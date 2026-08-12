import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const STORE_PATH = path.join(app.getPath('userData'), 'settings.json');

const DEFAULT_STORE = {
  sources: [],
  settings: {},
  library: [],
};

export function getSettings() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const text = fs.readFileSync(STORE_PATH, 'utf-8');
      const saved = JSON.parse(text);
      return { ...DEFAULT_STORE, ...saved };
    }
  } catch (err) {
    console.error('Failed to read settings from disk:', err);
  }

  return { ...DEFAULT_STORE };
}

export function saveSettings(data) {
  try {
    const current = getSettings();
    const updated = { ...current, ...data };

    fs.writeFileSync(STORE_PATH, JSON.stringify(updated, null, 2), 'utf-8');

    return { ok: true, data: updated };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

//review: this is what we did here: store.js remembers your settings between runs. It keeps
//one file called settings.json in the folder the operating system gives the app, holding
//the sources you added, your playback options, and your saved library. getSettings reads
//it and fills in empty defaults for anything missing, so a brand new install or a damaged
//file still starts up instead of crashing. saveSettings merges your change into what is
//already there rather than replacing the whole file, so saving a new source cannot wipe
//your library.
