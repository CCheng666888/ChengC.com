export const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const random = (min, max) => min + Math.random() * (max - min);
export const choose = list => list[Math.floor(Math.random() * list.length)];
export const approach = (n, target, dt, speed = 6) => n + (target - n) * Math.min(1, dt * speed);
export const timeLabel = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
