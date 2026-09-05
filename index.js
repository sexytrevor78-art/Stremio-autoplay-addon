const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('cross-fetch');
const app = express();

// Modes:
// - If META_IDS is set (comma-separated like "tmdb:1399,tmdb:2734"), the addon will expose those TMDB series IDs as catalogs.
//   Stremio will query installed addons (e.g., PenguPlay, Torrentino) for streams for those meta IDs.
// - Otherwise, the addon falls back to links.txt mode (one direct URL per line) as before.

const LINKS_URL = process.env.LINKS_URL || 'https://raw.githubusercontent.com/sexytrevor78-art/Stremio-autoplay-addon/main/links.txt';
const META_IDS_RAW = process.env.META_IDS || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
// Normalize META_IDS to lowercase to allow case-insensitive matching (accept TMDB, tmdb, Tmdb, etc.)
const META_IDS = (META_IDS_RAW && META_IDS_RAW.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) || ['tmdb:1399','tmdb:2734'];

// Simple in-memory cache so the catalog handler doesn't hammer TMDB on every Discover refresh
const tmdbCache = new Map();

// One-time startup diagnostic: confirms the key is actually reaching the app, without printing the real key
console.log('[STARTUP] TMDB_API_KEY present:', !!TMDB_API_KEY, '| length:', TMDB_API_KEY.length, '| first4:', JSON.stringify(TMDB_API_KEY.slice(0, 4)), '| last4:', JSON.stringify(TMDB_API_KEY.slice(-4)));

async function getLinks() {
  try {
    const res = await fetch(LINKS_URL);
    console.log('[LINKS] Fetch status', res.status);
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  } catch (err) {
    console.error('[LINKS] Error fetching links:', err.message || err);
    return [];
  }
}

// Fetch TMDB metadata for a given TMDB ID (cached)
async function getTmdbMeta(tmdbId) {
  if (!TMDB_API_KEY) {
    console.warn('[TMDB] No API key set. Set TMDB_API_KEY environment variable to fetch metadata.');
    return null;
  }

  if (tmdbCache.has(tmdbId)) {
    return tmdbCache.get(tmdbId);
  }

  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
    if (!response.ok) {
      console.error('[TMDB] API error:', response.status);
      return null;
    }
    const data = await response.json();
    tmdbCache.set(tmdbId, data);
    return data;
  } catch (err) {
    console.error('[TMDB] Error fetching metadata:', err.message || err);
    return null;
  }
}

const builder = new addonBuilder({
  id: 'community.stremio.autoplay-series',
  version: '1.3.0',
  name: 'Autoplay Series',
  description: 'Expose TMDB series IDs with real metadata or a text file of links for Stremio Next Up/autoplay',
  behaviorHints: { configurable: false },
  resources: ['catalog', 'meta', 'stream'],
  types: ['series'],
  catalogs: [{ type: 'series', id: 'autoplay', name: 'Autoplay Series' }]
});

builder.defineCatalogHandler(async (args) => {
  console.log('[CATALOG] requested', args);

  // If META_IDS mode: fetch real TMDB name/poster for each ID so Discover shows proper cards
  if (META_IDS && META_IDS.length > 0) {
    const metas = await Promise.all(META_IDS.map(async (id) => {
      const tmdbId = id.replace('tmdb:', '');
      const tmdbData = await getTmdbMeta(tmdbId);

      return {
        id,
        type: 'series',
        name: tmdbData && tmdbData.name ? tmdbData.name : 'Unknown',
        poster: tmdbData && tmdbData.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
          : 'https://via.placeholder.com/400x600.png?text=No+Poster',
        description: tmdbData && tmdbData.overview ? tmdbData.overview : undefined,
        releaseInfo: tmdbData && tmdbData.first_air_date ? tmdbData.first_air_date.split('-')[0] : undefined
      };
    }));
    return { metas };
  }

  // Otherwise, links.txt mode: expose a single synthetic series
  return { metas: [{ id: 'autoplay-series', type: 'series', name: 'Autoplay Series', poster: 'https://via.placeholder.com/400x600.png?text=Autoplay' }] };
});

