import { esc } from '../util.js';

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatTime(seconds = 0) {
  const whole = Math.floor(seconds);

  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;

  if (hours > 0) {
    return hours + ':' + pad(minutes) + ':' + pad(secs);
  }
  return minutes + ':' + pad(secs);
}

function valueOr(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

function loadingState(item, p) {
  const peers = p.peers;

  let status = 'Connecting to swarm&hellip;';

  if (peers === 1) {
    status = 'Connecting to swarm&hellip; 1 peer found';
  } else if (peers > 0) {
    status = 'Connecting to swarm&hellip; ' + peers + ' peers found';
  } else if (peers === 0) {
    status = 'Connecting to swarm&hellip; no peers found yet';
  }

  return `
    <div class="player">
      <div class="player__status">
        <div class="player__loadbar"><div class="player__loadbar-fill"></div></div>
        <p class="player__status-text">Starting ${esc(item.title || 'stream')}</p>
        <p class="player__status-sub">${status}</p>
      </div>
      <button class="player__back player__back--overlay" data-action="close-player">&lsaquo; Back</button>
    </div>`;
}

function errorState(item, message) {
  return `
    <div class="player">
      <div class="player__status">
        <h2 class="player__status-title">Playback failed</h2>
        <p class="player__status-text">${esc(message)}</p>
        <button class="btn" data-action="close-player">Back to ${esc(item.title || 'title')}</button>
      </div>
    </div>`;
}

export function player(state) {
  const p = state.player || {};
  const item = p.item || { title: 'Now playing' };
  const stream = p.stream || { name: '', quality: '' };

  if (p.loading) {
    return loadingState(item, p);
  }
  if (p.error) {
    return errorState(item, p.error);
  }

  const playing = valueOr(p.playing, false);
  const currentTime = valueOr(p.currentTime, 0);
  const duration = valueOr(p.duration, 0);
  const buffered = valueOr(p.buffered, 0);
  const chromeVisible = valueOr(p.chromeVisible, true);
  const subtitles = valueOr(p.subtitles, false);

  let progressPct = 0;
  if (duration > 0) {
    progressPct = (currentTime / duration) * 100;
  }

  let hideChromeClass = '';
  if (!chromeVisible) {
    hideChromeClass = ' player--hide-chrome';
  }

  let subtitleLine = '';
  if (subtitles) {
    subtitleLine = `<div class="player__subtitle-text">[Subtitles Enabled — Standard Audio Track]</div>`;
  }

  let stats = '';
  if (p.speed) {
    stats += `<span class="player__stat"><strong>${esc(p.speed)}</strong></span>`;
  }
  if (p.peers !== undefined && p.peers !== null) {
    stats += `<span class="player__stat">${p.peers} peers</span>`;
  }
  if (p.buffering) {
    stats += `<span class="player__stat player__stat--live">Buffering&hellip;</span>`;
  }

  let playIcon = '&#9654;&#65038;';
  let playLabel = 'Play';
  if (playing) {
    playIcon = '&#10074;&#10074;';
    playLabel = 'Pause';
  }

  let subtitleButtonClass = '';
  if (subtitles) {
    subtitleButtonClass = ' player__btn--active';
  }

  return `
    <div class="player${hideChromeClass}" id="player-container">
      ${subtitleLine}

      <div class="player__top">
        <button class="player__back" data-action="close-player" aria-label="Exit player">
          &lsaquo; Back
        </button>
        <div class="player__title-group">
          <h2 class="player__title">${esc(item.title)}</h2>
          <span class="player__stream-label">${esc(stream.name || stream.quality || '')}</span>
        </div>
        <div class="player__stats">${stats}</div>
      </div>

      <div class="player__bottom">
        <div class="player__scrub-wrap" data-action="seek-player">
          <div class="player__scrub-track">
            <div class="player__scrub-buffered" style="width: ${buffered}%"></div>
            <div class="player__scrub-played" style="width: ${progressPct}%"></div>
            <div class="player__scrub-handle" style="left: ${progressPct}%"></div>
          </div>
        </div>

        <div class="player__controls">
          <div class="player__left-controls">
            <button class="player__btn" data-action="toggle-play" aria-label="${playLabel}">
              ${playIcon}
            </button>
            <div class="player__time">
              <span>${formatTime(currentTime)}</span>
              <span class="player__time-sep">/</span>
              <span>${formatTime(duration)}</span>
            </div>
          </div>

          <div class="player__right-controls">
            <button class="player__btn${subtitleButtonClass}" data-action="toggle-subtitles">
              CC
            </button>
            <button class="player__btn" data-action="toggle-fullscreen" aria-label="Fullscreen">
              &#x26F6;
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

//review: this is what we did here: player.js draws the controls you see over the film. It
//does not contain the video itself, that is player-video.js, this is only the bar along the
//top and the controls along the bottom drawn on top of it.
//There are three different things it can show. While a torrent is still finding people to
//download from you get the starting screen with the live peer count, so you can tell
//something is happening rather than staring at a frozen spinner. If it fails you get a plain
//message and a way back. Otherwise you get the normal controls, which fade out on their own
//while you are watching and come back when you move the mouse.
