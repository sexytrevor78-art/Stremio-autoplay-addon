const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const app = express();

const DB = 'https://mytrakt-f15b2-default-rtdb.firebaseio.com';

async function loadData(uid) {
    const res = await fetch(`${DB}/users/${uid}.json`);
    const data = await res.json();
    return (data && data.watchlist) ? data : { watchlist: [] };
}

async function saveData(uid, data) {
    await fetch(`${DB}/users/${uid}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

const builder = new addonBuilder({
    id: 'community.stremio.mini-trakt-permanent',
    version: '4.2.0',
    name: 'MyTrakt (Permanent)',
    description: 'Your personal watchlist, saved permanently!',
    config: [{ key: "userId", title: "Enter User ID (e.g., Reddemon)", type: "text", required: true }],
    behaviorHints: { configurable: true },
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [{ type: 'movie', id: 'my-watchlist', name: 'My Watchlist' }]
});

builder.defineCatalogHandler(async (args) => {
    const uid = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    const data = await loadData(uid);
    return { metas: data.watchlist || [] };
});

builder.defineMetaHandler(async (args) => {
    const uid = (args.config && args.config.userId) ? args.config.userId : 'default_user';
    const url = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000'}/api/add/${encodeURIComponent(uid)}/${args.type}/${encodeURIComponent(args.id)}`;
    return { 
        meta: { 
            id: args.id, 
            type: args.type, 
            name: "Add to Watchlist", 
            poster: "https://via.placeholder.com/200x300.png?text=MyTrakt", 
            description: `Active User: ${uid}. Click link to save.`, 
            links: [{ name: "Add to Watchlist", url: url }] 
        } 
    };
});

builder.defineStreamHandler(async (args) => { 
    return { streams: [] }; 
});

app.get('/api/add/:uid/:type/:id', async (req, res) => {
    const { uid, type, id } = req.params;
    const data = await loadData(uid);
    if (!data.watchlist.find(i => i.id === id)) {
        data.watchlist.push({ id, type, name: id, poster: "https://via.placeholder.com/200x300.png?text=Saved" });
        await saveData(uid, data);
    }
    res.send('<h1 style="text-align:center;color:#00d4ff;">✅ Saved!</h1><p style="text-align:center;">Check Stremio.</p>');
});

app.get('/configure', (req, res) => {
    res.send('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#1a1a1a;color:white;text-align:center;padding:20px;font-family:Arial;"><h1>MyTrakt Setup</h1><input id="u" placeholder="User ID (e.g. Reddemon)" style="padding:12px;font-size:16px;width:80%;margin-bottom:15px;border-radius:5px;border:none;"><br><button onclick="gen()" style="padding:12px 24px;font-size:16px;background:#00d4ff;border:none;border-radius:5px;font-weight:bold;cursor:pointer;">Generate URL</button><div id="out" style="margin-top:25px;display:none;"><p>Copy this URL:</p><textarea id="url" style="width:90%;height:60px;background:#000;color:#0f0;border:2px solid #00d4ff;border-radius:5px;padding:10px;font-family:monospace;" readonly></textarea><br><button onclick="copy()" style="padding:12px 24px;margin-top:15px;font-size:16px;background:#4CAF50;color:white;border:none;border-radius:5px;cursor:pointer;">📋 Copy URL</button></div><script>function gen(){const u=document.getElementById("u").value;const url=window.location.origin+"/manifest.json?userId="+encodeURIComponent(u);document.getElementById("url").value=url;document.getElementById("out").style.display="block";}function copy(){navigator.clipboard.writeText(document.getElementById("url").value).then(()=>alert("Copied!")).catch(()=>alert("Please select and copy manually."));}</script></body></html>');
});

app.use(getRouter(builder.getInterface()));
app.listen(process.env.PORT || 10000, () => console.log('🚀 Running on port', process.env.PORT || 10000));
