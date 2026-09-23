/**
 * AudioVault Web Music Player Engine
 * High-performance, zero-dependency audio player with Web Audio API visualizer,
 * MediaSession API, virtualized infinite scrolling, and offline fallback support.
 */

(() => {
  'use strict';

  // --- State ---
  const state = {
    allSongs: [],
    filteredSongs: [],
    playbackQueue: [],
    currentSong: null,
    currentIndex: -1,
    isPlaying: false,
    isShuffle: localStorage.getItem('audiovault_shuffle') === 'true',
    repeatMode: localStorage.getItem('audiovault_repeat') || 'all', // 'off' | 'all' | 'one'
    volume: parseFloat(localStorage.getItem('audiovault_volume') || '0.8'),
    playbackRate: 1.0,
    isMuted: false,
    currentView: 'all', // 'all' | 'favorites' | 'recent' | 'artists' | playlist
    currentCategory: 'all',
    searchQuery: '',
    sortOrder: 'default',
    viewMode: localStorage.getItem('audiovault_view_mode') || 'grid', // 'grid' | 'list'
    favorites: new Set(JSON.parse(localStorage.getItem('audiovault_favorites') || '[]')),
    recentIds: JSON.parse(localStorage.getItem('audiovault_recent') || '[]'),
    playlists: JSON.parse(localStorage.getItem('audiovault_playlists') || '{}'),
    renderedCount: 0,
    chunkSize: 48
  };

  // --- DOM Elements ---
  const dom = {
    audio: document.getElementById('native-audio'),
    trackContainer: document.getElementById('track-container'),
    scrollSentinel: document.getElementById('scroll-sentinel'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    sortSelect: document.getElementById('sort-select'),
    btnViewGrid: document.getElementById('btn-view-grid'),
    btnViewList: document.getElementById('btn-view-list'),
    categoryChips: document.getElementById('category-chips'),
    emptyState: document.getElementById('empty-state'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    
    // View Titles & Badges
    currentViewTitle: document.getElementById('current-view-title'),
    currentViewCount: document.getElementById('current-view-count'),
    badgeAllCount: document.getElementById('badge-all-count'),
    badgeFavoritesCount: document.getElementById('badge-favorites-count'),
    statsTrackCount: document.getElementById('stats-track-count'),
    statsLibSize: document.getElementById('stats-lib-size'),
    playlistsNavList: document.getElementById('playlists-nav-list'),

    // Hero Spotlight
    heroBanner: document.getElementById('hero-banner'),
    heroBackdrop: document.getElementById('hero-backdrop'),
    heroVisualizer: document.getElementById('hero-visualizer'),
    heroTitle: document.getElementById('hero-title'),
    heroArtist: document.getElementById('hero-artist'),
    heroPlayBtn: document.getElementById('hero-play-btn'),
    heroPlayText: document.getElementById('hero-play-text'),
    heroFavBtn: document.getElementById('hero-fav-btn'),
    heroTag: document.getElementById('hero-tag'),
    heroSize: document.getElementById('hero-size'),

    // Bottom Player Bar
    playerBar: document.getElementById('player-bar'),
    playerArt: document.getElementById('player-art'),
    playerArtInner: document.getElementById('player-art-inner'),
    playerTitle: document.getElementById('player-title'),
    playerArtist: document.getElementById('player-artist'),
    btnPlayerFav: document.getElementById('btn-player-fav'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnRewind10: document.getElementById('btn-rewind-10'),
    btnForward10: document.getElementById('btn-forward-10'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnRepeat: document.getElementById('btn-repeat'),
    btnQuickShuffle: document.getElementById('btn-quick-shuffle'),
    timeCurrent: document.getElementById('time-current'),
    timeTotal: document.getElementById('time-total'),
    seekSlider: document.getElementById('seek-slider'),
    seekBuffer: document.getElementById('seek-buffer'),
    seekFill: document.getElementById('seek-fill'),
    seekContainer: document.getElementById('seek-container'),
    seekTooltip: document.getElementById('seek-tooltip'),
    volumeSlider: document.getElementById('volume-slider'),
    btnVolumeMute: document.getElementById('btn-volume-mute'),
    btnSpeed: document.getElementById('btn-speed'),
    speedMenu: document.getElementById('speed-menu'),

    // Queue
    queueDrawer: document.getElementById('queue-drawer'),
    btnToggleQueue: document.getElementById('btn-toggle-queue'),
    btnCloseQueue: document.getElementById('btn-close-queue'),
    btnClearQueue: document.getElementById('btn-clear-queue'),
    queueList: document.getElementById('queue-list'),
    queueCountBadge: document.getElementById('queue-count-badge'),
    queueDot: document.getElementById('queue-dot'),

    // Fullscreen Ambient Modal
    fsModal: document.getElementById('fullscreen-modal'),
    fsVisualizer: document.getElementById('fs-visualizer'),
    fsBackdrop: document.getElementById('fs-backdrop'),
    vinylDisc: document.getElementById('vinyl-disc'),
    vinylCenterArt: document.getElementById('vinyl-center-art'),
    vinylArtLetter: document.getElementById('vinyl-art-letter'),
    fsTitle: document.getElementById('fs-title'),
    fsArtist: document.getElementById('fs-artist'),
    fsTimeCurrent: document.getElementById('fs-time-current'),
    fsTimeTotal: document.getElementById('fs-time-total'),
    fsSeekSlider: document.getElementById('fs-seek-slider'),
    fsBtnPlay: document.getElementById('fs-btn-play'),
    fsBtnPrev: document.getElementById('fs-btn-prev'),
    fsBtnNext: document.getElementById('fs-btn-next'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    btnCloseFs: document.getElementById('btn-close-fs'),

    // Modals
    dialogPlaylist: document.getElementById('dialog-create-playlist'),
    formPlaylist: document.getElementById('form-create-playlist'),
    playlistNameInput: document.getElementById('playlist-name-input'),
    btnCreatePlaylistTrigger: document.getElementById('btn-create-playlist-trigger'),
    btnCancelPlaylist: document.getElementById('btn-cancel-playlist'),

    dialogShortcuts: document.getElementById('dialog-shortcuts'),
    btnShortcutsDialog: document.getElementById('btn-shortcuts-dialog'),
    btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),

    // Sidebar & Mobile
    sidebar: document.getElementById('sidebar'),
    btnMobileMenu: document.getElementById('btn-mobile-menu'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    queueBackdrop: document.getElementById('queue-backdrop'),

    // PWA Install
    btnInstallApp: document.getElementById('btn-install-app'),
    btnInstallAppTop: document.getElementById('btn-install-app-top')
  };

  // --- Web Audio API Setup ---
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let visualizerAnimId = null;

  function initAudioContext() {
    if (audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      sourceNode = audioCtx.createMediaElementSource(dom.audio);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
      startVisualizer();
    } catch (err) {
      console.warn('Web Audio API unavailable or restricted by CORS:', err);
    }
  }

  function startVisualizer() {
    if (!analyser) return;
    const heroCanvas = dom.heroVisualizer;
    const fsCanvas = dom.fsVisualizer;
    const heroCtx = heroCanvas.getContext('2d');
    const fsCtx = fsCanvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function resizeCanvases() {
      if (heroCanvas.clientWidth > 0 && heroCanvas.clientHeight > 0) {
        heroCanvas.width = heroCanvas.clientWidth * window.devicePixelRatio;
        heroCanvas.height = heroCanvas.clientHeight * window.devicePixelRatio;
      }
      if (fsCanvas.clientWidth > 0 && fsCanvas.clientHeight > 0) {
        fsCanvas.width = fsCanvas.clientWidth * window.devicePixelRatio;
        fsCanvas.height = fsCanvas.clientHeight * window.devicePixelRatio;
      }
    }
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    function draw() {
      visualizerAnimId = requestAnimationFrame(draw);
      if (!state.isPlaying) return;

      analyser.getByteFrequencyData(dataArray);

      // Draw Hero Visualizer
      if (heroCtx && heroCanvas.width > 0) {
        heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
        const barWidth = (heroCanvas.width / bufferLength) * 1.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * heroCanvas.height * 0.85;
          const hue = (state.currentSong ? state.currentSong.colorHue : 160) + (i * 2);
          heroCtx.fillStyle = `hsla(${hue}, 80%, 55%, 0.45)`;
          heroCtx.fillRect(x, heroCanvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      }

      // Draw Fullscreen Visualizer
      if (!dom.fsModal.classList.contains('hidden') && fsCtx && fsCanvas.width > 0) {
        fsCtx.clearRect(0, 0, fsCanvas.width, fsCanvas.height);
        const barWidth = (fsCanvas.width / bufferLength) * 1.2;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * fsCanvas.height * 0.9;
          const hue = (state.currentSong ? state.currentSong.colorHue : 160) + (i * 1.5);
          fsCtx.fillStyle = `hsla(${hue}, 85%, 60%, 0.6)`;
          fsCtx.fillRect(x, fsCanvas.height - barHeight, barWidth - 3, barHeight);
          x += barWidth;
        }
      }
    }
    draw();
  }

  // --- Catalog Loader ---
  async function loadCatalog() {
    try {
      if (window.AUDIO_CATALOG && Array.isArray(window.AUDIO_CATALOG) && window.AUDIO_CATALOG.length > 0) {
        state.allSongs = window.AUDIO_CATALOG;
      } else {
        const res = await fetch('songs.json');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        state.allSongs = await res.json();
      }

      // Compute total size
      const totalBytes = state.allSongs.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
      dom.statsLibSize.textContent = (totalBytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
      dom.statsTrackCount.textContent = `${state.allSongs.length} Tracks`;
      dom.badgeAllCount.textContent = state.allSongs.length;
      updateFavoritesBadge();

      // Initialize default view
      applyFiltersAndSort();
      renderPlaylistsNav();

      // Set initial hero track to first song or random
      if (state.allSongs.length > 0) {
        setHeroTrack(state.allSongs[0]);
      }
    } catch (err) {
      console.error('Failed to load audio catalog:', err);
      dom.trackContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Unable to load audio catalog</h3>
          <p>${err.message}. If running locally, make sure songs.js is present.</p>
        </div>`;
    }
  }

  // --- Filtering & Sorting ---
  function applyFiltersAndSort() {
    let list = [...state.allSongs];

    // Filter by Current View
    if (state.currentView === 'favorites') {
      list = list.filter(s => state.favorites.has(s.id));
      dom.currentViewTitle.textContent = 'Liked Songs';
    } else if (state.currentView === 'recent') {
      const recentSet = new Set(state.recentIds);
      list = list.filter(s => recentSet.has(s.id));
      // preserve recent order
      list.sort((a, b) => state.recentIds.indexOf(a.id) - state.recentIds.indexOf(b.id));
      dom.currentViewTitle.textContent = 'Recently Played';
    } else if (state.currentView.startsWith('playlist:')) {
      const pName = state.currentView.replace('playlist:', '');
      const pIds = new Set(state.playlists[pName] || []);
      list = list.filter(s => pIds.has(s.id));
      dom.currentViewTitle.textContent = pName;
    } else if (state.currentView === 'artists') {
      dom.currentViewTitle.textContent = 'Tracks by Artist';
      state.sortOrder = 'artist-asc';
    } else {
      dom.currentViewTitle.textContent = 'All Tracks';
    }

    // Filter by Category Chip
    if (state.currentCategory !== 'all') {
      list = list.filter(s => s.categories && s.categories.includes(state.currentCategory));
    }

    // Filter by Search Query
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.trim().toLowerCase();
      const terms = query.split(/\s+/);
      list = list.filter(s => {
        const text = `${s.title} ${s.artist} ${s.filename} ${(s.categories || []).join(' ')}`.toLowerCase();
        return terms.every(term => text.includes(term));
      });
    }

    // Sort
    if (state.sortOrder === 'title-desc') {
      list.sort((a, b) => b.title.localeCompare(a.title));
    } else if (state.sortOrder === 'artist-asc') {
      list.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
    } else if (state.sortOrder === 'size-desc') {
      list.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else if (state.sortOrder === 'size-asc') {
      list.sort((a, b) => (a.sizeBytes || 0) - (b.sizeBytes || 0));
    } else if (state.sortOrder === 'random') {
      list = shuffleArray([...list]);
    } else if (state.currentView !== 'recent') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    state.filteredSongs = list;
    dom.currentViewCount.textContent = `${list.length} tracks`;

    // Reset render chunking
    dom.trackContainer.innerHTML = '';
    state.renderedCount = 0;

    if (list.length === 0) {
      dom.emptyState.classList.remove('hidden');
    } else {
      dom.emptyState.classList.add('hidden');
      renderNextChunk();
    }
  }

  // --- Chunked Rendering (Virtual Scroll optimization) ---
  function renderNextChunk() {
    if (state.renderedCount >= state.filteredSongs.length) return;

    const nextBatch = state.filteredSongs.slice(
      state.renderedCount,
      state.renderedCount + state.chunkSize
    );

    const frag = document.createDocumentFragment();

    if (state.viewMode === 'grid') {
      nextBatch.forEach(song => {
        frag.appendChild(createSongCard(song));
      });
    } else {
      nextBatch.forEach((song, idx) => {
        frag.appendChild(createSongRow(song, state.renderedCount + idx + 1));
      });
    }

    dom.trackContainer.appendChild(frag);
    state.renderedCount += nextBatch.length;
  }

  // Setup infinite scroll observer on sentinel
  const scrollObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      renderNextChunk();
    }
  }, { rootMargin: '300px' });
  scrollObserver.observe(dom.scrollSentinel);

  // --- Card & Row Builders ---
  function createSongCard(song) {
    const card = document.createElement('div');
    card.className = `song-card ${state.currentSong && state.currentSong.id === song.id ? 'playing' : ''}`;
    card.dataset.id = song.id;

    const isLiked = state.favorites.has(song.id);
    const category = (song.categories && song.categories[0]) || 'Music';

    card.innerHTML = `
      <div class="card-art" style="background: ${song.gradient};">
        <div class="card-art-vinyl"></div>
        <div class="card-art-grooves"></div>
        <div class="card-badge">${escapeHtml(category)}</div>
        <div class="card-art-center">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div class="card-play-overlay">
          <div class="card-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              ${state.currentSong && state.currentSong.id === song.id && state.isPlaying 
                ? '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>' 
                : '<polygon points="5 3 19 12 5 21 5 3"></polygon>'}
            </svg>
          </div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title" title="${escapeHtml(song.title)}">${escapeHtml(song.title)}</div>
        <div class="card-artist" title="${escapeHtml(song.artist)}">${escapeHtml(song.artist)}</div>
        <div class="card-footer">
          <span>${song.sizeFormatted}</span>
          <div class="card-actions">
            <button class="btn-card-fav ${isLiked ? 'liked' : ''}" data-action="like" title="${isLiked ? 'Unlike' : 'Like'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button class="btn-icon-subtle" data-action="queue" title="Add to queue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    card.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('button[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'like') {
          toggleFavorite(song.id);
        } else if (action === 'queue') {
          addToQueue(song);
        }
        return;
      }
      playSong(song);
    });

    return card;
  }

  function createSongRow(song, rowNum) {
    const row = document.createElement('div');
    row.className = `song-row ${state.currentSong && state.currentSong.id === song.id ? 'playing' : ''}`;
    row.dataset.id = song.id;

    const isLiked = state.favorites.has(song.id);
    const category = (song.categories && song.categories[0]) || 'Music';

    row.innerHTML = `
      <div class="row-num">${rowNum}</div>
      <div class="row-art" style="background: ${song.gradient};">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;opacity:0.9;">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <div class="row-title-col">
        <div class="row-title" title="${escapeHtml(song.title)}">${escapeHtml(song.title)}</div>
        <div class="row-artist" title="${escapeHtml(song.artist)}">${escapeHtml(song.artist)}</div>
      </div>
      <div class="row-category">${escapeHtml(category)}</div>
      <div class="row-size">${song.sizeFormatted}</div>
      <div class="row-actions">
        <button class="btn-card-fav ${isLiked ? 'liked' : ''}" data-action="like" title="${isLiked ? 'Unlike' : 'Like'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <button class="btn-icon-subtle" data-action="queue" title="Add to queue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    row.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('button[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'like') {
          toggleFavorite(song.id);
        } else if (action === 'queue') {
          addToQueue(song);
        }
        return;
      }
      playSong(song);
    });

    return row;
  }

  // --- Audio Playback Engine ---
  function playSong(song, syncQueue = true) {
    if (!song) return;

    initAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (syncQueue) {
      // If clicked from main list, set current playlist as queue
      state.playbackQueue = [...state.filteredSongs];
      state.currentIndex = state.playbackQueue.findIndex(s => s.id === song.id);
      renderQueue();
    }

    state.currentSong = song;
    dom.audio.src = song.url;
    dom.audio.playbackRate = state.playbackRate;
    dom.audio.volume = state.isMuted ? 0 : state.volume;

    dom.audio.play()
      .then(() => {
        state.isPlaying = true;
        updatePlayerUI();
        addToRecent(song.id);
      })
      .catch(err => {
        console.warn('Playback error (e.g. user gesture required or format issue):', err);
        state.isPlaying = false;
        updatePlayerUI();
      });

    setHeroTrack(song);
    updateMediaSession(song);
  }

  function togglePlayPause() {
    if (!state.currentSong) {
      if (state.filteredSongs.length > 0) {
        playSong(state.filteredSongs[0]);
      }
      return;
    }

    initAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (dom.audio.paused) {
      dom.audio.play().then(() => {
        state.isPlaying = true;
        updatePlayerUI();
      }).catch(console.error);
    } else {
      dom.audio.pause();
      state.isPlaying = false;
      updatePlayerUI();
    }
  }

  function playNext() {
    if (state.playbackQueue.length === 0) return;

    if (state.isShuffle) {
      state.currentIndex = Math.floor(Math.random() * state.playbackQueue.length);
    } else {
      state.currentIndex++;
      if (state.currentIndex >= state.playbackQueue.length) {
        if (state.repeatMode === 'all') {
          state.currentIndex = 0;
        } else {
          state.currentIndex = state.playbackQueue.length - 1;
          dom.audio.pause();
          state.isPlaying = false;
          updatePlayerUI();
          return;
        }
      }
    }

    const nextSong = state.playbackQueue[state.currentIndex];
    playSong(nextSong, false);
  }

  function playPrev() {
    if (dom.audio.currentTime > 3) {
      dom.audio.currentTime = 0;
      return;
    }

    if (state.playbackQueue.length === 0) return;

    if (state.isShuffle) {
      state.currentIndex = Math.floor(Math.random() * state.playbackQueue.length);
    } else {
      state.currentIndex--;
      if (state.currentIndex < 0) {
        state.currentIndex = state.playbackQueue.length - 1;
      }
    }

    const prevSong = state.playbackQueue[state.currentIndex];
    playSong(prevSong, false);
  }

  // --- Audio Event Listeners ---
  dom.audio.addEventListener('timeupdate', () => {
    if (!dom.audio.duration) return;
    const current = dom.audio.currentTime;
    const total = dom.audio.duration;
    const pct = (current / total) * 100;

    dom.timeCurrent.textContent = formatTime(current);
    dom.fsTimeCurrent.textContent = formatTime(current);
    dom.timeTotal.textContent = formatTime(total);
    dom.fsTimeTotal.textContent = formatTime(total);

    dom.seekSlider.value = pct;
    dom.fsSeekSlider.value = pct;
    dom.seekFill.style.width = `${pct}%`;
  });

  dom.audio.addEventListener('progress', () => {
    if (dom.audio.buffered.length > 0 && dom.audio.duration) {
      const bufferedEnd = dom.audio.buffered.end(dom.audio.buffered.length - 1);
      const pct = (bufferedEnd / dom.audio.duration) * 100;
      dom.seekBuffer.style.width = `${pct}%`;
    }
  });

  dom.audio.addEventListener('ended', () => {
    if (state.repeatMode === 'one') {
      dom.audio.currentTime = 0;
      dom.audio.play().catch(console.error);
    } else {
      playNext();
    }
  });

  dom.audio.addEventListener('error', (e) => {
    console.error('Audio playback error:', e);
    // Auto advance to next song after 1.5 seconds if track not found or unplayable
    setTimeout(() => {
      if (state.isPlaying) playNext();
    }, 1500);
  });

  // --- UI Update Helpers ---
  function updatePlayerUI() {
    const isPlaying = state.isPlaying;
    const song = state.currentSong;

    if (isPlaying) {
      dom.playerBar.classList.add('playing');
      dom.btnPlayPause.querySelector('.icon-play').classList.add('hidden');
      dom.btnPlayPause.querySelector('.icon-pause').classList.remove('hidden');
      dom.fsBtnPlay.querySelector('.icon-play').classList.add('hidden');
      dom.fsBtnPlay.querySelector('.icon-pause').classList.remove('hidden');
      if (dom.heroPlayText) dom.heroPlayText.textContent = 'Pause';
      dom.heroPlayBtn?.querySelector('.icon-hero-play')?.classList.add('hidden');
      dom.heroPlayBtn?.querySelector('.icon-hero-pause')?.classList.remove('hidden');
      dom.vinylDisc.classList.add('spinning');
      dom.vinylDisc.classList.remove('paused');
    } else {
      dom.playerBar.classList.remove('playing');
      dom.btnPlayPause.querySelector('.icon-play').classList.remove('hidden');
      dom.btnPlayPause.querySelector('.icon-pause').classList.add('hidden');
      dom.fsBtnPlay.querySelector('.icon-play').classList.remove('hidden');
      dom.fsBtnPlay.querySelector('.icon-pause').classList.add('hidden');
      if (dom.heroPlayText) dom.heroPlayText.textContent = 'Play Track';
      dom.heroPlayBtn?.querySelector('.icon-hero-play')?.classList.remove('hidden');
      dom.heroPlayBtn?.querySelector('.icon-hero-pause')?.classList.add('hidden');
      dom.vinylDisc.classList.add('paused');
    }

    if (song) {
      dom.playerTitle.textContent = song.title;
      dom.playerArtist.textContent = song.artist;
      dom.playerArtInner.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;color:#fff;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
      dom.playerArt.style.background = song.gradient;

      const isLiked = state.favorites.has(song.id);
      dom.btnPlayerFav.classList.toggle('liked', isLiked);
      dom.heroFavBtn.classList.toggle('liked', isLiked);

      // Fullscreen Modal Details
      dom.fsTitle.textContent = song.title;
      dom.fsArtist.textContent = song.artist;
      dom.vinylCenterArt.style.background = song.gradient;
      dom.vinylArtLetter.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:36px;height:36px;color:#fff;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
      dom.fsBackdrop.style.background = `radial-gradient(circle at center, hsla(${song.colorHue}, 80%, 50%, 0.4), transparent 70%)`;
    }

    // Active state highlighting in DOM cards
    document.querySelectorAll('.song-card, .song-row').forEach(el => {
      const isActive = song && el.dataset.id === song.id;
      el.classList.toggle('playing', isActive);
      const playIcon = el.querySelector('.card-play-btn');
      if (playIcon) {
        playIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">${
          isActive && isPlaying 
            ? '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>' 
            : '<polygon points="5 3 19 12 5 21 5 3"></polygon>'
        }</svg>`;
      }
    });

    // Shuffle & Repeat state indicators
    dom.btnShuffle.classList.toggle('active', state.isShuffle);
    dom.btnRepeat.classList.toggle('active', state.repeatMode !== 'off');
    const repeatOne = dom.btnRepeat.querySelector('.repeat-one-indicator');
    if (repeatOne) {
      repeatOne.classList.toggle('hidden', state.repeatMode !== 'one');
    }
  }

  function setHeroTrack(song) {
    if (!song) return;
    dom.heroTitle.textContent = song.title;
    dom.heroArtist.textContent = song.artist;
    dom.heroSize.textContent = song.sizeFormatted;
    dom.heroTag.textContent = song.extension;
    dom.heroBackdrop.style.background = `radial-gradient(circle at 100% 0%, hsla(${song.colorHue}, 75%, 50%, 0.45), transparent 70%),
                                         radial-gradient(circle at 0% 100%, hsla(${(song.colorHue + 60) % 360}, 80%, 45%, 0.35), transparent 60%)`;
    const isLiked = state.favorites.has(song.id);
    dom.heroFavBtn.classList.toggle('liked', isLiked);
  }

  // --- Scrubber & Volume Interactions ---
  dom.seekSlider.addEventListener('input', (e) => {
    if (!dom.audio.duration) return;
    const targetTime = (e.target.value / 100) * dom.audio.duration;
    dom.audio.currentTime = targetTime;
    dom.seekFill.style.width = `${e.target.value}%`;
  });

  dom.fsSeekSlider.addEventListener('input', (e) => {
    if (!dom.audio.duration) return;
    const targetTime = (e.target.value / 100) * dom.audio.duration;
    dom.audio.currentTime = targetTime;
  });

  dom.seekContainer.addEventListener('mousemove', (e) => {
    if (!dom.audio.duration) return;
    const rect = dom.seekContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoverTime = pos * dom.audio.duration;
    dom.seekTooltip.textContent = formatTime(hoverTime);
    dom.seekTooltip.style.left = `${pos * 100}%`;
    dom.seekTooltip.classList.remove('hidden');
  });

  dom.seekContainer.addEventListener('mouseleave', () => {
    dom.seekTooltip.classList.add('hidden');
  });

  dom.volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.volume = val;
    state.isMuted = val === 0;
    dom.audio.volume = val;
    localStorage.setItem('audiovault_volume', val.toString());
    updateVolumeIcon();
  });

  dom.btnVolumeMute.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    dom.audio.volume = state.isMuted ? 0 : state.volume;
    dom.volumeSlider.value = state.isMuted ? 0 : state.volume;
    updateVolumeIcon();
  });

  function updateVolumeIcon() {
    const isMuted = state.isMuted || state.volume === 0;
    dom.btnVolumeMute.querySelector('.icon-vol-high').classList.toggle('hidden', isMuted);
    dom.btnVolumeMute.querySelector('.icon-vol-mute').classList.toggle('hidden', !isMuted);
  }

  // --- Speed Selector ---
  dom.btnSpeed.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.speedMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    dom.speedMenu.classList.add('hidden');
  });

  dom.speedMenu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      state.playbackRate = speed;
      dom.audio.playbackRate = speed;
      dom.btnSpeed.textContent = `${speed}x`;
      dom.speedMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Jump seek buttons (-10s / +10s)
  dom.btnRewind10.addEventListener('click', () => {
    dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 10);
  });
  dom.btnForward10.addEventListener('click', () => {
    if (dom.audio.duration) {
      dom.audio.currentTime = Math.min(dom.audio.duration, dom.audio.currentTime + 10);
    }
  });

  // Shuffle & Repeat toggles
  dom.btnShuffle.addEventListener('click', () => {
    state.isShuffle = !state.isShuffle;
    localStorage.setItem('audiovault_shuffle', state.isShuffle.toString());
    updatePlayerUI();
  });

  dom.btnRepeat.addEventListener('click', () => {
    if (state.repeatMode === 'off') state.repeatMode = 'all';
    else if (state.repeatMode === 'all') state.repeatMode = 'one';
    else state.repeatMode = 'off';
    localStorage.setItem('audiovault_repeat', state.repeatMode);
    updatePlayerUI();
  });

  dom.btnQuickShuffle.addEventListener('click', () => {
    if (state.filteredSongs.length === 0) return;
    state.isShuffle = true;
    localStorage.setItem('audiovault_shuffle', 'true');
    const randomIndex = Math.floor(Math.random() * state.filteredSongs.length);
    playSong(state.filteredSongs[randomIndex]);
  });

  // Hero Controls
  dom.heroPlayBtn.addEventListener('click', () => {
    if (state.currentSong) {
      togglePlayPause();
    } else if (state.filteredSongs.length > 0) {
      playSong(state.filteredSongs[0]);
    }
  });

  dom.heroFavBtn.addEventListener('click', () => {
    if (state.currentSong) {
      toggleFavorite(state.currentSong.id);
    }
  });

  // Bottom Player Controls
  dom.btnPlayPause.addEventListener('click', togglePlayPause);
  dom.btnNext.addEventListener('click', playNext);
  dom.btnPrev.addEventListener('click', playPrev);
  dom.btnPlayerFav.addEventListener('click', () => {
    if (state.currentSong) toggleFavorite(state.currentSong.id);
  });

  // Fullscreen Modal Controls
  dom.btnFullscreen.addEventListener('click', () => {
    dom.fsModal.classList.remove('hidden');
  });
  dom.btnCloseFs.addEventListener('click', () => {
    dom.fsModal.classList.add('hidden');
  });
  dom.fsBtnPlay.addEventListener('click', togglePlayPause);
  dom.fsBtnNext.addEventListener('click', playNext);
  dom.fsBtnPrev.addEventListener('click', playPrev);

  // --- Queue Management ---
  function addToQueue(song) {
    state.playbackQueue.push(song);
    renderQueue();
    // Brief toast / dot animation
    dom.queueDot.classList.remove('hidden');
  }

  function renderQueue(showAll = false) {
    dom.queueList.innerHTML = '';
    const total = state.playbackQueue.length;
    dom.queueCountBadge.textContent = `${total} tracks`;
    dom.queueDot.classList.toggle('hidden', total === 0);

    if (total === 0) {
      dom.queueList.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Queue is empty</div>';
      return;
    }

    const limit = showAll ? total : Math.min(total, 40);
    const frag = document.createDocumentFragment();

    for (let idx = 0; idx < limit; idx++) {
      const song = state.playbackQueue[idx];
      const item = document.createElement('div');
      item.className = `queue-item ${state.currentIndex === idx ? 'active' : ''}`;
      item.innerHTML = `
        <div class="queue-art" style="background: ${song.gradient};">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;opacity:0.9;">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div class="queue-info">
          <div class="queue-title">${escapeHtml(song.title)}</div>
          <div class="queue-artist">${escapeHtml(song.artist)}</div>
        </div>
        <button class="btn-icon-subtle btn-remove-queue" data-idx="${idx}" title="Remove">✕</button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-queue')) {
          e.stopPropagation();
          state.playbackQueue.splice(idx, 1);
          if (idx < state.currentIndex) state.currentIndex--;
          renderQueue();
          return;
        }
        state.currentIndex = idx;
        playSong(song, false);
      });

      frag.appendChild(item);
    }

    dom.queueList.appendChild(frag);

    if (total > limit) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'btn-subtle';
      moreBtn.style.cssText = 'width: 100%; margin: 12px 0; padding: 8px; font-size: 0.8rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); color: var(--text-secondary); cursor: pointer;';
      moreBtn.textContent = `Show All ${total} Tracks in Queue`;
      moreBtn.addEventListener('click', () => renderQueue(true));
      dom.queueList.appendChild(moreBtn);
    }
  }

  dom.btnToggleQueue.addEventListener('click', () => {
    const isOpen = dom.queueDrawer.classList.toggle('open');
    if (dom.queueBackdrop) dom.queueBackdrop.classList.toggle('active', isOpen);
  });
  dom.btnCloseQueue.addEventListener('click', () => {
    dom.queueDrawer.classList.remove('open');
    if (dom.queueBackdrop) dom.queueBackdrop.classList.remove('active');
  });
  dom.btnClearQueue.addEventListener('click', () => {
    state.playbackQueue = [];
    state.currentIndex = -1;
    renderQueue();
  });

  // --- Favorites & Recent ---
  function toggleFavorite(songId) {
    if (state.favorites.has(songId)) {
      state.favorites.delete(songId);
    } else {
      state.favorites.add(songId);
    }
    localStorage.setItem('audiovault_favorites', JSON.stringify(Array.from(state.favorites)));
    updateFavoritesBadge();
    updatePlayerUI();
    if (state.currentView === 'favorites') {
      applyFiltersAndSort();
    }
  }

  function updateFavoritesBadge() {
    dom.badgeFavoritesCount.textContent = state.favorites.size;
  }

  function addToRecent(songId) {
    state.recentIds = state.recentIds.filter(id => id !== songId);
    state.recentIds.unshift(songId);
    if (state.recentIds.length > 60) state.recentIds.pop();
    localStorage.setItem('audiovault_recent', JSON.stringify(state.recentIds));
  }

  // --- Playlists ---
  dom.btnCreatePlaylistTrigger.addEventListener('click', () => {
    dom.dialogPlaylist.showModal();
    dom.playlistNameInput.focus();
  });
  dom.btnCancelPlaylist.addEventListener('click', () => {
    dom.dialogPlaylist.close();
  });
  dom.formPlaylist.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = dom.playlistNameInput.value.trim();
    if (name) {
      if (!state.playlists[name]) {
        state.playlists[name] = [];
        localStorage.setItem('audiovault_playlists', JSON.stringify(state.playlists));
        renderPlaylistsNav();
      }
      dom.dialogPlaylist.close();
      dom.playlistNameInput.value = '';
    }
  });

  function renderPlaylistsNav() {
    dom.playlistsNavList.innerHTML = '';
    Object.keys(state.playlists).forEach(name => {
      const btn = document.createElement('button');
      btn.className = `playlist-nav-btn ${state.currentView === `playlist:${name}` ? 'active' : ''}`;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
          <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
        </svg>
        <span>${escapeHtml(name)}</span>
      `;
      btn.addEventListener('click', () => {
        state.currentView = `playlist:${name}`;
        updateNavActiveState(btn);
        applyFiltersAndSort();
      });
      dom.playlistsNavList.appendChild(btn);
    });
  }

  // --- Navigation & Mobile Drawers ---
  function closeDrawers() {
    dom.sidebar.classList.remove('mobile-open');
    dom.queueDrawer.classList.remove('open');
    if (dom.sidebarBackdrop) dom.sidebarBackdrop.classList.remove('active');
    if (dom.queueBackdrop) dom.queueBackdrop.classList.remove('active');
  }

  if (dom.sidebarBackdrop) {
    dom.sidebarBackdrop.addEventListener('click', closeDrawers);
  }
  if (dom.queueBackdrop) {
    dom.queueBackdrop.addEventListener('click', closeDrawers);
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      state.currentView = view;
      updateNavActiveState(item);
      applyFiltersAndSort();
      closeDrawers();
    });
  });

  function updateNavActiveState(activeEl) {
    document.querySelectorAll('.nav-item, .playlist-nav-btn').forEach(el => el.classList.remove('active'));
    activeEl.classList.add('active');
  }

  // Mobile menu toggle
  dom.btnMobileMenu.addEventListener('click', () => {
    const isOpen = dom.sidebar.classList.toggle('mobile-open');
    if (dom.sidebarBackdrop) dom.sidebarBackdrop.classList.toggle('active', isOpen);
  });

  // Clicking player track info on mobile opens fullscreen ambient player
  const playerTrackInfo = document.querySelector('.player-track-info');
  if (playerTrackInfo) {
    playerTrackInfo.addEventListener('click', (e) => {
      if (e.target.closest('#btn-player-fav')) return;
      if (window.innerWidth <= 768 && state.currentSong) {
        dom.fsModal.classList.remove('hidden');
      }
    });
  }

  // --- Search & Filters ---
  let searchDebounce = null;
  dom.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    const val = e.target.value;
    dom.searchClear.classList.toggle('hidden', !val);
    searchDebounce = setTimeout(() => {
      state.searchQuery = val;
      applyFiltersAndSort();
    }, 80);
  });

  dom.searchClear.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.searchQuery = '';
    dom.searchClear.classList.add('hidden');
    applyFiltersAndSort();
  });

  dom.btnClearSearch.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.searchQuery = '';
    dom.searchClear.classList.add('hidden');
    state.currentCategory = 'all';
    dom.categoryChips.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.category === 'all');
    });
    applyFiltersAndSort();
  });

  dom.sortSelect.addEventListener('change', (e) => {
    state.sortOrder = e.target.value;
    applyFiltersAndSort();
  });

  dom.categoryChips.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      dom.categoryChips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentCategory = chip.dataset.category;
      applyFiltersAndSort();
    });
  });

  // View Switcher (Grid vs List)
  dom.btnViewGrid.addEventListener('click', () => {
    state.viewMode = 'grid';
    localStorage.setItem('audiovault_view_mode', 'grid');
    dom.btnViewGrid.classList.add('active');
    dom.btnViewList.classList.remove('active');
    dom.trackContainer.className = 'track-container track-grid';
    applyFiltersAndSort();
  });

  dom.btnViewList.addEventListener('click', () => {
    state.viewMode = 'list';
    localStorage.setItem('audiovault_view_mode', 'list');
    dom.btnViewList.classList.add('active');
    dom.btnViewGrid.classList.remove('active');
    dom.trackContainer.className = 'track-container track-list';
    applyFiltersAndSort();
  });

  // --- Shortcuts Dialog ---
  dom.btnShortcutsDialog.addEventListener('click', () => {
    dom.dialogShortcuts.showModal();
  });
  dom.btnCloseShortcuts.addEventListener('click', () => {
    dom.dialogShortcuts.close();
  });

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes when typing in inputs
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) playPrev();
        else dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) playNext();
        else if (dom.audio.duration) {
          dom.audio.currentTime = Math.min(dom.audio.duration, dom.audio.currentTime + 5);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        state.volume = Math.min(1, state.volume + 0.05);
        dom.audio.volume = state.volume;
        dom.volumeSlider.value = state.volume;
        updateVolumeIcon();
        break;
      case 'ArrowDown':
        e.preventDefault();
        state.volume = Math.max(0, state.volume - 0.05);
        dom.audio.volume = state.volume;
        dom.volumeSlider.value = state.volume;
        updateVolumeIcon();
        break;
      case 'm':
      case 'M':
        state.isMuted = !state.isMuted;
        dom.audio.volume = state.isMuted ? 0 : state.volume;
        dom.volumeSlider.value = state.isMuted ? 0 : state.volume;
        updateVolumeIcon();
        break;
      case 's':
      case 'S':
        dom.btnShuffle.click();
        break;
      case 'r':
      case 'R':
        dom.btnRepeat.click();
        break;
      case 'f':
      case 'F':
        dom.fsModal.classList.toggle('hidden');
        break;
      case '/':
        e.preventDefault();
        dom.searchInput.focus();
        dom.searchInput.select();
        break;
      case '?':
        dom.dialogShortcuts.showModal();
        break;
      case 'Escape':
        dom.fsModal.classList.add('hidden');
        closeDrawers();
        if (dom.dialogPlaylist.open) dom.dialogPlaylist.close();
        if (dom.dialogShortcuts.open) dom.dialogShortcuts.close();
        break;
    }
  });

  // --- MediaSession API Integration ---
  function updateMediaSession(song) {
    if (!('mediaSession' in navigator) || !song) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'Audio Vault',
        artwork: [
          { src: generateCoverDataUri(song, 128), sizes: '128x128', type: 'image/png' },
          { src: generateCoverDataUri(song, 512), sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => dom.audio.play());
      navigator.mediaSession.setActionHandler('pause', () => dom.audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        dom.audio.currentTime = Math.max(0, dom.audio.currentTime - (details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (dom.audio.duration) {
          dom.audio.currentTime = Math.min(dom.audio.duration, dom.audio.currentTime + (details.seekOffset || 10));
        }
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in dom.audio) {
          dom.audio.fastSeek(details.seekTime);
        } else {
          dom.audio.currentTime = details.seekTime;
        }
      });
    } catch (e) {
      console.warn('MediaSession handler error:', e);
    }
  }

  // Generate lightweight artwork for MediaSession
  function generateCoverDataUri(song, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, `hsl(${song.colorHue}, 75%, 45%)`);
    grad.addColorStop(1, `hsl(${(song.colorHue + 60) % 360}, 80%, 25%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Initial Letter
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((song.title.trim()[0] || '🎵').toUpperCase(), size / 2, size / 2);

    return canvas.toDataURL('image/png');
  }

  // --- Utilities ---
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Initialize view mode icons
  if (state.viewMode === 'list') {
    dom.btnViewList.classList.add('active');
    dom.btnViewGrid.classList.remove('active');
    dom.trackContainer.className = 'track-container track-list';
  } else {
    dom.btnViewGrid.classList.add('active');
    dom.btnViewList.classList.remove('active');
    dom.trackContainer.className = 'track-container track-grid';
  }

  // --- Progressive Web App (PWA) & Service Worker ---
  let deferredInstallPrompt = null;

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
          .then((reg) => {
            console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
  }

  function initPWAInstall() {
    // If already running in standalone mode (already installed), do not show prompts
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      console.log('[PWA] App is running in standalone mode.');
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent default mini-infobar on mobile
      e.preventDefault();
      deferredInstallPrompt = e;

      // Reveal install CTA buttons
      if (dom.btnInstallApp) dom.btnInstallApp.classList.remove('hidden');
      if (dom.btnInstallAppTop) dom.btnInstallAppTop.classList.remove('hidden');
    });

    async function triggerInstall() {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log(`[PWA] Install prompt outcome: ${outcome}`);
      if (outcome === 'accepted') {
        if (dom.btnInstallApp) dom.btnInstallApp.classList.add('hidden');
        if (dom.btnInstallAppTop) dom.btnInstallAppTop.classList.add('hidden');
      }
      deferredInstallPrompt = null;
    }

    if (dom.btnInstallApp) dom.btnInstallApp.addEventListener('click', triggerInstall);
    if (dom.btnInstallAppTop) dom.btnInstallAppTop.addEventListener('click', triggerInstall);

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] AudioVault was successfully installed!');
      deferredInstallPrompt = null;
      if (dom.btnInstallApp) dom.btnInstallApp.classList.add('hidden');
      if (dom.btnInstallAppTop) dom.btnInstallAppTop.classList.add('hidden');
    });
  }

  // Boot
  loadCatalog();
  registerServiceWorker();
  initPWAInstall();

})();
