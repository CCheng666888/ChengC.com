(() => {
  'use strict';

  const SONG_FILES = [
    '冯沁苑(买辣椒也用券) - 起风了.mp3',
    '孙燕姿 - 我怀念的.mp3',
    '林俊杰 - 修炼爱情.mp3',
    '林俊杰 - 当你.mp3',
    '梁静茹 - 情歌.mp3',
    '毛不易 - 一程山路.mp3',
    '汪苏泷 - 我想念.mp3',
    '郑润泽 - 如果呢.mp3',
    '陈奕迅 - 好久不见.mp3',
    '陈奕迅 - 爱情转移.mp3',
    '韦礼安 - 如果可以.mp3'
  ];

  const musicRoot = new URL('../assets/music/', document.currentScript.src);
  const SONGS = SONG_FILES.map(f => ({
    title: f.replace(/\.mp3$/, ''),
    // A new URL prevents an old HTTP cache from retaining the large ID3 covers.
    src: new URL(encodeURIComponent(f) + '?v=20261010-audio', musicRoot).href
  }));

  const $ = id => document.getElementById(id);
  const toggle = $('musicToggle');
  const panel = $('musicPanel');
  const list = $('musicList');
  const mini = $('musicMini');
  const miniTitle = $('musicMiniTitle');
  const miniSeek = $('musicMiniSeek');
  const miniPause = $('musicMiniPause');
  const miniPrev = $('musicMiniPrev');
  const miniNext = $('musicMiniNext');
  const miniStop = $('musicMiniStop');
  const grip = $('musicMiniDrag');
  const status = document.createElement('span');
  status.id = 'musicMiniStatus';
  status.className = 'music-mini-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  miniTitle.after(status);

  const audio = new Audio();
  audio.preload = 'none';
  let index = -1;
  let loadedIndex = -1;
  let playAttempt = 0;
  let wantsPlay = false;
  let state = 'idle';
  let panelOpen = false;
  const connection = navigator.connection;
  const canWarm = !connection?.saveData && !/^(slow-)?2g$/.test(connection?.effectiveType || '');

  SONGS.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'music-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = s.title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => playSong(i));
    button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') warmSong(i); });
    button.addEventListener('focus', () => warmSong(i));
    li.appendChild(button);
    list.appendChild(li);
  });

  function refreshActive() {
    Array.prototype.forEach.call(list.children, (li, i) => {
      li.classList.toggle('active', i === index);
      li.querySelector('button').setAttribute('aria-pressed', String(i === index));
    });
  }

  function setMiniVisible(visible) {
    mini.hidden = !visible;
    mini.classList.toggle('show', visible);
    mini.setAttribute('aria-hidden', String(!visible));
  }

  function updatePauseBtn() {
    miniPause.textContent = state === 'error' ? '↻' : wantsPlay ? '⏸' : '▶';
    miniPause.setAttribute('aria-label', state === 'error' ? '重试播放' : wantsPlay ? '暂停' : '播放');
  }

  function setState(next, message) {
    state = next;
    status.textContent = message;
    mini.dataset.state = next;
    mini.setAttribute('aria-busy', String(next === 'loading' || next === 'buffering'));
    toggle.classList.toggle('playing', next === 'playing');
    updatePauseBtn();
  }

  function prepareSong(i, reload = false) {
    if (loadedIndex === i && !reload) return;
    loadedIndex = i;
    audio.preload = 'metadata';
    audio.src = SONGS[i].src;
  }

  function warmSong(i) {
    // Only prepare metadata after the visitor opens/focuses the player.
    // Reuse this audio element on click; do not download a second copy.
    if (canWarm && index < 0 && !audio.error) prepareSong(i);
  }

  function requestPlay() {
    if (index < 0) return;
    prepareSong(index, Boolean(audio.error));
    const attempt = ++playAttempt;
    wantsPlay = true;
    setState('loading', '正在加载…');
    // Keep play() inside the click event for mobile browser audio permission.
    audio.play().catch(error => {
      if (attempt !== playAttempt || index < 0 || !wantsPlay) return;
      wantsPlay = false;
      setState('error', error.name === 'NotAllowedError' ? '点重试播放' : '加载失败，点重试');
    });
  }

  function playSong(i) {
    if (i === index) {
      if (!wantsPlay) requestPlay();
      return;
    }
    ++playAttempt;
    wantsPlay = false;
    index = i;
    prepareSong(i);
    miniTitle.textContent = SONGS[i].title;
    miniSeek.value = 0;
    miniSeek.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0;
    setMiniVisible(true);
    refreshActive();
    requestPlay();
  }

  function next() { if (index < 0) return; playSong((index + 1) % SONGS.length); }
  function prev() { if (index < 0) return; playSong((index - 1 + SONGS.length) % SONGS.length); }

  function stop() {
    ++playAttempt;
    wantsPlay = false;
    index = -1;
    loadedIndex = -1;
    audio.pause();
    // Abort an outstanding download, including one still waiting to start.
    audio.removeAttribute('src');
    audio.load();
    miniTitle.textContent = '未在播放';
    setState('idle', '');
    setMiniVisible(false);
    refreshActive();
    miniSeek.value = 0;
    miniSeek.disabled = true;
  }

  function setPanelOpen(next) {
    panelOpen = next;
    panel.hidden = !next;
    toggle.setAttribute('aria-expanded', String(next));
    panel.classList.toggle('open', next);
    panel.setAttribute('aria-hidden', String(!next));
    toggle.classList.toggle('panel-open', next);
    if (next) warmSong(0);
  }

  toggle.addEventListener('click', () => {
    setPanelOpen(!panelOpen);
  });

  $('musicClose').addEventListener('click', () => { setPanelOpen(false); toggle.focus(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panelOpen) { setPanelOpen(false); toggle.focus(); }
  });
  miniPrev.addEventListener('click', prev);
  miniNext.addEventListener('click', next);
  miniPause.addEventListener('click', () => {
    if (index < 0) return;
    if (!wantsPlay) requestPlay();
    else {
      ++playAttempt;
      wantsPlay = false;
      audio.pause();
      setState('paused', '已暂停');
    }
  });
  miniStop.addEventListener('click', stop);

  audio.addEventListener('timeupdate', () => {
    if (isFinite(audio.duration) && audio.duration > 0) {
      miniSeek.value = (audio.currentTime / audio.duration) * 100;
    }
  });
  audio.addEventListener('loadedmetadata', () => {
    miniSeek.disabled = index < 0 || !Number.isFinite(audio.duration) || audio.duration <= 0;
  });
  audio.addEventListener('playing', () => {
    if (index >= 0 && wantsPlay) setState('playing', '播放中');
  });
  audio.addEventListener('waiting', () => {
    if (index >= 0 && wantsPlay) setState('buffering', '正在缓冲…');
  });
  audio.addEventListener('pause', () => {
    if (index < 0 || state === 'error' || !audio.paused) return;
    wantsPlay = false;
    setState('paused', '已暂停');
  });
  audio.addEventListener('error', () => {
    if (index < 0 || !audio.error) return;
    wantsPlay = false;
    setState('error', '加载失败，点重试');
  });
  audio.addEventListener('ended', next);

  miniSeek.addEventListener('input', () => {
    if (index < 0 || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (miniSeek.value / 100) * audio.duration;
  });

  // 拖动小窗
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, width = 0, height = 0;
  grip.addEventListener('pointerdown', e => {
    dragging = true;
    const r = mini.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = r.left; startTop = r.top;
    width = r.width; height = r.height;
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  grip.addEventListener('pointermove', e => {
    if (!dragging) return;
    const left = Math.max(0, Math.min(startLeft + (e.clientX - startX), window.innerWidth - width));
    const top = Math.max(0, Math.min(startTop + (e.clientY - startY), window.innerHeight - height));
    mini.style.left = left + 'px';
    mini.style.top = top + 'px';
    mini.style.bottom = 'auto';
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (grip.hasPointerCapture && grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
  }
  grip.addEventListener('pointerup', endDrag);
  grip.addEventListener('pointercancel', endDrag);

  document.addEventListener('click', e => {
    if (panelOpen && !panel.contains(e.target) && !toggle.contains(e.target)) setPanelOpen(false);
  });
})();
