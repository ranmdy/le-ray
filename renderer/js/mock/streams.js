const TEMPLATES = [
  {
    id: 'stream-1',
    quality: '4K',
    name: '{T}.{Y}.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-FLUX',
    group: 'FLUX',
    size: '24.8 GB',
    speed: 4,
    isBest: true,
  },
  {
    id: 'stream-2',
    quality: '1080p',
    name: '{T}.{Y}.1080p.BluRay.x264.DTS-HD.MA.5.1-NTb',
    group: 'NTb',
    size: '12.4 GB',
    speed: 4,
  },
  {
    id: 'stream-3',
    quality: '1080p',
    name: '{T}.{Y}.1080p.Remux.AVC.DTS-HD.MA.5.1-DON',
    group: 'DON',
    size: '18.1 GB',
    speed: 3,
  },
  {
    id: 'stream-4',
    quality: '720p',
    name: '{T}.{Y}.720p.HDTV.x264-RARBG',
    group: 'RARBG',
    size: '3.2 GB',
    speed: 2,
  },
];

function releaseName(template, item) {
  const scene = String(item.title || '')
    .replace(/[^A-Za-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');

  let year = item.year;
  if (year === undefined || year === null) {
    year = '';
  }

  return template.replace('{T}', scene).replace('{Y}', year);
}

export function streamsFor(item) {
  if (!item) {
    return [];
  }

  const list = [];

  for (const template of TEMPLATES) {
    if (template.quality === '4K' && item.quality !== '4K') {
      continue;
    }

    list.push({
      ...template,
      name: releaseName(template.name, item),
      isBest: list.length === 0,
    });
  }

  return list;
}

//review: this is what we did here: streams.js makes up a few fake download options so the
//source picker has something to show when you have no real sources connected yet. The names
//are templates with {T} and {Y} standing in for the title and year, so the fake results at
//least match the film you clicked instead of always naming the same one. A film we only
//have in 1080p does not get offered a 4K option. None of this is used once you connect a
//real source, it exists so the picker can be looked at with nothing set up.
