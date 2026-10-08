export const device = {
  get mobile() { return matchMedia('(pointer: coarse)').matches || innerWidth <= 760; },
  get fps() { return this.mobile ? 30 : 60; },
  get pixelRatio() { return Math.min(devicePixelRatio || 1, this.mobile ? 1.25 : 2); },
  apply() { document.body.dataset.device = this.mobile ? 'mobile' : 'pc'; }
};
