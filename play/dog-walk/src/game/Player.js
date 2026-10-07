export class Player {
  constructor() { this.x = 790; this.y = 810; this.direction = 1; this.phase = 0; this.moving = false; }
  update(dt, input, world) {
    const v = input.vector(), old = { x: this.x, y: this.y };
    this.moving = Math.hypot(v.x, v.y) > .05;
    if (this.moving) {
      world.move(this, v.x * dt * 138, v.y * dt * 138, 13);
      if (Math.abs(v.x) > .03) this.direction = Math.sign(v.x);
      this.phase += dt * 11;
    }
    return Math.hypot(this.x - old.x, this.y - old.y) * .055;
  }
}
