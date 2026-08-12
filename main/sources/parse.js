export function parseReleaseTitle(rawName = '') {
  const name = String(rawName);

  let quality = 'SD';
  if (/2160p|4k|uhd/i.test(name)) {
    quality = '4K';
  } else if (/1080p|fhd/i.test(name)) {
    quality = '1080p';
  } else if (/720p|hd/i.test(name)) {
    quality = '720p';
  }

  let year = null;
  const yearMatch = name.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  let codec = 'x264';
  if (/x265|hevc|h\.?265/i.test(name)) {
    codec = 'x265';
  } else if (/av1/i.test(name)) {
    codec = 'AV1';
  } else if (/x264|h\.?264/i.test(name)) {
    codec = 'x264';
  }

  const withoutExtension = name.replace(/\.(mkv|mp4|avi|mov|webm|m4v|ts|wmv)$/i, '');

  let group = 'Unknown';
  const groupMatch = withoutExtension.match(/-([A-Za-z0-9_]+)$/);
  if (groupMatch) {
    group = groupMatch[1];
  }

  return {
    rawName: name,
    quality,
    year,
    codec,
    group,
  };
}

//review: this is what we did here: parse.js reads a messy release filename and pulls out
//the useful bits. A name like "Stalker.1979.2160p.UHD.BluRay.x265-FLUX" is just one long
//string, so this file searches it for a resolution (2160p means 4K), a four digit year,
//a codec, and the release group which is the bit after the last dash. Anything it cannot
//find gets a sensible default instead of crashing. The picker uses this to show quality
//and group next to each result.
