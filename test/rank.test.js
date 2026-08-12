import test from 'node:test';
import assert from 'node:assert/strict';
import { rankStreams } from '../main/sources/rank.js';

test('rankStreams: orders streams by quality and speed, marking best pick', () => {
  const streams = [
    { title: 'Stalker.1979.720p.HDTV.x264-RARBG', speed: 1 },
    { title: 'Stalker.1979.2160p.UHD.BluRay.x265-FLUX', speed: 4 },
    { title: 'Stalker.1979.1080p.BluRay.x264-NTb', speed: 3 },
  ];

  const ranked = rankStreams(streams, '4K');
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].parsed.quality, '4K');
  assert.equal(ranked[0].isBest, true);
  assert.equal(ranked[1].isBest, false);
});
