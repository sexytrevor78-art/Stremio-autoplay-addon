const express = require('express');
const fs = require('fs');
const path = require('path');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// =====================================================================
// 1. THE "DATABASE" (Just a simple local file)
// =====================================================================
const DATA_FILE = path.join(__dirname, 'data.json');

// Load existing data, or start fresh
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    return {}; // Empty object if file doesn't exist yet
}

// Save data to the file
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// =====================================================================
// 2. THE ADDON MANIFEST
// =====================================================================
const builder = new addonBuilder({
    id: 'community.stremio.mini-trakt-easy',
    version: '3.1.0',
    name: 'MyTrakt (Easy Mode)',
    description: 'Your personal watchlist. No logins required!',
    // This forces Stremio to ask for a User ID when installing
    config: [
        { key: "userId", title: "Enter your Unique User ID (e.g., your name)", type: "text", required: true }
    ],
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        { type: 'movie', id: 'my-watchlist', name: '📌 My Watchlist' }
    ]
});

// =====================================================================
// 3. CATALOG HANDLER (Shows your watchlist on the home screen)
// =====================================================================
builder.defineCatalogHandler(async (args) => {
    const userId = args.config.userId;
    const allData = loadData();
    
    // Get the specific user's watchlist
    const userWatchlist = allData[userId] || [];
    
    return { metas: userWatchlist };
});

// =====================================================================
// 4. META HANDLER (Adds the "Add to Watchlist" button to movies)
// =====================================================================
builder.defineMetaHandler(async (args) => {
    const userId = args.config.userId;
    // This creates the secret link that saves the movie
    const addWatchlistUrl = `https://stremio-autoplay-addon.onrender.com/api/add/${userId}/${args.type}/${args.id}`;

    return {
        meta: {
            id: args.id,
            type: args.type,
            name: "Manage Your Watchlist",
            poster: "https://via.placeholder.com/200x300.png?text=MyTrakt",
            description: "Click the link below to save this to your personal watchlist!",
            links: [
                { name: "➕ Add to My Watchlist", url: addWatchlistUrl }
            ]
        }
    };
});

// =====================================================================
// 5. STREAM HANDLER (Dummy stream to satisfy Stremio)
// =====================================================================
builder.defineStreamHandler(async (args) => {
    return { streams: [] }; 
});

// =====================================================================
// 6. CUSTOM API ROUTES (The logic that saves the movie to the file)
// =====================================================================
app.get('/api/add/:userId/:type/:id', (req, res) => {
    const { userId, type, id } = req.params;
    
    let allData = loadData();
    
    // If this user doesn't exist in the file yet, create them
    if (!allData[userId]) {
        allData[userId] = [];
    }

    // Check if the movie is already in their watchlist
    const exists = allData[userId].find(item => item.id === id);
    
    if (!exists) {
        // Add it to the file!
        allData[userId].push({ 
            id: id, 
            type: type, 
            name: id, 
            poster: "https://via.placeholder.com/200x300.png?text=Saved!" 
        });
        saveData(allData);
        
        res.send(`
            <h1 style="text-align:center; font-family:sans-serif;">✅ Success!</h1>
            <p style="text-align:center; font-family:sans-serif;">Added to your Watchlist. You can close this tab and open Stremio.</p>
        `);
    } else {
        res.send(`
            <h1 style="text-align:center; font-family:sans-serif;">ℹ️ Already Saved</h1>
            <p style="text-align:center; font-family:sans-serif;">This is already in your watchlist. You can close this tab.</p>
        `);
    }
});

// Mount the Stremio Addon SDK to the Express app
app.use(getRouter(builder.getInterface()));

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 MyTrakt (Easy Mode) running on port ${PORT}`);
});
