import { parseReleaseTitle } from './parse.js';

export function normalizeRelease(raw) {
  const label = raw.title || raw.name || '';
  const parsed = parseReleaseTitle(label);

  let name = label;
  if (!name) {
    name = parsed.rawName;
  }
  if (!name) {
    name = 'Unnamed release';
  }

  let size = raw.size;
  if (!size) {
    size = formatSize(raw.sizeBytes);
  }

  return {
    ...raw,
    name,
    quality: parsed.quality,
    group: parsed.group,
    size,
    speed: pickSpeed(raw, parsed.quality),
    parsed,
  };
}

function pickSpeed(raw, quality) {
  if (raw.speed !== undefined && raw.speed !== null) {
    return raw.speed;
  }

  const fromSeeders = speedFromSeeders(raw.seeders);
  if (fromSeeders !== null) {
    return fromSeeders;
  }

  return speedFromQuality(quality);
}

function speedFromSeeders(seeders) {
  if (seeders === undefined || seeders === null) {
    return null;
  }

  if (seeders >= 50) {
    return 4;
  }
  if (seeders >= 15) {
    return 3;
  }
  if (seeders >= 3) {
    return 2;
  }
  return 1;
}

function speedFromQuality(quality) {
  if (quality === '4K') {
    return 4;
  }
  if (quality === '1080p') {
    return 3;
  }
  if (quality === '720p') {
    return 2;
  }
  return 1;
}

export function formatSize(bytes) {
  if (!bytes) {
    return 'Unknown size';
  }

  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return gb.toFixed(1) + ' GB';
  }

  const mb = bytes / (1024 * 1024);
  return mb.toFixed(0) + ' MB';
}

export function withIds(sourceName, releases) {
  const result = [];

  for (let i = 0; i < releases.length; i++) {
    const release = releases[i];

    let unique = release.infoHash || release.magnet || release.url;
    if (!unique) {
      unique = i;
    }

    result.push({
      ...release,
      id: sourceName + '-' + unique + '-' + i,
    });
  }

  return result;
}

//review: this is what we did here: normalize.js takes results from different places and
//makes them all look the same. A Stremio addon and a Prowlarr server describe a file in
//totally different ways, so everything downstream would need to know which one it came
//from. Instead this file reshapes each result into one common format: a readable name,
//quality, group, a size like "4.2 GB", and a 1 to 4 speed rating. Speed comes from the
//real seeder count when the source gives one, otherwise it is guessed from the quality.
//withIds gives every result its own id so the picker knows which row you clicked.
