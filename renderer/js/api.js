import { CATALOG, findTitle } from './mock/catalog.js';
import { EPISODES } from './mock/episodes.js';
import { streamsFor } from './mock/streams.js';
import { SETTINGS_OPTIONS } from './mock/settings.js';

const LOCAL_KEY = 'leray.settings';
const EMPTY_SETTINGS = { sources: [], settings: {}, library: [] };

function bridge() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.lerayNative;
}

async function dev(endpoint, params = {}) {
  if (typeof window === 'undefined') {
    return null;
  }
  if (window.location.protocol.startsWith('file')) {
    return null;
  }

  const query = new URLSearchParams();
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      query.append(key, value);
    }
  }

  try {
    const res = await fetch('/__dev/' + endpoint + '?' + query);
    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    if (!json.ok) {
      return null;
    }
    return json.data;
  } catch {
    return null;
  }
}

function localSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return { ...EMPTY_SETTINGS, ...saved };
  } catch {
    return { ...EMPTY_SETTINGS };
  }
}

function usable(data) {
  if (Array.isArray(data)) {
    return data.length > 0;
  }
  return Boolean(data);
}

function searchMockCatalog(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    return CATALOG;
  }

  const hits = [];

  for (const item of CATALOG) {
    const haystack = [item.title, item.director, item.genre, item.cast];
    let matched = false;

    for (const field of haystack) {
      if (field && field.toLowerCase().includes(q)) {
        matched = true;
        break;
      }
    }

    if (matched) {
      hits.push(item);
    }
  }

  return hits;
}

export const api = {
  async getSettings() {
    const native = bridge();

    if (native && native.settings) {
      const res = await native.settings.get();
      if (res.ok) {
        return res.data;
      }
    }

    return localSettings();
  },

  async saveSettings(data) {
    const native = bridge();

    if (native && native.settings) {
      return await native.settings.set(data);
    }

    try {
      const merged = { ...localSettings(), ...data };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
    } catch {
      // storage can be unavailable, saving is best effort
    }

    return { ok: true };
  },

  async getCatalogs() {
    const native = bridge();

    if (native && native.metadata && native.metadata.catalogs) {
      const res = await native.metadata.catalogs();
      if (res.ok) {
        return res.data;
      }
    }

    const live = await dev('catalogs');
    if (live && live.catalogs) {
      return live;
    }

    return {
      rows: [{ key: 'trending', title: 'Trending now' }],
      catalogs: { trending: CATALOG },
    };
  },

  async searchCatalog(query) {
    const native = bridge();

    if (native && native.metadata) {
      const res = await native.metadata.search(query);
      if (res.ok) {
        return res.data;
      }
    }

    const live = await dev('search', { query });
    if (usable(live)) {
      return live;
    }

    return searchMockCatalog(query);
  },

  async getDetail(id, type) {
    const native = bridge();

    if (native && native.metadata) {
      const res = await native.metadata.detail(id, type);
      if (res.ok) {
        return res.data;
      }
    }

    const live = await dev('detail', { id, type });
    if (usable(live)) {
      return live;
    }

    return findTitle(id);
  },

  async getEpisodes(id, season = 1) {
    const native = bridge();

    if (native && native.metadata) {
      const res = await native.metadata.episodes(id, season);
      if (res.ok) {
        return res.data;
      }
    }

    const live = await dev('episodes', { id, season });
    if (usable(live)) {
      return live;
    }

    return EPISODES[season] || EPISODES[1] || [];
  },

  async getStreams(id, title = null) {
    const native = bridge();

    if (native && native.sources) {
      let lookupId = id;
      let type = 'movie';
      let name;
      let year;

      if (title) {
        if (title.imdbId) {
          lookupId = title.imdbId;
        }
        if (title.type === 'tv') {
          type = 'series';
        }
        name = title.title;
        year = title.year;
      }

      const res = await native.sources.search({
        id: lookupId,
        type,
        query: name,
        title: name,
        year,
      });

      if (res.ok) {
        return res.data;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    return streamsFor(title || findTitle(id));
  },

  async startStream(source) {
    const native = bridge();

    if (!native || !native.torrent) {
      return { error: 'Not available in this preview — torrenting runs in the desktop app.' };
    }

    const res = await native.torrent.start(source);
    if (res.ok) {
      return res.data;
    }
    return { error: res.error };
  },

  async stopStream(infoHash) {
    const native = bridge();

    if (native && native.torrent && infoHash) {
      await native.torrent.stop(infoHash);
    }
  },

  async getStreamStats(infoHash) {
    const native = bridge();

    if (!native || !native.torrent || !infoHash) {
      return null;
    }

    const res = await native.torrent.stats(infoHash);
    if (res.ok) {
      return res.data;
    }
    return null;
  },
};

//review: this is what we did here: api.js is the only file in the window allowed to ask for
//outside information. Every screen goes through it, which is why the screens themselves
//contain no fetching at all. Each function tries three places in order. First the desktop
//bridge, which is the real app. If that is missing it tries the dev server, which is how the
//app runs in a plain browser with real data but no desktop features. If neither answers it
//falls back to the sample films bundled in the mock folder, so the layout can still be
//looked at with no keys set up. That ordering is why a broken bridge shows sample data
//instead of an error, which is worth remembering if the app ever looks oddly out of date.
