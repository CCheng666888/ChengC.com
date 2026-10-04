(() => {
  'use strict';
  const track = document.getElementById('workTrack');
  if (!track) return;
  const originals = [...track.querySelectorAll('.work-card')], count = originals.length;
  if (!count) return;
  const dots = [...document.querySelectorAll('.carousel-dot[data-work-index]')];
  const previous = document.getElementById('workPrevious'), next = document.getElementById('workNext');
  const position = document.getElementById('workPosition');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wrap = i => (i % count + count) % count;
  originals.forEach((card, i) => card.dataset.logicalIndex = i);

  // Two copies at each end keep a dim neighbour visible even while crossing the seam.
  function clone(card) {
    const copy = card.cloneNode(true);
    copy.dataset.workClone = 'true';
    copy.removeAttribute('data-detail');
    copy.setAttribute('aria-hidden', 'true');
    copy.removeAttribute('role');
    copy.removeAttribute('aria-label');
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    copy.querySelectorAll('a,button,input').forEach(node => {
      node.setAttribute('tabindex', '-1');
      node.removeAttribute('href');
      node.removeAttribute('download');
    });
    return copy;
  }
  const offset = count > 1 ? Math.min(2, count) : 0;
  if (offset) {
    track.prepend(...originals.slice(-offset).map(clone));
    track.append(...originals.slice(0, offset).map(clone));
  }
  const cards = [...track.querySelectorAll('.work-card')];
  let active = 0, slot = offset, animation = 0, rebasing = false, scrollFrame = 0, settleTimer = 0;
  let drag = null, suppressClickUntil = 0, queue = [];
  document.querySelectorAll('.carousel-controls [hidden], .carousel-sides[hidden]').forEach(node => node.hidden = false);
  previous.disabled = next.disabled = count < 2;

  function leftFor(index) {
    const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    return Math.max(0, Math.min(cards[index].offsetLeft - track.offsetLeft - padding, track.scrollWidth - track.clientWidth));
  }
  function reflect(index) {
    slot = index;
    active = wrap(index - offset);
    cards.forEach((card, i) => {
      const current = Number(card.dataset.logicalIndex) === active;
      card.classList.toggle('is-current', current);
      card.classList.toggle('is-before', i < index);
      card.classList.toggle('is-after', i > index);
      card.querySelectorAll('a').forEach(link => {
        if (current && !card.dataset.workClone) link.removeAttribute('tabindex');
        else link.setAttribute('tabindex', '-1');
      });
    });
    window.WorkScenes?.setTheme(originals[active].dataset.scene);
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === active)));
    position.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(count).padStart(2, '0') + ' · ' + originals[active].dataset.title;
  }
  function nearest() {
    let index = slot, distance = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(track.scrollLeft - leftFor(i));
      if (d < distance) { distance = d; index = i; }
    });
    return index;
  }
  function drain() {
    if (!animation && !rebasing && queue.length) request(queue.shift());
  }
  function settle(index = nearest()) {
    if (animation || rebasing || drag?.moving) return;
    reflect(index);
    if (count > 1 && (index < offset || index >= offset + count)) {
      rebasing = true;
      track.classList.add('is-rebasing');
      reflect(wrap(index - offset) + offset);
      track.scrollTo({left:leftFor(slot), behavior:'instant'});
      requestAnimationFrame(() => requestAnimationFrame(() => {
        rebasing = false;
        track.classList.remove('is-rebasing');
        drain();
      }));
    } else drain();
  }
  function stop() {
    cancelAnimationFrame(animation);
    animation = 0;
    queue = [];
    clearTimeout(settleTimer);
    track.classList.remove('is-switching');
    cards.forEach(card => card.classList.remove('is-entering'));
  }
  function move(destination, smooth = true) {
    clearTimeout(settleTimer);
    const start = track.scrollLeft, end = leftFor(destination);
    reflect(destination);
    if (!smooth || reduced.matches || Math.abs(start - end) < 1) {
      track.scrollTo({left:end, behavior:'instant'});
      settle(destination);
      return;
    }
    track.classList.add('is-switching');
    cards[destination].classList.remove('is-entering');
    const began = performance.now(), duration = 360;
    requestAnimationFrame(() => cards[destination].classList.add('is-entering'));
    function frame(now) {
      const t = Math.min(1, (now - began) / duration);
      const ease = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      track.scrollTo({left:start + (end - start) * ease, behavior:'instant'});
      if (t < 1) animation = requestAnimationFrame(frame);
      else {
        animation = 0;
        cards[destination].classList.remove('is-entering');
        track.classList.remove('is-switching');
        settle(destination);
      }
    }
    animation = requestAnimationFrame(frame);
  }
  function request(action) {
    if (count < 2) return;
    if (rebasing) {
      queue = [action];
      return;
    }
    // A new press redirects the current motion instead of adding a long queue.
    if (animation) stop();
    const logical = action.type === 'step' ? wrap(active + action.value) : wrap(action.value);
    if (logical === active) { drain(); return; }
    let destination = logical + offset;
    if (active === count - 1 && logical === 0) destination = offset + count;
    else if (active === 0 && logical === count - 1) destination = offset - 1;
    move(destination);
  }
  previous.addEventListener('click', () => request({type:'step', value:-1}));
  next.addEventListener('click', () => request({type:'step', value:1}));
  dots.forEach(dot => dot.addEventListener('click', () => request({type:'absolute', value:Number(dot.dataset.workIndex)})));
  track.addEventListener('scroll', () => {
    if (animation || rebasing) return;
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      if (!animation && !rebasing) reflect(nearest());
    });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => settle(), 150);
  }, {passive:true});
  track.addEventListener('scrollend', () => { clearTimeout(settleTimer); settle(); });
  track.addEventListener('wheel', stop, {passive:true});
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    const actions = {
      ArrowLeft:{type:'step',value:-1}, ArrowRight:{type:'step',value:1},
      Home:{type:'absolute',value:0}, End:{type:'absolute',value:count-1}
    };
    if (!(event.key in actions)) return;
    event.preventDefault();
    request(actions[event.key]);
  });
  track.addEventListener('pointerdown', event => {
    stop();
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a,button,input')) return;
    drag = {id:event.pointerId, x:event.clientX, left:track.scrollLeft, moving:false};
    track.classList.add('drag-ready');
  });
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    if (!drag.moving && Math.abs(delta) < 6) return;
    if (!drag.moving) {
      drag.moving = true;
      track.classList.add('dragging');
      track.setPointerCapture(drag.id);
    }
    event.preventDefault();
    track.scrollLeft = drag.left - delta;
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moving = drag.moving, id = drag.id;
    drag = null;
    track.classList.remove('dragging', 'drag-ready');
    if (track.hasPointerCapture(id)) track.releasePointerCapture(id);
    if (moving) {
      suppressClickUntil = performance.now() + 250;
      move(nearest());
    }
  }
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  track.addEventListener('lostpointercapture', event => {
    if (drag?.id === event.pointerId) {
      drag = null;
      track.classList.remove('dragging', 'drag-ready');
      move(nearest());
    }
  });
  track.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault(); event.stopPropagation(); return;
    }
    const card = event.target.closest('.work-card');
    if (!card) return;
    const logical = Number(card.dataset.logicalIndex);
    if (card.dataset.workClone || logical !== active) {
      event.preventDefault();
      event.stopPropagation();
      request({type:'absolute', value:logical});
    } else if (!event.target.closest('a,button,input') && card.dataset.detail) {
      event.preventDefault();
      event.stopPropagation();
      location.href = card.dataset.detail;
    }
  }, true);
  track.addEventListener('dragstart', event => event.preventDefault());
  addEventListener('resize', () => requestAnimationFrame(() => {
    const wanted = active;
    stop();
    track.classList.add('is-rebasing');
    reflect(wanted + offset);
    track.scrollTo({left:leftFor(slot), behavior:'instant'});
    requestAnimationFrame(() => track.classList.remove('is-rebasing'));
  }));
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      stop();
      track.scrollTo({left:leftFor(slot), behavior:'instant'});
      settle(slot);
    }
  });
  track.classList.add('is-rebasing');
  reflect(offset);
  track.scrollTo({left:leftFor(offset), behavior:'instant'});
  requestAnimationFrame(() => track.classList.remove('is-rebasing'));
})();
