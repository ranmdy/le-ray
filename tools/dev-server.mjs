import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'renderer');
const PORT = Number(process.argv[2]) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

function readEnvLines() {
  try {
    const file = path.join(__dirname, '..', '.env');
    return fs.readFileSync(file, 'utf8').split('\n');
  } catch {
    return [];
  }
}

function loadEnv() {
  for (const line of readEnvLines()) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) {
      continue;
    }

    const name = match[1];
    if (process.env[name]) {
      continue;
    }

    process.env[name] = match[2].replace(/^["']|["']$/g, '');
  }
}

loadEnv();

const metadata = await import('../main/metadata/index.js');

async function runRoute(pathname, query) {
  if (pathname === '/__dev/catalogs') {
    const catalogs = await metadata.fetchCatalogs();
    return { rows: metadata.CATALOG_ROWS, catalogs };
  }

  if (pathname === '/__dev/search') {
    return metadata.searchTMDB(query.get('query') || '');
  }

  if (pathname === '/__dev/detail') {
    return metadata.getDetail(query.get('id'), query.get('type'));
  }

  if (pathname === '/__dev/episodes') {
    const season = Number(query.get('season')) || 1;
    return metadata.getTMDBEpisodes(query.get('id'), season);
  }

  return undefined;
}

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store, must-revalidate',
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(payload));
}

function serveStatic(pathname, res) {
  let rel;
  if (pathname === '/') {
    rel = 'index.html';
  } else {
    rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  }

  const file = path.join(ROOT, rel);

  if (!file.startsWith(ROOT)) {
    send(res, 403, 'text/plain', 'Forbidden');
    return;
  }

  fs.readFile(file, (err, body) => {
    if (err) {
      send(res, 404, 'text/plain', 'Not found');
      return;
    }

    let type = MIME[path.extname(file)];
    if (!type) {
      type = 'application/octet-stream';
    }

    send(res, 200, type, body);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);

  if (url.pathname.startsWith('/__dev/')) {
    try {
      const data = await runRoute(url.pathname, url.searchParams);

      if (data === undefined) {
        sendJson(res, 404, { ok: false, error: 'Unknown dev route' });
        return;
      }

      sendJson(res, 200, { ok: true, data });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
    }
    return;
  }

  serveStatic(url.pathname, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('renderer on http://127.0.0.1:' + PORT);

  if (process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN) {
    console.log('TMDB credentials loaded — live metadata');
  } else {
    console.log('no TMDB credentials — renderer falls back to mock data');
  }

  if (process.env.OMDB_API_KEY) {
    console.log('OMDb key loaded — IMDb ratings on');
  } else {
    console.log('no OMDb key — IMDb ratings off');
  }
});

//review: this is what we did here: dev-server.mjs lets you open the app in an ordinary web
//browser instead of the desktop window, which is handy while working on the look of a
//screen. It serves the renderer folder as a normal website, and answers the /__dev/
//addresses by calling the very same metadata code the desktop app uses, so what you see is
//real film data rather than samples. Two details matter. It only listens on 127.0.0.1 so
//nothing else on your network can reach it, and it sends a no-store header on everything,
//because browsers otherwise keep serving an old copy of a file you just edited. Torrent
//playback does not work here since that needs the desktop side. This file is for
//development only and is never part of the shipped app.
