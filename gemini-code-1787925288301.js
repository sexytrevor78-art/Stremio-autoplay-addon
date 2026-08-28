const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Put the raw URL to your text file containing your links (one link per line)
const LINKS_TEXT_FILE_URL = 'https://raw.githubusercontent.com/your-username/your-repo/main/links.txt';

app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({
        id: 'community.stremio.flatlist',
        version: '1.0.2',
        name: 'Direct Links Streamer',
        description: 'Pulls uniform direct links from your text file.',
        resources: ['stream'],
        types: ['movie', 'series'],
        idPrefixes: ['tt', 'tmdb']
    });
});

app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        const response = await fetch(LINKS_TEXT_FILE_URL);
        const textData = await response.text();
        const links = textData.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (links.length > 0) {
            // Maps your uniform list of links into clean, numbered options
            const streams = links.map((url, index) => ({
                name: `Direct Link ${index + 1}`,
                title: `Stream Option ${index + 1}`,
                url: url
            }));

            res.json({ streams: streams });
        } else {
            res.json({ streams: [] });
        }
    } catch (e) {
        res.json({ streams: [] });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Addon running on port ${PORT}`);
});