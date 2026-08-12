import { normalizeRelease, withIds } from './normalize.js';

function parseStremioTitle(title) {
  const text = String(title || '');
  const firstLine = text.split('\n')[0];

  const sizeMatch = /💾\s*([\d.]+)\s*(GB|MB)/i.exec(text);
  let sizeBytes;
  if (sizeMatch) {
    const amount = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toUpperCase();

    if (unit === 'GB') {
      sizeBytes = amount * 1024 * 1024 * 1024;
    } else {
      sizeBytes = amount * 1024 * 1024;
    }
  }

  const seedersMatch = /👤\s*(\d+)/.exec(text);
  let seeders;
  if (seedersMatch) {
    seeders = Number(seedersMatch[1]);
  }

  return {
    releaseName: firstLine.trim(),
    sizeBytes,
    seeders,
  };
}

function manifestUrlFor(addonUrl) {
  if (addonUrl.endsWith('/manifest.json')) {
    return addonUrl;
  }
  return addonUrl + '/manifest.json';
}

export async function fetchAddonManifest(addonUrl) {
  try {
    const res = await fetch(manifestUrlFor(addonUrl));
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch manifest from ${addonUrl}:`, err.message);
    return null;
  }
}

function addonHandlesId(manifest, id) {
  if (!manifest.idPrefixes) {
    return true;
  }
  if (manifest.idPrefixes.length === 0) {
    return true;
  }

  for (const prefix of manifest.idPrefixes) {
    if (id.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

export async function queryAddonStreams(addonUrl, type, id) {
  try {
    const manifestUrl = manifestUrlFor(addonUrl);
    const baseUrl = manifestUrl.replace(/\/manifest\.json$/, '');

    const manifest = await fetchAddonManifest(manifestUrl);
    if (!manifest) {
      return [];
    }

    if (!addonHandlesId(manifest, id)) {
      return [];
    }

    const streamUrl = baseUrl + '/stream/' + type + '/' + encodeURIComponent(id) + '.json';
    const res = await fetch(streamUrl);
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const rawStreams = data.streams || [];

    const releases = [];

    for (const raw of rawStreams) {
      const rawTitle = raw.title || raw.name || raw.description || '';
      const fromTitle = parseStremioTitle(rawTitle);

      let hints = raw.behaviorHints;
      if (!hints) {
        hints = {};
      }

      let title = hints.filename;
      if (!title) {
        title = fromTitle.releaseName;
      }

      let sizeBytes = hints.videoSize;
      if (sizeBytes === undefined || sizeBytes === null) {
        sizeBytes = fromTitle.sizeBytes;
      }

      let seeders = raw.seeders;
      if (seeders === undefined || seeders === null) {
        seeders = fromTitle.seeders;
      }

      releases.push(normalizeRelease({ ...raw, title, sizeBytes, seeders }));
    }

    const sourceName = manifest.name || addonUrl;
    return withIds(sourceName, releases);
  } catch (err) {
    console.error(`Addon query error (${addonUrl}):`, err.message);
    return [];
  }
}

export async function queryAllAddons(sources = [], type = 'movie', id) {
  if (!sources || sources.length === 0) {
    return [];
  }
  if (!id) {
    return [];
  }

  const jobs = [];
  for (const source of sources) {
    jobs.push(queryAddonStreams(source.url, type, id));
  }

  const results = await Promise.allSettled(jobs);

  const streams = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      streams.push(...result.value);
    }
  }

  return streams;
}

//review: this is what we did here: addon.js talks to Stremio addons, which is one of the
//two kinds of source you can connect. Every addon publishes a manifest describing itself,
//and this file reads that first. Some addons only understand certain kinds of id, so
//addonHandlesId checks the manifest before wasting a request on one that cannot answer.
//The streams that come back describe the file in a human line like "1080p 💾 2.3 GB 👤 45",
//so parseStremioTitle digs the real filename, size and seeder count out of that text.
//Every addon is asked at the same time rather than one after another, and Promise.allSettled
//means one broken or slow addon returns nothing instead of taking the whole search down.
