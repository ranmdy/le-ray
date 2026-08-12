# LE-RAY

Hey! Welcome to LE-RAY. I built this as a desktop media player and an open-source alternative to Stremio.

Right off the bat: **this app comes completely empty.** There are zero movies, shows, or streams built into it. Think of it as just the UI and the playback engine. You have to plug in your own sources (like Stremio addons or your own Prowlarr/Jackett servers) to actually watch anything. For all the movie posters and metadata, it hooks up to TMDB.

---

## What it actually does right now

* **Browsing:** You get 8 rows of live data from TMDB (Trending, In Cinemas, Top Rated, etc.). You get real posters, cast info, and if you drop in an [OMDb key](https://www.omdbapi.com/apikey.aspx), it'll pull IMDb ratings alongside the TMDB ones.
* **Searching for streams:** When you click on a movie, the app talks to whatever Stremio addons or indexers you've set up, searches them all in parallel, and ranks the best results.
* **Playback:** Standard HTTP video links play instantly. If it's a torrent, I built a local HTTP bridge using WebTorrent. Basically, it streams the exact pieces of the file you need right now, so you can skip around the video without waiting for the whole thing to download.
* **Saving state:** It saves your library and settings locally on your machine (`settings.json` in Electron or `localStorage` in the browser).

Again, nothing is bundled. When you open it for the first time, it's just a blank screen asking you to connect a source.

---

## Want to run it?

It's pretty simple to set up:

```bash
git clone <repo-url>
cd le-ray
npm install

```

Before you run it, make a `.env` file in the main folder so the app can pull movie data:

```text
TMDB_API_KEY=your_key_here       # REQUIRED — you can get this for free at themoviedb.org/settings/api
TMDB_READ_TOKEN=                 # optional (v4 bearer token)
OMDB_API_KEY=                    # optional — get this free at omdbapi.com/apikey.aspx if you want IMDb ratings

```

Then just start it:

```bash
npm start

```

Go to **Settings → Sources**, pick the type of source you want to add from the dropdown (Stremio addon, Prowlarr, or Jackett), and paste the URL. If you're using Prowlarr or Jackett, it'll show an extra box for your API key.

### Running it without Electron (Browser Dev Mode)

Because I built the UI with just plain HTML/JS/CSS, you can actually run it in a regular browser without compiling anything:

```bash
node tools/dev-server.mjs 4173

```

This just serves the `renderer/` folder as a static site. It uses the exact same TMDB logic that Electron uses, so you can test UI stuff and browse live data without constantly reopening the Electron window. Just a heads up: torrent streaming won't work here because it needs Node.js running in the background. Direct-URL streams still work though.

### Tests

```bash
npm test

```

I wrote 22 tests for the core logic (stuff like parsing release titles, torrent piece-range math, and ranking). They're completely isolated—no network calls and no Electron needed.

---

## How it's built

```text
┌─────────────────────────────────────────────────────┐
│  Electron                                            │
│                                                       │
│  ┌───────────────────┐      ┌────────────────────┐  │
│  │  Renderer          │ IPC  │  Main               │  │
│  │  (the UI)          │◄────►│  (the engine)       │  │
│  │                    │      │                     │  │
│  │  HTML, CSS, JS      │      │  Node.js            │  │
│  │  No framework       │      │  Full system access │  │
│  │  Sandboxed          │      │                     │  │
│  └───────────────────┘      └────────────────────┘  │
│                                       │               │
└───────────────────────────────────────┼───────────────┘
                                        ▼
                          ┌──────────────────────────┐
                          │  Torrent swarm           │
                          │  Stremio addons           │
                          │  User's Prowlarr/Jackett  │
                          │  TMDB / OMDb              │
                          └──────────────────────────┘

```

I kept the stack super minimal. No React, no Webpack, no TypeScript, no CSS frameworks. The whole app is just a handful of screens, so a massive toolchain just wasn't worth the headache.

**The Renderer Rule:**
The front-end UI (`renderer/`) has zero access to the outside world. No file system, no network requests, no direct API calls. It *only* talks to the Electron main process through `renderer/js/api.js`.

**The UI Loop:**
It's just a one-way state update: `state → render() → HTML string → innerHTML → screen`. I didn't use a virtual DOM. Screens are just pure functions that take a state object and spit out HTML. One master click handler handles all the user interactions.

**The Video Player hack:**
Since I'm replacing `#app`'s `innerHTML` on every render, I couldn't put the `<video>` tag inside it. If I did, the video would get deleted and recreated every time you clicked a button in the UI, which drops the local server connection. So the `<video>` element lives permanently in `index.html` outside the main app container, and is controlled imperatively by its own script (`player-video.js`).

### Why `preload.cjs` instead of `.js`?

Everything else in this project uses standard ES Modules (`import/export`). But Electron sandboxes preload scripts by default, meaning they only support CommonJS (`require`). If I named it `preload.js`, it would silently fail to load the IPC bridge, and the app would quietly fall back to fake mock data. Using `.cjs` forces it to load correctly. Took me a minute to figure that out.

---

## Under the hood (Playback)

1. The app asks your Stremio addons (using IMDb IDs) and your indexers (using text search) for streams.
2. It grabs all the results at the same time and ranks them based on quality and speed.
3. If it's a direct URL, it just hands it straight to the video player.
4. If it's a torrent, `WebTorrent` boots up. But it's set to *sequential downloading* with nothing pre-selected (`deselect: true`). That means if you click an episode from a giant season pack, it won't secretly try to download the other 20 episodes in the background while you watch.
5. A local server streams the file at `[http://127.0.0.1](http://127.0.0.1):{port}`. When you scrub the video timeline, it automatically prioritizes the new byte-range so you don't get stuck waiting for data you skipped over.
6. The torrent engine is immediately destroyed when you close the player.

*Side note on real-world torrents:* Your speed depends entirely on the source. Some Stremio addons only give you a raw info hash without a tracker list, which forces the app to rely on DHT to find peers. That can take a painfully long time. If the addon provides trackers, LE-RAY uses them and it connects almost instantly.

---

## Adding Sources

You configure these in **Settings → Sources**.

### Stremio addons

Just paste any Stremio manifest URL. LE-RAY speaks the addon protocol natively. It also checks `idPrefixes` before searching, so it doesn't spam addons with IDs they don't support.

### Indexers (Prowlarr / Jackett)

Pick the type, paste your server address, and drop in your API key. It talks directly to their standard REST APIs. I had to write a filter (`sources/match.js`) because indexers use raw text search—if you search for a movie called "Alien", the indexer will return literally any file with the word "alien" in it, so my filter checks the exact title and release year before showing it to you.

---

## My strict rules for this project

I wrote these down when I started and I'm sticking to them:

* **No bundled content.** No default addons, no preconfigured trackers, no fallback lists.
* **No web scraping.** Only documented APIs.
* **Privacy first.** No telemetry. It never logs your source URLs, IP addresses, magnet links, or watch habits.
* **Keys stay safe.** Your TMDB/OMDb keys stay in `.env` and are never exposed to the frontend.

---

## Stuff that doesn't work (yet)

* **No transcoding.** Whatever video format the file is in, that's what the `<video>` tag gets. If your computer doesn't support the codec (like some weird audio formats), it just won't play. I probably won't fix this.
* **Category weirdness:** Prowlarr/Jackett use standard Torznab categories (2000 for movies, 5000 for TV). If your specific tracker uses weird custom categories, search results might be missing.
* **Missing features:** No subtitles, no watch history, and no Chromecast support yet. I want to add these eventually.

---

## License

TBD — probably going with MIT or GPL-3.0.