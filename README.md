# 🎵 PAudio - Personal Audio Music Player

A modern, high-performance web music player designed to stream audio files directly from this repository via **GitHub Pages** or run offline on your local machine as an installable Progressive Web App (PWA).

![PAudio Preview](https://img.shields.io/badge/PAudio-Personal%20Audio-10b981?style=for-the-badge&logo=music)
![Total Tracks](https://img.shields.io/badge/Tracks-919-06b6d4?style=for-the-badge)
![Storage](https://img.shields.io/badge/Storage-7.2%20GB-8b5cf6?style=for-the-badge)

---

## 🚀 Live GitHub Pages Deployment

To publish this music player on GitHub Pages:

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Add AudioVault music player application"
   git push origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages** (under "Code and automation" in the left sidebar).
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select Branch: `main` and Folder: `/ (root)`.
   - Click **Save**.
3. Within 1–2 minutes, your music player will be live at:
   ```
   https://<your-github-username>.github.io/Audio/
   ```

---

## ✨ Features

- 🎧 **Direct Streaming from Repo**: Streams MP3 files directly from the repository using HTTP range requests for instant seek and buffering.
- ⚡ **Ultra-Fast Performance**: Custom chunked virtual scrolling easily handles 900+ tracks at 60 FPS without DOM lag.
- 🎨 **Modern Glassmorphic Dark UI**: Sleek aesthetic with neon accents, responsive sidebar, and custom smooth scrollbars.
- 📊 **Real-Time Audio Visualizer**: HTML5 Canvas + Web Audio API frequency spectrum analyzer that dances with your music.
- 💿 **Ambient Vinyl Fullscreen Mode**: Interactive spinning vinyl disc animation with synchronized audio visualizer and track details.
- 🔍 **Instant Search & Filter**: Sub-5ms search across song titles, artists, and filenames, with category filter chips (Punjabi, Bollywood, Romantic, Sufi, Devotional, Rap, Lo-Fi, Poetry).
- 🔀 **Flexible Playback Modes**: Smart unrepeated shuffle, repeat all, repeat one, jump seek (-10s / +10s), and speed control (0.75x to 2.0x).
- ❤️ **Favorites & Custom Playlists**: Like tracks and create custom playlists that persist in your browser's `localStorage`.
- 📋 **Play Queue**: Add to queue, reorder, view upcoming tracks, and manage your listening flow.
- ⌨️ **Full Keyboard Shortcuts**: Control playback without touching your mouse.
- 📱 **System Media Session Integration**: Native lock screen, Windows media overlay, and Bluetooth headphone/earbud controls support.
- 📴 **Offline & Local Testing**: Works both when served via HTTP and when opened directly by double-clicking `index.html` (via fallback `songs.js`).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek Backward / Forward 5s |
| <kbd>Shift</kbd> + <kbd>←</kbd> | Previous Track |
| <kbd>Shift</kbd> + <kbd>→</kbd> | Next Track |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume Up / Down 5% |
| <kbd>M</kbd> | Mute / Unmute |
| <kbd>S</kbd> | Toggle Shuffle Mode |
| <kbd>R</kbd> | Toggle Repeat Mode (Off / All / One) |
| <kbd>F</kbd> | Toggle Fullscreen Ambient Mode |
| <kbd>/</kbd> | Focus Search Bar |
| <kbd>?</kbd> | Open Keyboard Shortcuts Guide |
| <kbd>Esc</kbd> | Close Modals / Exit Fullscreen |

---

## 🔄 Adding New Songs

Whenever you add new MP3 files to the repository:

### Option 1: Automated (GitHub Actions)
Push your new audio files into the `songs/` folder on `main`. The included GitHub Actions workflow (`.github/workflows/update-catalog.yml`) will automatically run the generator and commit the updated catalog.

### Option 2: Manual / Local
1. Place new audio files into the `songs/` folder.
2. Run the catalog generator:
   ```bash
   node generate-catalog.cjs
   ```
3. Commit and push:
   ```bash
   git add .
   git commit -m "Add new songs and update catalog"
   git push origin main
   ```

---

## 💻 Local Development & Testing

- **Quick Launch**: Double-click `index.html` to open in any web browser.
- **Local Web Server**:
  ```bash
  # Using Python:
  python -m http.server 8080

  # Or using Node:
  npx serve .
  ```
  Open `http://localhost:8080` in your browser.
