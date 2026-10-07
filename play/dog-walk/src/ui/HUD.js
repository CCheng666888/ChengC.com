import { paw, button } from './icons.js';
import { STAT_LABELS } from '../data/dogs.js';
export function hud(game) {
  return `<div class="hud-screen">
    <header class="hud-top"><button class="walk-brand" data-action="pause" aria-label="暂停散步">${paw}<span>DOG WALK<small>MAPLE PARK</small></span></button>
      <div class="walk-clock"><span class="clock-dot"></span><span data-hud="time">03:00</span><small>一小段好时光</small></div>
      <div class="hud-top-actions">${button('sound','♫','icon','aria-label="切换声音"')}${button('pause','Ⅱ','icon','aria-label="暂停"')}</div>
    </header>
    <aside class="dog-card paper"><div class="dog-card-head"><canvas id="dog-portrait" width="90" height="82" aria-label="狗狗肖像"></canvas><div><h2>${game.dog.spec.name}<span>${game.dog.spec.breed}</span></h2><p data-hud="state">悠闲散步</p></div><span class="bond-heart">♡</span></div>
      <div class="stat-list">${Object.entries(STAT_LABELS).map(([id,label])=>`<div class="stat"><div><span>${label}</span><b data-stat-value="${id}">${Math.round(game.dog.stats[id])}</b></div><div class="stat-track"><span data-stat-bar="${id}" style="width:${game.dog.stats[id]}%"></span></div></div>`).join('')}</div>
      <p class="dog-card-caption">每一小步，都让你们更亲近。</p>
    </aside>
    <aside class="walk-plan paper"><p class="eyebrow">TODAY'S LITTLE PLAN</p><h2>随便走走，也很好。</h2><p class="walk-distance"><b data-hud="distance">0</b><span>m 已走过</span></p>
      <div class="quest" data-quest="visits"><span>○</span> 探索公园 <b>0 / 4</b></div><div class="quest" data-quest="interactions"><span>○</span> 陪它互动 <b>0 / 5</b></div><div class="quest" data-quest="games"><span>○</span> 一起玩个小游戏 <b>0 / 1</b></div>
    </aside>
    <div id="bone-banner" class="bone-banner paper" hidden></div>
    <div class="context-hint" data-hud="context">慢慢走，看看这个公园。</div>
    <div class="action-dock paper">${button('interact','<kbd>E</kbd> 和它互动','primary')}${button('mini-frisbee','◎ <span>飞盘</span>')}${button('mini-bone','⌕ <span>找骨头</span>')}${button('mini-commands','✓ <span>听指令</span>')}<span class="dock-divider"></span>${button('finish','结束散步','finish-button')}</div>
    <div class="movement-help"><div class="key-grid"><kbd>W</kbd><div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div><span>或方向键移动<br><small>ESC 暂停 · E 互动</small></span></div>
    <div class="mini-map paper"><canvas id="mini-map" width="160" height="100" aria-label="公园简图"></canvas><span>MAPLE PARK <i data-hud="save">● 已存档</i></span></div>
    <div id="joystick" class="joystick" role="group" aria-label="触摸摇杆，拖动以移动"><span></span></div>
  </div>`;
}
