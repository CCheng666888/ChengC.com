
    (() => {
      'use strict';
      const $ = id => document.getElementById(id);
      const canvas = $('particles');
      const context = canvas.getContext('2d', { alpha: true });
      const art = $('landscapeArt');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const coarsePointer = matchMedia('(pointer: coarse)');
      const config = { density: 65, speed: 35, mist: 40, glow: 60 };
      let width = 0, height = 0, particles = [], ripples = [], animation = 0;
      let paused = reducedMotion.matches, visible = true, lastFrame = 0, time = 0;
      const pointer = { x: -2000, y: -2000, dx: 0, dy: 0 };
      const random = (min, max) => min + Math.random() * (max - min);

      function resize() {
        width = innerWidth; height = innerHeight;
        const dpr = Math.min(devicePixelRatio || 1, coarsePointer.matches ? 1.25 : 1.7);
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        context?.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cap = coarsePointer.matches ? 360 : 1000;
        const count = Math.min(cap, Math.round(width * height / 1300));
        particles = Array.from({ length: count }, () => ({ x: random(0, width), y: random(0, height), r: random(.35, 1.6), phase: random(0, Math.PI * 2), drift: random(.3, 1.4), alpha: random(.15, .65) }));
        ripples = Array.from({ length: coarsePointer.matches ? 40 : 100 }, () => ({ x: random(width * .24, width), y: random(height * .59, height * .97), length: random(2, 21), phase: random(0, Math.PI * 2), alpha: random(.1, .4) }));
        draw(0); schedule();
      }
      function draw(delta) {
        if (!context) return;
        time += delta;
        context.clearRect(0, 0, width, height);
        const wind = .12 + config.speed / 100;
        const amount = Math.round(particles.length * config.density / 100);
        for (let i = 0; i < amount; i++) {
          const p = particles[i];
          p.x += delta * (4 + p.drift * 12) * wind;
          p.y += Math.sin(time * .25 + p.phase) * delta * 2 * wind;
          if (p.x > width + 8) p.x = -8;
          const twinkle = .45 + .55 * Math.sin(time * .6 + p.phase) ** 2;
          const dx = p.x - pointer.x, dy = p.y - pointer.y, distance = Math.hypot(dx, dy);
          const influence = !coarsePointer.matches && !paused && distance < 110 ? (1 - distance / 110) * 15 : 0;
          context.globalAlpha = p.alpha * twinkle;
          context.fillStyle = p.y > height * .55 ? '#c3e9df' : '#dcece2';
          context.beginPath();
          context.arc(p.x + dx / (distance || 1) * influence, p.y + dy / (distance || 1) * influence, p.r, 0, Math.PI * 2);
          context.fill();
        }
        if (config.glow > 0) {
          context.strokeStyle = '#dcf0d7'; context.lineWidth = .8;
          for (const r of ripples) {
            const shine = (.5 + Math.sin(time * .75 + r.phase) * .5) ** 3;
            context.globalAlpha = r.alpha * shine * config.glow / 100;
            const offset = Math.sin(time * .35 + r.phase) * 5;
            context.beginPath(); context.moveTo(r.x + offset, r.y); context.lineTo(r.x + offset + r.length, r.y); context.stroke();
          }
        }
        context.globalAlpha = 1;
        art.style.transform = paused || coarsePointer.matches ? 'none' : `translate3d(${pointer.dx * 5}px, ${pointer.dy * 3}px, 0)`;
      }
      function frame(now) {
        animation = 0;
        if (paused || !visible || document.hidden || !context) { lastFrame = 0; return; }
        if (!lastFrame) lastFrame = now;
        const elapsed = now - lastFrame;
        if (elapsed >= 32) { draw(Math.min(elapsed / 1000, .075)); lastFrame = now; }
        schedule();
      }
      function schedule() { if (!animation && !paused && visible && !document.hidden && context) { document.body.classList.remove('motion-idle'); animation = requestAnimationFrame(frame); } }
      function stop() { cancelAnimationFrame(animation); animation = 0; lastFrame = 0; document.body.classList.add('motion-idle'); }
      function updatePause() {
        document.body.classList.toggle('paused', paused);
        $('pauseToggle').textContent = paused ? '继续动画' : '暂停动画';
        $('pauseToggle').setAttribute('aria-pressed', String(paused));
        if (paused) { stop(); pointer.x = pointer.y = -2000; draw(0); } else schedule();
      }
      function setPanel(open) {
        $('settings').hidden = !open;
        $('settingsToggle').setAttribute('aria-expanded', String(open));
        if (open) $('settingsClose').focus(); else $('settingsToggle').focus();
      }
      for (const key of Object.keys(config)) {
        $(key).addEventListener('input', event => {
          config[key] = Number(event.target.value);
          $(key + 'Value').value = config[key] + '%';
          if (key === 'mist') document.documentElement.style.setProperty('--mist-opacity', config.mist * .0055);
          if (paused) draw(0);
        });
      }
      $('pauseToggle').addEventListener('click', () => { paused = !paused; updatePause(); });
      $('settingsToggle').addEventListener('click', () => setPanel($('settings').hidden));
      $('settingsClose').addEventListener('click', () => setPanel(false));
      document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('settings').hidden) setPanel(false); });
      document.addEventListener('click', event => { if (!$('settings').hidden && !$('settings').contains(event.target) && !$('settingsToggle').contains(event.target)) { $('settings').hidden = true; $('settingsToggle').setAttribute('aria-expanded', 'false'); } });
      $('sceneToggle').addEventListener('click', () => {
        const sceneOnly = document.body.classList.toggle('scene-only');
        $('sceneToggle').textContent = sceneOnly ? '显示首页' : '只看风景';
        $('sceneToggle').setAttribute('aria-pressed', String(sceneOnly));
        if (sceneOnly) scrollTo({ top: 0, behavior: 'instant' });
      });
      $('nightToggle').addEventListener('click', () => {
        const night = document.body.classList.toggle('night');
        $('nightToggle').textContent = night ? '切换晨光' : '切换夜色';
        $('nightToggle').setAttribute('aria-pressed', String(night));
      });
      $('reset').addEventListener('click', () => {
        Object.assign(config, { density: 65, speed: 35, mist: 40, glow: 60 });
        for (const key of Object.keys(config)) { $(key).value = config[key]; $(key + 'Value').value = config[key] + '%'; }
        document.documentElement.style.setProperty('--mist-opacity', '.22');
        document.body.classList.remove('night'); $('nightToggle').textContent = '切换夜色'; $('nightToggle').setAttribute('aria-pressed', 'false');
        paused = reducedMotion.matches; updatePause(); draw(0);
      });
      addEventListener('pointermove', event => {
        if (coarsePointer.matches || paused) return;
        pointer.x = event.clientX; pointer.y = event.clientY;
        pointer.dx = event.clientX / width - .5; pointer.dy = event.clientY / height - .5;
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -2000; pointer.dx = pointer.dy = 0; });
      let resizeTimer;
      addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else schedule(); });
      if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) schedule(); else stop(); }).observe(document.querySelector('.hero'));
      function syncMotionPreference() {
        paused = reducedMotion.matches;
        $('motionNote').textContent = reducedMotion.matches ? '已跟随系统的减少动态效果设置，默认显示静态风景。' : '移动鼠标，感受微风与粒子。可随时暂停动画。';
        updatePause();
      }
      reducedMotion.addEventListener('change', syncMotionPreference);
      if (!context) { $('pauseToggle').hidden = true; $('motionNote').textContent = '当前浏览器显示静态山水背景。'; }
      resize(); syncMotionPreference();
    })();
  