builder.defineMetaHandler(async (args) => {
  console.log('[META] requested', args);

  const reqId = (args.id || '').toLowerCase();

  // If requested meta is one of the META_IDS, fetch REAL TMDB metadata
  if (META_IDS && META_IDS.includes(reqId)) {
    const tmdbId = reqId.replace('tmdb:', ''); // Extract the numeric ID
    const tmdbData = await getTmdbMeta(tmdbId);

    if (tmdbData) {
      // Build episodes array if available
      const episodes = tmdbData.seasons ?
        tmdbData.seasons
          .filter(s => s.season_number > 0) // Skip season 0 (specials)
          .flatMap(season =>
            Array.from({ length: season.episode_count }, (_, i) => ({
              id: `${reqId}-s${season.season_number}e${i + 1}`,
              season: season.season_number,
              episode: i + 1,
              name: `Season ${season.season_number} Episode ${i + 1}`,
              poster: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : undefined
            }))
          )
        : [];

      return {
        meta: {
          id: reqId,
          type: 'series',
          name: tmdbData.name || 'Unknown',
          poster: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : 'https://via.placeholder.com/400x600.png?text=No+Poster',
          description: tmdbData.overview || 'No description available',
          genres: tmdbData.genres?.map(g => g.name) || [],
          releaseInfo: tmdbData.first_air_date?.split('-')[0] || 'Unknown',
          episodes: episodes.length > 0 ? episodes : undefined
        }
      };
    }

    // Fallback if TMDB fetch fails
    console.log('[META] TMDB fetch failed, returning minimal meta');
    return { meta: { id: reqId, type: 'series' } };
  }

  // Links.txt mode
  if (reqId === 'autoplay-series') {
    const links = await getLinks();
    const episodes = links.map((link, idx) => ({
      id: `autoplay-ep-${idx + 1}`,
      season: 1,
      episode: idx + 1,
      name: `Episode ${idx + 1}`,
      poster: 'https://via.placeholder.com/200x300.png?text=Episode'
    }));

    const meta = {
      id: 'autoplay-series',
      type: 'series',
      name: 'Autoplay Series',
      poster: 'https://via.placeholder.com/400x600.png?text=Autoplay',
      description: `A series generated from ${LINKS_URL}. ${links.length} episode(s).`,
      episodes
    };

    return { meta };
  }

  return { meta: null };
});

// Stream handler: if we are in META_IDS mode we intentionally return no streams so other addons
// (PenguPlay, Torrentino, etc.) can provide streams for those meta IDs. In links mode we provide direct streams.
builder.defineStreamHandler(async (args) => {
  console.log('[STREAM] requested', args);

  const reqId = (args.id || '').toLowerCase();

  // If requested id is one of META_IDS, return empty streams so other addons can respond.
  if (META_IDS && META_IDS.includes(reqId)) {
    return { streams: [] };
  }

  // Links mode: map autoplay-ep-N to the URL from links.txt
  const match = reqId.match(/^autoplay-ep-(\d+)$/);
  if (!match) return { streams: [] };
  const epIndex = parseInt(match[1], 10) - 1;
  const links = await getLinks();
  if (epIndex < 0 || epIndex >= links.length) return { streams: [] };

  const url = links[epIndex];
  return { streams: [{ title: `Episode ${epIndex + 1}`, url, quality: 'SD' }] };
});

// Simple informational root page
app.get('/', (req, res) => {
  const mode = (META_IDS && META_IDS.length > 0) ? `META_IDS mode: ${META_IDS.join(',')}${TMDB_API_KEY ? ' (with TMDB metadata)' : ' (no TMDB_API_KEY set)'}` : `links mode (${LINKS_URL})`;
  res.send(`<h1>Autoplay Addon</h1><p>Mode: ${mode}</p><p>Manifest: <a href="/manifest.json">/manifest.json</a></p>`);
});

app.use(getRouter(builder.getInterface()));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log('🚀 Autoplay addon running on port', port));
