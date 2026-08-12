export function esc(value) {
  let text = value;
  if (text === undefined || text === null) {
    text = '';
  }

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function meta(...parts) {
  const kept = [];

  for (const part of parts) {
    if (part) {
      kept.push(part);
    }
  }

  return kept.join('  ·  ');
}

export function art(url, fallback) {
  if (!url) {
    if (fallback) {
      return fallback;
    }
    return 'var(--c-surface-1)';
  }

  const safe = String(url).replace(/["'()\\\s]/g, '');
  return "url('" + safe + "') center/cover no-repeat";
}

//review: this is what we did here: util.js holds three small helpers the screens use all
//the time. esc makes text safe to drop into HTML, so a film title containing < or & shows
//as characters instead of breaking the page. meta joins bits like year, runtime and genre
//with the dot separator, skipping any that are missing so you never get "1984 · · Drama".
//art builds the CSS background for a poster: it uses the image when there is one and falls
//back to a plain colour when there isn't, and it strips quotes and brackets out of the URL
//first so the value cannot escape the style attribute and break the layout.
