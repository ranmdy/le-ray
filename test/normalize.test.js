import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRelease, formatSize, withIds } from '../main/sources/normalize.js';

test('normalizeRelease: derives quality and group from the title', () => {
  const r = normalizeRelease({ title: 'Stalker.1979.2160p.UHD.BluRay.x265-FLUX' });
  assert.equal(r.quality, '4K');
  assert.equal(r.group, 'FLUX');
  assert.equal(r.name, 'Stalker.1979.2160p.UHD.BluRay.x265-FLUX');
});

test('normalizeRelease: formats size from bytes when no size string is given', () => {
  const r = normalizeRelease({ title: 'X.1080p-GROUP', sizeBytes: 4.2 * 1024 ** 3 });
  assert.equal(r.size, '4.2 GB');
});

test('normalizeRelease: an explicit size string wins over sizeBytes', () => {
  const r = normalizeRelease({ title: 'X.1080p-GROUP', size: '4.0 GB', sizeBytes: 999 });
  assert.equal(r.size, '4.0 GB');
});

test('normalizeRelease: speed comes from seeders when the source reports them', () => {
  const r = normalizeRelease({ title: 'X.1080p-GROUP', seeders: 60 });
  assert.equal(r.speed, 4);
});

test('normalizeRelease: falls back to a quality-based speed with no seeder count', () => {
  const r = normalizeRelease({ title: 'X.2160p-GROUP' });
  assert.equal(r.speed, 4);
});

test('normalizeRelease: carries the rest of the raw fields through untouched', () => {
  const r = normalizeRelease({ title: 'X.1080p-GROUP', magnet: 'magnet:?xt=urn:btih:abc', infoHash: 'abc' });
  assert.equal(r.magnet, 'magnet:?xt=urn:btih:abc');
  assert.equal(r.infoHash, 'abc');
});

test('formatSize: switches from MB to GB at the 1GB boundary', () => {
  assert.equal(formatSize(500 * 1024 ** 2), '500 MB');
  assert.equal(formatSize(1.5 * 1024 ** 3), '1.5 GB');
  assert.equal(formatSize(0), 'Unknown size');
});

test('withIds: every release gets a unique, stable id', () => {
  const releases = [{ infoHash: 'aaa' }, { infoHash: 'bbb' }, { url: 'http://x/y' }];
  const withIdsResult = withIds('source-a', releases);
  const ids = withIdsResult.map((r) => r.id);
  assert.equal(new Set(ids).size, 3);
  assert.ok(ids[0].startsWith('source-a-aaa-'));
});
