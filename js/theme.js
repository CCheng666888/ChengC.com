(() => {
  'use strict';
  const paperPage = document.documentElement.hasAttribute('data-paper-theme');
  const fallback = () => 'light';
  let preference = null;
  try { preference = localStorage.getItem('theme'); } catch {}
  if (!['light', 'dark'].includes(preference)) preference = null;
  function apply(theme) {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme !== 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = paperPage ? (theme === 'light' ? '#f5f3ee' : '#171e1b') : (theme === 'light' ? '#f3f7f5' : '#0b2431');
    document.querySelectorAll('#themeToggle, #articleTheme').forEach(button => {
      button.setAttribute('aria-label', theme === 'light' ? '切换深色主题' : '切换浅色主题');
    });
  }
  apply(preference || fallback());
  document.documentElement.classList.add('js');
  function connect() {
    apply(preference || fallback());
    document.querySelectorAll('#themeToggle, #articleTheme').forEach(button => {
      button.addEventListener('click', () => {
        preference = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        apply(preference);
        try { localStorage.setItem('theme', preference); } catch {}
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connect);
  else connect();
})();
