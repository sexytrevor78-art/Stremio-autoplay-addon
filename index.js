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
// Normalize META_IDS to lowercase to allow case-insensitive matching (accept TMDB, tmdb, Tmdb, etc.)
const META_IDS = (META_IDS_RAW && META_IDS_RAW.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) || ['tmdb:1399','tmdb:2734'];

async function getLinks() {
  try {
    const res = await fetch(LINKS_URL);
    console.log('[LINKS] Fetch status', res.status);
    if (!res.ok) return [];
    const text = await res.text();
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  } catch (err) {
    console.error('[LINKS] Error fetching links:', err.message || err);
    return [];
  }
}

const builder = new addonBuilder({
  id: 'community.stremio.autoplay-series',
  version: '1.1.1',
  name: 'Autoplay Series',
  description: 'Expose TMDB series IDs or a text file of links for Stremio Next Up/autoplay',
  behaviorHints: { configurable: false },
  resources: ['catalog', 'meta', 'stream'],
  types: ['series'],
  catalogs: [{ type: 'series', id: 'autoplay', name: 'Autoplay Series' }]
});

builder.defineCatalogHandler(async (args) => {
  console.log('[CATALOG] requested', args);

  // If META_IDS mode
  if (META_IDS && META_IDS.length > 0) {
    // Expose IDs in their normalized (lowercase) form so matching is consistent
    const metas = META_IDS.map(id => ({ id, type: 'series' }));
    return { metas };
  }

  // Otherwise, links.txt mode: expose a single synthetic series
  const links = await getLinks();
  return { metas: [{ id: 'autoplay-series', type: 'series', name: 'Autoplay Series', poster: 'https://via.placeholder.com/400x600.png?text=Autoplay' }] };
});

builder.defineMetaHandler(async (args) => {
  console.log('[META] requested', args);

  const reqId = (args.id || '').toLowerCase();

  // If requested meta is one of the META_IDS, return a minimal meta with the same id.
  if (META_IDS && META_IDS.includes(reqId)) {
    // Return minimal meta; Stremio core will often fetch richer metadata from TMDB for known ids.
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
  const mode = (META_IDS && META_IDS.length > 0) ? `META_IDS mode: ${META_IDS.join(',')}` : `links mode (${LINKS_URL})`;
  res.send(`<h1>Autoplay Addon</h1><p>Mode: ${mode}</p><p>Manifest: <a href="/manifest.json">/manifest.json</a></p>`);
});

app.use(getRouter(builder.getInterface()));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log('🚀 Autoplay addon running on port', port));
