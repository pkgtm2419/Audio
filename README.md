# 🎵 PAudio - Personal Audio Music Player

A modern, high-performance web music player and installable **Progressive Web App (PWA)** designed to stream 919+ audio tracks directly from this repository via **GitHub Pages** or run offline on any device.

[![Open Web App](https://img.shields.io/badge/Open%20PAudio%20App-https%3A%2F%2Fpkgtm2419.github.io%2FAudio%2F-10b981?style=for-the-badge&logo=googlechrome&logoColor=white)](https://pkgtm2419.github.io/Audio/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable%20App-06b6d4?style=for-the-badge&logo=pwa&logoColor=white)](https://pkgtm2419.github.io/Audio/)
[![Total Tracks](https://img.shields.io/badge/Tracks-919-8b5cf6?style=for-the-badge&logo=audiomack&logoColor=white)](https://pkgtm2419.github.io/Audio/)
[![Storage](https://img.shields.io/badge/Storage-7.2%20GB-f43f5e?style=for-the-badge)](https://pkgtm2419.github.io/Audio/)

---

## 🌐 Live Web App URL

You can open and stream your music anytime from any browser:

👉 **[https://pkgtm2419.github.io/Audio/](https://pkgtm2419.github.io/Audio/)**

---

## 📲 How to Install PAudio on Any Device

PAudio is built as a **Progressive Web App (PWA)** with a dedicated Service Worker. You can install it directly onto your home screen or desktop without needing an app store!

### 📱 Android (Chrome, Edge, Samsung Internet)
1. Open **[https://pkgtm2419.github.io/Audio/](https://pkgtm2419.github.io/Audio/)** on your phone.
2. Tap the **"Install App"** button inside the app (or tap the browser menu `⋮` > **Install app** / **Add to Home screen**).
3. PAudio will be installed onto your home screen and app drawer as an independent, standalone music player app with full lock-screen playback controls.

### 🍎 iPhone & iPad (iOS Safari)
1. Open **[https://pkgtm2419.github.io/Audio/](https://pkgtm2419.github.io/Audio/)** in Safari.
2. Tap the **Share** button (the square icon with an upward-pointing arrow at the bottom of the screen).
3. Scroll down and select **Add to Home Screen**.
4. Tap **Add** in the top-right corner. PAudio will appear on your iOS home screen and launch fullscreen without browser bars.

### 💻 Windows PC, Mac & Linux (Chrome, Edge, Brave)
1. Open **[https://pkgtm2419.github.io/Audio/](https://pkgtm2419.github.io/Audio/)** in your browser.
2. Click the **"Install App"** button in the sidebar, or click the **Install icon** (monitor with arrow) in your browser's address bar.
3. PAudio will open in its own clean desktop window and can be pinned to your Windows Taskbar or macOS Dock.

---

## ✨ Key Features

- 🎧 **Native Range Streaming**: Direct audio streaming with HTTP 206 partial content support for instantaneous seeking, scrubbing, and zero buffering lag.
- 📴 **Offline Shell & PWA Support**: Service Worker (`sw.js`) precaches the complete app shell, stylesheet, icons, and catalog for ultra-fast startup and offline capability.
- ⚡ **Virtual Scroll Performance**: Chunked rendering engine easily handles 900+ audio tracks at smooth 60 FPS without memory bottlenecks.
- 🎨 **Modern Dark Glassmorphic UI**: Cohesive dark obsidian theme with neon emerald/cyan accents, vinyl album art, responsive drawer navigation, and glass backdrop filters.
- 📊 **Real-Time Audio Visualizer**: HTML5 Canvas spectrum analyzer powered by the Web Audio API that responds dynamically to playback frequencies.
- 💿 **Ambient Vinyl Fullscreen Mode**: Interactive spinning vinyl disc animation with synchronized track glow, scrubber, and ambient visualizer.
- 🔍 **Instant Search & Genre Filtering**: Sub-5ms search across song titles, artists, and filenames, with one-click category chips (Punjabi, Bollywood, Romantic, Sufi, Devotional, Rap, Lo-Fi, Poetry).
- 🔀 **Full Playback Controls**: Unrepeated shuffle, repeat all, repeat one, jump seek (-10s / +10s), volume controls, and playback speed adjustment (0.75x to 2.0x).
- ❤️ **Favorites & Custom Playlists**: Like songs and create personal playlists stored persistently in browser `localStorage`.
- 📋 **Live Queue Management**: View upcoming tracks, reorder, remove items, or play next with instant 0ms latency.
- ⌨️ **Keyboard Shortcuts**: Complete desktop keyboard shortcuts for hands-free music control.
- 📱 **System Media Session Integration**: Controls display on your phone lock screen, Windows media overlay, and wireless Bluetooth headphones/earbuds.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek Backward / Forward 5s |
| <kbd>Shift</kbd> + <kbd>←</kbd> | Previous Track |
| <kbd>Shift</kbd> + <kbd>→</kbd> | Next Track |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume Up / Down 5% |
| <kbd>M</kbd> | Mute / Unmute Audio |
| <kbd>S</kbd> | Toggle Shuffle Mode |
| <kbd>R</kbd> | Toggle Repeat Mode (Off / All / One) |
| <kbd>F</kbd> | Toggle Fullscreen Ambient Vinyl Mode |
| <kbd>/</kbd> | Focus Search Bar |
| <kbd>?</kbd> | Open Shortcuts Modal |
| <kbd>Esc</kbd> | Close Drawers, Modals & Fullscreen |

---

## 📁 Repository Structure

```
Audio/
├── .github/
│   └── workflows/
│       └── update-catalog.yml    # Automatic catalog regeneration workflow
├── icons/                        # PWA Icons (192px, 512px, maskable, SVG)
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   └── icon-maskable-512.png
├── songs/                        # Dedicated folder containing all audio files (~7.2 GB)
│   ├── 12 Saal.mp3
│   └── ...
├── app.js                        # Audio playback engine, PWA install & MediaSession
├── generate-catalog.cjs          # Metadata parser & JSON/JS catalog generator
├── index.html                    # Single-page web app entry point
├── manifest.webmanifest          # PWA Web App Manifest
├── README.md                     # Documentation & usage guide
├── songs.js                      # Pre-generated JavaScript catalog (offline file:/// support)
├── songs.json                    # Structured JSON catalog (HTTP fetch support)
├── style.css                     # Dark glassmorphic responsive stylesheet
└── sw.js                         # Service Worker with Range request bypass
```

---

## 🔄 Adding New Songs

Whenever you add new MP3 files to the repository:

### Method 1: Automated (GitHub Actions)
Simply push your new audio files into the `songs/` folder on branch `main`. The included GitHub Actions workflow (`.github/workflows/update-catalog.yml`) will automatically scan new files, parse ID3 tags, update `songs.json` and `songs.js`, and commit them.

### Method 2: Manual / Local
1. Add new audio files into the `songs/` folder.
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

## 💻 Local Testing & Offline Running

- **Direct Launch**: Double-click `index.html` to open in any web browser (works offline without CORS errors via `songs.js`).
- **Local Web Server**:
  ```bash
  # Using Python:
  python -m http.server 8080

  # Or using Node:
  npx serve .
  ```
  Open `http://localhost:8080` in your browser.
