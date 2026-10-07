import { clamp } from './math.js';
export const SAVE_KEY = 'dog-walk-save-v1';
export const defaults = () => ({ version: 1, bestScore: 0, achievements: [], unlockedHiddenAchievement: false, archiveDiscovered: false, totalWalks: 0, totalDistance: 0, dogTrust: 55, frisbeeCatches: 0, bonesFound: 0, commandsPassed: 0, interactions: 0, dogsMet: 0, foodsAvoided: 0, selectedDog: 'milo', settings: { sound: true, volume: 0.45, duration: 180, reducedMotion: false }, currentWalk: null });

export class Storage {
  constructor(backend) {
    this.available = true;
    try { this.backend = backend ?? globalThis.localStorage; }
    catch { this.backend = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } }; }
    this.data = this.load();
  }
  load() {
    const base = defaults();
    try {
      const raw = JSON.parse(this.backend.getItem(SAVE_KEY) || 'null');
      if (!raw || raw.version !== 1) return base;
      for (const k of ['bestScore', 'totalWalks', 'totalDistance', 'frisbeeCatches', 'bonesFound', 'commandsPassed', 'interactions', 'dogsMet', 'foodsAvoided']) base[k] = clamp(raw[k], 0, 1e9);
      base.dogTrust = clamp(raw.dogTrust ?? 55);
      base.achievements = Array.isArray(raw.achievements) ? raw.achievements.filter(x => typeof x === 'string') : [];
      base.unlockedHiddenAchievement = raw.unlockedHiddenAchievement === true;
      base.archiveDiscovered = raw.archiveDiscovered === true;
      base.selectedDog = ['milo', 'mochi', 'pepper'].includes(raw.selectedDog) ? raw.selectedDog : 'milo';
      const s = raw.settings || {};
      base.settings = { sound: s.sound !== false, volume: clamp(s.volume ?? .45, 0, 1), duration: [180, 300].includes(s.duration) ? s.duration : 180, reducedMotion: s.reducedMotion === true };
      const w = raw.currentWalk;
      if (w && w.player && w.dog && w.stats && Number.isFinite(w.elapsed) && Number.isFinite(w.distance)) {
        base.currentWalk = { player: { x: clamp(w.player.x, 40, 1560), y: clamp(w.player.y, 40, 960) }, dog: { x: clamp(w.dog.x, 40, 1560), y: clamp(w.dog.y, 40, 960) }, stats: Object.fromEntries(['happiness','energy','obedience','curiosity','trust'].map(k => [k, clamp(w.stats[k])])), elapsed: clamp(w.elapsed, 0, 300), distance: clamp(w.distance, 0, 1e6), score: clamp(w.score, 0, 1e5), duration: [180,300].includes(w.duration) ? w.duration : 180, visits: Array.isArray(w.visits) ? w.visits.filter(x => typeof x === 'string') : [], interactions: clamp(w.interactions, 0, 1e4), games: clamp(w.games, 0, 1e4) };
      }
    } catch { this.available = false; }
    return base;
  }
  save() { try { this.backend.setItem(SAVE_KEY, JSON.stringify(this.data)); this.available = true; return true; } catch { this.available = false; return false; } }
  reset() { this.data = defaults(); return this.save(); }
}
