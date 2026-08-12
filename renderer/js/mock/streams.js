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
  return template.replace('{T}', scene).replace('{Y}', item.year ?? '');
}

export function streamsFor(item) {
  if (!item) return [];

  const list = TEMPLATES.filter((t) => item.quality === '4K' || t.quality !== '4K').map((t) => ({
    ...t,
    name: releaseName(t.name, item),
  }));

  return list.map((s, i) => ({ ...s, isBest: i === 0 }));
}
