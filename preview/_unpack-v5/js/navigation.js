(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let leaving = false;
  const curtain = document.createElement('div');
  curtain.className = 'page-transition';
  curtain.setAttribute('aria-hidden', 'true');
  document.body.append(curtain);

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-animate]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin) return;
    if (!reduced.matches && link.classList.contains('portal-link')) {
      const box = link.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'link-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      const keyboard = event.detail === 0;
      ripple.style.setProperty('--ripple-x', `${keyboard ? box.width / 2 : event.clientX - box.left}px`);
      ripple.style.setProperty('--ripple-y', `${keyboard ? box.height / 2 : event.clientY - box.top}px`);
      link.append(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), {once:true});
    }
    const samePage = destination.pathname === location.pathname && destination.search === location.search;
    if (samePage || reduced.matches) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    document.body.classList.add('page-leaving');
    // A short exit keeps the landscape visible and preserves ordinary link navigation.
    setTimeout(() => location.assign(destination.href), 280);
  });
  addEventListener('pageshow', () => {
    leaving = false;
    document.body.classList.remove('page-leaving');
  });
})();
