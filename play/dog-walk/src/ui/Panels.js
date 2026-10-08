import { DOGS } from '../data/dogs.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { button } from './icons.js';
import { device } from '../game/Device.js';
export function codex(game) {
  const selected=game.storage.data.selectedDog;
  return `<p class="panel-intro">每只狗都有自己的小脾气。选一位伙伴，下次散步一起出发。</p><div class="dog-codex">${DOGS.map(d=>`<article class="dog-entry ${selected===d.id?'selected':''}"><canvas width="210" height="150" data-dog-portrait="${d.id}" aria-label="${d.name}"></canvas><p class="eyebrow">${d.breed}</p><h3>${d.name}</h3><p>${d.tagline}</p><small>${d.personality}</small>${button('select-dog',selected===d.id?'✓ 你的散步搭档':'选择它',selected===d.id?'selected-btn':'',`data-dog="${d.id}" ${game.state==='playing'?'disabled':''}`)}</article>`).join('')}</div>${game.state==='playing'?'<p class="panel-footnote">结束这次散步以后，就可以更换伙伴了。</p>':''}`;
}
export function achievementPanel(game) {
  const s=game.storage.data;
  return `<p class="panel-intro">${s.achievements.length + Number(s.unlockedHiddenAchievement)} / ${ACHIEVEMENTS.length+1} 个小小里程碑。快乐总是从小事开始。</p><div class="achievement-grid">${ACHIEVEMENTS.map(a=>`<article class="achievement-entry ${s.achievements.includes(a.id)?'unlocked':''}"><span class="achievement-icon">${a.icon}</span><div><h3>${a.name}</h3><p>${a.description}</p><small>${s.achievements.includes(a.id)?'✓ 已解锁':'尚未解锁'}</small></div></article>`).join('')}<article class="achievement-entry ${s.unlockedHiddenAchievement?'unlocked':''}"><span class="achievement-icon">${s.unlockedHiddenAchievement?'♜':'?'}</span><div><h3>${s.unlockedHiddenAchievement?"Don't Mess With The Dog":'？？？？？'}</h3><p>${s.unlockedHiddenAchievement?'有些事情，看看别人做过就够了。':'尚未解锁'}</p></div></article></div>`;
}
export function settings(game) {
  const s=game.storage.data.settings;
  return `<div class="settings-list"><label class="setting-row"><span>声音<small>公园里的小小声音</small></span><input type="checkbox" data-setting="sound" ${s.sound?'checked':''}></label>
    <label class="setting-row"><span>音量</span><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-setting="volume" aria-label="游戏音量"></label>
    <label class="setting-row"><span>散步时长<small>下一次散步生效</small></span><select data-setting="duration"><option value="180" ${s.duration===180?'selected':''}>3 分钟 · 轻松走走</option><option value="300" ${s.duration===300?'selected':''}>5 分钟 · 慢慢探索</option></select></label>
    <label class="setting-row"><span>减少装饰动画</span><input type="checkbox" data-setting="reducedMotion" ${s.reducedMotion?'checked':''}></label></div>
    <div class="controls-reference"><p class="eyebrow">HOW TO WALK</p>${device.mobile?'<p>左手摇杆移动，右手按钮互动。</p><p>点按状态查看属性；小游戏使用滑杆与按钮。</p><small>已启用手机画面与轻量播放，散步中途自动保存。</small>':'<p><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> 移动　<kbd>E</kbd> 互动</p><p><kbd>Space</kbd> 扔飞盘 / 寻找　<kbd>ESC</kbd> 暂停</p><small>电脑画面保留完整仪表与地图，散步中途自动保存。</small>'}</div>
    <div class="reset-row"><span>想重新认识这个公园？</span>${button('reset-confirm','重置存档','danger-text')}</div>`;
}
