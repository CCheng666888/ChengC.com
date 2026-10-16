/* Home-page paper transition. Native scrolling always remains available. */
(() => {
  'use strict';
  if (!document.body.classList.contains('home-page')) return;
  // Key only the original animation's blue backdrop. SVG filtering keeps the
  // existing video and caret interaction, and also works when opened via file://.
  const filterId = 'firefly-transparent';
  const filterSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  filterSvg.setAttribute('aria-hidden', 'true');
  filterSvg.setAttribute('width', '0'); filterSvg.setAttribute('height', '0');
  filterSvg.classList.add('firefly-filter-defs');
  const distanceTable = key => Array.from({length:65}, (_,i) =>
    Math.min(1, Math.pow((i / 64 - key / 255) / .18, 2)).toFixed(5)).join(' ');
  filterSvg.innerHTML = `<defs><filter id="${filterId}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feComponentTransfer in="SourceGraphic" result="distance">
      <feFuncR type="table" tableValues="${distanceTable(59)}"/>
      <feFuncG type="table" tableValues="${distanceTable(130)}"/>
      <feFuncB type="table" tableValues="${distanceTable(185)}"/>
    </feComponentTransfer>
    <feColorMatrix in="distance" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 1 1 0 0" result="key"/>
    <feComponentTransfer in="key" result="matte"><feFuncA type="linear" slope="1.4" intercept="-.08"/></feComponentTransfer>
    <feComposite in="SourceGraphic" in2="matte" operator="in"/>
  </filter></defs>`;
  document.body.append(filterSvg);
  // An absolute document URL avoids resolving the filter against the page's base.
  document.documentElement.style.setProperty('--firefly-key-filter', `url("${location.href.split('#')[0]}#${filterId}")`);
  const hero = document.querySelector('.hero');
  const art = hero.querySelector('.landscape');
  const grid = document.getElementById('postsContainer');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:800px)');
  const coarse = matchMedia('(pointer:coarse)');
  const clamp = n => Math.max(0, Math.min(1, n));
  let frame = 0, lastScroll = scrollY;
  let cards = [...grid.querySelectorAll(':scope > .post-card')].slice(0,2);
  // Cache the header height once; measuring it every frame forces synchronous layout.
  let headerEl = document.querySelector('.site-header');
  let navHeight = headerEl ? headerEl.offsetHeight : 0;
  const measureHeader = () => { navHeight = headerEl ? headerEl.offsetHeight : 0; };
  new ResizeObserver(measureHeader).observe(headerEl);
  const motion = window.ChenCPaperMotion = { progress:0, direction:'none', active:false, mode:'desktop', motionPreview:false };
  const motionNotice = document.createElement('button');
  motionNotice.type = 'button'; motionNotice.className = 'motion-preference-notice'; motionNotice.hidden = true;
  motionNotice.textContent = '系统已减少动态效果 · 启用本页翻页动画';
  motionNotice.title = '只在本页启用翻页，不修改系统设置；启用后可上下滚动查看。';
  motionNotice.addEventListener('click', () => {
    motion.motionPreview = true;
    document.body.classList.add('motion-preview');
    schedule();
  });
  document.body.append(motionNotice);
  function clearCard(card) {
    if (!card.classList.contains('turning-card')) return;
    // Commit the resting pose while transitions are disabled, then return
    // control to the original hover style without an extra settling animation.
    card.style.setProperty('--card-turn', 'none');
    getComputedStyle(card).transform;
    card.classList.remove('turning-card');
    card.style.removeProperty('--card-turn');
    card.style.removeProperty('--card-lift');
  }
  function render() {
    frame = 0;
    const photo = hero.getBoundingClientRect();
    document.body.classList.toggle('paper-reading', photo.bottom < innerHeight * .9);
    if (scrollY !== lastScroll) motion.direction = scrollY > lastScroll ? 'down' : 'up';
    lastScroll = scrollY;
    motionNotice.hidden = !reduced.matches || motion.motionPreview;
    const enabled = (!reduced.matches || motion.motionPreview) && cards.length > 0;
    document.body.classList.toggle('stage-enabled', enabled);
    motion.mode = compact.matches || coarse.matches ? 'lightweight' : 'desktop';
    if (!enabled) {
      document.body.classList.remove('stage-active');
      cards.forEach(clearCard);
      art.style.transform = ''; art.style.opacity = '';
      motion.active = false; motion.progress = 1;
      return;
    }
    // Measure the untransformed grid, so card motion never feeds back into progress.
    // Position alone defines the pose: scrolling back retraces it, on every visit.
    const start = innerHeight + 80;
    const end = Math.max(navHeight + (compact.matches ? 56 : 72), innerHeight * .14);
    const rawProgress = clamp((start - grid.getBoundingClientRect().top) / (start - end));
    // Integer scroll offsets can leave a fraction of a pixel at either endpoint.
    const progress = rawProgress < .002 ? 0 : rawProgress > .998 ? 1 : rawProgress;
    const active = progress > 0 && progress < 1;
    motion.progress = progress; motion.active = active;
    document.body.classList.toggle('stage-active', active);
    const ease = progress * progress * (3 - 2 * progress);
    const fold = 1 - ease;
    const lightweight = compact.matches || coarse.matches;
    cards.forEach((card,i) => {
      if (!active || (compact.matches && i > 0)) { clearCard(card); return; }
      const side = i === 0 ? -1 : 1;
      const x = compact.matches ? 0 : side * (lightweight ? 8 : 28) * fold;
      const y = (lightweight ? 36 : 76) * fold;
      const turnX = -(lightweight ? 36 : 72) * fold;
      const turnY = compact.matches ? 0 : side * (lightweight ? 3 : 12) * fold;
      const turnZ = compact.matches ? 0 : side * (lightweight ? .5 : 2.5) * fold;
      const scale = 1 - fold * (lightweight ? .025 : .06);
      card.style.setProperty('--card-turn', `perspective(1200px) translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0) rotateX(${turnX.toFixed(3)}deg) rotateY(${turnY.toFixed(3)}deg) rotateZ(${turnZ.toFixed(3)}deg) scale(${scale.toFixed(5)})`);
      card.style.setProperty('--card-lift', `${(fold * (lightweight ? 7 : 22)).toFixed(2)}px`);
      card.classList.add('turning-card');
    });
    if (!lightweight && photo.top < 0 && photo.bottom > 0) {
      const retreat = clamp(-photo.top / photo.height);
      art.style.transform = `translateY(${-retreat * 22}px) scale(${1 - retreat * .025})`;
      art.style.opacity = String(1 - retreat * .18);
    } else {
      art.style.transform = ''; art.style.opacity = '';
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  new MutationObserver(() => {
    cards.forEach(clearCard);
    cards = [...grid.querySelectorAll(':scope > .post-card')].slice(0,2);
    schedule();
  }).observe(grid, {childList:true});
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  reduced.addEventListener('change', schedule); compact.addEventListener('change', schedule); coarse.addEventListener('change', schedule);
  addEventListener('pageshow', schedule);
  schedule();
})();
