export class AudioManager {
  constructor(settings) { this.settings = settings; this.context = null; this.ducked = false; }
  unlock() {
    if (!this.context) { const C = window.AudioContext || window.webkitAudioContext; if (C) { this.context = new C(); this.gain = this.context.createGain(); this.gain.connect(this.context.destination); } }
    if (this.context?.state === 'suspended') this.context.resume().catch(() => {});
  }
  tone(freq, duration = .12, type = 'sine', delay = 0, volume = .12, end = freq) {
    if (!this.context || !this.settings.sound || this.ducked) return;
    const t = this.context.currentTime + delay, o = this.context.createOscillator(), g = this.context.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20,end), t + duration);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume * this.settings.volume, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + duration + .02);
  }
  play(name) {
    const sequence = { click: [620], bark: [190,260], step: [95], frisbee: [900,650], success: [523,659,784], fail: [290,210], achievement: [523,659,784,1046], event: [110,164,220], bird: [1900,2400] }[name] || [440];
    sequence.forEach((f,i) => this.tone(f, name === 'step' ? .035 : .16, name === 'bark' ? 'triangle' : 'sine', i * .09, name === 'step' || name === 'bird' ? .025 : .12, name === 'frisbee' ? f * .55 : f));
  }
  duck(value) { this.ducked = value; if (this.gain && this.context) this.gain.gain.setTargetAtTime(value ? .08 : 1, this.context.currentTime, .3); }
}
