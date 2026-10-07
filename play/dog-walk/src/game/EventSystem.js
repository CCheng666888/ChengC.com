import { EVENTS } from '../data/events.js';
import { choose, random } from './math.js';
export class EventSystem {
  constructor(game) {this.game=game;this.timer=9;this.active=null;this.timeLeft=0;this.last=null;}
  update(dt) {
    if(this.active){if(this.active.timeout){this.timeLeft-=dt;this.game.ui.eventTime(this.timeLeft);if(this.timeLeft<=0){this.game.dog.change({obedience:-4,happiness:-2});this.close();this.game.ui.toast('你轻轻拉开它，下次要更及时。','!');}}return;}
    if(!this.game.player.moving)return;
    this.timer-=dt;
    if(this.timer<=0){const near=this.game.world.nearest(this.game.player);const type=near&&EVENTS[near.kind]?near.kind:choose(['frisbee','bird','dog','food','bone'].filter(x=>x!==this.last));this.open(type);}
  }
  open(type) {
    if(this.game.ui.hasModal||this.game.mini.active||this.game.state!=='playing')return;
    this.active=EVENTS[type];this.type=type;this.last=type;this.timeLeft=this.active.timeout||0;this.game.input.clear();this.game.dog.think(type==='bird'?'小鸟！':'发现了！');this.game.audio.play('bark');this.game.ui.showEvent(this.active);
  }
  choose(index) {
    const choice=this.active?.choices[index];if(!choice)return;
    this.close();const g=this.game,s=g.storage.data;
    if(choice.game){g.mini.start(choice.game);return;}
    if(choice.special==='social'){
      const good=Math.random()<.35+(g.dog.stats.obedience+g.dog.stats.trust)/330;
      g.dog.change(good?{happiness:9,trust:5,curiosity:3}:{energy:-3,obedience:-1,trust:2});s.dogsMet++;g.ui.toast(good?'鼻子碰鼻子，新朋友！':'有点太兴奋了，下次慢慢来。','∞');
    }else if(['safe','safeTreat'].includes(choice.special)) {s.foodsAvoided++;g.dog.change(choice.changes||{obedience:6,trust:3});g.ui.toast('安全第一，你做得很好。','♧');}
    else if(choice.special==='recall'){const ok=g.dog.call();if(ok){s.foodsAvoided++;g.ui.toast('它立刻跑回了你的身边。','♡');}else{g.dog.change({obedience:-2});g.ui.toast('你拉住牵引绳，帮它离开了食物。','♧');}}
    else {g.dog.change(choice.changes);g.ui.toast(choice.reply,'♡');}
    g.rewardInteraction(12);
  }
  close() {this.active=null;this.timer=random(17,27);this.game.ui.closeModal();}
}
