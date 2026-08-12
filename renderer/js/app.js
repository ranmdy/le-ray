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

const SOURCE_KIND_LABEL = {
  addon: 'Stremio addon',
  prowlarr: 'Prowlarr',
  jackett: 'Jackett',
};

const CHROME_HIDE_DELAY = 2600;
const SEARCH_DELAY = 300;

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

const screens = { home, library: home, search, detail, player, settings };

export function inLibrary(state, id) {
  for (const item of state.library) {
    if (String(item.id) === String(id)) {
      return true;
    }
  }
  return false;
}

function resolveTitle(id) {
  if (state.detail && String(state.detail.id) === String(id)) {
    return state.detail;
  }

  for (const item of state.catalog) {
    if (String(item.id) === String(id)) {
      return item;
    }
  }

  return null;
}

function saveLibrary() {
  api.saveSettings({ library: state.library });
}

function saveSources() {
  api.saveSettings({ sources: state.sources });
}

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
    if (state.detailId !== id) {
      return;
    }

    state.detailLoading = false;
    if (item) {
      state.detail = item;
    }
    render();

    if (item && item.type === 'tv') {
      loadEpisodes(id, state.season);
    }
  });
}

function loadEpisodes(id, season) {
  state.episodes = [];
  state.episodesLoading = true;

  api.getEpisodes(id, season).then((episodes) => {
    if (state.detailId !== id || state.season !== season) {
      return;
    }

    state.episodes = episodes || [];
    state.episodesLoading = false;
    render();
  });
}

let searchTimer = null;

function scheduleSearch(query) {
  clearTimeout(searchTimer);

  const wanted = query.trim();

  if (!wanted) {
    state.results = null;
    state.searching = false;
    render();
    return;
  }

  state.searching = true;
  render();

  searchTimer = setTimeout(() => {
    api.searchCatalog(wanted).then((results) => {
      if (state.query.trim() !== wanted) {
        return;
      }

      state.results = results || [];
      state.searching = false;
      render();
    });
  }, SEARCH_DELAY);
}

let statsTimer = null;

function pollStreamStats(infoHash) {
  clearInterval(statsTimer);

  statsTimer = setInterval(async () => {
    if (state.screen !== 'player' || !state.player) {
      stopStatsPoll();
      return;
    }

    const stats = await api.getStreamStats(infoHash);

    if (state.screen !== 'player' || !state.player) {
      return;
    }
    if (!stats) {
      return;
    }

    state.player.peers = stats.numPeers;
    if (!state.player.loading) {
      state.player.speed = formatSpeed(stats.downloadSpeed);
    }
    render();
  }, 1000);
}

function stopStatsPoll() {
  clearInterval(statsTimer);
  statsTimer = null;
}

function formatSpeed(bytesPerSec = 0) {
  if (bytesPerSec >= 1024 * 1024) {
    const mb = bytesPerSec / (1024 * 1024);
    return mb.toFixed(1) + ' MB/s';
  }

  if (bytesPerSec >= 1024) {
    return Math.round(bytesPerSec / 1024) + ' KB/s';
  }

  return Math.round(bytesPerSec) + ' B/s';
}

function stub(name) {
  return `<div class="stub"><div class="kicker">Not built yet</div><h1 class="stub__title">${name}</h1></div>`;
}

