const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// Remove any trailing slash just in case
const FIREBASE_DB_URL = 'https://mytrakt-f15b2-default-rtdb.firebaseio.com'.replace(/\/$/, "");

// Helper: Load user data from Firebase
async function loadData(userId) {
    try {
        const url = `${FIREBASE_DB_URL}/users/${userId}.json`;
        console.log(`[FIREBASE] Fetching from: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        console.log(`[FIREBASE] Raw response for ${userId}:`, JSON.stringify(data));
        return data && data.watchlist ? data : { watchlist: [] };
    } catch (e) {
        console.error("[FIREBASE] Error loading:", e);
        return { watchlist: [] };
    }
}

// Helper: Save user data to Firebase
async function saveData(userId, data) {
    try {
        const url = `${FIREBASE_DB_URL}/users/${userId}.json`;
        console.log(`[FIREBASE] Saving to: ${url} with data:`, JSON.stringify(data));
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        console.log(`[FIREBASE] Save response status:`, response.status);
    } catch (e) {
        console.error("[FIREBASE] Error saving:", e);
    }
}

// =====================================================================
// 1. THE ADDON MANIFEST
// =====================================================================
const builder = new addonBuilder({
    id: 'community.stremio.mini-trakt-permanent',
    version: '4.1.0',
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
// 2. CATALOG HANDLER
// =====================================================================
builder.defineCatalogHandler(async (args) => {
    console.log("[CATALOG] Stremio requested catalog with args:", JSON.stringify(args));
    const userId = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    console.log(`[CATALOG] Extracted userId: ${userId}`);
    
    const userData = await loadData(userId);
    console.log(`[CATALOG] Returning metas for ${userId}:`, JSON.stringify(userData.watchlist));
    
    return { metas: userData.watchlist || [] };
});

// =====================================================================
// 3. META HANDLER
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
// 5. CUSTOM API ROUTES
// =====================================================================
app.get('/api/add/:userId/:type/:id', async (req, res) => {
    const { userId, type, id } = req.params;
    console.log(`\n[API] === ADD REQUEST ===`);
    console.log(`[API] User: ${userId}, Type: ${type}, ID: ${id}`);
    
    const userData = await loadData(userId);
    const exists = userData.watchlist.find(item => item.id === id);
    
    if (!exists) {
        userData.watchlist.push({ 
            id: id, 
            type: type, 
            name: id, 
            poster: "https://via.placeholder.com/200x300.png?text=Saved!" 
        });
        await saveData(userId, userData);
        console.log(`[API] === SUCCESSFULLY SAVED ===\n`);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <h1 style="text-align:center; font-family:sans-serif; color:#00d4ff;">✅ Permanently Saved!</h1>
            <p style="text-align:center; font-family:sans-serif;">Added <b>${id}</b> to your cloud Watchlist.<br>Please check your Render Logs to confirm.</p>
        `);
    } else {
        console.log(`[API] === ALREADY EXISTS ===\n`);
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <h1 style="text-align:center; font-family:sans-serif; color:orange;">ℹ️ Already Saved</h1>
            <p style="text-align:center; font-family:sans-serif;">This is already in your permanent watchlist.</p>
        `);
    }
});

// =====================================================================
// 6. CONFIGURE PAGE
// =====================================================================
app.get('/configure', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MyTrakt Configuration</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: white; margin: 0; }
                .container {
// =====================================================================
// 7. MOUNT THE STREMIO ADDON SDK
// =====================================================================
app.use(getRouter(builder.getInterface()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 MyTrakt (Permanent) running on port ${PORT}`);
});
