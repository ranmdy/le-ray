import {
  fetchCatalogs,
  searchTMDB,
  getTMDBDetail,
  getTMDBEpisodes,
  CATALOG_ROWS,
} from './tmdb.js';
import { fetchImdbRating } from './omdb.js';

export { fetchCatalogs, searchTMDB, getTMDBEpisodes, CATALOG_ROWS };

export async function getDetail(id, type) {
  const item = await getTMDBDetail(id, type);

  if (!item) {
    return item;
  }
  if (!item.imdbId) {
    return item;
  }

  const imdb = await fetchImdbRating(item.imdbId);
  if (!imdb) {
    return item;
  }

  return { ...item, ...imdb };
}

//review: this is what we did here: index.js is the front door for everything to do with
//film information. The rest of the app asks this file instead of talking to TMDB and OMDb
//separately. Browsing, searching and episode lists are passed straight through to TMDB.
//The one place it does extra work is getDetail: after TMDB returns a film it also asks
//OMDb for that film's IMDb score and merges it in. OMDb is optional, so if there is no
//IMDb id or no OMDb key the film is returned exactly as TMDB gave it and nothing breaks.
