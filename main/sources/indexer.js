import { normalizeRelease, withIds } from './normalize.js';

const CATEGORY = { movie: [2000], series: [5000] };

function trimSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

export async function queryProwlarr(source, query) {
  const url = source.url;
  const apiKey = source.apiKey;

  if (!url || !apiKey || !query) {
    return [];
  }

  try {
    const params = new URLSearchParams({ query, type: 'search' });

    const categories = CATEGORY[source.type] || [];
    for (const category of categories) {
      params.append('categories', String(category));
    }

    const res = await fetch(trimSlash(url) + '/api/v1/search?' + params, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) {
      return [];
    }

    const results = await res.json();
    const releases = [];

    for (const item of results || []) {
      if (item.protocol !== 'torrent') {
        continue;
      }

      releases.push(
        normalizeRelease({
          title: item.title,
          sizeBytes: item.size,
          seeders: item.seeders,
          magnet: item.magnetUrl || item.downloadUrl,
          infoHash: item.infoHash || null,
        })
      );
    }

    return withIds(source.name || url, releases);
  } catch (err) {
    console.error(`Prowlarr query error (${url}):`, err.message);
    return [];
  }
}

export async function queryJackett(source, query) {
  const url = source.url;
  const apiKey = source.apiKey;

  if (!url || !apiKey || !query) {
    return [];
  }

  try {
    const params = new URLSearchParams({ apikey: apiKey, Query: query });

    const res = await fetch(trimSlash(url) + '/api/v2.0/indexers/all/results?' + params);
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const releases = [];

    for (const item of json.Results || []) {
      releases.push(
        normalizeRelease({
          title: item.Title,
          sizeBytes: item.Size,
          seeders: item.Seeders,
          magnet: item.MagnetUri || item.Link,
          infoHash: item.InfoHash || null,
        })
      );
    }

    return withIds(source.name || url, releases);
  } catch (err) {
    console.error(`Jackett query error (${url}):`, err.message);
    return [];
  }
}

export function queryIndexer(source, query, type = 'movie') {
  const withType = { ...source, type };

  if (withType.kind === 'jackett') {
    return queryJackett(withType, query);
  }
  return queryProwlarr(withType, query);
}

export async function queryAllIndexers(sources = [], query, type = 'movie') {
  if (!sources || sources.length === 0) {
    return [];
  }
  if (!query) {
    return [];
  }

  const jobs = [];
  for (const source of sources) {
    jobs.push(queryIndexer(source, query, type));
  }

  const results = await Promise.allSettled(jobs);

  const streams = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      streams.push(...result.value);
    }
  }

  return streams;
}

//review: this is what we did here: indexer.js talks to Prowlarr and Jackett, the other kind
//of source you can connect. Both are programs you run yourself that search torrent sites on
//your behalf, and both have their own documented web api, so this file just calls those. It
//never scrapes a web page. The two look similar but differ in the details: Prowlarr wants the
//key in a header and uses lower case field names, Jackett wants it in the address and uses
//capitalised ones, so there is one function each. Prowlarr can also return usenet results,
//which the torrent engine cannot play, so those are skipped. queryIndexer picks the right
//function based on which kind you chose in Settings, and queryAllIndexers asks every one at
//the same time so a slow server does not hold up the rest.
