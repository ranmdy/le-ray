import { esc } from '../util.js';
import { poster } from './poster.js';

export function posterRow(row) {
  let body = '';
  let arrows = '';

  if (row.items.length > 0) {
    body = scroller(row);
    arrows = `
      <div class="row__arrows">
        <button class="row__arrow" aria-label="Scroll left"
                data-action="scroll-row" data-row="${esc(row.key)}" data-dir="-1">&lsaquo;</button>
        <button class="row__arrow" aria-label="Scroll right"
                data-action="scroll-row" data-row="${esc(row.key)}" data-dir="1">&rsaquo;</button>
      </div>`;
  } else {
    body = emptyCard(row.empty);
  }

  return `
    <section class="row">
      <header class="row__head">
        <h2 class="row__title">${esc(row.title)}</h2>
        ${arrows}
      </header>
      ${body}
    </section>`;
}

function scroller(row) {
  let cards = '';

  for (const item of row.items) {
    cards += poster(item, row.showProgress);
  }

  return `<div class="row__scroll scroll-x" data-row="${esc(row.key)}">${cards}</div>`;
}

function emptyCard(empty) {
  if (!empty) {
    return '';
  }

  return `
    <div class="row__empty">
      <h3 class="row__empty-title">${esc(empty.title)}</h3>
      <p class="row__empty-body">${esc(empty.body)}</p>
      <button class="btn" data-action="go" data-screen="${esc(empty.screen)}">${esc(empty.cta)}</button>
    </div>`;
}

export function skeletonRows(count = 2, cells = 7) {
  let oneRow = '<div class="skeleton__row"><div class="skeleton__label"></div><div class="skeleton__cells">';

  for (let i = 0; i < cells; i++) {
    oneRow += '<div class="skeleton__cell shimmer"></div>';
  }

  oneRow += '</div></div>';

  let allRows = '';
  for (let i = 0; i < count; i++) {
    allRows += oneRow;
  }

  return `<div class="skeleton">${allRows}</div>`;
}

//review: this is what we did here: poster-row.js draws one titled row of posters on Home,
//like "Trending now". If the row has films it lays them out in a strip you can scroll
//sideways and adds the little left and right arrows. If the row is empty, for example your
//library before you have saved anything, it shows a short message and a button instead,
//and no arrows since there is nothing to scroll. skeletonRows at the bottom draws the grey
//placeholder shapes you see for a moment while the real posters are still loading, so the
//page does not jump about once they arrive.
