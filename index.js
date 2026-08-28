const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Replace this URL with your exact configured PenguPlay URL (cut off '/manifest.json' from the end)
const UPSTREAM_STREAM_URL = 'https://your-configured-penguplay-url-here'; 

app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({
        id: 'community.stremio.autoplay.pengu',
        version: '1.1.0',
        name: 'Auto-Play (PenguPlay)',
        description: 'Automatically selects and plays the top HTTP stream.',
        resources: ['stream'],
        types: ['movie', 'series'],
        idPrefixes: ['tt', 'tmdb']
    });
});

app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        const { type, id } = req.params;
        const upstreamRes = await fetch(`${UPSTREAM_STREAM_URL}/stream/${type}/${id}.json`);
        const data = await upstreamRes.json();

        if (data && data.streams && data.streams.length > 0) {
            // Intercepts and returns only the first available HTTP stream to trigger auto-play
            const selectedStream = data.streams.find(s => s.url) || data.streams[0];

            res.json({ streams: [selectedStream] });
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
