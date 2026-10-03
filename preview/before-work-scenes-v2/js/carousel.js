(() => {
  'use strict';
  const track = document.getElementById('workTrack');
  if (!track) return;
  const cards = [...track.querySelectorAll('.work-card')];
  const dots = [...document.querySelectorAll('[data-work-index]')];
  const previous = document.getElementById('workPrevious');
  const next = document.getElementById('workNext');
  const position = document.getElementById('workPosition');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0, requested = null, scrollFrame = 0, drag = null, suppressClickUntil = 0;
  document.querySelectorAll('.carousel-controls [hidden]').forEach(node => node.hidden = false);
  function leftFor(index) {
    const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    return Math.max(0, Math.min(cards[index].offsetLeft - track.offsetLeft - padding, track.scrollWidth - track.clientWidth));
  }
  function reflect(index) {
    active = index;
    cards.forEach((card, i) => card.classList.toggle('is-current', i === index));
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === index)));
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    const text = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')} · ${cards[index].dataset.title}`;
    if (position.textContent !== text) position.textContent = text;
  }
  function show(index, smooth = true) {
    const destination = Math.max(0, Math.min(index, cards.length - 1));
    requested = destination;
    reflect(destination);
    track.scrollTo({left:leftFor(destination), behavior:smooth && !reduced.matches ? 'smooth' : 'instant'});
  }
  function nearest() {
    let index = 0, distance = Infinity;
    cards.forEach((card, i) => {
      const delta = Math.abs(track.scrollLeft - leftFor(i));
      if (delta < distance) { distance = delta; index = i; }
    });
    return index;
  }
  previous.addEventListener('click', () => show(active - 1));
  next.addEventListener('click', () => show(active + 1));
  dots.forEach(dot => dot.addEventListener('click', () => show(Number(dot.dataset.workIndex))));
  track.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      if (requested !== null && Math.abs(track.scrollLeft - leftFor(requested)) > 1) return;
      requested = null;
      reflect(nearest());
    });
  }, {passive:true});
  track.addEventListener('wheel', () => { requested = null; }, {passive:true});
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    const keys = {ArrowLeft:active - 1, ArrowRight:active + 1, Home:0, End:cards.length - 1};
    if (!(event.key in keys)) return;
    event.preventDefault();
    show(keys[event.key]);
  });
  track.addEventListener('pointerdown', event => {
    requested = null;
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a,button,input')) return;
    drag = {id:event.pointerId, x:event.clientX, left:track.scrollLeft, moving:false};
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
    track.classList.remove('dragging');
    if (track.hasPointerCapture(id)) track.releasePointerCapture(id);
    if (moving) { suppressClickUntil = performance.now() + 180; show(nearest()); }
  }
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  track.addEventListener('lostpointercapture', event => { if (drag?.id === event.pointerId) { drag = null; track.classList.remove('dragging'); show(nearest()); } });
  track.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  track.addEventListener('dragstart', event => event.preventDefault());
  addEventListener('resize', () => requestAnimationFrame(() => show(requested ?? active, false)));
  reflect(0);
})();
