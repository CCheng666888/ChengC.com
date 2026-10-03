(() => {
  'use strict';
  const legacy = location.hash.slice(1);
  const sections = new Set(['web', 'tools', 'games', 'catalog', 'guide']);
  location.replace('about.html#' + (sections.has(legacy) ? legacy : 'portfolio'));
})();