const actions = {
  noop: () => false,

  go: ({ screen }) => {
    state.screen = screen;
    state.picker = null;
  },

  back: () => {
    state.screen = 'home';
  },

  'open-detail': ({ id, type }) => {
    state.screen = 'detail';
    state.detailId = id;
    state.season = 1;
    state.episodes = [];
    loadDetail(id, type);
  },

  'scroll-row': ({ row, dir }) => {
    const el = root.querySelector(`.row__scroll[data-row="${row}"]`);
    if (el) {
      el.scrollBy({ left: Number(dir) * 600, behavior: 'smooth' });
    }
    return false;
  },

  'clear-search': () => {
    state.query = '';
    scheduleSearch('');
  },

  'toggle-library': ({ id }) => {
    let foundAt = -1;

    for (let i = 0; i < state.library.length; i++) {
      if (String(state.library[i].id) === String(id)) {
        foundAt = i;
        break;
      }
    }

    if (foundAt >= 0) {
      state.library.splice(foundAt, 1);
    } else {
      const item = resolveTitle(id);
      if (!item) {
        return;
      }
      state.library.unshift(item);
    }

    saveLibrary();
  },

  'select-season': ({ season }) => {
    state.season = Number(season);
    loadEpisodes(state.detailId, state.season);
  },

  play: ({ id }) => {
    actions['open-picker']({ id });
  },

  'open-picker': ({ id }) => {
    const titleId = id || state.detailId;
    if (id) {
      state.detailId = id;
    }

    state.picker = { loading: true, titleId, items: [] };

    api.getStreams(titleId, resolveTitle(titleId)).then((items) => {
      if (!state.picker || state.picker.titleId !== titleId) {
        return;
      }

      state.picker.items = items;
      state.picker.loading = false;
      render();
    });
  },

  'close-picker': () => {
    state.picker = null;
  },

  'select-stream': ({ streamId }) => {
    let items = [];
    if (state.picker) {
      items = state.picker.items || [];
    }

    let stream = null;
    for (const candidate of items) {
      if (candidate.id === streamId) {
        stream = candidate;
        break;
      }
    }
    if (!stream) {
      stream = items[0];
    }
    if (!stream) {
      return;
    }

    const item = resolveTitle(state.detailId);

    state.picker = null;
    state.screen = 'player';
    state.player = {
      item,
      stream,
      loading: true,
      error: null,
      playing: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      buffering: false,
      chromeVisible: true,
      subtitles: false,
      infoHash: null,
      peers: null,
    };

    if (stream.infoHash) {
      pollStreamStats(stream.infoHash);
    }

    api.startStream(stream).then((result) => {
      if (state.screen !== 'player' || !state.player) {
        return;
      }
      if (state.player.stream !== stream) {
        return;
      }

      state.player.loading = false;

      if (!result || !result.url) {
        let message = 'Could not start this stream.';
        if (result && result.error) {
          message = result.error;
        }

        state.player.error = message;
        stopStatsPoll();
        render();
        return;
      }

      state.player.infoHash = result.infoHash || null;

      let poster = null;
      if (item) {
        poster = item.backdrop;
      }
      showPlayerVideo(result.url, poster);

      if (!state.player.infoHash) {
        stopStatsPoll();
      }
      render();
    });
  },

  'toggle-play': () => {
    togglePlayerPlayback();
    return false;
  },

  'toggle-subtitles': () => {
    if (state.player) {
      state.player.subtitles = !state.player.subtitles;
    }
  },

  'toggle-fullscreen': () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    return false;
  },

  'seek-player': (dataset, event, el) => {
    if (!state.player) {
      return;
    }

    const rect = el.getBoundingClientRect();

    let fraction = (event.clientX - rect.left) / rect.width;
    if (fraction < 0) {
      fraction = 0;
    }
    if (fraction > 1) {
      fraction = 1;
    }

    seekPlayerTo(fraction * (state.player.duration || 0));
    return false;
  },

  'close-player': () => {
    let infoHash = null;
    if (state.player) {
      infoHash = state.player.infoHash;
    }

    hidePlayerVideo();
    stopStatsPoll();

    if (infoHash) {
      api.stopStream(infoHash);
    }

    state.screen = 'home';
    state.player = null;
  },

  'select-settings-section': ({ section }) => {
    state.settingsSection = section;
  },

  'add-source': () => {
    const url = (state.sourceInputUrl || '').trim();
    const kind = state.sourceKind || 'addon';
    const apiKey = (state.sourceInputApiKey || '').trim();

    if (!url) {
      return;
    }
    if (kind !== 'addon' && !apiKey) {
      return;
    }

    const source = {
      name: SOURCE_KIND_LABEL[kind] + ' — ' + hostOf(url),
      url,
      kind,
    };

    if (kind !== 'addon') {
      source.apiKey = apiKey;
    }

    state.sources.push(source);
    state.sourceInputUrl = '';
    state.sourceInputApiKey = '';
    saveSources();
  },

  'remove-source': ({ index }) => {
    const i = Number(index);

    if (isNaN(i) || i < 0 || i >= state.sources.length) {
      return;
    }

    state.sources.splice(i, 1);
    saveSources();
  },

  'cycle-setting': ({ section, key }) => {
    const list = SETTINGS_OPTIONS[section] || [];

    let option = null;
    for (const candidate of list) {
      if (candidate.key === key) {
        option = candidate;
        break;
      }
    }
    if (!option) {
      return;
    }

    let current = state.settings[key];
    if (current === undefined || current === null) {
      current = option.default;
    }

    const nextIndex = (option.options.indexOf(current) + 1) % option.options.length;
    state.settings[key] = option.options[nextIndex];
  },
};

