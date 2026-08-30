const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');

const app = express();

// YOUR PERMANENT FIREBASE DATABASE URL
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
// 2. CATALOG HANDLER
// =====================================================================
builder.defineCatalogHandler(async (args) => {
    const userId = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    const userData = await loadData(userId);
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
// 5. CUSTOM API ROUTES (This is the line that was missing a bracket before!)
// =====================================================================
app.get('/api/add/:userId/:type/:id', async (req, res) => {
    const { userId, type, id } = req.params;
    console.log(`[API] Adding to permanent watchlist: User=${userId}, ID=${id}`);
    
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
        
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <h1 style="text-align:center; font-family:sans-serif; color:#00d4ff;">✅ Permanently Saved!</h1>
            <p style="text-align:center; font-family:sans-serif;">Added <b>${id}</b> to your cloud Watchlist.<br>It will never disappear now. You can close this tab.</p>
        `);
    } else {
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
                .container { max-width: 400px; margin: 0 auto; background: #2a2a2a; padding: 30px; border-radius: 10px; }
                h1 { text-align: center; color: #00d4ff; }
                label { display: block; margin-bottom: 10px; font-size: 16px; }
                input { width: 100%; padding: 12px; margin-bottom: 20px; border: none; border-radius: 5px; font-size: 16px; box-sizing: border-box; }
                button { width: 100%; padding: 15px; background: #00d4ff; color: #000; border: none; border-radius: 5px; font-size: 18px; font-weight: bold; cursor: pointer; margin-bottom: 10px; }
                button:hover { background: #00a8cc; }
                .info { background: #333; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 14px; }
                .url-container { background: #000; padding: 15px; border-radius: 5px; margin-top: 20px; border: 2px solid #00d4ff; }
                .url-box { 
                    background: #1a1a1a; 
                    padding: 12px; 
                    border-radius: 5px; 
                    word-break: break-all; 
                    font-family: monospace; 
                    font-size: 13px; 
                    margin: 10px 0; 
                    color: #00ff00;
                    user-select: all;
                    -webkit-user-select: all;
                }
                .copy-btn { background: #4CAF50; color: white; padding: 12px 15px; font-size: 16px; }
                .step { background: #333; padding: 10px; margin: 10px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎬 MyTrakt Setup</h1>
                <div class="info">
                    <p><strong>Step 1: Enter your User ID</strong></p>
                    <p>This saves your watchlist permanently to the cloud.</p>
                </div>
                <form id="configForm">
                    <label for="userId">Your User ID:</label>
                    <input type="text" id="userId" name="userId" placeholder="e.g., Reddemon" required>
                    <button type="submit">Generate Install URL</button>
                </form>
                
                <div id="urlContainer" class="url-container" style="display:none;">
                    <h3 style="color:#00d4ff; margin-top:0;">Step 2: Copy this URL</h3>
                    <div class="url-box" id="manifestUrl"></div>
                    <button class="copy-btn" onclick="copyUrl()">📋 Copy URL</button>
                    
                    <div class="step">
                        <strong>Step 3: Install in Stremio</strong><br>
                        1. Open Stremio app<br>
                        2. Go to Add-ons → Add an addon<br>
                        3. Paste the URL and click Install
                    </div>
                </div>
            </div>
            <script>
                document.getElementById('configForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    const userId = document.getElementById('userId').value;
                    const manifestUrl = window.location.origin + '/manifest.json?userId=' + encodeURIComponent(userId);
                    
                    document.getElementById('manifestUrl').textContent = manifestUrl;
                    document.getElementById('urlContainer').style.display = 'block';
                    document.getElementById('urlContainer').scrollIntoView({behavior: 'smooth'});
                });
                
                function copyUrl() {
                    const url = document.getElementById('manifestUrl').textContent;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(url).then(() => {
                            alert('✅ URL copied! Now open Stremio and paste it in Add-ons.');
                        }).catch(() => {
                            fallbackCopy(url);
                        });
                    } else {
                        fallbackCopy(url);
                    }
                }
                
                function fallbackCopy(text) {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        alert('✅ URL copied! Now open Stremio and paste it in Add-ons.');
                    } catch (err) {
                        alert('Please manually select and copy the URL above.');
                    }
                    document.body.removeChild(textArea);
                }
            </script>
        </body>
        </html>
    `);
});

// =====================================================================
// 7. MOUNT THE STREMIO ADDON SDK
// =====================================================================
app.use(getRouter(builder.getInterface()));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 MyTrakt (Permanent) running on port ${PORT}`);
});
