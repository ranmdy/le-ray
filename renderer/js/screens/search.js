import { CATALOG } from '../mock/catalog.js';
import { header } from '../components/header.js';
import { poster } from '../components/poster.js';
import { esc } from '../util.js';

function resultsToShow(state, query) {
  if (query) {
    return state.results;
  }

  if (state.catalog && state.catalog.length > 0) {
    return state.catalog;
  }

  return CATALOG;
}

function skeletonGrid() {
  let cells = '';

  for (let i = 0; i < 10; i++) {
    cells += '<div class="search__skeleton shimmer"></div>';
  }

  return `<div class="search__grid">${cells}</div>`;
}

export function search(state) {
  const query = (state.query || '').trim();
  const results = resultsToShow(state, query);

  const stillLoading = state.searching || (query && results === null);

  let content = '';

  if (stillLoading) {
    content = skeletonGrid();
  } else if (results.length > 0) {
    let cards = '';
    for (const item of results) {
      cards += poster(item);
    }
    content = `<div class="search__grid">${cards}</div>`;
  } else {
    content = `
      <div class="search__empty">
        <h2 class="search__empty-title">Nothing here.</h2>
        <p class="search__empty-text">No titles match &ldquo;${esc(state.query)}&rdquo;</p>
      </div>`;
  }

  let clearButton = '';
  if (state.query) {
    clearButton = `<button class="search__clear" data-action="clear-search" aria-label="Clear search">&times;</button>`;
  }

  return `
    ${header(state)}
    <div class="search">
      <div class="search__header">
        <input
          id="search-input"
          class="search__input"
          type="text"
          placeholder="Search titles, directors, genres, cast..."
          value="${esc(state.query || '')}"
          data-action="search-input"
          autofocus
        />
        ${clearButton}
      </div>
      ${content}
    </div>`;
}

//review: this is what we did here: search.js draws the search screen. With the box empty it
//just shows everything already loaded for Home, so the page is never blank. Once you type,
//it shows whatever came back for that search, and while the request is still travelling it
//shows ten grey placeholder shapes so the layout does not jump around when the real posters
//land. If a search genuinely finds nothing it says so and repeats what you typed. This file
//only draws; the typing itself is handled in app.js, which waits a moment after your last
//keypress before searching so it is not firing off a request for every single letter.
