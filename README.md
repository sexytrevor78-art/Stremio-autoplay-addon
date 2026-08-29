# Stremio Autoplay Addon

A lightweight, custom Stremio addon that serves direct video links from a remote text file. It intelligently structures these links as a "TV Series" (Season 1, Episode 1, 2, etc.) to fully support Stremio's native **"Next Up"** and auto-play features.

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
https://stremio-autoplay-addon.onrender.com/
