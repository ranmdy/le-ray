import http from 'http';
import { getFile } from './engine.js';
import { calculatePieceRange, calculatePriorityWindow } from './pieces.js';

const VIDEO_MIME = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
};

const HEAD_START_BYTES = 4 * 1024 * 1024;

let server = null;
let baseUrl = null;

export function ensureStreamServer() {
  if (baseUrl) {
    return Promise.resolve(baseUrl);
  }

  return new Promise((resolve, reject) => {
    server = http.createServer(handleRequest);
    server.once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = 'http://127.0.0.1:' + port;
      resolve(baseUrl);
    });
  });
}

export function stopStreamServer() {
  if (!server) {
    return;
  }

  server.close();
  server = null;
  baseUrl = null;
}

function handleRequest(req, res) {
  const parts = req.url.split('/');
  const infoHash = parts[1];
  const fileIndex = Number(parts[2]);

  const found = getFile(infoHash, fileIndex);
  if (!found) {
    res.writeHead(404);
    res.end('Stream not found');
    return;
  }

  const file = found.file;
  const torrent = found.torrent;

  let type = VIDEO_MIME[extensionOf(file.name)];
  if (!type) {
    type = 'application/octet-stream';
  }

  const range = req.headers.range;

  if (!range) {
    prioritize(torrent, file, 0, file.length - 1);

    res.writeHead(200, {
      'Content-Length': file.length,
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
    });
    file.createReadStream().pipe(res);
    return;
  }

  const { start, end } = parseRange(range, file.length);

  if (start >= file.length || end < start) {
    res.writeHead(416, { 'Content-Range': 'bytes */' + file.length });
    res.end();
    return;
  }

  prioritize(torrent, file, start, end);

  res.writeHead(206, {
    'Content-Range': 'bytes ' + start + '-' + end + '/' + file.length,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': type,
  });
  file.createReadStream({ start, end }).pipe(res);
}

function parseRange(header, fileLength) {
  const cleaned = header.replace(/bytes=/, '');
  const parts = cleaned.split('-');

  let start = 0;
  if (parts[0]) {
    start = parseInt(parts[0], 10);
  }

  let end = fileLength - 1;
  if (parts[1]) {
    end = parseInt(parts[1], 10);
  }

  return { start, end };
}

function extensionOf(name) {
  const parts = name.split('.');
  const last = parts.pop() || '';
  return last.toLowerCase();
}

function prioritize(torrent, file, start, end) {
  const pieceLength = torrent.pieceLength;

  const range = calculatePieceRange(file.offset, file.length, pieceLength, start, end);

  let windowSize = Math.ceil(HEAD_START_BYTES / pieceLength);
  if (windowSize < 4) {
    windowSize = 4;
  }

  const window = calculatePriorityWindow(range.startPiece, torrent.pieces.length, windowSize);

  torrent.critical(window.highPriorityStart, window.highPriorityEnd);
}

//review: this is what we did here: server.js is a tiny web server running inside the app
//that hands the video player the film as it downloads. The player cannot read a torrent, but
//it can play a normal web address, so this pretends to be one. It only listens on
//127.0.0.1, which means your own machine and nothing on your network can reach it.
//The important part is the range handling. When you drag the progress bar, the player asks
//for a specific stretch of bytes, and before sending anything this file works out which
//pieces those bytes are in and marks them urgent, so the download jumps to the part you
//actually want instead of carrying on from where it was.
