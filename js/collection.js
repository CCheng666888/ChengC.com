(() => {
  'use strict';
  const menu = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  }
  menu.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', event => { if (!event.target.closest('.nav-shell')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links.classList.contains('open')) { setMenu(false); menu.focus(); }
  });
  const header = document.querySelector('.site-header');
  const updateHeader = () => header.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', updateHeader, {passive:true});
  updateHeader();
  // A browser back/forward restore should not leave a stale mobile menu over the page.
  addEventListener('pageshow', () => { setMenu(false); updateHeader(); });
  matchMedia('(max-width:800px)').addEventListener('change', () => setMenu(false));
})();
