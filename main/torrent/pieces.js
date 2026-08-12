export function calculatePieceRange(fileOffset, fileSize, pieceLength, requestedStart = 0, requestedEnd = null) {
  if (pieceLength <= 0) {
    throw new Error('pieceLength must be positive');
  }

  let endByte = requestedEnd;
  if (endByte === null) {
    endByte = fileSize - 1;
  }

  const firstByte = fileOffset + requestedStart;
  const lastByte = fileOffset + endByte;

  const startPiece = Math.floor(firstByte / pieceLength);
  const endPiece = Math.floor(lastByte / pieceLength);

  return { startPiece, endPiece };
}

export function calculatePriorityWindow(startPiece, totalPieces, windowSize = 5) {
  if (totalPieces <= 0) {
    return { highPriorityStart: 0, highPriorityEnd: 0 };
  }

  const lastPiece = totalPieces - 1;

  let start = startPiece;
  if (start < 0) {
    start = 0;
  }
  if (start > lastPiece) {
    start = lastPiece;
  }

  let end = start + windowSize - 1;
  if (end > lastPiece) {
    end = lastPiece;
  }

  return { highPriorityStart: start, highPriorityEnd: end };
}

//review: this is what we did here: pieces.js is the math helper for the stream server.
//A torrent is split into many equal-sized chunks called pieces. When you drag the video
//to the middle of a film, the browser asks for a range of bytes, and this file works out
//which piece numbers those bytes live in. calculatePieceRange does that conversion.
//calculatePriorityWindow then picks a small group of pieces starting from there, so the
//app can tell the downloader "grab these first" and playback starts quickly instead of
//waiting for the whole file.
