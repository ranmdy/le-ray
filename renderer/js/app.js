import { api } from './api.js';
import { home } from './screens/home.js';
import { search } from './screens/search.js';
import { detail } from './screens/detail.js';
import { picker } from './screens/picker.js';
import { player } from './screens/player.js';
import { settings } from './screens/settings.js';
import { SETTINGS_OPTIONS } from './mock/settings.js';
import {
  mountPlayerVideo,
  showPlayerVideo,
  hidePlayerVideo,
  togglePlayerPlayback,
  seekPlayerTo,
} from './player-video.js';

const root = document.getElementById('app');

export const state = {
  screen: 'home',
  loading: true,
  query: '',
  detailId: null,
  season: 1,
  settingsSection: 'Sources',
  sources: [],
  sourceInputUrl: '',
  sourceInputApiKey: '',
  sourceKind: 'addon',
  library: [],
  settings: {},
  catalog: [],
  catalogRows: [],
  catalogs: {},
  catalogError: null,
  results: null,
  searching: false,
  detail: null,
  detailLoading: false,
  episodes: [],
  episodesLoading: false,
  picker: null,
  player: null,
};

export function inLibrary(state, id) {
  return state.library.some((item) => String(item.id) === String(id));
}

function resolveTitle(id) {
  if (state.detail && String(state.detail.id) === String(id)) return state.detail;
  return state.catalog.find((item) => String(item.id) === String(id)) || null;
}

function saveLibrary() {
  api.saveSettings({ library: state.library });
}

function saveSources() {
  api.saveSettings({ sources: state.sources });
}

const SOURCE_KIND_LABEL = { addon: 'Stremio addon', prowlarr: 'Prowlarr', jackett: 'Jackett' };

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function loadDetail(id, type) {
  state.detailLoading = true;
  state.detail = null;
  api.getDetail(id, type).then((item) => {
    if (state.detailId !== id) return;
    state.detailLoading = false;
    if (item) state.detail = item;
    render();
    if (item?.type === 'tv') loadEpisodes(id, state.season);
  });
}

function loadEpisodes(id, season) {
  state.episodes = [];
  state.episodesLoading = true;
  api.getEpisodes(id, season).then((episodes) => {
    if (state.detailId !== id || state.season !== season) return;
    state.episodes = episodes || [];
    state.episodesLoading = false;
    render();
  });
}

let searchTimer = null;
function scheduleSearch(query) {
  clearTimeout(searchTimer);
  const q = query.trim();

  if (!q) {
    state.results = null;
    state.searching = false;
    render();
    return;
  }

  state.searching = true;
  render();
  searchTimer = setTimeout(() => {
    api.searchCatalog(q).then((results) => {
      if (state.query.trim() !== q) return;
      state.results = results || [];
      state.searching = false;
      render();
    });
  }, 300);
}

const screens = { home, library: home, search, detail, player, settings };

function stub(name) {
  return `<div class="stub"><div class="kicker">Not built yet</div><h1 class="stub__title">${name}</h1></div>`;
}

const actions = {
  noop: () => false,

  go: ({ screen }) => { state.screen = screen; state.picker = null; },
  'open-detail': ({ id, type }) => {
    state.screen = 'detail';
    state.detailId = id;
    state.season = 1;
    state.episodes = [];
    loadDetail(id, type);
  },
  back: () => { state.screen = 'home'; },

  'scroll-row': ({ row, dir }) => {
    const el = root.querySelector(`.row__scroll[data-row="${row}"]`);
    if (el) el.scrollBy({ left: Number(dir) * 600, behavior: 'smooth' });
    return false;
  },

  'clear-search': () => { state.query = ''; scheduleSearch(''); },
  'toggle-library': ({ id }) => {
    const idx = state.library.findIndex((item) => String(item.id) === String(id));
    if (idx >= 0) {
      state.library.splice(idx, 1);
    } else {
      const item = resolveTitle(id);
      if (!item) return;
      state.library.unshift(item);
    }
    saveLibrary();
  },
  'select-season': ({ season }) => {
    state.season = Number(season);
    loadEpisodes(state.detailId, state.season);
  },

  play: ({ id }) => { actions['open-picker']({ id }); },
  'open-picker': ({ id }) => {
    const titleId = id || state.detailId;
    if (id) state.detailId = id;
    state.picker = { loading: true, titleId, items: [] };
    api.getStreams(titleId, resolveTitle(titleId)).then((items) => {
      if (state.picker?.titleId !== titleId) return;
      state.picker.items = items;
      state.picker.loading = false;
      render();
    });
  },
  'close-picker': () => { state.picker = null; },
  'select-stream': ({ streamId }) => {
    const items = state.picker?.items || [];
    const stream = items.find((s) => s.id === streamId) || items[0];
    if (!stream) return;
    state.picker = null;
    state.screen = 'player';
    const item = resolveTitle(state.detailId);
    state.player = {
      item, stream, loading: true, error: null,
      playing: false, currentTime: 0, duration: 0, buffered: 0, buffering: false,
      chromeVisible: true, subtitles: false, infoHash: null, peers: null,
    };

    if (stream.infoHash) pollStreamStats(stream.infoHash);

    api.startStream(stream).then((result) => {
      if (state.screen !== 'player' || state.player?.stream !== stream) return;

      state.player.loading = false;
      if (!result?.url) {
        state.player.error = result?.error || 'Could not start this stream.';
        stopStatsPoll();
        render();
        return;
      }

      state.player.infoHash = result.infoHash || null;
      showPlayerVideo(result.url, item?.backdrop);
      if (!state.player.infoHash) stopStatsPoll();
      render();
    });
  },

  'toggle-play': () => { togglePlayerPlayback(); return false; },
  'toggle-subtitles': () => { if (state.player) state.player.subtitles = !state.player.subtitles; },
  'toggle-fullscreen': () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
    return false;
  },
  'seek-player': (dataset, event, el) => {
    if (!state.player) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    seekPlayerTo(pct * (state.player.duration || 0));
    return false;
  },
  'close-player': () => {
    const infoHash = state.player?.infoHash;
    hidePlayerVideo();
    stopStatsPoll();
    if (infoHash) api.stopStream(infoHash);
    state.screen = 'home';
    state.player = null;
  },

  'select-settings-section': ({ section }) => { state.settingsSection = section; },
  'add-source': () => {
    const url = (state.sourceInputUrl || '').trim();
    const kind = state.sourceKind || 'addon';
    const apiKey = (state.sourceInputApiKey || '').trim();

    if (!url || (kind !== 'addon' && !apiKey)) return;

    state.sources.push({
      name: `${SOURCE_KIND_LABEL[kind]} — ${hostOf(url)}`,
      url,
      kind,
      ...(kind !== 'addon' ? { apiKey } : {}),
    });
    state.sourceInputUrl = '';
    state.sourceInputApiKey = '';
    saveSources();
  },
  'remove-source': ({ index }) => {
    const i = Number(index);
    if (!isNaN(i) && i >= 0 && i < state.sources.length) {
      state.sources.splice(i, 1);
      saveSources();
    }
  },
  'cycle-setting': ({ section, key }) => {
    const list = SETTINGS_OPTIONS[section] || [];
    const item = list.find((o) => o.key === key);
    if (!item) return;
    const current = state.settings[key] ?? item.default;
    const nextIdx = (item.options.indexOf(current) + 1) % item.options.length;
    state.settings[key] = item.options[nextIdx];
  },
};

