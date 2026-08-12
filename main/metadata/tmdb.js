import { getCache, setCache } from './cache.js';

const BASE_URL = 'https://api.themoviedb.org/3';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const STILL_BASE = 'https://image.tmdb.org/t/p/w300';

const FALLBACK_ART = 'linear-gradient(150deg, #1f3f6b 0%, #100f1c 82%)';

const GENRE_TTL = 30 * 24 * 60 * 60 * 1000;
const MIN_ROW = 6;

function apiKey() {
  return process.env.TMDB_API_KEY || '';
}

function getHeaders() {
  const headers = { Accept: 'application/json' };

  const token = process.env.TMDB_READ_TOKEN;
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  return headers;
}

let warned = false;

function checkCredentials() {
  if (warned) {
    return;
  }
  if (apiKey() || process.env.TMDB_READ_TOKEN) {
    return;
  }

  warned = true;
  console.error(
    'TMDB credentials missing. Copy .env.example to .env and set TMDB_API_KEY. ' +
      'Metadata requests will fail until then.'
  );
}

function formatRuntime(minutes) {
  if (!minutes) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return hours + 'h ' + mins + 'm';
  }
  if (hours > 0) {
    return hours + 'h';
  }
  return mins + 'm';
}

function seasonLabel(count) {
  if (!count) {
    return null;
  }
  if (count === 1) {
    return '1 season';
  }
  return count + ' seasons';
}

function genreNames(item, genreMap) {
  if (item.genres && item.genres.length > 0) {
    const names = [];
    for (const genre of item.genres) {
      names.push(genre.name);
    }
    return names.join(', ');
  }

  const ids = item.genre_ids || [];
  const names = [];

  for (const id of ids) {
    if (genreMap && genreMap[id]) {
      names.push(genreMap[id]);
    }
  }

  return names.join(', ');
}

export function normalizeTMDBItem(item, genreMap = null) {
  const isTV = item.media_type === 'tv' || Boolean(item.first_air_date || item.number_of_seasons);

  const title = item.title || item.name || item.original_title || 'Untitled';

  const dateStr = item.release_date || item.first_air_date || '';
  let year = null;
  if (dateStr) {
    year = new Date(dateStr).getFullYear();
  }

  let runtime;
  if (isTV) {
    runtime = seasonLabel(item.number_of_seasons);
  } else {
    runtime = formatRuntime(item.runtime);
  }

  let rating = null;
  if (typeof item.vote_average === 'number' && item.vote_average > 0) {
    rating = item.vote_average.toFixed(1);
  }

  let poster = null;
  if (item.poster_path) {
    poster = POSTER_BASE + item.poster_path;
  }

  let backdrop = null;
  if (item.backdrop_path) {
    backdrop = BACKDROP_BASE + item.backdrop_path;
  }

  let seasons = null;
  if (isTV && item.number_of_seasons) {
    seasons = item.number_of_seasons;
  }

  let imdbId = item.imdb_id;
  if (!imdbId && item.external_ids) {
    imdbId = item.external_ids.imdb_id;
  }
  if (!imdbId) {
    imdbId = null;
  }

  let type = 'movie';
  if (isTV) {
    type = 'tv';
  }

  return {
    id: String(item.id),
    title,
    year,
    runtime,
    genre: genreNames(item, genreMap),
    rating,
    director: item.director || '',
    cast: item.cast || '',
    synopsis: item.overview || '',
    poster,
    backdrop,
    bg: FALLBACK_ART,
    type,
    seasons,
    imdbId,
  };
}

async function fetchGenreList(kind) {
  const url = BASE_URL + '/genre/' + kind + '/list?api_key=' + apiKey();
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    return [];
  }

  const json = await res.json();
  return json.genres || [];
}

export async function fetchGenreMap() {
  const cacheKey = 'tmdb_genres';

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const jobs = [];
    for (const kind of ['movie', 'tv']) {
      jobs.push(fetchGenreList(kind));
    }

    const lists = await Promise.all(jobs);

    const map = {};
    for (const genres of lists) {
      for (const genre of genres) {
        map[genre.id] = genre.name;
      }
    }

    setCache(cacheKey, map, GENRE_TTL);
    return map;
  } catch (err) {
    console.error('TMDB genre list error:', err.message);
    return {};
  }
}

async function fetchListPage(path, page) {
  let separator = '?';
  if (path.includes('?')) {
    separator = '&';
  }

  const url = BASE_URL + path + separator + 'api_key=' + apiKey() + '&page=' + page;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    throw new Error('TMDB error: ' + res.status);
  }

  const json = await res.json();
  return json.results || [];
}

async function fetchList(path, genreMap, pages = 2) {
  const safePath = path.replace(/[^a-z0-9]+/gi, '_');
  const cacheKey = 'tmdb_list_' + safePath + '_p' + pages;

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const jobs = [];
    for (let page = 1; page <= pages; page++) {
      jobs.push(fetchListPage(path, page));
    }

    const pageResults = await Promise.all(jobs);

    const items = [];
    for (const results of pageResults) {
      for (const result of results) {
        if (result.media_type === 'person') {
          continue;
        }

        const item = normalizeTMDBItem(result, genreMap);
        if (item.poster) {
          items.push(item);
        }
      }
    }

    setCache(cacheKey, items);
    return items;
  } catch (err) {
    console.error(`TMDB list error (${path}):`, err.message);
    return [];
  }
}

