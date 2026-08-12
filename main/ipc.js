import { ipcMain } from 'electron';
import { getSettings, saveSettings } from './store.js';
import {
  fetchCatalogs,
  searchTMDB,
  getDetail,
  getTMDBEpisodes,
  CATALOG_ROWS,
} from './metadata/index.js';
import { queryAllAddons } from './sources/addon.js';
import { queryAllIndexers } from './sources/indexer.js';
import { looksLikeMatch, looksLikeYear } from './sources/match.js';
import { rankStreams } from './sources/rank.js';
import { startTorrentStream, stopTorrentStream, getStreamStats } from './torrent/engine.js';

function splitSources(sources) {
  const addons = [];
  const indexers = [];

  for (const source of sources) {
    const kind = source.kind || 'addon';

    if (kind === 'prowlarr' || kind === 'jackett') {
      indexers.push(source);
    } else {
      addons.push(source);
    }
  }

  return { addons, indexers };
}

function keepRealMatches(streams, title, year) {
  const kept = [];

  for (const stream of streams) {
    if (title && !looksLikeMatch(stream.name, title)) {
      continue;
    }

    let releaseYear = null;
    if (stream.parsed) {
      releaseYear = stream.parsed.year;
    }

    if (year && !looksLikeYear(releaseYear, year)) {
      continue;
    }

    kept.push(stream);
  }

  return kept;
}

export function registerIPCHandlers() {
  ipcMain.handle('settings:get', async () => {
    try {
      return { ok: true, data: getSettings() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('settings:set', async (event, data) => {
    try {
      return saveSettings(data);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('metadata:catalogs', async () => {
    try {
      const catalogs = await fetchCatalogs();
      return { ok: true, data: { rows: CATALOG_ROWS, catalogs } };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('metadata:search', async (event, { query }) => {
    try {
      const data = await searchTMDB(query);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('metadata:detail', async (event, { id, type }) => {
    try {
      const data = await getDetail(id, type);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('metadata:episodes', async (event, { id, season }) => {
    try {
      const data = await getTMDBEpisodes(id, season);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('sources:search', async (event, { id, type = 'movie', query, title, year }) => {
    try {
      const saved = getSettings();
      const sources = saved.sources || [];
      const settings = saved.settings || {};

      const { addons, indexers } = splitSources(sources);

      const bothJobs = [
        queryAllAddons(addons, type, id),
        queryAllIndexers(indexers, query, type),
      ];
      const [addonStreams, indexerStreams] = await Promise.all(bothJobs);

      const matchedIndexerStreams = keepRealMatches(indexerStreams, title, year);

      const everything = [...addonStreams, ...matchedIndexerStreams];
      const preferredQuality = settings.defaultQuality || '4K';

      return { ok: true, data: rankStreams(everything, preferredQuality) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('torrent:start', async (event, source) => {
    try {
      return await startTorrentStream(source);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('torrent:stats', async (event, { infoHash } = {}) => {
    try {
      return { ok: true, data: getStreamStats(infoHash) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('torrent:stop', async (event, { infoHash } = {}) => {
    try {
      return stopTorrentStream(infoHash);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

//review: this is what we did here: ipc.js is the switchboard. The window is not allowed to
//read files or reach the internet itself, so it asks for a named job instead, and this file
//lists every job it is allowed to ask for. Each one does the work and answers in the same
//shape, either ok true with the data or ok false with a message, so a failure comes back as
//a normal answer the screen can show rather than crashing anything.
//The interesting one is sources:search. It splits your saved sources into addons and
//indexers because they are asked in different ways, sends both off at the same time, then
//filters the indexer results, since a text search returns loosely related things an addon
//lookup never would. Whatever survives is ranked and sent back as one list.