export function render() {
  const active = document.activeElement;

  let activeId = null;
  let selStart;
  let selEnd;

  if (active) {
    activeId = active.id;
    selStart = active.selectionStart;
    selEnd = active.selectionEnd;
  }

  const screen = screens[state.screen];

  let html;
  if (screen) {
    html = screen(state);
  } else {
    html = stub(state.screen);
  }

  if (state.picker && state.screen !== 'player') {
    html += picker(state);
  }

  root.innerHTML = html;

  if (!activeId) {
    return;
  }

  const el = document.getElementById(activeId);
  if (!el) {
    return;
  }

  el.focus();

  if (typeof selStart === 'number' && typeof selEnd === 'number' && el.setSelectionRange) {
    el.setSelectionRange(selStart, selEnd);
  }
}

root.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) {
    return;
  }

  const action = actions[el.dataset.action];
  if (!action) {
    return;
  }

  const result = action(el.dataset, event, el);
  if (result !== false) {
    render();
  }
});

root.addEventListener('input', (event) => {
  const target = event.target;
  if (!target.dataset) {
    return;
  }

  const action = target.dataset.action;

  if (action === 'search-input') {
    state.query = target.value;
    scheduleSearch(state.query);
  } else if (action === 'source-url-input') {
    state.sourceInputUrl = target.value;
  } else if (action === 'source-apikey-input') {
    state.sourceInputApiKey = target.value;
  } else if (action === 'set-source-kind') {
    state.sourceKind = target.value;
    state.sourceInputApiKey = '';
    render();
  }
});

window.addEventListener('keydown', (event) => {
  if (state.screen === 'player') {
    if (event.code === 'Space') {
      event.preventDefault();
      togglePlayerPlayback();
    } else if (event.code === 'Escape') {
      event.preventDefault();
      actions['close-player']();
      render();
    }
    return;
  }

  if (!state.picker) {
    return;
  }

  if (event.code === 'Enter' && !state.picker.loading) {
    event.preventDefault();

    const items = state.picker.items || [];

    let best = null;
    for (const item of items) {
      if (item.isBest) {
        best = item;
        break;
      }
    }
    if (!best) {
      best = items[0];
    }

    if (best) {
      actions['select-stream']({ streamId: best.id });
      render();
    }
  } else if (event.code === 'Escape') {
    event.preventDefault();
    actions['close-picker']();
    render();
  }
});

let mouseTimer = null;

window.addEventListener('mousemove', () => {
  if (state.screen !== 'player' || !state.player) {
    return;
  }

  if (!state.player.chromeVisible) {
    state.player.chromeVisible = true;
    render();
  }

  clearTimeout(mouseTimer);
  mouseTimer = setTimeout(() => {
    if (state.screen === 'player' && state.player) {
      state.player.chromeVisible = false;
      render();
    }
  }, CHROME_HIDE_DELAY);
});

mountPlayerVideo();
render();

api.getSettings().then((stored) => {
  if (!stored) {
    return;
  }

  if (Array.isArray(stored.library)) {
    state.library = stored.library;
  }
  if (Array.isArray(stored.sources)) {
    state.sources = stored.sources;
  }
  if (stored.settings) {
    state.settings = stored.settings;
  }

  render();
});

api.getCatalogs().then((result) => {
  state.catalogRows = result.rows || [];
  state.catalogs = result.catalogs || {};

  const seen = new Set();
  const everything = [];

  for (const key of Object.keys(state.catalogs)) {
    for (const item of state.catalogs[key]) {
      const id = String(item.id);
      if (seen.has(id)) {
        continue;
      }

      seen.add(id);
      everything.push(item);
    }
  }

  state.catalog = everything;
  state.loading = false;
  render();
});

window.__leray = { state, render };

//review: this is what we did here: app.js runs the whole window. It works on one simple
//idea. There is a single state object holding everything the app currently knows, and one
//render function that turns that state into html and drops it into the page. Nothing else
//touches the page directly.
//Clicks are handled in one place too. Every button in the app carries a data-action label,
//and the one click listener here looks that name up in the actions list and runs it, then
//redraws. An action returning false means do not redraw, which is used for things like the
//row arrows that would otherwise undo their own scrolling.
//The rest is the odds and ends a real app needs: a short delay before searching so it does
//not fire on every keystroke, checks that a slow reply still belongs to the screen you are
//on before showing it, hiding the player controls after a couple of seconds of stillness,
//and asking the download for its speed once a second while something is playing.
