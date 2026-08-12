import { esc } from '../util.js';

function speedMeter(bars = 4) {
  let html = '';

  for (let i = 0; i < 4; i++) {
    let activeClass = '';
    if (i < bars) {
      activeClass = ' picker__bar--active';
    }
    html += `<span class="picker__bar${activeClass}"></span>`;
  }

  return html;
}

function streamRow(stream) {
  let bestClass = '';
  if (stream.isBest) {
    bestClass = ' picker__row--best';
  }

  return `
    <button class="picker__row${bestClass}" data-action="select-stream" data-stream-id="${esc(stream.id)}">
      <span class="picker__quality">${esc(stream.quality)}</span>
      <div class="picker__release">
        <div class="picker__name">${esc(stream.name)}</div>
        <span class="picker__group">${esc(stream.group)}</span>
      </div>
      <span class="picker__size">${esc(stream.size)}</span>
      <div class="picker__speed" title="Speed rating: ${stream.speed}/4">
        ${speedMeter(stream.speed)}
      </div>
    </button>`;
}

export function picker(state) {
  if (!state.picker) {
    return '';
  }

  const loading = state.picker.loading;
  const items = state.picker.items || [];

  let content = '';

  if (loading) {
    content = `
      <div class="picker__searching">
        <div class="picker__spinner shimmer"></div>
        <div class="picker__status">Searching sources...</div>
      </div>`;
  } else if (items.length === 0) {
    content = `
      <div class="picker__empty">
        <h3 class="picker__empty-title">No sources found</h3>
        <p class="picker__empty-text">No working streams were returned for this title.</p>
      </div>`;
  } else {
    let rows = '';
    for (const stream of items) {
      rows += streamRow(stream);
    }
    content = `<div class="picker__list">${rows}</div>`;
  }

  return `
    <div class="picker-backdrop" data-action="close-picker">
      <div class="picker" data-action="noop">
        <header class="picker__head">
          <h3 class="picker__title">Select Source</h3>
          <button class="picker__close" data-action="close-picker" aria-label="Close">&times;</button>
        </header>
        ${content}
      </div>
    </div>`;
}

//review: this is what we did here: picker.js draws the panel that slides up when you press
//Play, listing every copy of the film your sources found. It has three states: searching,
//nothing found, or the list itself. Each row shows quality, the release name, the size and
//a four bar speed meter, and the best one is marked so it stands out.
//One small thing worth knowing: the dark area behind the panel closes it when clicked, so
//the panel itself carries data-action="noop" to swallow clicks and stop a click on the panel
//from counting as a click on the background and closing it by accident.
