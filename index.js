const express = require('express');
const fs = require('fs');
const path = require('path');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// =====================================================================
// 1. THE "DATABASE" (Just a simple local file)
// =====================================================================
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("Error reading data file:", e);
    }
    return {};
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error saving data file:", e);
    }
}

// =====================================================================
// 2. THE ADDON MANIFEST
// =====================================================================
const builder = new addonBuilder({
    id: 'community.stremio.mini-trakt-easy',
    version: '3.2.0',
    name: 'MyTrakt (Easy Mode)',
    description: 'Your personal watchlist. No logins required!',
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
// 3. CATALOG HANDLER
// =====================================================================
builder.defineCatalogHandler(async (args) => {
    const userId = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    const allData = loadData();
    const userWatchlist = allData[userId] || [];
    return { metas: userWatchlist };
});

// =====================================================================
// 4. META HANDLER (Creates the "Add" link)
// =====================================================================
builder.defineMetaHandler(async (args) => {
    const userId = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 10000}`;
    const addWatchlistUrl = `${baseUrl}/api/add/${encodeURIComponent(userId)}/${args.type}/${encodeURIComponent(args.id)}`;

    return {
        meta: {
            id: args.id,
            type: args.type,
            name: "Manage Your Watchlist",
            poster: "https://via.placeholder.com/200x300.png?text=MyTrakt",
            description: `Click the link below to save this to your personal watchlist! (Active User: ${userId})`,
            links: [
                { name: "➕ Add to My Watchlist", url: addWatchlistUrl }
            ]
        }
    };
});

// =====================================================================
// 5. STREAM HANDLER
// =====================================================================
builder.defineStreamHandler(async (args) => {
    return { streams: [] }; 
});

// =====================================================================
// 6. CUSTOM API ROUTES (The logic that saves the movie)
// =====================================================================
app.get('/api/add/:userId/:type/:id', (req, res) => {
    const { userId, type, id } = req.params;
    console.log(`[API] Adding to watchlist: User=${userId}, Type=${type}, ID=${id}`);
    
    let allData = loadData();
    
    if (!allData[userId]) {
        allData[userId] = [];
    }

    const exists = allData[userId].find(item => item.id === id);
    
    if (!exists) {
        allData[userId].push({ 
            id: id, 
            type: type, 
            name: id, 
            poster: "https://via.placeholder.com/200x300.png?text=Saved!" 
        });
        saveData(allData);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <h1 style="text-align:center; font-family:sans-serif; color:green;">✅ Success!</h1>
            <p style="text-align:center; font-family:sans-serif;">Added <b>${id}</b> to your Watchlist.<br>You can close this tab and check Stremio.</p>
        `);
    } else {
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <h1 style="text-align:center; font-family:sans-serif; color:orange;">ℹ️ Already Saved</h1>
            <p style="text-align:center; font-family:sans-serif;">This is already in your watchlist.</p>
        `);
    }
});

// =====================================================================
// 7. CONFIGURE PAGE (Mobile-friendly version)
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
                .container { max-width: 400px; margin: 0 auto; background: #2a2a2a; padding: 30px; border-radius: 10px; }
                h1 { text-align: center; color: #00d4ff; }
                label { display: block; margin-bottom: 10px; font-size: 16px; }
                input { width: 100%; padding: 12px; margin-bottom: 20px; border: none; border-radius: 5px; font-size: 16px; box-sizing: border-box; }
                button { width: 100%; padding: 15px; background: #00d4ff; color: #000; border: none; border-radius: 5px; font-size: 18px; font-weight: bold; cursor: pointer; margin-bottom: 10px; }
                button:hover { background: #00a8cc; }
                .info { background: #333; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 14px; }
                .manual-install { background: #1a1a1a; padding: 15px; border-radius: 5px; margin-top: 20px; border: 1px solid #00d4ff; }
                .manual-install h3 { color: #00d4ff; margin-top: 0; }
                .url-box { background: #000; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; margin: 10px 0; }
                .copy-btn { background: #444; color: white; padding: 8px 15px; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎬 MyTrakt Setup</h1>
                <div class="info">
                    <p><strong>Enter your unique User ID below.</strong></p>
                    <p>This can be your name, nickname, or any word you want. It's used to save your personal watchlist.</p>
                </div>
                <form id="configForm">
                    <label for="userId">Your User ID:</label>
                    <input type="text" id="userId" name="userId" placeholder="e.g., trevor" required>
                    <button type="submit">Install in Stremio</button>
                </form>
                
                <div class="manual-install">
                    <h3>Manual Install (If button doesn't work)</h3>
                    <p>1. Enter your User ID above</p>
                    <p>2. Copy this URL:</p>
                    <div class="url-box" id="manifestUrl">https://stremio-autoplay-addon.onrender.com/manifest.json</div>
                    <button class="copy-btn" onclick="copyUrl()">Copy URL</button>
                    <p>3. Open Stremio → Add-ons → Add an addon → Paste the URL</p>
                </div>
            </div>
            <script>
                document.getElementById('configForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    const userId = document.getElementById('userId').value;
                    const manifestUrl = window.location.origin + '/manifest.json?userId=' + encodeURIComponent(userId);
                    
                    window.location.href = manifestUrl;
                    document.getElementById('manifestUrl').textContent = manifestUrl;
                    alert('If Stremio did not open automatically, please copy the URL below and paste it in Stremio manually.');
                });
                
                function copyUrl() {
                    const url = document.getElementById('manifestUrl').textContent;
                    navigator.clipboard.writeText(url).then(() => {
                        alert('URL copied! Now open Stremio and paste it in Add-ons.');
                    }).catch(() => {
                        alert('Please manually select and copy the URL above.');
                    });
                }
            </script>
        </body>
        </html>
    `);
});

// =====================================================================
// 8. MOUNT THE STREMIO ADDON SDK
// =====================================================================
app.use(getRouter(builder.getInterface()));

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(` MyTrakt (Easy Mode) running on port ${PORT}`);
});
