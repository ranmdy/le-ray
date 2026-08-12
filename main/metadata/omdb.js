import { getCache, setCache } from './cache.js';

const BASE_URL = 'https://www.omdbapi.com/';
const TTL = 7 * 24 * 60 * 60 * 1000;

function apiKey() {
  return process.env.OMDB_API_KEY || '';
}

export function hasOmdbKey() {
  return Boolean(apiKey());
}

function realValue(raw) {
  if (!raw) {
    return null;
  }
  if (raw === 'N/A') {
    return null;
  }
  return raw;
}

export async function fetchImdbRating(imdbId) {
  if (!imdbId) {
    return null;
  }
  if (!apiKey()) {
    return null;
  }

  const cacheKey = 'omdb_' + imdbId;

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = BASE_URL + '?apikey=' + encodeURIComponent(apiKey()) + '&i=' + encodeURIComponent(imdbId);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('OMDb error: ' + res.status);
    }

    const json = await res.json();
    if (json.Response === 'False') {
      console.error('OMDb lookup failed:', json.Error);
      return null;
    }

    const rating = realValue(json.imdbRating);
    if (!rating) {
      return null;
    }

    const data = {
      imdbRating: rating,
      imdbVotes: realValue(json.imdbVotes),
      rated: realValue(json.Rated),
    };

    setCache(cacheKey, data, TTL);
    return data;
  } catch (err) {
    console.error('OMDb error:', err.message);
    return null;
  }
}

//review: this is what we did here: omdb.js fetches a film's IMDb score. IMDb has no public
//api of its own, so OMDb is used as the middle man: TMDB gives us the imdb id, and this
//file swaps that id for the score, vote count and age rating. It is completely optional.
//With no OMDb key in the .env file, or no imdb id, every path here returns null and the
//detail page simply shows no IMDb badge. Scores barely change, so answers are cached for a
//week to stay well inside the free daily limit. OMDb replies with the text "N/A" instead of
//leaving a field out, which is why realValue turns that into a proper empty value.
