const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const fetch = require('cross-fetch');
const app = express();

// URL to a raw text file with one direct video URL per line.
// Set LINKS_URL as an environment variable in your deployment (recommended).
const LINKS_URL = process.env.LINKS_URL || 'https://raw.githubusercontent.com/sexytrevor78-art/Stremio-autoplay-addon/autoplay-pr/links.txt';

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
  version: '1.0.0',
  name: 'Autoplay Series',
  description: 'Turn a simple text file of direct links into a TV Series for Stremio Next Up/autoplay',
  behaviorHints: { configurable: false },
  resources: ['catalog', 'meta', 'stream'],
  types: ['series'],
  catalogs: [{ type: 'series', id: 'autoplay', name: 'Autoplay Series' }]
});

// Single catalog entry representing the series
builder.defineCatalogHandler(async (args) => {
  console.log('[CATALOG] requested', args);
  // Return one meta pointing to the series id; Stremio will call meta handler next.
  return { metas: [{ id: 'autoplay-series', type: 'series', name: 'Autoplay Series', poster: 'https://via.placeholder.com/400x600.png?text=Autoplay' }] };
});

// Provide series meta including episodes based on the links file
builder.defineMetaHandler(async (args) => {
  console.log('[META] requested', args);
  if (args.id !== 'autoplay-series') return { meta: null };

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
});

// Map episode id to a direct stream URL from links.txt
builder.defineStreamHandler(async (args) => {
  console.log('[STREAM] requested', args);
  const { id } = args;
  const match = id && id.match(/^autoplay-ep-(\d+)$/);
  if (!match) return { streams: [] };
  const epIndex = parseInt(match[1], 10) - 1;
  const links = await getLinks();
  if (epIndex < 0 || epIndex >= links.length) return { streams: [] };

  const url = links[epIndex];
  return { streams: [{ title: `Episode ${epIndex + 1}`, url, quality: 'SD' }] };
});

// Simple informational root page
app.get('/', (req, res) => {
  res.send(`<h1>Autoplay Addon</h1><p>Set LINKS_URL to a raw text file (one direct link per line) and deploy.</p><p>Manifest: <a href="/manifest.json">/manifest.json</a></p>`);
});

app.use(getRouter(builder.getInterface()));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log('🚀 Autoplay addon running on port', port));
