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

  const SONGS = SONG_FILES.map(f => ({
    title: f.replace(/\.mp3$/, ''),
    src: 'assets/music/' + encodeURIComponent(f)
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

  const audio = new Audio();
  audio.preload = 'none';
  let index = -1;
  let panelOpen = false;

  SONGS.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'music-item';
    li.textContent = s.title;
    li.setAttribute('role', 'option');
    li.addEventListener('click', () => playSong(i));
    list.appendChild(li);
  });

  function refreshActive() {
    Array.prototype.forEach.call(list.children, (li, i) => li.classList.toggle('active', i === index));
  }

  function setMiniVisible(visible) {
    mini.classList.toggle('show', visible);
    mini.setAttribute('aria-hidden', String(!visible));
  }

  function updatePauseBtn() {
    miniPause.textContent = audio.paused ? '▶' : '⏸';
    miniPause.setAttribute('aria-label', audio.paused ? '播放' : '暂停');
  }

  function playSong(i) {
    index = i;
    audio.src = SONGS[i].src;
    audio.play().catch(() => {});
    miniTitle.textContent = SONGS[i].title;
    miniSeek.value = 0;
    toggle.classList.add('playing');
    setMiniVisible(true);
    refreshActive();
    updatePauseBtn();
  }

  function next() { if (index < 0) return; playSong((index + 1) % SONGS.length); }
  function prev() { if (index < 0) return; playSong((index - 1 + SONGS.length) % SONGS.length); }

  function stop() {
    audio.pause();
    audio.currentTime = 0;
    index = -1;
    miniTitle.textContent = '未在播放';
    toggle.classList.remove('playing');
    setMiniVisible(false);
    refreshActive();
    miniSeek.value = 0;
    updatePauseBtn();
  }

  function setPanelOpen(next) {
    panelOpen = next;
    panel.classList.toggle('open', next);
    panel.setAttribute('aria-hidden', String(!next));
    toggle.classList.toggle('panel-open', next);
  }

  toggle.addEventListener('click', () => {
    if (index >= 0) stop();
    else setPanelOpen(!panelOpen);
  });

  miniPrev.addEventListener('click', prev);
  miniNext.addEventListener('click', next);
  miniPause.addEventListener('click', () => {
    if (index < 0) return;
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  });
  miniStop.addEventListener('click', stop);

  audio.addEventListener('timeupdate', () => {
    if (isFinite(audio.duration) && audio.duration > 0) {
      miniSeek.value = (audio.currentTime / audio.duration) * 100;
    }
  });
  audio.addEventListener('play', updatePauseBtn);
  audio.addEventListener('pause', updatePauseBtn);
  audio.addEventListener('ended', next);

  miniSeek.addEventListener('input', () => {
    if (index < 0 || !isFinite(audio.duration)) return;
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
