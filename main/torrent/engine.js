import WebTorrent from 'webtorrent';
import { ensureStreamServer, stopStreamServer } from './server.js';

const IDLE_TIMEOUT = 10 * 60 * 1000;
const METADATA_TIMEOUT = 30 * 1000;
const MAX_CONNS = 100;

let client = null;
const engines = new Map();

function getClient() {
  if (!client) {
    client = new WebTorrent({ maxConns: MAX_CONNS });
  }
  return client;
}

function touch(infoHash) {
  const entry = engines.get(infoHash);
  if (!entry) {
    return;
  }

  clearTimeout(entry.idleTimer);
  entry.idleTimer = setTimeout(() => destroyEngine(infoHash), IDLE_TIMEOUT);
}

function destroyEngine(infoHash) {
  const entry = engines.get(infoHash);
  if (!entry) {
    return;
  }

  engines.delete(infoHash);
  clearTimeout(entry.idleTimer);
  entry.torrent.destroy({ destroyStore: false }, () => {});

  if (engines.size === 0) {
    stopStreamServer();
  }
}

function addTorrent(idOrMagnet, announce) {
  return new Promise((resolve, reject) => {
    const opts = { deselect: true };
    if (announce && announce.length > 0) {
      opts.announce = announce;
    }

    let settled = false;

    const torrent = getClient().add(idOrMagnet, opts, (ready) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(ready);
    });

    torrent.once('infoHash', (infoHash) => {
      if (!engines.has(infoHash)) {
        engines.set(infoHash, { torrent, idleTimer: null });
      }
      touch(infoHash);
    });

    torrent.once('error', (err) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);

      if (torrent.infoHash) {
        destroyEngine(torrent.infoHash);
      }
      reject(err);
    });

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;

      if (torrent.infoHash) {
        destroyEngine(torrent.infoHash);
      }
      reject(new Error('No peers responded in time. This release may have no active seeders right now.'));
    }, METADATA_TIMEOUT);
  });
}

function pickVideoFile(torrent) {
  const VIDEO = /\.(mp4|mkv|avi|mov|webm|m4v)$/i;

  const videos = [];
  for (const file of torrent.files) {
    if (VIDEO.test(file.name)) {
      videos.push(file);
    }
  }

  let pool = videos;
  if (pool.length === 0) {
    pool = torrent.files;
  }

  let biggest = pool[0];
  for (const file of pool) {
    if (file.length > biggest.length) {
      biggest = file;
    }
  }

  return biggest;
}

function announceList(source, extra = []) {
  const sources = source.sources || [];
  const trackers = [];

  for (const entry of sources) {
    if (typeof entry === 'string' && entry.startsWith('tracker:')) {
      trackers.push(entry.slice('tracker:'.length).trim());
    }
  }

  for (const entry of extra) {
    trackers.push(entry);
  }

  const unique = [];
  for (const tracker of trackers) {
    if (tracker && !unique.includes(tracker)) {
      unique.push(tracker);
    }
  }

  return unique;
}

export async function startTorrentStream(source, extraTrackers = []) {
  if (!source) {
    return { ok: false, error: 'Stream has no URL, magnet, or info hash' };
  }

  const magnetOrHash = source.magnet || source.infoHash;

  if (!magnetOrHash) {
    const directUrl = source.url || source.directUrl;
    if (!directUrl) {
      return { ok: false, error: 'Stream has no URL, magnet, or info hash' };
    }
    return { ok: true, data: { url: directUrl, direct: true } };
  }

  try {
    const torrent = await addTorrent(magnetOrHash, announceList(source, extraTrackers));

    const file = pickVideoFile(torrent);
    const fileIdx = torrent.files.indexOf(file);

    const base = await ensureStreamServer();

    return {
      ok: true,
      data: {
        url: base + '/' + torrent.infoHash + '/' + fileIdx,
        infoHash: torrent.infoHash,
        fileIdx,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function stopTorrentStream(infoHash) {
  if (infoHash) {
    destroyEngine(infoHash);
  }
  return { ok: true };
}

export function getStreamStats(infoHash) {
  const entry = engines.get(infoHash);
  if (!entry) {
    return null;
  }

  const torrent = entry.torrent;

  return {
    downloadSpeed: torrent.downloadSpeed,
    numPeers: torrent.numPeers,
    progress: torrent.progress,
  };
}

export function getFile(infoHash, fileIdx) {
  const entry = engines.get(infoHash);
  if (!entry) {
    return null;
  }

  const file = entry.torrent.files[fileIdx];
  if (!file) {
    return null;
  }

  touch(infoHash);
  return { file, torrent: entry.torrent };
}

//review: this is what we did here: engine.js is the part that actually downloads a torrent.
//Some sources give a plain web address instead, and those are handed straight back without
//any of this running. For a real torrent it starts a downloader, waits for the file list to
//arrive, then picks the biggest video file, which skips samples and readme files.
//Three details matter. deselect stops it grabbing the whole torrent, so a full season does
//not download in the background while you watch one episode. The thirty second timer gives
//up on a dead torrent with a clear message instead of spinning forever. And each downloader
//shuts itself down ten minutes after you stop watching, so browsing many films does not
//leave a pile of them running.
