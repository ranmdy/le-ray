import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePieceRange, calculatePriorityWindow } from '../main/torrent/pieces.js';

test('calculatePieceRange: maps requested byte ranges to piece indices correctly', () => {
  const fileOffset = 1000;
  const fileSize = 5000;
  const pieceLength = 1000;

  const range = calculatePieceRange(fileOffset, fileSize, pieceLength, 0, 1999);
  assert.equal(range.startPiece, 1);
  assert.equal(range.endPiece, 2);
});

test('calculatePriorityWindow: returns valid high priority window bounds', () => {
  const { highPriorityStart, highPriorityEnd } = calculatePriorityWindow(2, 20, 5);
  assert.equal(highPriorityStart, 2);
  assert.equal(highPriorityEnd, 6);
});

test('calculatePriorityWindow: caps priority window at total piece count', () => {
  const { highPriorityStart, highPriorityEnd } = calculatePriorityWindow(18, 20, 5);
  assert.equal(highPriorityStart, 18);
  assert.equal(highPriorityEnd, 19);
});