export const CATALOG_ROWS = [
  { key: 'trending', title: 'Trending now', path: '/trending/all/day' },
  { key: 'nowPlaying', title: 'In cinemas', path: '/movie/now_playing' },
  { key: 'popularMovies', title: 'Popular films', path: '/movie/popular' },
  { key: 'topRatedMovies', title: 'Top rated films', path: '/movie/top_rated' },
  { key: 'upcoming', title: 'Coming soon', path: '/movie/upcoming' },
  { key: 'popularTv', title: 'Popular series', path: '/tv/popular' },
  { key: 'topRatedTv', title: 'Top rated series', path: '/tv/top_rated' },
  { key: 'airingToday', title: 'On air today', path: '/tv/airing_today' },
];

export async function fetchCatalogs() {
  checkCredentials();

  const genreMap = await fetchGenreMap();

  const jobs = [];
  for (const row of CATALOG_ROWS) {
    jobs.push(fetchList(row.path, genreMap));
  }

  const lists = await Promise.all(jobs);

  const catalogs = {};
  const alreadyShown = new Set();

  for (let i = 0; i < CATALOG_ROWS.length; i++) {
    const row = CATALOG_ROWS[i];
    const items = lists[i];

    const fresh = [];
    const idsInThisRow = new Set();

    for (const item of items) {
      const id = String(item.id);

      if (alreadyShown.has(id) || idsInThisRow.has(id)) {
        continue;
      }

      idsInThisRow.add(id);
      fresh.push(item);
    }

    if (fresh.length < MIN_ROW) {
      continue;
    }

    for (const id of idsInThisRow) {
      alreadyShown.add(id);
    }

    catalogs[row.key] = fresh;
  }

  return catalogs;
}

export async function fetchTrending() {
  checkCredentials();

  const genreMap = await fetchGenreMap();
  return fetchList('/trending/all/day', genreMap);
}

export async function searchTMDB(query) {
  checkCredentials();

  if (!query) {
    return fetchTrending();
  }

  const cacheKey = 'tmdb_search_' + query.toLowerCase();

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = BASE_URL + '/search/multi?api_key=' + apiKey() + '&query=' + encodeURIComponent(query);
    const res = await fetch(url, { headers: getHeaders() });

    if (!res.ok) {
      throw new Error('TMDB search error: ' + res.status);
    }

    const json = await res.json();
    const genreMap = await fetchGenreMap();

    const items = [];
    for (const result of json.results || []) {
      if (result.media_type === 'movie' || result.media_type === 'tv') {
        items.push(normalizeTMDBItem(result, genreMap));
      }
    }

    setCache(cacheKey, items);
    return items;
  } catch (err) {
    console.error('TMDB search error:', err.message);
    return [];
  }
}

export async function getTMDBDetail(id, type) {
  checkCredentials();

  const cacheKey = 'tmdb_detail_' + (type || 'unknown') + '_' + id;

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  let endpointsToTry;
  if (type === 'tv') {
    endpointsToTry = ['tv'];
  } else if (type === 'movie') {
    endpointsToTry = ['movie'];
  } else {
    endpointsToTry = ['movie', 'tv'];
  }

  try {
    let res;
    let isTV = false;

    for (const kind of endpointsToTry) {
      const url =
        BASE_URL + '/' + kind + '/' + id + '?api_key=' + apiKey() + '&append_to_response=credits,external_ids';

      res = await fetch(url, { headers: getHeaders() });
      isTV = kind === 'tv';

      if (res.ok) {
        break;
      }
    }

    if (!res.ok) {
      throw new Error('TMDB detail error: ' + res.status);
    }

    const json = await res.json();

    if (isTV) {
      json.media_type = 'tv';
    } else {
      json.media_type = 'movie';
    }

    if (json.credits) {
      const crew = json.credits.crew || [];
      json.director = '';

      for (const person of crew) {
        if (person.job === 'Director') {
          json.director = person.name;
          break;
        }
      }

      const cast = json.credits.cast || [];
      const names = [];

      for (let i = 0; i < cast.length && i < 4; i++) {
        names.push(cast[i].name);
      }

      json.cast = names.join(', ');
    }

    const normalized = normalizeTMDBItem(json);
    setCache(cacheKey, normalized);
    return normalized;
  } catch (err) {
    console.error('TMDB detail error:', err.message);
    return null;
  }
}

export async function getTMDBEpisodes(id, season = 1) {
  checkCredentials();

  const cacheKey = 'tmdb_episodes_' + id + '_s' + season;

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = BASE_URL + '/tv/' + id + '/season/' + season + '?api_key=' + apiKey();
    const res = await fetch(url, { headers: getHeaders() });

    if (!res.ok) {
      throw new Error('TMDB episodes error: ' + res.status);
    }

    const json = await res.json();
    const episodes = [];

    for (const ep of json.episodes || []) {
      let still = null;
      if (ep.still_path) {
        still = STILL_BASE + ep.still_path;
      }

      episodes.push({
        num: String(ep.episode_number),
        title: ep.name,
        blurb: ep.overview || 'No description.',
        length: formatRuntime(ep.runtime),
        still,
        bg: 'linear-gradient(120deg,#2f4a5c,#121a20)',
      });
    }

    setCache(cacheKey, episodes);
    return episodes;
  } catch (err) {
    console.error('TMDB episodes error:', err.message);
    return [];
  }
}

//review: this is what we did here: tmdb.js is where all the film information comes from.
//TMDB is a free film database, and every poster, description, cast list and episode in the
//app is fetched here. normalizeTMDBItem is the important one: TMDB returns different shapes
//for films and series, so this turns them both into one tidy object the screens understand.
//Posters and backdrops are kept apart on purpose, since a tall poster stretched across a
//wide banner looks wrong. fetchCatalogs builds the eight rows on Home and quietly drops any
//film already shown in an earlier row, so you do not see the same title four times going
//down the page. getTMDBDetail has one trap worth knowing: TMDB numbers films and series
//separately, so the same number can be a film and a completely different series, which is
//why the type has to be passed in rather than guessed.
