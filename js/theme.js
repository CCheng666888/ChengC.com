(() => {
  'use strict';
  const system = matchMedia('(prefers-color-scheme: light)');
  let preference = null;
  try { preference = localStorage.getItem('theme'); } catch {}
  if (!['light', 'dark'].includes(preference)) preference = null;
  function apply(theme) {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme !== 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#f3f7f5' : '#0b2431';
    document.querySelectorAll('#themeToggle, #articleTheme').forEach(button => {
      button.setAttribute('aria-label', theme === 'light' ? '切换深色主题' : '切换浅色主题');
    });
  }
  apply(preference || (system.matches ? 'light' : 'dark'));
  document.documentElement.classList.add('js');
  system.addEventListener('change', () => { if (!preference) apply(system.matches ? 'light' : 'dark'); });
  function connect() {
    apply(preference || (system.matches ? 'light' : 'dark'));
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
