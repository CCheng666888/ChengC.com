(() => {
  'use strict';
  const movie = document.querySelector('#fireflyMotion');
  const toggle = document.querySelector('[data-motion-toggle]');
  if (!movie || !toggle) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let wantsPlayback = !reducedMotion.matches;
  movie.controls = false;
  movie.muted = true;
  movie.defaultPlaybackRate = 0.5;
  movie.playbackRate = 0.5;
  toggle.hidden = false;

  function render() {
    toggle.textContent = movie.paused ? '▶ 播放' : 'Ⅱ 暂停';
    toggle.setAttribute('aria-label', movie.paused ? '播放流萤动画' : '暂停流萤动画');
  }

  function play() {
    movie.play().catch(render);
  }

  movie.addEventListener('playing', render);
  movie.addEventListener('pause', render);
  toggle.addEventListener('click', () => {
    wantsPlayback = movie.paused;
    if (wantsPlayback) play();
    else movie.pause();
    render();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) movie.pause();
    else if (wantsPlayback) play();
  });

  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) {
      wantsPlayback = false;
      movie.pause();
    }
  });

  if (wantsPlayback) play();
  else movie.pause();
  render();
})();
