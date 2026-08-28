const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const LINKS_TEXT_FILE_URL = 'https://raw.githubusercontent.com/your-username/your-repo/main/links.txt';

app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({
        id: 'community.stremio.trueautoplay',
        version: '1.0.1',
        name: 'True Auto-Play',
        description: 'Bypasses the stream menu and auto-plays instantly.',
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
            // STRICT AUTO-PLAY: Returning an array with strictly 1 item 
            // forces Stremio to bypass the menu and start playing immediately.
            res.json({
                streams: [
                    {
                        name: "Auto-Play",
                        title: "Launching Stream...",
                        url: links[0]
                    }
                ]
            });
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
