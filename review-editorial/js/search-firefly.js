/* The character stays beside the text caret, with its sword tip anchored to it. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const widgets = [...document.querySelectorAll('[data-blog-search]')];
  const states = [];
  const measure = document.createElement('canvas').getContext('2d');
  const viewport = window.visualViewport;
  let viewportHeight = viewport?.height || innerHeight;
  let scrollTimer;
  document.addEventListener('pointerdown', () => clearTimeout(scrollTimer), {passive:true});

  widgets.forEach(form => {
    const input = form.querySelector('input');
    const control = form.querySelector('.search-control');
    const sprite = form.querySelector('.search-firefly');
    const movie = sprite.querySelector('video');
    const canvas = form.querySelector('.search-effects');
    const ctx = canvas.getContext('2d');
    const state = {form,input,control,movie,sprite,canvas,ctx,visible:true,frame:0,active:false,target:50,last:0,width:0,height:0,caretY:28,fieldRight:0,collapseTimer:0};
    states.push(state);
    movie.muted = true;
    sprite.hidden = true;
    movie.defaultPlaybackRate = movie.playbackRate = 0.5;
    movie.addEventListener('error', () => { movie.poster = '../assets/firefly-official-pixel.png'; });

    function caret() {
      if (!measure) return;
      const inputBox = input.getBoundingClientRect(), box = control.getBoundingClientRect();
      const styles = getComputedStyle(input);
      measure.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      if ('fontKerning' in measure) measure.fontKerning = styles.fontKerning;
      // type=text retains selectionStart on Safari/Chromium, unlike type=search in some engines.
      const selection = (input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd) ?? input.value.length;
      const text = input.value.slice(0, selection);
      const spacing = parseFloat(styles.letterSpacing) || 0;
      state.target = Math.max(inputBox.left - box.left, Math.min(inputBox.right - box.left - 2,
        inputBox.left - box.left + measure.measureText(text).width + text.length * spacing - input.scrollLeft));
      state.caretY = inputBox.top - box.top + inputBox.height / 2;
      state.fieldRight = inputBox.right - box.left;
    }
    function resize() {
      const rect = control.getBoundingClientRect();
      state.width = rect.width; state.height = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
      ctx?.setTransform(dpr,0,0,dpr,0,0);
      caret();
      if (state.active) position();
    }
    function stop() {
      cancelAnimationFrame(state.frame); state.frame = 0; state.last = 0;
      movie.pause();
      ctx?.clearRect(0,0,state.width,state.height);
    }
    function play() {
      if (!state.active || !state.visible || document.hidden) return;
      if (reduced.matches) { movie.poster = '../assets/firefly-official-pixel.png'; movie.pause(); caret(); position(true); return; }
      if (!movie.src && !movie.error) { movie.src = '../assets/firefly-official-pixel-loop.mp4'; movie.load(); }
      movie.play().catch(() => { movie.poster = '../assets/firefly-official-pixel.png'; });
      if (!state.frame) state.frame = requestAnimationFrame(tick);
    }
    function position() {
      const width = 36, height = 32, swordX = width * .12, swordY = height * .34;
      const bodyFitsRight = state.target + width - swordX <= state.fieldRight;
      const x = state.target - (bodyFitsRight ? swordX : width - swordX);
      sprite.style.transform = `translate(${x.toFixed(2)}px,${(state.caretY-swordY).toFixed(2)}px) scaleX(${bodyFitsRight ? 1 : -1})`;
      return bodyFitsRight ? 1 : -1;
    }
    function tick(now) {
      state.frame = 0;
      if (!state.active || !state.visible || document.hidden || reduced.matches) { stop(); return; }
      // Decorative work is capped at 30 FPS, including high-refresh-rate phones.
      if (now - state.last < 33) { state.frame = requestAnimationFrame(tick); return; }
      state.last = now;
      caret();
      const facing = position();
      if (ctx) {
        ctx.clearRect(0,0,state.width,state.height);
        const phase = now % 870;
        if (phase < 170) {
          const x = state.target, y = state.caretY, radius = 3 + phase / 40;
          ctx.strokeStyle = '#b5f4d1';ctx.lineWidth = 1.4;ctx.globalAlpha = (1-phase/170)*.8;
          ctx.beginPath();ctx.moveTo(x+facing*9,y-6);ctx.lineTo(x,y);ctx.stroke();
          for (const [dx,dy] of [[-1,-1],[1,-.7],[.4,1]]) {
            ctx.beginPath();ctx.moveTo(x+dx*radius,y+dy*radius);ctx.lineTo(x+dx*(radius+3),y+dy*(radius+3));ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      state.frame = requestAnimationFrame(tick);
    }
    input.addEventListener('focus', () => {
      clearTimeout(state.collapseTimer); sprite.hidden = false;
      state.active = true; viewportHeight = Math.max(viewportHeight, viewport?.height || innerHeight);
      document.body.classList.add('search-active');
      form.classList.add('search-engaged');
      resize(); position(true); play();
    });
    input.addEventListener('blur', () => {
      state.active = false; sprite.hidden = true;stop();
      document.body.classList.remove('search-keyboard');
    });
    form.addEventListener('focusout', () => {
      clearTimeout(state.collapseTimer);
      // A result tap must keep its position between pointerdown and click.
      // Hide/pause the character immediately, but collapse only after focus leaves the form.
      state.collapseTimer = setTimeout(() => {
        if (form.contains(document.activeElement)) return;
        form.classList.remove('search-engaged');
        if (!states.some(s => s.form.classList.contains('search-engaged'))) document.body.classList.remove('search-active');
      },200);
    });
    form.addEventListener('submit', () => {
      clearTimeout(state.collapseTimer);
      state.active = false; sprite.hidden = true;stop();
      form.classList.remove('search-engaged');
      document.body.classList.remove('search-keyboard');
      if (!states.some(s => s.active)) document.body.classList.remove('search-active');
    });
    ['input','keyup','click','select','scroll'].forEach(name => input.addEventListener(name, () => {
      caret(); if (state.active) position();
    }));
    if ('ResizeObserver' in window) { const observer = new ResizeObserver(resize);observer.observe(control);observer.observe(input); }
    else addEventListener('resize',resize,{passive:true});
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      state.visible = entries[0].isIntersecting;
      if (state.visible) play(); else stop();
    }).observe(control);
    state.stop = stop;state.play = play;state.caret = caret;state.position = position;
  });
  document.addEventListener('selectionchange', () => states.forEach(s => {
    if (s.active) { s.caret(); s.position(); }
  }));
  document.addEventListener('visibilitychange', () => states.forEach(s => document.hidden ? s.stop() : s.play()));
  reduced.addEventListener('change', () => states.forEach(s => { s.stop();s.play(); }));
  addEventListener('pagehide', () => states.forEach(s => s.stop()));
  addEventListener('pageshow', () => states.forEach(s => s.play()));
  viewport?.addEventListener('resize', () => {
    const current = states.find(s => s.active);
    if (!current) { viewportHeight = viewport.height;document.body.classList.remove('search-keyboard');return; }
    const keyboard = coarse.matches && viewportHeight - viewport.height > 120;
    document.body.classList.toggle('search-keyboard',keyboard);
    if (keyboard) {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (current.form.classList.contains('nav-search')) {
          document.body.style.setProperty('--search-result-height', `${Math.max(100,viewport.height - 100)}px`);
          return;
        }
        // Keep room below the field for suggestions, even while the software keyboard is open.
        const top = viewport.offsetTop + 88;
        scrollTo({top:scrollY + current.control.getBoundingClientRect().top - top,behavior:'instant'});
        document.body.style.setProperty('--search-result-height', `${Math.max(100,viewport.height - (current.control.getBoundingClientRect().bottom - viewport.offsetTop) - 48)}px`);
      },100);
    } else document.body.style.removeProperty('--search-result-height');
  },{passive:true});
})();
