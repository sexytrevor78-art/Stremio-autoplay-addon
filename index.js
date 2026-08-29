const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const LINKS_TEXT_FILE_URL = process.env.LINKS_TEXT_FILE_URL || 'https://raw.githubusercontent.com/sexytrevor78-art/Stremio-autoplay-addon/main/links.txt';

const builder = new addonBuilder({
    id: 'community.stremio.autoplay-direct',
    version: '1.2.0', // Bumped version to force cache refresh
    name: 'Autoplay Direct Links',
    description: 'Provides direct video links structured for Next Up support.',
    resources: ['stream', 'meta', 'catalog'], 
    types: ['series'],
    catalogs: [{ type: 'series', id: 'my_custom_playlist' }],
    idPrefixes: ['myauto'] // Unique prefix so we don't conflict with other addons
});

// Helper to fetch links
async function getLinks() {
    try {
        const response = await fetch(LINKS_TEXT_FILE_URL);
        if (!response.ok) return [];
        const textData = await response.text();
        return textData.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    } catch (e) {
        console.error('Error fetching links:', e);
        return [];
    }
}

// 1. CATALOG HANDLER
builder.defineCatalogHandler(async (args) => {
    return {
        metas: [{
            id: 'myauto:my_playlist',
            type: 'series',
            name: 'My Custom Playlist',
            poster: 'https://via.placeholder.com/200x300.png?text=Playlist',
            description: 'Your custom direct links.'
        }]
    };
});

// 2. META HANDLER (The Fix)
builder.defineMetaHandler(async (args) => {
    const links = await getLinks();
    
    // Map links to episodes
    const videos = links.map((url, index) => ({
        id: `myauto:my_playlist:1:${index + 1}`, // Format: prefix:id:season:episode
        title: `Video ${index + 1}`,
        season: 1,
        episode: index + 1,
        // 🚨 CRITICAL FIX: Stremio NEEDS a released date to enable Next Up
        released: new Date(2024, 0, index + 1).toISOString() 
    }));

    return {
        meta: {
            id: 'myauto:my_playlist',
            type: 'series',
            name: 'My Custom Playlist',
            videos: videos
        }
    };
});

// 3. STREAM HANDLER
builder.defineStreamHandler(async (args) => {
    console.log(`[STREAM REQUEST] Received ID: ${args.id}`); // Check logs to see if Stremio asks for Ep 2
    
    if (args.id.startsWith('myauto:my_playlist')) {
        const links = await getLinks();
        const parts = args.id.split(':');
        const epNum = parseInt(parts[parts.length - 1], 10);

        if (!isNaN(epNum) && links[epNum - 1]) {
            return { streams: [{ url: links[epNum - 1] }] };
        }
    }

    return { streams: [] };
});

const PORT = process.env.PORT || 10000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon running on port ${PORT}`);
