(() => {
  'use strict';
  const toggle = document.getElementById('sceneToggle');
  function setScene(only) {
    document.body.classList.toggle('scene-only', only);
    toggle.textContent = only ? '显示个人页' : '只看背景';
    toggle.setAttribute('aria-pressed', String(only));
    if (only) scrollTo({top:0,behavior:'instant'});
  }
  toggle.addEventListener('click', () => setScene(!document.body.classList.contains('scene-only')));
  document.querySelectorAll('a[data-animate]').forEach(link => link.addEventListener('click', () => setScene(false)));
})();
