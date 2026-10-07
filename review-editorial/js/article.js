(() => {
  const button = document.getElementById('menuToggle'), nav = document.getElementById('navLinks');
  function close() { nav.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); }
  button.addEventListener('click', () => { const open = nav.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-shell')) close(); });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
})();
