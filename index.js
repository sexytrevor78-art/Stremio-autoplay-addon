const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// Your text file URL
const LINKS_TEXT_FILE_URL = process.env.LINKS_TEXT_FILE_URL || 'https://raw.githubusercontent.com/sexytrevor78-art/Stremio-autoplay-addon/main/links.txt';

const builder = new addonBuilder({
    id: 'community.stremio.autoplay-direct',
    version: '1.1.0',
    name: 'Autoplay Direct Links',
    description: 'Provides direct video links structured as a series for Next Up support.',
    // We added 'meta' and 'catalog' so Stremio can show the episodes and the "Next Up" UI
    resources: ['stream', 'meta', 'catalog'], 
    types: ['series', 'movie'],
    catalogs: [{ type: 'series', id: 'my_custom_playlist' }],
    idPrefixes: ['tt', 'tmdb', 'kitsu', 'autoplay']
});

// Helper function to fetch and clean the links
async function getLinks() {
    try {
        const response = await fetch(LINKS_TEXT_FILE_URL);
        if (!response.ok) return [];
        const textData = await response.text();
        return textData.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    } catch (e) {
        return [];
    }
}

// 1. CATALOG HANDLER: Makes your playlist show up on the Stremio Home Screen
builder.defineCatalogHandler(async (args) => {
    return {
        metas: [
            {
                id: 'autoplay:my_playlist',
                type: 'series',
                name: 'My Custom Playlist',
                poster: 'https://via.placeholder.com/200x300.png?text=My+Playlist',
                description: 'Your custom direct links, structured for Next Up auto-play.'
            }
        ]
    };
});

// 2. META HANDLER: This is the magic! It tells Stremio what the "Episodes" are.
builder.defineMetaHandler(async (args) => {
    const links = await getLinks();
    
    // Map each link to an "Episode" object
    const videos = links.map((url, index) => ({
        id: `autoplay:my_playlist:1:${index + 1}`, // Format: series_id:season:episode
        title: `Video ${index + 1}`,
        season: 1,
        episode: index + 1,
        // We embed the stream directly in the meta so Stremio knows exactly how to play it
        streams: [{ url: url }] 
    }));

    return {
        meta: {
            id: 'autoplay:my_playlist',
            type: 'series',
            name: 'My Custom Playlist',
            videos: videos // Stremio reads this array to build the "Next Up" queue!
        }
    };
});

// 3. STREAM HANDLER: Fallback for when Stremio asks for a specific stream
builder.defineStreamHandler(async (args) => {
    const links = await getLinks();
    
    // If Stremio asks for a specific episode ID, try to return just that link
    if (args.id && args.id.includes(':')) {
        const parts = args.id.split(':');
        const episodeNum = parseInt(parts[parts.length - 1], 10);
        
        if (!isNaN(episodeNum) && links[episodeNum - 1]) {
            return { streams: [{ url: links[episodeNum - 1] }] };
        }
    }

    // Fallback: return all links if it's a generic request
    const streams = links.map((url, index) => ({
        name: 'Autoplay Direct',
        title: `Stream Option ${index + 1}`,
        url: url
    }));
    
    return { streams };
});

// Start the server
const PORT = process.env.PORT || 10000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon running on port ${PORT}`);
