const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

//  YOUR PERMANENT FIREBASE DATABASE URL 
const FIREBASE_DB_URL = 'https://mytrakt-f15b2-default-rtdb.firebaseio.com';

// Helper: Load user data from Firebase
async function loadData(userId) {
    try {
        const response = await fetch(`${FIREBASE_DB_URL}/users/${userId}.json`);
        const data = await response.json();
        return data || { watchlist: [] }; 
    } catch (e) {
        console.error("Error loading from Firebase:", e);
        return { watchlist: [] };
    }
}

// Helper: Save user data to Firebase
async function saveData(userId, data) {
    try {
        await fetch(`${FIREBASE_DB_URL}/users/${userId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error("Error saving to Firebase:", e);
    }
}

// =====================================================================
// 1. THE ADDON MANIFEST
// =====================================================================
const builder = new addonBuilder({
    id: 'community.stremio.mini-trakt-permanent',
    version: '4.0.0',
    name: 'MyTrakt (Permanent)',
    description: 'Your personal watchlist, saved permanently in the cloud!',
    config: [
        { key: "userId", title: "Enter your Unique User ID (e.g., your name)", type: "text", required: true }
    ],
    behaviorHints: {
        configurable: true 
    },
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        { type: 'movie', id: 'my-watchlist', name: '📌 My Watchlist' }
    ]
});

// =====================================================================
// 2. CATALOG HANDLER (Shows your permanent watchlist)
// =====================================================================
builder.defineCatalogHandler(async (args) => {
    const userId = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    const userData = await loadData(userId);
    return { metas: userData.watchlist || [] };
});

// =====================================================================
// 3. META HANDLER (Creates the "Add" link)
// =====================================================================
builder.defineMetaHandler(async (args) => {
    const userId = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    const addWatchlistUrl = `${baseUrl}/api/add/${encodeURIComponent(userId)}/${args.type}/${encodeURIComponent(args.id)}`;

    return {
        meta: {
            id: args.id,
            type: args.type,
            name: "Manage Your Permanent Watchlist",
            poster: "https://via.placeholder.com/200x300.png?text=MyTrakt",
            description: `Click the link below to save this permanently! (Active User: ${userId})`,
            links: [
                { name: "➕ Add to My Permanent Watchlist", url: addWatchlistUrl }
            ]
        }
    };
});

// =====================================================================
// 4. STREAM HANDLER
// =====================================================================
builder.defineStreamHandler(async (args) => {
    return { streams: [] }; 
});

// =====================================================================
// 5. CUSTOM API ROUTES (Saves to Firebase permanently)
// =====================================================================
app.get('/api/add/:userId/:type/:id', async (req, res
