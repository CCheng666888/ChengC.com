import { paw, button } from './icons.js';
export function mainMenu(game) {
  const s=game.storage.data;
  return `<div class="menu-screen">
    <header class="menu-header"><span class="small-brand">${paw} A CHENGC LITTLE GAME</span><span class="weather" data-secret>☀ <span>A GOOD DAY TO GO OUT</span></span></header>
    <section class="menu-content"><p class="eyebrow"><span class="line-mark"></span> TAKE YOUR TIME. TAKE A WALK.</p>
      <h1>DOG<br><span>WALK<i>${paw}</i></span></h1>
      <p class="tagline">A little walk with a<br>very unpredictable dog.</p>
      <p class="menu-chinese">没什么大事。只是一起出去走走。</p>
      <nav class="menu-buttons" aria-label="主菜单">${button('start','开始游戏 <span>↗</span>','primary big')}
      ${s.currentWalk?button('resume','继续上次散步 <span>↝</span>','resume'):''}
      <div class="menu-secondary">${button('codex','狗狗图鉴')}${button('achievements','成就')}${button('settings','设置')}</div></nav>
      <div class="menu-best"><span>YOUR LITTLE JOURNEY</span><p>${s.totalWalks} 次散步 <i>·</i> ${Math.round(s.totalDistance)} m <i>·</i> 最高 ${s.bestScore} 分</p></div>
    </section>
    <div class="park-note"><span class="note-pin"></span><p>A little fresh air.<br>A lot of good company.</p><small>MAPLE PARK / EST. 2026</small><span class="note-paw">${paw}</span></div>
    <footer class="menu-footer"><span>MADE FOR THE SMALL, GOOD MOMENTS.</span><span>01.00 <i>●</i> ${game.storage.available?'自动存档已开启':'存档暂不可用'}</span></footer>
  </div>`;
}
