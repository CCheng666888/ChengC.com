import { mainMenu } from './MainMenu.js';
import { hud } from './HUD.js';
import { codex, achievementPanel, settings } from './Panels.js';
import { button, paw } from './icons.js';
import { DOGS, STATE_LABELS } from '../data/dogs.js';
import { drawDog, ellipse } from '../game/Art.js';
import { timeLabel, clamp } from '../game/math.js';

export class UI {
  constructor(game) {
    this.game=game;this.root=document.querySelector('#interface');this.dialogs=document.querySelector('#dialogs');this.hasModal=false;this.hudTimer=0;
    this.root.addEventListener('click',e=>this.click(e));this.dialogs.addEventListener('click',e=>this.click(e));
    this.dialogs.addEventListener('input',e=>this.change(e));this.dialogs.addEventListener('change',e=>this.change(e));
    document.addEventListener('keydown',e=>this.trapFocus(e));
  }
  click(e) {
    const b=e.target.closest('[data-action]');if(!b||b.disabled||this.game.suspended)return;
    const action=b.dataset.action,g=this.game;g.audio.unlock();g.audio.play('click');
    const handlers={
      start:()=>g.storage.data.currentWalk?this.showModal('A FRESH START','重新开始散步？','<p class="panel-intro">上次的散步还没走完。开始新的散步会替换中途进度，累计记录会保留。</p>',`${button('resume','继续上次','primary')}${button('start-fresh','重新开始')}`):g.start(),
      'start-fresh':()=>g.start(),resume:()=>g.start(true),codex:()=>this.showCodex(),achievements:()=>this.showAchievements(),settings:()=>this.showSettings(),
      close:()=>{if(g.mini.active)g.mini.cancel();else if(g.events.active)g.events.choose(2);else this.closeModal();},
      pause:()=>{if(!g.mini.active&&!g.events.active)this.pause();},unpause:()=>this.closeModal(),menu:()=>g.toMenu(),interact:()=>g.interact(),
      'mini-frisbee':()=>{if(!g.ui.hasModal&&!g.mini.active)g.mini.start('frisbee');},'mini-bone':()=>{if(!g.ui.hasModal&&!g.mini.active)g.mini.start('bone');},'mini-commands':()=>{if(!g.ui.hasModal&&!g.mini.active)g.mini.start('commands');},
      care:()=>g.care(b.dataset.care),call:()=>{g.dog.call();this.closeModal();g.audio.play('bark');},'event-choice':()=>g.events.choose(Number(b.dataset.index)),
      throw:()=>g.mini.throw(),sniff:()=>g.mini.sniff(),command:()=>g.mini.command(b.dataset.command),
      finish:()=>{if(g.mini.active)return;this.showModal('A GOOD WALK','准备回家了吗？','<p class="panel-intro">结束本次散步，看看你们今天的默契。也可以继续在公园里走走。</p>',`${button('finish-confirm','结束并结算','primary')}${button('close','再走一会儿')}`);},'finish-confirm':()=>g.finish(),
      sound:()=>{g.storage.data.settings.sound=!g.storage.data.settings.sound;g.storage.save();this.toast(g.storage.data.settings.sound?'公园声音已开启':'已静音','♫');},
      'select-dog':()=>{if(g.state==='playing')return;g.storage.data.selectedDog=b.dataset.dog;g.storage.data.currentWalk=null;g.storage.save();g.dog=g.createDog();this.showCodex();},
      'reset-confirm':()=>this.showModal('START AGAIN','确定重置存档？','<p class="panel-intro">散步记录、最高分、伙伴信任和所有成就都会清除。这个操作无法撤销。</p>',`${button('reset-now','确认重置','danger')}${button('settings','保留记录','primary')}`),
      'reset-now':()=>{g.state='menu';g.storage.reset();g.audio.settings=g.storage.data.settings;g.dog=g.createDog();g.session=g.newSession();g.mini.cancel();g.events.active=null;g.ui.closeModal();g.ui.menu();this.toast('新的旅程，从第一步开始。','☀');}
    };
    handlers[action]?.();
  }
  change(e) {
    const el=e.target,g=this.game;
    if(el.dataset.setting){const key=el.dataset.setting;g.storage.data.settings[key]=el.type==='checkbox'?el.checked:Number(el.value);g.storage.save();document.body.classList.toggle('reduce-motion',g.storage.data.settings.reducedMotion);}
    if(el.id==='throw-angle'&&g.mini.active){g.mini.active.angle=Number(el.value);document.querySelector('[data-angle-label]').textContent=`${el.value}°`;}
  }
  menu() {this.root.innerHTML=mainMenu(this.game);this.root.className='menu-ui';document.body.classList.toggle('reduce-motion',this.game.storage.data.settings.reducedMotion);}
  hud() {this.root.innerHTML=hud(this.game);this.root.className='game-ui';this.game.input.bindJoystick(document.querySelector('#joystick'));this.portrait(document.querySelector('#dog-portrait'),this.game.dog.spec,.9);this.updateHUD();}
  portrait(canvas,spec,scale=1.8) {if(!canvas)return;const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);ellipse(c,canvas.width/2,canvas.height*.57,canvas.width*.36,canvas.height*.35,'#eee7d0');drawDog(c,{x:canvas.width*.43,y:canvas.height*.77,spec,direction:1,moving:false,state:'happy'},0,scale);}
  showModal(tag,title,body,footer='',wide=false,close=true) {
    if(!this.hasModal)this.returnFocus=document.activeElement;
    this.hasModal=true;this.game.input.clear();this.root.inert=true;
    this.dialogs.innerHTML=`<div class="modal-scrim"><section class="panel ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="panel-title"><header class="panel-header"><div><p class="eyebrow">${tag}</p><h2 id="panel-title">${title}</h2></div>${close?button('close','×','close-btn','aria-label="关闭"'):''}</header><div class="panel-body">${body}</div>${footer?`<footer class="panel-actions">${footer}</footer>`:''}</section></div>`;
    this.dialogs.querySelector('button, input, select')?.focus({preventScroll:true});
  }
  closeModal() {this.hasModal=false;this.dialogs.innerHTML='';this.root.inert=false;this.game.input.clear();if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});}
  trapFocus(e) {
    if(e.key!=='Tab'||!this.hasModal||this.game.suspended)return;
    const nodes=[...this.dialogs.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')];if(!nodes.length)return;
    const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  showCodex() {this.showModal('YOUR WALKING COMPANIONS','认识你的散步搭档',codex(this.game),button('close','好，我们走吧','primary'),true);document.querySelectorAll('[data-dog-portrait]').forEach(c=>this.portrait(c,DOGS.find(d=>d.id===c.dataset.dogPortrait)));}
  showAchievements() {this.showModal('THE LITTLE MILESTONES','一点点，变得更好。',achievementPanel(this.game),button('close','继续好好散步','primary'),true);}
  showSettings() {this.showModal('MAKE YOURSELF AT HOME','按照你的节奏。',settings(this.game),button('close','保存并返回','primary'));}
  pause() {this.game.saveWalk();this.showModal('TAKE A BREATHER','歇一小会儿。','<div class="pause-art">'+paw+'</div><p class="panel-intro">公园还在这里。你的散步搭档也在等你。</p>',`${button('unpause','继续散步','primary')}${button('settings','设置')}${button('achievements','成就')}${button('menu','返回主菜单')}`);}
  interaction(bench=false) {this.showModal('A MOMENT TOGETHER',bench?'一起坐一会儿吧。':'它想和你待在一起。',`<p class="panel-intro">${this.game.dog.spec.name}抬头看着你。每一点耐心，都会被它记住。</p><div class="choice-list">${button('care','<span>♡ 摸摸它<small>快乐 +7 · 信任 +5</small></span><b>↗</b>','choice','data-care="pet"')}${button('care','<span>♧ 喂点零食<small>精力 +12 · 服从 +4</small></span><b>↗</b>','choice','data-care="treat"')}${button('care','<span>☀ 陪它休息<small>精力 +18 · 信任 +3</small></span><b>↗</b>','choice','data-care="rest"')}${button('call','<span>↝ 叫它过来<small>让它回到你身边</small></span><b>↗</b>','choice')}</div>`);}
  showEvent(event) {this.showModal(event.tag,event.title,`<div class="event-emblem">${event.icon}</div><p class="panel-intro">${event.text}</p>${event.timeout?'<div class="event-timer"><span data-event-timer></span></div>':''}<div class="choice-list">${event.choices.map((c,i)=>button('event-choice',`<span>${c.label}<small>${c.note}</small></span><b>↗</b>`,'choice',`data-index="${i}"`)).join('')}</div>`,'',false,false);}
  eventTime(t) {const el=document.querySelector('[data-event-timer]');if(el)el.style.width=`${clamp(t/7*100)}%`;}
  showFrisbee(a) {this.showModal('01 / CATCH A LITTLE JOY','接住这一点快乐。',`<p class="panel-intro">拖动方向，对准落点。等力度到达理想值，点击投掷或按空格。</p><canvas id="frisbee-field" width="620" height="245" aria-label="飞盘投掷练习"></canvas><div class="throw-controls"><label>方向 <b data-angle-label>0°</b><input id="throw-angle" type="range" min="-50" max="50" step="1" value="0" aria-label="飞盘角度"></label><div class="power-block"><span>力度 <b data-power-label>0%</b><small>理想值 ${a.targetPower}%</small></span><div class="power-track"><i style="left:${a.targetPower}%"></i><span data-power-bar></span></div></div></div><p class="panel-footnote">方向 ${a.targetAngle}° 最接近落点 · 精力与服从也会影响接盘。</p>`,button('throw','扔出去 <kbd>Space</kbd>','primary','id="throw-button"'),true);}
  frisbeePower(a) {const bar=document.querySelector('[data-power-bar]'),label=document.querySelector('[data-power-label]');if(bar)bar.style.width=`${a.phase==='ready'?a.power:a.thrownPower}%`;if(label)label.textContent=`${Math.round(a.phase==='ready'?a.power:a.thrownPower)}%`;}
  frisbeeThrown() {const b=document.querySelector('#throw-button');if(b){b.disabled=true;b.textContent='它正在追飞盘…';}const angle=document.querySelector('#throw-angle');if(angle)angle.disabled=true;}
  showBone() {const el=document.querySelector('#bone-banner');el.hidden=false;el.innerHTML=`<div><p class="eyebrow">02 / FOLLOW YOUR NOSE <b data-bone-time>35s</b></p><h3>跟着它的鼻子走。</h3><p data-bone-hint></p></div>${button('sniff','挖一挖 <kbd>E</kbd>','primary')}${button('close','×','close-btn','aria-label="结束寻找"')}`;}
  boneHint(a) {const h=document.querySelector('[data-bone-hint]'),t=document.querySelector('[data-bone-time]');if(h)h.textContent=a.hint;if(t)t.textContent=`${Math.ceil(a.remaining)}s`;}
  hideBone() {const el=document.querySelector('#bone-banner');if(el){el.hidden=true;el.innerHTML='';}}
  showCommands(a) {this.showModal('03 / A LITTLE UNDERSTANDING','听懂彼此的小心思。',`<p class="panel-intro">看清指令，4 秒内点击对应按钮。四轮成功三次，就算默契过关。</p><div class="command-card"><span data-command-round>1 / 4</span><h3 data-command-wanted>${a.wanted}</h3><p data-command-feedback>准备好了吗？</p><div class="event-timer"><span data-command-timer></span></div></div><div class="command-buttons">${a.commands.map(c=>button('command',c,'',`data-command="${c}"`)).join('')}</div><p class="panel-footnote">服从和信任越高，它就越容易回应你。</p>`);}
  commandRound(a) {document.querySelector('[data-command-round]').textContent=`${a.round+1} / 4`;document.querySelector('[data-command-wanted]').textContent=a.wanted;document.querySelector('[data-command-feedback]').textContent='就是这个，快一点！';document.querySelectorAll('[data-command]').forEach(b=>b.disabled=false);}
  commandTimer(t) {const el=document.querySelector('[data-command-timer]');if(el)el.style.width=`${clamp(t/4*100)}%`;}
  commandFeedback(ok,text) {const el=document.querySelector('[data-command-feedback]');if(el)el.textContent=ok?'✓ 做到了！好乖。':text;document.querySelectorAll('[data-command]').forEach(b=>b.disabled=true);}
  showMiniResult(ok,message) {this.showModal(ok?'A LITTLE WIN':'KEEP TRYING',ok?'好搭档，就是你们。':'没关系，再试一次。',`<div class="event-emblem">${ok?'✧':'♡'}</div><p class="panel-intro">${message}</p>`,button('close','继续散步','primary'));}
  results(result) {
    const g=this.game,s=g.dog.stats;
    this.root.innerHTML='';this.showModal('UNTIL THE NEXT LITTLE WALK','WALK COMPLETE',`<div class="result-paw">${paw}</div><p class="result-title">${result.title}</p><div class="result-stats"><div><span>Distance</span><b>${Math.round(g.session.distance)}<small> m</small></b></div><div><span>Happiness</span><b>${Math.round(s.happiness)}</b></div><div><span>Trust</span><b>${Math.round(s.trust)}</b></div><div><span>Obedience</span><b>${Math.round(s.obedience)}</b></div></div><div class="walk-score"><span>Walk Score ${result.newBest?'<i>NEW BEST</i>':''}</span><strong>${result.score}<small> / 1000</small></strong><div class="stars">${'★'.repeat(result.stars)}<span>${'☆'.repeat(5-result.stars)}</span></div></div><p class="panel-footnote">${g.session.visits.size} 个地点 · ${g.session.interactions} 次互动 · ${g.session.games} 次小游戏成功</p>`,`${button('start-fresh','再走一次','primary')}${button('menu','返回主菜单')}`,false,false);
  }
  toast(message,icon='♡') {
    const el=document.createElement('div');el.className='toast';const glyph=document.createElement('span');glyph.className='toast-icon';glyph.textContent=icon;const text=document.createElement('span');text.textContent=message;el.append(glyph,text);const box=document.querySelector('#toasts');box.append(el);if(box.children.length>3)box.firstChild.remove();setTimeout(()=>{el.classList.add('leaving');setTimeout(()=>el.remove(),300);},3500);
  }
  update(dt) {this.hudTimer+=dt;if(this.hudTimer>.18){this.hudTimer=0;if(this.game.state==='playing')this.updateHUD();}}
  updateHUD() {
    const g=this.game,s=g.dog.stats,set=(name,value)=>{const e=this.root.querySelector(`[data-hud="${name}"]`);if(e)e.textContent=value;};
    set('time',timeLabel(Math.max(0,g.session.duration-g.session.elapsed)));set('distance',Math.round(g.session.distance));set('state',STATE_LABELS[g.dog.state]||'悠闲散步');set('save',g.storage.available?'● 已存档':'○ 存档不可用');
    Object.entries(s).forEach(([key,v])=>{const val=this.root.querySelector(`[data-stat-value="${key}"]`),bar=this.root.querySelector(`[data-stat-bar="${key}"]`);if(val)val.textContent=Math.round(v);if(bar){bar.style.width=`${v}%`;bar.classList.toggle('low',v<25);}});
    for(const [key,done,max] of [['visits',g.session.visits.size,4],['interactions',g.session.interactions,5],['games',g.session.games,1]]) {const q=this.root.querySelector(`[data-quest="${key}"]`);if(q){q.querySelector('b').textContent=`${Math.min(done,max)} / ${max}`;q.querySelector('span').textContent=done>=max?'✓':'○';q.classList.toggle('done',done>=max);}}
    const p=g.world.nearest(g.player);set('context',g.mini.active?.type==='bone'?'靠近土堆，观察它的嗅闻提示。':p?`E · ${p.label}`:g.dog.stats.energy<25?'它有点累了，陪它休息一下吧。':'慢慢走，看看这个公园。');
    const map=document.querySelector('#mini-map');if(map){const c=map.getContext('2d');c.clearRect(0,0,160,100);c.fillStyle='#d8dfb8';c.fillRect(0,0,160,100);c.strokeStyle='#f7edd4';c.lineWidth=8;c.beginPath();c.ellipse(81,46,29,24,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(80,68);c.lineTo(80,100);c.stroke();g.world.landmarks.forEach(p=>ellipse(c,p.x/10,p.y/10,3,3,g.session.visits.has(p.landmark)?'#809962':'#e7b35e'));ellipse(c,g.player.x/10,g.player.y/10,4,4,'#e4825b');ellipse(c,g.dog.x/10,g.dog.y/10,2,2,'#775f47');}
    const interact=this.root.querySelector('[data-action="interact"]');if(interact)interact.disabled=!!g.mini.active;
  }
}
