const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// TODO: Replace this with your actual raw text file URL containing one direct video link per line.
// Example: 'https://raw.githubusercontent.com/sexytrevor78-art/your-repo/main/links.txt'
const LINKS_TEXT_FILE_URL = process.env.LINKS_TEXT_FILE_URL || 'https://raw.githubusercontent.com/sexytrevor78-art/Stremio-autoplay-addon/main/links.txt';

const builder = new addonBuilder({
    id: 'community.stremio.autoplay-direct',
    version: '1.0.0',
    name: 'Autoplay Direct Links',
    description: 'Provides direct video links from a text file for seamless playback.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', 'tmdb', 'kitsu']
});

builder.defineStreamHandler(async (args) => {
    try {
        // Fetch the links from the text file
        const response = await fetch(LINKS_TEXT_FILE_URL);
        
        if (!response.ok) {
            console.error(`Failed to fetch links: ${response.status} ${response.statusText}`);
            return { streams: [] };
        }
        
        const textData = await response.text();
        
        // Split by newline, trim whitespace, and filter out empty lines or non-HTTP lines
        const links = textData
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('http'));

        if (links.length > 0) {
            // Format links into Stremio stream objects
            const streams = links.map((url, index) => ({
                name: 'Autoplay Direct',
                title: `Stream Option ${index + 1}`,
                url: url
            }));
            return { streams };
        } else {
            console.log('No valid HTTP links found in the text file.');
            return { streams: [] };
        }
    } catch (error) {
        console.error('Error in stream handler:', error);
        return { streams: [] };
    }
});

// Start the server
const PORT = process.env.PORT || 10000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon running on port ${PORT}`);
console.log(`Test it locally at: http://localhost:${PORT}/manifest.json`);
