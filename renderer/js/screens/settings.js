import { SETTINGS_OPTIONS } from '../mock/settings.js';
import { header } from '../components/header.js';
import { esc } from '../util.js';

const SECTIONS = ['Sources', 'Playback', 'Appearance', 'Storage'];

const SOURCE_KIND_LABEL = {
  addon: 'Stremio addon',
  prowlarr: 'Prowlarr',
  jackett: 'Jackett',
};

const URL_PLACEHOLDER = {
  addon: 'https://example.com/manifest.json',
  prowlarr: 'http://localhost:9696',
  jackett: 'http://localhost:9117',
};

function sourceCard(source, index) {
  let name = source.name;
  if (!name) {
    name = 'Source #' + (index + 1);
  }

  let kindLabel = SOURCE_KIND_LABEL[source.kind];
  if (!kindLabel) {
    kindLabel = SOURCE_KIND_LABEL.addon;
  }

  return `
    <div class="source-card">
      <div class="source-card__status-dot" title="Active"></div>
      <div class="source-card__info">
        <div class="source-card__name">${esc(name)}</div>
        <div class="source-card__url">${esc(source.url)}</div>
      </div>
      <span class="source-card__kind">${esc(kindLabel)}</span>
      <button class="btn btn--sm btn--ghost" data-action="remove-source" data-index="${index}">Remove</button>
    </div>`;
}

function sourcesPanel(state) {
  const sources = state.sources || [];
  const kind = state.sourceKind || 'addon';

  let list = '';
  if (sources.length === 0) {
    list = `
      <div class="sources__empty">
        <p class="sources__empty-text">No sources connected yet. Add one below.</p>
      </div>`;
  } else {
    for (let i = 0; i < sources.length; i++) {
      list += sourceCard(sources[i], i);
    }
  }

  let kindOptions = '';
  for (const value of Object.keys(SOURCE_KIND_LABEL)) {
    let selected = '';
    if (value === kind) {
      selected = ' selected';
    }
    kindOptions += `<option value="${value}"${selected}>${SOURCE_KIND_LABEL[value]}</option>`;
  }

  let apiKeyInput = '';
  if (kind !== 'addon') {
    apiKeyInput = `
      <input
        id="source-apikey-input"
        class="sources__input sources__input--key"
        type="password"
        placeholder="API key"
        value="${esc(state.sourceInputApiKey || '')}"
        data-action="source-apikey-input"
      />`;
  }

  return `
    <div class="settings__section-head">
      <h3 class="settings__section-title">Sources</h3>
      <p class="settings__section-desc">
        Connect a Stremio addon, or your own self-hosted Prowlarr or Jackett instance.
        LE-RAY ships empty by design.
      </p>
    </div>

    <div class="sources__add-form">
      <select id="source-kind-select" class="sources__select" data-action="set-source-kind">
        ${kindOptions}
      </select>
      <input
        id="source-url-input"
        class="sources__input"
        type="url"
        placeholder="${esc(URL_PLACEHOLDER[kind])}"
        value="${esc(state.sourceInputUrl || '')}"
        data-action="source-url-input"
      />
      ${apiKeyInput}
      <button class="btn" data-action="add-source">Add source</button>
    </div>

    <div class="sources__list">
      ${list}
    </div>`;
}

function optionsPanel(state, section) {
  const options = SETTINGS_OPTIONS[section] || [];

  if (!state.settings) {
    state.settings = {};
  }

  let rows = '';

  for (const option of options) {
    let value = state.settings[option.key];
    if (value === undefined || value === null) {
      value = option.default;
    }

    rows += `
      <div class="setting-row">
        <div class="setting-row__info">
          <h4 class="setting-row__label">${esc(option.label)}</h4>
          <p class="setting-row__help">${esc(option.help)}</p>
        </div>
        <button class="btn btn--ghost setting-row__cycle" data-action="cycle-setting" data-section="${esc(section)}" data-key="${esc(option.key)}">
          ${esc(value)}
        </button>
      </div>`;
  }

  return `
    <div class="settings__section-head">
      <h3 class="settings__section-title">${esc(section)}</h3>
    </div>
    <div class="settings__options-list">${rows}</div>`;
}

export function settings(state) {
  const currentSection = state.settingsSection || 'Sources';

  let navItems = '';
  for (const section of SECTIONS) {
    let activeClass = '';
    if (section === currentSection) {
      activeClass = ' settings__nav-item--active';
    }

    navItems += `<button class="settings__nav-item${activeClass}" data-action="select-settings-section" data-section="${section}">${esc(section)}</button>`;
  }

  let panelContent = '';
  if (currentSection === 'Sources') {
    panelContent = sourcesPanel(state);
  } else {
    panelContent = optionsPanel(state, currentSection);
  }

  return `
    ${header(state)}
    <div class="settings">
      <aside class="settings__sidebar">
        <h2 class="settings__sidebar-title">Settings</h2>
        <nav class="settings__nav">${navItems}</nav>
      </aside>
      <main class="settings__panel">
        ${panelContent}
      </main>
    </div>`;
}

//review: this is what we did here: settings.js draws the settings screen, a list of sections
//down the left and the chosen one on the right. Sources is the one that matters, because
//without a source nothing will play. You pick what kind you are adding from the dropdown,
//and the API key box only appears for Prowlarr and Jackett since a Stremio addon does not
//need one. Already added sources are listed below with a Remove button each.
//The other three sections are simpler: each setting is one button showing its current value,
//and clicking it moves to the next choice, so there is no separate save step.
