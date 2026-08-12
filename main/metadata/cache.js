import fs from 'fs';
import os from 'os';
import path from 'path';

async function resolveCacheDir() {
  try {
    const { app } = await import('electron');
    if (app && app.getPath) {
      return path.join(app.getPath('userData'), 'cache');
    }
  } catch {
    // not running inside Electron
  }

  return path.join(os.tmpdir(), 'le-ray-cache');
}

const CACHE_DIR = await resolveCacheDir();
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function fileNameFor(key) {
  const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
  return safeKey + '.json';
}

export function getCache(key) {
  try {
    const file = path.join(CACHE_DIR, fileNameFor(key));

    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, 'utf-8');
      const entry = JSON.parse(text);

      if (Date.now() < entry.expiresAt) {
        return entry.data;
      }
    }
  } catch {
    // a missing or damaged cache file just means no cached copy
  }

  return null;
}

export function setCache(key, data, ttlMs = DEFAULT_TTL) {
  try {
    const file = path.join(CACHE_DIR, fileNameFor(key));

    const entry = {
      expiresAt: Date.now() + ttlMs,
      data,
    };

    fs.writeFileSync(file, JSON.stringify(entry), 'utf-8');
  } catch {
    // failing to save is fine, the app just fetches again next time
  }
}

//review: this is what we did here: cache.js saves answers from TMDB and OMDb to disk so
//the app is not asking the internet for the same film every time you open a page. Each
//answer is written as a small json file with an expiry time stamped on it. getCache only
//returns the saved copy if that time has not passed, otherwise it returns nothing and the
//caller fetches fresh. Both functions swallow their errors on purpose: a cache is only a
//shortcut, so a missing folder or a half written file should never stop the app, it just
//means fetching again. The folder is inside the app's own data directory when running in
//Electron, or the system temp folder when running the browser dev server.
