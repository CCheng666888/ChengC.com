import { ACHIEVEMENTS } from '../data/achievements.js';
export class AchievementSystem {
  constructor(game) { this.game=game; }
  check() {
    const g=this.game,s=g.storage.data;
    for(const a of ACHIEVEMENTS)if(!s.achievements.includes(a.id)&&a.test(s,g)) {
      s.achievements.push(a.id);g.ui.toast(`成就解锁 · ${a.name}`,a.icon);g.audio.play('achievement');
    }
    g.storage.save();
  }
  completeArchive() {const s=this.game.storage.data;if(!s.unlockedHiddenAchievement){s.unlockedHiddenAchievement=true;this.game.storage.save();this.game.audio.play('achievement');}}
}
