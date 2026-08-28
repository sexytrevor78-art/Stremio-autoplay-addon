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
        id: 'community.stremio.textfileautoplay',
        version: '1.0.0',
        name: 'Text File Auto-Play',
        description: 'Pulls links from a text file to auto-play movies.',
        resources: ['stream'],
        types: ['movie', 'series'],
        idPrefixes: ['tt', 'tmdb']
    });
});

app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        // Fetch your text file live
        const response = await fetch(LINKS_TEXT_FILE_URL);
        const textData = await response.text();
        
        // Split the text file by lines to get every individual link
        const links = textData.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (links.length > 0) {
            // Automatically grab the first link from your file and send it to Stremio
            const workingStream = {
                name: "Auto-Play Link",
                title: "Playing top link from text file",
                url: links[0] // or you can loop through to test which one works
            };

            res.json({ streams: [workingStream] });
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
