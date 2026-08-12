import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReleaseTitle } from '../main/sources/parse.js';

test('parseReleaseTitle: parses 4K release title correctly', () => {
  const result = parseReleaseTitle('Stalker.1979.2160p.UHD.BluRay.x265-FLUX');
  assert.equal(result.quality, '4K');
  assert.equal(result.year, 1979);
  assert.equal(result.codec, 'x265');
  assert.equal(result.group, 'FLUX');
});

test('parseReleaseTitle: parses 1080p release title correctly', () => {
  const result = parseReleaseTitle('Solaris.1972.1080p.BluRay.x264-NTb');
  assert.equal(result.quality, '1080p');
  assert.equal(result.year, 1972);
  assert.equal(result.codec, 'x264');
  assert.equal(result.group, 'NTb');
});

test('parseReleaseTitle: extracts the group from a real filename, not just a bare release name', () => {
  const result = parseReleaseTitle(
    'The.Shawshank.Redemption.1994.UHD.BluRay.2160p.DTS-HD.MA.5.1.DV.HEVC.HYBRID.REMUX-FraMeSToR.mkv'
  );
  assert.equal(result.quality, '4K');
  assert.equal(result.group, 'FraMeSToR');
});
