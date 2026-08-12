import { findTitle } from '../mock/catalog.js';
import { header } from '../components/header.js';
import { esc, meta, art } from '../util.js';

function currentTitle(state) {
  if (state.detail && String(state.detail.id) === String(state.detailId)) {
    return state.detail;
  }

  const catalog = state.catalog || [];
  for (const item of catalog) {
    if (String(item.id) === String(state.detailId)) {
      return item;
    }
  }

  return findTitle(state.detailId);
}

function detailSkeleton() {
  return `
    <div class="detail">
      <div class="detail__hero">
        <div class="detail__art shimmer"></div>
        <div class="detail__body">
          <button class="detail__back" data-action="back">&lsaquo; Back</button>
        </div>
      </div>
    </div>`;
}

function imdbBadge(item) {
  if (!item.imdbId) {
    return '';
  }

  const href = 'https://www.imdb.com/title/' + esc(item.imdbId) + '/';

  let label = '';
  if (item.imdbRating) {
    label = `<strong class="detail__imdb-score">${esc(item.imdbRating)}</strong>`;

    if (item.imdbVotes) {
      label += `<span class="detail__imdb-votes">${esc(item.imdbVotes)} votes</span>`;
    }
  }

  return `
    <a class="detail__imdb" href="${href}" target="_blank" rel="noopener noreferrer"
       title="View on IMDb">
      <span class="detail__imdb-mark">IMDb</span>${label}
    </a>`;
}

function episodeRow(state, ep) {
  return `
    <div class="episode-row" data-action="open-picker" data-id="${esc(state.detailId)}" data-episode="${esc(ep.num)}">
      <span class="episode-row__num">${esc(ep.num)}</span>
      <div class="episode-row__still" style="background:${art(ep.still, ep.bg)}">
        <span class="episode-row__play">&#9654;&#65038;</span>
      </div>
      <div class="episode-row__info">
        <h4 class="episode-row__title">${esc(ep.title)}</h4>
        <p class="episode-row__blurb">${esc(ep.blurb)}</p>
      </div>
      <span class="episode-row__length">${esc(ep.length)}</span>
    </div>`;
}

function episodesSection(state, item) {
  const currentSeason = state.season || 1;
  const seasonCount = item.seasons || 1;
  const episodes = state.episodes || [];

  let seasonButtons = '';
  for (let season = 1; season <= seasonCount; season++) {
    let activeClass = '';
    if (season === currentSeason) {
      activeClass = ' detail__season--active';
    }

    seasonButtons += `<button class="detail__season${activeClass}" data-action="select-season" data-season="${season}">Season ${season}</button>`;
  }

  let body = '';

  if (state.episodesLoading) {
    for (let i = 0; i < 4; i++) {
      body += '<div class="episode-row episode-row--skeleton shimmer"></div>';
    }
  } else if (episodes.length === 0) {
    body = `<p class="detail__episodes-empty">No episodes listed for this season.</p>`;
  } else {
    for (const ep of episodes) {
      body += episodeRow(state, ep);
    }
  }

  return `
    <div class="detail__episodes">
      <div class="detail__seasons">${seasonButtons}</div>
      <div class="detail__episode-list">${body}</div>
    </div>`;
}

export function detail(state) {
  const item = currentTitle(state);
  if (!item) {
    return header(state) + detailSkeleton();
  }

  let inLibrary = false;
  for (const saved of state.library) {
    if (String(saved.id) === String(item.id)) {
      inLibrary = true;
      break;
    }
  }

  let libraryLabel = '+ My Library';
  if (inLibrary) {
    libraryLabel = '&check; In Library';
  }

  let genre = '';
  if (item.genre) {
    genre = `<span class="detail__genre">${esc(item.genre)}</span>`;
  }

  let quality = '';
  if (item.quality) {
    quality = `<span class="detail__quality">${esc(item.quality)}</span>`;
  }

  let rating = '';
  if (item.rating) {
    rating = `<span class="detail__rating">&#9733; ${esc(item.rating)}</span>`;
  }

  let director = '';
  if (item.director) {
    director = `<div><span class="detail__label">Director:</span> ${esc(item.director)}</div>`;
  }

  let cast = '';
  if (item.cast) {
    cast = `<div><span class="detail__label">Cast:</span> ${esc(item.cast)}</div>`;
  }

  let episodes = '';
  if (item.type === 'tv') {
    episodes = episodesSection(state, item);
  }

  return `
    ${header(state)}
    <div class="detail">
      <div class="detail__hero">
        <div class="detail__art" style="background:${art(item.backdrop, item.bg)}"></div>
        <div class="detail__scrim-left"></div>
        <div class="detail__scrim-bottom"></div>

        <div class="detail__body">
          <button class="detail__back" data-action="back">&lsaquo; Back</button>

          <div class="detail__meta-row">
            ${genre}
            ${quality}
            ${rating}
            ${imdbBadge(item)}
          </div>

          <h1 class="detail__title">${esc(item.title)}</h1>

          <div class="detail__meta">${esc(meta(item.year, item.runtime))}</div>

          <p class="detail__synopsis">${esc(item.synopsis)}</p>

          <div class="detail__credits">
            ${director}
            ${cast}
          </div>

          <div class="detail__actions">
            <button class="btn btn--lg" data-action="open-picker" data-id="${esc(item.id)}">
              <span class="detail__play-icon">&#9654;&#65038;</span> Play
            </button>
            <button class="btn btn--lg btn--ghost" data-action="toggle-library" data-id="${esc(item.id)}">
              ${libraryLabel}
            </button>
          </div>
        </div>
      </div>

      ${episodes}
    </div>`;
}

//review: this is what we did here: detail.js draws the page for a single film or series.
//It shows whatever it already knows straight away, using the basic information from the row
//you clicked, then fills in the runtime, director, cast and IMDb score once the fuller
//request comes back, so the page never sits blank waiting.
//Almost every part is optional, because not every film has a rating or a known director, so
//each piece is built separately and left out entirely when there is nothing to show rather
//than printing an empty label. For a series it also lists the episodes with a button per
//season, and clicking any episode opens the source picker for that episode.