export function render() {
  const activeId = document.activeElement ? document.activeElement.id : null;
  const selStart = document.activeElement?.selectionStart;
  const selEnd = document.activeElement?.selectionEnd;

  const screen = screens[state.screen];
  let html = screen ? screen(state) : stub(state.screen);
  if (state.picker && state.screen !== 'player') html += picker(state);
  root.innerHTML = html;

  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      if (typeof selStart === 'number' && typeof selEnd === 'number' && el.setSelectionRange) {
        el.setSelectionRange(selStart, selEnd);
      }
    }
  }
}

root.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = actions[el.dataset.action];
  if (!action) return;
  if (action(el.dataset, event, el) !== false) render();
});

root.addEventListener('input', (event) => {
  const action = event.target.dataset?.action;
  if (action === 'search-input') { state.query = event.target.value; scheduleSearch(state.query); }
  else if (action === 'source-url-input') { state.sourceInputUrl = event.target.value; }
  else if (action === 'source-apikey-input') { state.sourceInputApiKey = event.target.value; }
  else if (action === 'set-source-kind') {
    state.sourceKind = event.target.value;
    state.sourceInputApiKey = '';
    render();
  }
});

window.addEventListener('keydown', (event) => {
  if (state.screen === 'player') {
    if (event.code === 'Space') { event.preventDefault(); togglePlayerPlayback(); }
    else if (event.code === 'Escape') { event.preventDefault(); actions['close-player'](); render(); }
  } else if (state.picker) {
    if (event.code === 'Enter' && !state.picker.loading) {
      event.preventDefault();
      const items = state.picker.items || [];
      const best = items.find((s) => s.isBest) || items[0];
      if (best) { actions['select-stream']({ streamId: best.id }); render(); }
    } else if (event.code === 'Escape') {
      event.preventDefault(); actions['close-picker'](); render();
    }
  }
});

let mouseTimer = null;
window.addEventListener('mousemove', () => {
  if (state.screen !== 'player' || !state.player) return;
  if (!state.player.chromeVisible) { state.player.chromeVisible = true; render(); }
  clearTimeout(mouseTimer);
  mouseTimer = setTimeout(() => {
    if (state.screen === 'player' && state.player) {
      state.player.chromeVisible = false;
      render();
    }
  }, 2600);
});

let statsTimer = null;

function pollStreamStats(infoHash) {
  clearInterval(statsTimer);
  statsTimer = setInterval(async () => {
    if (state.screen !== 'player' || !state.player) return stopStatsPoll();

    const stats = await api.getStreamStats(infoHash);
    if (state.screen !== 'player' || !state.player) return;
    if (!stats) return;

    state.player.peers = stats.numPeers;
    if (!state.player.loading) state.player.speed = formatSpeed(stats.downloadSpeed);
    render();
  }, 1000);
}

function stopStatsPoll() {
  clearInterval(statsTimer);
  statsTimer = null;
}

function formatSpeed(bytesPerSec = 0) {
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1024) return `${Math.round(bytesPerSec / 1024)} KB/s`;
  return `${Math.round(bytesPerSec)} B/s`;
}

mountPlayerVideo();
render();

api.getSettings().then((stored) => {
  state.library = Array.isArray(stored?.library) ? stored.library : [];
  state.sources = Array.isArray(stored?.sources) ? stored.sources : [];
  if (stored?.settings) state.settings = stored.settings;
  render();
});

api.getCatalogs().then(({ rows, catalogs }) => {
  state.catalogRows = rows || [];
  state.catalogs = catalogs || {};

  const seen = new Set();
  state.catalog = Object.values(state.catalogs)
    .flat()
    .filter((item) => !seen.has(String(item.id)) && seen.add(String(item.id)));

  state.loading = false;
  render();
});

window.__leray = { state, render };
