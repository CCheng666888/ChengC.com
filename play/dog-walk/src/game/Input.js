export class Input {
  constructor(onAction) {
    this.keys = new Set(); this.stick = { x: 0, y: 0 }; this.onAction = onAction;
    window.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (!e.repeat && ['e',' ','escape'].includes(k)) onAction(k);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => this.clear());
  }
  vector() {
    let x = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft')) + this.stick.x;
    let y = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup')) + this.stick.y;
    const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    return { x, y };
  }
  clear() { this.keys.clear(); this.stick = { x: 0, y: 0 }; }
  bindJoystick(el) {
    let pointer = null;
    const knob = el.querySelector('span');
    const move = e => {
      if (pointer !== e.pointerId) return;
      const r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      const length = Math.hypot(x, y), scale = Math.min(1, 35 / Math.max(1, length));
      this.stick = { x: x * scale / 35, y: y * scale / 35 };
      knob.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
    };
    el.addEventListener('pointerdown', e => { pointer = e.pointerId; el.setPointerCapture(pointer); move(e); e.preventDefault(); });
    el.addEventListener('pointermove', move);
    const end = e => { if (pointer !== e.pointerId) return; pointer = null; this.stick = { x: 0, y: 0 }; knob.style.transform = ''; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
}
