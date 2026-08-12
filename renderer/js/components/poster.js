import { esc, meta, art } from '../util.js';

export function poster(item, showProgress = false) {
  let badge = '';
  if (item.quality) {
    badge = `<span class="poster__quality">${esc(item.quality)}</span>`;
  } else if (item.rating) {
    badge = `<span class="poster__rating">&#9733; ${esc(item.rating)}</span>`;
  }

  let runtime = item.runtime;
  if (item.type === 'tv' && !runtime) {
    runtime = 'Series';
  }
  const line = meta(item.year, runtime);

  let genre = '';
  if (item.genre) {
    genre = `<span class="poster__genre">${esc(item.genre)}</span>`;
  }

  let progressBar = '';
  if (showProgress && item.progress > 0) {
    progressBar = `
      <span class="poster__track">
        <span class="poster__progress" style="width:${item.progress}%"></span>
      </span>`;
  }

  let type = item.type;
  if (!type) {
    type = 'movie';
  }

  return `
    <button class="poster" data-action="open-detail" data-id="${esc(item.id)}"
            data-type="${esc(type)}" title="${esc(item.title)}">
      <span class="poster__art" style="background:${art(item.poster, item.bg)}">
        <span class="poster__scrim"></span>
        ${badge}
        <span class="poster__text">
          <span class="poster__title">${esc(item.title)}</span>
          <span class="poster__meta">${esc(line)}</span>
          ${genre}
        </span>
        ${progressBar}
      </span>
    </button>`;
}

//review: this is what we did here: poster.js draws one film or series card. The same
//function is used for the rows on Home, the search results grid and the library grid, so
//a card looks identical everywhere. It builds each optional bit separately before putting
//the card together: the corner badge shows quality if we know it, otherwise the star
//rating, otherwise nothing; the genre line is skipped when the genre is unknown; and the
//little amber progress bar along the bottom only appears for something you part watched.
//The whole card is a button carrying the film id and type, so the click handler in app.js
//knows which title to open.
