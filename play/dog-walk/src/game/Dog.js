import { clamp, distance, random } from './math.js';
export class Dog {
  constructor(spec, trust) {
    this.spec = spec; this.stats = { ...spec.stats, trust: Math.max(spec.stats.trust, trust) };
    this.x = 850; this.y = 830; this.state = 'calm'; this.direction = 1; this.phase = 0; this.thought = ''; this.thoughtTime = 0; this.timer = 3; this.target = null; this.moving = false;
  }
  change(changes) { for (const [key, value] of Object.entries(changes || {})) this.stats[key] = clamp(this.stats[key] + value); }
  think(text, seconds = 3) { this.thought = text; this.thoughtTime = seconds; }
  update(dt, player, world) {
    const s = this.stats, gap = distance(this, player);
    this.thoughtTime = Math.max(0, this.thoughtTime - dt); this.timer -= dt;
    if (player.moving) this.change({ energy: -dt * .13, happiness: dt * .025 });
    else if (s.energy < 42) this.change({ energy: dt * .5 });
    if (this.timer <= 0) {
      this.timer = random(3, 7);
      if (s.energy < 22 && gap < 90) { this.state = 'tired'; this.target = null; this.think('歇一小会儿…'); }
      else if (Math.random() < s.curiosity / 145 && gap < 115) {
        const nearby = world.props.filter(p => distance(this, p) < 180);
        const p = nearby[Math.floor(Math.random() * nearby.length)];
        this.target = p ? { x: p.x + random(-45, 45), y: p.y + 45 } : { x: this.x + random(-70,70), y: this.y + random(-70,70) };
        this.state = Math.random() < .5 ? 'curious' : 'distracted'; this.think(Math.random() < .5 ? '这是什么？' : '闻到了好东西');
      } else { this.state = s.happiness > 82 ? 'happy' : 'calm'; this.target = null; }
    }
    if (gap > 130 + (100 - s.obedience) * .35) { this.target = null; this.state = s.energy > 45 ? 'running' : 'calm'; }
    let target = this.target || { x: player.x - player.direction * 48, y: player.y + 25 };
    if ((this.state === 'tired' || this.state === 'sitting') && gap < 125) target = this;
    const d = distance(this, target);
    this.moving = d > (this.target ? 12 : 26);
    if (this.moving) {
      const speed = (60 + s.energy * .7 + s.happiness * .28) * (this.state === 'running' ? 1.45 : 1);
      const dx = (target.x - this.x) / d, dy = (target.y - this.y) / d;
      world.move(this, dx * Math.min(d, dt * speed), dy * Math.min(d, dt * speed), 12);
      if (Math.abs(dx) > .1) this.direction = Math.sign(dx);
      this.phase += dt * (this.state === 'running' ? 18 : 12);
    }
    // A soft tether keeps the companion nearby without robotic following.
    const leash = distance(this, player);
    if (leash > 180) {
      const excess = leash - 180;
      world.move(this, (player.x - this.x) / leash * excess, (player.y - this.y) / leash * excess, 12);
    }
  }
  call() {
    this.target = null; this.timer = 4;
    if (Math.random() < .4 + this.stats.obedience / 170) { this.state = 'running'; this.change({ trust: 1, obedience: 1 }); this.think('来啦！'); return true; }
    this.think('等一下嘛…'); return false;
  }
}
