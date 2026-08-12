import { CATALOG } from '../mock/catalog.js';
import { header } from '../components/header.js';
import { poster } from '../components/poster.js';
import { posterRow, skeletonRows } from '../components/poster-row.js';
import { esc, meta, art } from '../util.js';

const LIBRARY_EMPTY = {
  title: 'Your library is empty',
  body: 'Anything you add from a title page collects here.',
  cta: 'Browse titles',
  screen: 'search',
};

function catalogOf(state) {
  if (state.catalog && state.catalog.length > 0) {
    return state.catalog;
  }
  return [];
}

function continueWatching(state) {
  const catalog = catalogOf(state);
  const started = [];

  for (const item of catalog) {
    const progress = item.progress || 0;
    if (progress > 0) {
      started.push(item);
    }
  }

  return started;
}

function heroTitle(state) {
  if (state.screen === 'library' && state.library.length > 0) {
    return state.library[0];
  }

  const watching = continueWatching(state);

  if (watching.length === 0) {
    const catalog = catalogOf(state);
    return catalog[0] || CATALOG[0];
  }

  let furthest = watching[0];
  for (const item of watching) {
    const progress = item.progress || 0;
    const bestSoFar = furthest.progress || 0;

    if (progress > bestSoFar) {
      furthest = item;
    }
  }

  return furthest;
}

function minutesLeft(item) {
  if (!item.progress) {
    return null;
  }

  const match = /(?:(\d+)h)?\s*(?:(\d+)m)?/.exec(item.runtime || '');
  if (!match) {
    return null;
  }

  const hours = Number(match[1] || 0);
  const mins = Number(match[2] || 0);
  const total = hours * 60 + mins;

  if (!total) {
    return null;
  }

  const remaining = Math.floor((total * (100 - item.progress)) / 100);
  return remaining + 'm';
}

function hero(state) {
  const item = heroTitle(state);
  const resuming = item.progress > 0;
  const left = minutesLeft(item);

  let kicker = esc(item.genre || 'Featured');
  if (resuming && left) {
    kicker = 'Continue watching &middot; ' + left + ' left';
  }

  let ratingText = '';
  if (item.rating) {
    ratingText = '★ ' + item.rating;
  }

  let playLabel = 'Play';
  if (resuming) {
    playLabel = 'Resume';
  }

  return `
    <div class="hero">
      <div class="hero__art" style="background:${art(item.backdrop, item.bg)}"></div>
      <div class="hero__scrim-left"></div>
      <div class="hero__scrim-bottom"></div>
      <div class="hero__body">
        <div class="kicker">${kicker}</div>
        <h1 class="hero__title">${esc(item.title)}</h1>
        <div class="hero__meta">${esc(meta(item.year, item.runtime, item.director, ratingText))}</div>
        <p class="hero__synopsis">${esc(item.synopsis)}</p>
        <div class="hero__actions">
          <button class="btn btn--lg" data-action="play" data-id="${esc(item.id)}">
            <span class="hero__play-icon">&#9654;&#65038;</span>${playLabel}
          </button>
          <button class="btn btn--lg btn--ghost" data-action="open-detail" data-id="${esc(item.id)}">
            More info
          </button>
        </div>
      </div>
    </div>`;
}

function rows(state) {
  const list = [];

  list.push({
    key: 'continue',
    title: 'Continue watching',
    items: continueWatching(state),
    showProgress: true,
  });

  const catalogRows = state.catalogRows || [];
  for (const row of catalogRows) {
    let items = [];
    if (state.catalogs && state.catalogs[row.key]) {
      items = state.catalogs[row.key];
    }

    list.push({ key: row.key, title: row.title, items });
  }

  list.push({
    key: 'library',
    title: 'My Library',
    items: state.library.slice(0, 20),
    empty: LIBRARY_EMPTY,
  });

  let html = '';
  for (const row of list) {
    if (row.items.length > 0 || row.empty) {
      html += posterRow(row);
    }
  }

  return `<div class="rows">${html}</div>`;
}

function countLabel(films, series) {
  const parts = [];

  if (films === 1) {
    parts.push('1 film');
  } else if (films > 1) {
    parts.push(films + ' films');
  }

  if (series > 0) {
    parts.push(series + ' series');
  }

  return parts.join('  ·  ');
}

function library(state) {
  const items = state.library;

  if (items.length === 0) {
    return `
      <div class="library">
        <header class="library__head">
          <h1 class="library__title">My Library</h1>
        </header>
        <div class="library__empty">
          <h2 class="library__empty-title">Nothing saved yet.</h2>
          <p class="library__empty-text">
            Add a title from its page and it collects here, ready to pick up later.
          </p>
          <button class="btn" data-action="go" data-screen="home">Browse titles</button>
        </div>
      </div>`;
  }

  let films = 0;
  for (const item of items) {
    if (item.type !== 'tv') {
      films = films + 1;
    }
  }
  const series = items.length - films;

  let cards = '';
  for (const item of items) {
    cards += poster(item);
  }

  return `
    <div class="library">
      <header class="library__head">
        <h1 class="library__title">My Library</h1>
        <span class="library__count">${esc(countLabel(films, series))}</span>
      </header>
      <div class="library__grid">${cards}</div>
    </div>`;
}

function nothingToShow() {
  return `
    <div class="empty-screen">
      <div class="empty-screen__glow"></div>
      <div class="empty-screen__body">
        <div class="kicker">Nothing to show</div>
        <h1 class="empty-screen__title">Empty<br />screen.</h1>
        <p class="empty-screen__text">
          No metadata came back. Check that TMDB credentials are set in
          <code>.env</code>, then try again.
        </p>
        <button class="btn" data-action="go" data-screen="settings">Open settings</button>
      </div>
    </div>`;
}

export function home(state) {
  if (state.screen === 'library') {
    return header(state) + library(state);
  }

  if (state.loading) {
    return header(state) + `<div class="home">${hero(state)}${skeletonRows()}</div>`;
  }

  if (catalogOf(state).length === 0) {
    return header(state) + nothingToShow();
  }

  return header(state) + `<div class="home">${hero(state)}${rows(state)}</div>`;
}

//review: this is what we did here: home.js draws two screens that share the same layout,
//Home and My Library. Home is the big banner at the top plus the rows of posters beneath it.
//The banner picks whatever you are furthest through if you started something, otherwise the
//first film in the list. Rows that have nothing in them are left out, so you never see an
//empty heading, with My Library the one exception since its empty message is the prompt that
//tells you what the row is for. While the films are still loading it shows grey placeholder
//rows, and if nothing at all comes back it explains that the TMDB key is probably missing
//rather than just showing a blank page.
