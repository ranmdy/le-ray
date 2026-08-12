import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'renderer');
const PORT = Number(process.argv[2]) || 4173;

for (const line of readEnvLines()) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

function readEnvLines() {
  try {
    return fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n');
  } catch {
    return [];
  }
}

const metadata = await import('../main/metadata/index.js');

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

const ROUTES = {
  '/__dev/catalogs': async () => ({
    rows: metadata.CATALOG_ROWS,
    catalogs: await metadata.fetchCatalogs(),
  }),
  '/__dev/search': (q) => metadata.searchTMDB(q.get('query') || ''),
  '/__dev/detail': (q) => metadata.getDetail(q.get('id'), q.get('type')),
  '/__dev/episodes': (q) => metadata.getTMDBEpisodes(q.get('id'), Number(q.get('season')) || 1),
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = ROUTES[url.pathname];

  if (route) {
    try {
      const data = await route(url.searchParams);
      send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ ok: true, data }));
    } catch (err) {
      send(res, 500, 'application/json; charset=utf-8', JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  serveStatic(url.pathname, res);
});

function serveStatic(pathname, res) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.join(ROOT, rel);

  if (!file.startsWith(ROOT)) return send(res, 403, 'text/plain', 'Forbidden');

  fs.readFile(file, (err, body) => {
    if (err) return send(res, 404, 'text/plain', 'Not found');
    send(res, 200, MIME[path.extname(file)] || 'application/octet-stream', body);
  });
}

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store, must-revalidate',
  });
  res.end(body);
}

server.listen(PORT, '127.0.0.1', () => {
  const keyed = Boolean(process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN);
  console.log(`renderer on http://127.0.0.1:${PORT}`);
  console.log(keyed ? 'TMDB credentials loaded — live metadata' : 'no TMDB credentials — renderer falls back to mock data');
  console.log(process.env.OMDB_API_KEY ? 'OMDb key loaded — IMDb ratings on' : 'no OMDb key — IMDb ratings off');
});
