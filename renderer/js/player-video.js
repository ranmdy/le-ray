import { state, render } from './app.js';

let el = null;
let currentUrl = null;

function updatePlayer(changes) {
  if (!state.player) {
    return;
  }

  Object.assign(state.player, changes);
  render();
}

export function mountPlayerVideo() {
  el = document.getElementById('player-video');
  if (!el) {
    return;
  }

  el.addEventListener('loadedmetadata', () => {
    updatePlayer({ duration: el.duration || 0 });
  });

  el.addEventListener('timeupdate', () => {
    updatePlayer({ currentTime: el.currentTime });
  });

  el.addEventListener('play', () => {
    updatePlayer({ playing: true });
  });

  el.addEventListener('pause', () => {
    updatePlayer({ playing: false });
  });

  el.addEventListener('ended', () => {
    updatePlayer({ playing: false });
  });

  el.addEventListener('waiting', () => {
    updatePlayer({ buffering: true });
  });

  el.addEventListener('playing', () => {
    updatePlayer({ buffering: false });
  });

  el.addEventListener('error', () => {
    updatePlayer({ loading: false, error: 'Playback failed. The source may be unreachable.' });
  });

  el.addEventListener('progress', () => {
    if (!el.duration) {
      return;
    }
    if (el.buffered.length === 0) {
      return;
    }

    const loadedUpTo = el.buffered.end(el.buffered.length - 1);
    let percent = (loadedUpTo / el.duration) * 100;
    if (percent > 100) {
      percent = 100;
    }

    updatePlayer({ buffered: percent });
  });
}

export function showPlayerVideo(url, posterUrl) {
  if (!el || !url) {
    return;
  }

  el.hidden = false;

  if (posterUrl) {
    el.poster = posterUrl;
  }

  if (url === currentUrl) {
    return;
  }

  currentUrl = url;
  el.src = url;
  el.load();
  el.play().catch(() => {});
}

export function hidePlayerVideo() {
  if (!el) {
    return;
  }

  el.pause();
  el.removeAttribute('src');
  el.load();
  el.hidden = true;
  currentUrl = null;
}

export function togglePlayerPlayback() {
  if (!el) {
    return;
  }

  if (el.paused) {
    el.play().catch(() => {});
  } else {
    el.pause();
  }
}

export function seekPlayerTo(seconds) {
  if (!el) {
    return;
  }
  if (!Number.isFinite(seconds)) {
    return;
  }

  let target = seconds;
  if (target < 0) {
    target = 0;
  }

  el.currentTime = target;
}

//review: this is what we did here: player-video.js looks after the actual video element.
//Every other screen is redrawn from scratch whenever anything changes, which is fine for
//buttons and text but would be a disaster for a playing video, since rebuilding it would
//restart the film every time you clicked anything. So the video tag lives outside all that,
//sitting in index.html permanently, and this file is the only thing that touches it.
//It works the other way round too. Rather than guessing, it listens to the video and copies
//what is really happening back into the app, so the play icon, the clock and the progress
//bar always match reality, including when the browser refuses to autoplay.
