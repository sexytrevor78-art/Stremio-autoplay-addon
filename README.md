# Stremio Autoplay Addon

A lightweight, custom Stremio addon that serves direct video links from a remote text file. It intelligently structures these links as a "TV Series" (Season 1, Episode 1, 2, etc.) to fully support Stremio's Next Up/autoplay behavior.

## ✨ Features
- **Dynamic Link Loading**: Fetches direct video URLs (`.mp4`, `.mkv`, `.m3u8`, etc.) from a simple remote `.txt` file.
- **Next Up Support**: Formats links as episodic content so Stremio's player recognizes the queue and can trigger the "Next Up" countdown.
- **Lightweight & Fast**: Built with Node.js and the official [`stremio-addon-sdk`](https://github.com/Stremio/stremio-addon-sdk).
- **Easy Deployment**: Ready to be hosted for free on platforms like Render, Glitch, or Koyeb.

## ⚙️ Configuration

The addon looks for a text file containing one direct video link per line.

1. Create a file named `links.txt` (e.g., in this GitHub repo or any raw URL host).
2. Add your direct video links, one per line:
   ```text
   https://example.com/video1.mp4
   https://example.com/video2.mkv
   https://example.com/video3.m3u8
   ```

3. Deploy the addon and set the LINKS_URL environment variable to the raw text file URL (optional). If LINKS_URL is not set, the addon will default to the included `links.txt` on the branch it runs from.

## Manifest (manifest.json)

If you need to register the addon manually in Stremio or inspect the manifest, here is the manifest the addon exposes (served at `/manifest.json`):

```json
{
  "id": "community.stremio.autoplay-series",
  "version": "1.0.0",
  "name": "Autoplay Series",
  "description": "Turn a simple text file of direct links into a TV Series for Stremio Next Up/autoplay",
  "resources": ["catalog", "meta", "stream"],
  "types": ["series"],
  "catalogs": [{ "type": "series", "id": "autoplay", "name": "Autoplay Series" }],
  "behaviorHints": { "configurable": false }
}
```

> Note: The live manifest served by the running addon will include the same values above. Use the running addon's `/manifest.json` URL when adding to Stremio (for example `https://your-deploy-url/manifest.json`).

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open `http://localhost:10000/manifest.json` to view the manifest, or add that URL in Stremio -> Add-ons -> Add from URL.

## Deploying

- Deploy the `autoplay-pr` branch to any Node.js host. Set `LINKS_URL` to a raw text file URL containing your links if you prefer to manage links remotely.

## Troubleshooting

- Ensure the links are direct playable URLs. Some hosts block range requests or CORS which can cause playback issues in Stremio.
- If an episode doesn't play, try hosting the file on a different raw/static host (GitHub raw, a CDN, or direct file host).
