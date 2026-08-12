import { parseReleaseTitle } from './parse.js';

const QUALITY_POINTS = {
  '4K': 400,
  '1080p': 300,
  '720p': 200,
  SD: 100,
};

export function rankStreams(streams = [], preferredQuality = '4K') {
  if (!Array.isArray(streams)) {
    return [];
  }

  const scored = [];

  for (const stream of streams) {
    let parsed = stream.parsed;
    if (!parsed) {
      parsed = parseReleaseTitle(stream.name || stream.title || '');
    }

    let qualityScore = QUALITY_POINTS[parsed.quality];
    if (!qualityScore) {
      qualityScore = 100;
    }

    if (parsed.quality === preferredQuality) {
      qualityScore = qualityScore * 1.5;
    }

    const speed = stream.speed || stream.seeds || 1;
    const speedScore = speed * 10;

    scored.push({
      ...stream,
      parsed,
      score: qualityScore + speedScore,
      isBest: false,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    scored[0].isBest = true;
  }

  return scored;
}

//review: this is what we did here: rank.js decides the order results appear in the
//picker. Each stream gets points for its quality, with a bonus if it matches the quality
//you chose in Settings, plus a smaller number of points for how fast it looks based on
//seeders. The list is then sorted highest score first and the very top one is tagged
//isBest, which is what draws the amber highlight and what the Enter key plays.
