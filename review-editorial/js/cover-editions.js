/* One current cover. Add real dated editions only when the matching assets exist.
   startsAt/endsAt must be ISO timestamps with an explicit +08:00 offset.
   More specific editions use a higher priority. Each photo declares its own controls. */
window.ChenCCoverEditions = {
  default: {
    id: 'cangshan-erhai', title: '苍山 · 洱海',
    desktop: '../assets/cangshan-erhai.webp', mobile: '../assets/cangshan-erhai-mobile.webp',
    night: '../assets/cangshan-erhai-night.webp', nightMobile: '../assets/cangshan-erhai-night-mobile.webp',
    alt: '苍山的雪峰与洱海，天光落在湖面上。',
    focus: '55% 50%', mobileFocus: '60% 50%',
    controls: ['density', 'speed', 'mist', 'glow', 'lanterns'], legacyLandscape: true
  },
  editions: []
};
