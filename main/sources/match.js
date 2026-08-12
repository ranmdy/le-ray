function clean(text) {
  if (!text) {
    return '';
  }

  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function looksLikeMatch(releaseTitle, queryTitle) {
  const cleanRelease = clean(releaseTitle);
  const cleanQuery = clean(queryTitle);

  const importantWords = [];
  const allWords = cleanQuery.split(' ');

  for (const word of allWords) {
    if (word.length > 2) {
      importantWords.push(word);
    }
  }

  if (importantWords.length === 0) {
    return true;
  }

  let found = 0;
  for (const word of importantWords) {
    if (cleanRelease.includes(word)) {
      found = found + 1;
    }
  }

  return found / importantWords.length >= 0.6;
}

export function looksLikeYear(releaseYear, queryYear) {
  if (!releaseYear || !queryYear) {
    return true;
  }

  const gap = Math.abs(releaseYear - queryYear);
  return gap <= 1;
}

//review: this is what we did here: match.js checks whether a search result is actually
//the film you asked for. Stremio addons are looked up by IMDb id so they always return
//the right title, but Prowlarr and Jackett search by plain text, so a search for "Alien"
//also brings back unrelated things with that word in the name. looksLikeMatch strips out
//punctuation, ignores tiny words like "of" and "the", then checks how many of the real
//words appear in the release name — 60% or more counts as a match. looksLikeYear is a
//second check that throws out a result if it clearly names a different year.
