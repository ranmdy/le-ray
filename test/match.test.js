import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeMatch, looksLikeYear } from '../main/sources/match.js';

test('looksLikeMatch: accepts a release that contains the query title', () => {
  assert.equal(looksLikeMatch('Paris.Texas.1984.1080p.BluRay.x264-NTb', 'Paris, Texas'), true);
});

test('looksLikeMatch: rejects a release that only shares one word out of several', () => {
  assert.equal(looksLikeMatch('A.Real.Batman.Movie.2019.1080p-GROUP', 'Real Steel'), false);
});

test('looksLikeMatch: an empty query matches anything', () => {
  assert.equal(looksLikeMatch('Whatever.2020.1080p', ''), true);
});

test('looksLikeYear: accepts when the release names the same year', () => {
  assert.equal(looksLikeYear(1984, 1984), true);
});

test('looksLikeYear: accepts a one-year drift for release-date ambiguity', () => {
  assert.equal(looksLikeYear(1983, 1984), true);
});

test('looksLikeYear: rejects a release that names a clearly different year', () => {
  assert.equal(looksLikeYear(1954, 1984), false);
});

test('looksLikeYear: nothing to contradict with when either side is unknown', () => {
  assert.equal(looksLikeYear(null, 1984), true);
  assert.equal(looksLikeYear(1984, null), true);
});
