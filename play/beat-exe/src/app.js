(()=>{'use strict';
const $=id=>document.getElementById(id), E=BeatEngine, content=BEAT_CONTENT, KEY='beat_exe_save_v1', diffNames=E.DIFFICULTIES;
const mobileMedia=matchMedia('(max-width:800px), (pointer:coarse)').matches;
let songs=content.songs,pack=content.pack,save=E.defaults(),selected='neon',difficulty='NORMAL',page='home',filter='all',desktop=false,nativeTimer,toastTimer,modalOrigin;
let session=null,audio=null,playing=false,paused=false,loading=false,assist=false,raf=0,timer=0,launchToken=0,lastTime=0,held=new Set(),particles=[],flashes=[0,0,0,0],judgeUntil=0,phase=-1,secretBuffer='',secretAt=0,pointerLanes=new Map(),lastResult=null;
const missPhotos=new Map(),missFlash=BeatMedia.createMissFlash(src=>{
  for(const [path,img] of missPhotos)img.classList.toggle('hidden',path!==src);
  $('missPhotoFlash').classList.add('active');
},()=>$('missPhotoFlash').classList.remove('active'));
function prepareMissPhotos(p){
  for(const src of p?.missImages||[]){const img=new Image();img.src=src;img.alt='';img.decoding='async';img.className='hidden';missPhotos.set(src,img);$('missPhotoFlash').appendChild(img);}
}
const achievements=[{id:'first',name:'第一次连接',desc:'完成任意一首普通曲目',icon:'◈'},{id:'combo',name:'节奏在手',desc:'达成 50 连击',icon:'〰'},{id:'grade',name:'频率共振',desc:'任意普通曲目达到 A 评级',icon:'✦'},{id:'three',name:'持续在线',desc:'累计完成 3 次正式游玩',icon:'⌁'},{id:'fc',name:'无缝连接',desc:'任意曲目达成 FULL COMBO',icon:'◇'},{id:'six',name:'跨越频段',desc:'通关 6 首不同普通曲目',icon:'⟁'},{id:'secret',name:'你发现了不属于这里的东西',desc:'连接到异常谱面系统',icon:'⌘',hidden:true},{id:'boss',name:'隐藏玩家认证',desc:'完成 UNKNOWN_07',icon:'♜',hidden:true}];
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const timeLabel=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3600)}
function savedStatus(ok=true){$('saveStatus').innerHTML=ok?'<i class="green-dot"></i> 进度已保存':'本次进度仅保存在会话中';$('saveStatus').classList.toggle('save-warning',!ok)}
function persist(){save.updatedAt=Date.now();try{const previous=localStorage.getItem(KEY);if(previous)localStorage.setItem(KEY+'_backup',previous);localStorage.setItem(KEY,JSON.stringify(save));savedStatus()}catch{savedStatus(false)}if(desktop){clearTimeout(nativeTimer);nativeTimer=setTimeout(async()=>{try{const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(save)});if(!r.ok)throw Error();savedStatus()}catch{savedStatus(false);toast('本机存档暂时写入失败，请导出备份')}},180)}}
async function init(){
  for(const key of [KEY,KEY+'_backup'])try{const raw=localStorage.getItem(key);if(raw){save=E.validateSave(JSON.parse(raw));break}}catch{}
  // Show the first-run help before optional fetches, so it cannot replace a terminal opened while loading.
  applySettings();render();if(!localStorageSafe('beat_exe_seen_help')){showHelp();try{localStorage.setItem('beat_exe_seen_help','1')}catch{}}
  if(location.protocol.startsWith('http')&&new URLSearchParams(location.search).has('desktop')&&['127.0.0.1','localhost'].includes(location.hostname))try{const r=await fetch('/api/platform');if(r.ok&&(await r.json()).desktop){desktop=true;const s=await fetch('/api/save');if(s.ok){const n=await s.json();if(n){let validated=E.validateSave(n);if(validated.updatedAt>=save.updatedAt)save=validated;}}}}catch{}
  if(location.protocol.startsWith('http')&&!window.BEAT_BUNDLED){
    try{const r=await fetch('bonus_pack/zxx.json',{cache:'no-cache'});if(r.ok){const p=await r.json();if(p.version===1&&p.id&&p.song&&p.stages){pack=p;content.pack=p;songs=songs.map(s=>s.id===p.song.id?{...s,...p.song,hidden:true}:s);const cr=await fetch(p.chart,{cache:'no-cache'});if(cr.ok){const ch=await cr.json();if(diffNames.every(d=>Array.isArray(ch[d])))content.charts[p.song.id]=ch;}}}}catch{console.warn('Bonus configuration unavailable; using bundled pack.')}
    try{const r=await fetch('bonus_pack/index.json',{cache:'no-cache'});if(r.ok){const files=await r.json();for(const file of files.packs||[]){const pr=await fetch(file,{cache:'no-cache'}),p=await pr.json();if(p.version!==1||!p.song||!p.chart)continue;const cr=await fetch(p.chart,{cache:'no-cache'}),ch=await cr.json();if(!diffNames.every(d=>Array.isArray(ch[d])))continue;songs=songs.filter(s=>s.id!==p.song.id).concat({...p.song,hidden:true,pack:p});content.charts[p.song.id]=ch;}}}catch{}
  }
  if(!playing&&!loading){applySettings();render();}
}
function localStorageSafe(k){try{return localStorage.getItem(k)}catch{return null}}
function applySettings(){document.body.classList.toggle('reduced',save.settings.reduceMotion)}
function unlocked(s){return !s.hidden?save.plays>=s.unlock:save.hiddenUnlocked}
function unlockedDiff(d){return d!=='INSANE'||save.clears>=3||selected===pack.song.id&&save.hiddenUnlocked}
function awardAchievement(id){if(!save.achievements.includes(id)){save.achievements.push(id);const a=achievements.find(a=>a.id===id);if(a)toast(`成就解锁 · ${a.name}`)}}
function song(){return songs.find(s=>s.id===selected)||songs[0]}
function activePack(s=song()){return s.pack||pack}
function render(){
  $('navCount').textContent=String(songs.filter(s=>!s.hidden||save.hiddenUnlocked).length).padStart(2,'0');$('achCount').textContent=String(save.achievements.length).padStart(2,'0');
  if(page==='settings'){renderSettings();return}if(page==='achievements'){renderAchievements();return}
  renderTracks();renderDetail();$('unlockHint').textContent=save.plays<3?`累计完成 ${save.plays} / 3 次游玩解锁新曲目`:save.plays<6?`累计完成 ${save.plays} / 6 次游玩解锁最后广播`:'全部常规曲目已解锁';
}
function navigate(p){page=p;$('pageLabel').textContent=({home:'主菜单',library:'曲目库',achievements:'成就档案',settings:'音频与设置'})[p];document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===p));$('homeHero').classList.toggle('hidden',p!=='home');$('musicSection').classList.toggle('hidden',!['home','library'].includes(p));$('achievementsPage').classList.toggle('hidden',p!=='achievements');$('settingsPage').classList.toggle('hidden',p!=='settings');$('musicHeading').innerHTML=p==='library'?'全部频段<span>原创曲目库</span>':'选择你的下一段节拍<span>曲目精选</span>';render();window.scrollTo({top:0,behavior:'smooth'})}
function renderTracks(){
  const list=songs.filter(s=>(!s.hidden||save.hiddenUnlocked)&&(filter!=='available'||unlocked(s))&&(filter!=='favorites'||save.favorites.includes(s.id)));
  $('trackGrid').innerHTML=list.length?list.map((s,i)=>{const open=unlocked(s),r=save.records[`${s.id}:${difficulty}`];return `<article tabindex="0" role="button" aria-label="选择 ${esc(s.title)}${open?'':'，尚未解锁'}" class="track-card ${selected===s.id?'selected':''} ${open?'':'locked'}" data-song="${s.id}"><div class="art"><img src="${esc(s.cover)}" alt="${esc(s.cn)}封面"><span class="number">${s.hidden?'??':String(songs.indexOf(s)+1).padStart(2,'0')}</span><button class="favorite ${save.favorites.includes(s.id)?'on':''}" data-favorite="${s.id}" aria-label="收藏 ${esc(s.title)}">${save.favorites.includes(s.id)?'♥':'♡'}</button>${open?'':'<div class="lock-cover">◇</div>'}</div><div class="info"><h3>${esc(s.title)}</h3><p>${esc(s.cn)} · ${esc(s.genre)}</p><div class="meta"><span>${s.bpm} BPM <span>· ${timeLabel(s.duration)}</span></span><span>${open?r?r.grade+' / '+Math.round(r.accuracy)+'%':'未游玩':s.unlock+' 次游玩解锁'}</span></div></div></article>`}).join(''):'<p class="page-intro">这里还没有曲目。点击封面的 ♡，收藏你的频率。</p>';
}
function renderDetail(){const s=song();if(!unlockedDiff(difficulty))difficulty='HARD';const r=save.records[`${s.id}:${difficulty}`],open=unlocked(s),notes=content.charts[s.id]?.[difficulty]||[];
  $('trackDetail').innerHTML=`<div class="detail-heading"><span>SELECTED FREQUENCY</span><span>↗</span></div><img class="detail-cover" src="${esc(s.cover)}" alt="${esc(s.cn)}"><h3>${esc(s.title)}</h3><p class="cn">${esc(s.cn)} / ${esc(s.artist)}</p><div class="detail-meta"><span><small>TEMPO</small>${s.bpm} BPM</span><span><small>DURATION</small>${timeLabel(s.duration)}</span><span><small>NOTES</small>${notes.length}</span></div><div class="diff-label">选择难度 <span>4 KEY MODE</span></div><div class="difficulty">${diffNames.map((d,i)=>`<button data-diff="${d}" class="${difficulty===d?'active':''}" ${unlockedDiff(d)?'':'disabled'}>${d}<small>${unlockedDiff(d)?'Lv.'+(s.level+i*3):'🔒'}</small></button>`).join('')}</div><div class="best-record"><span>${r?'个人最佳 / '+r.grade+(r.fullCombo?' · FC':''):'个人最佳'}</span><b>${r?r.score.toLocaleString():'— — —'}</b></div><button id="startBtn" class="primary play-button" ${open?'':'disabled'}><span>▶ ${save.settings.assist?'观谱练习':'开始游戏'}</span><span>↗</span></button><p class="detail-tip">${open?'D / F / J / K · 或点击四条轨道':`完成 ${s.unlock} 次正式游玩即可解锁`}</p>`;
}
function renderAchievements(){const visible=achievements.filter(a=>!a.hidden||save.achievements.includes(a.id));$('achievementsPage').innerHTML=`<p class="eyebrow">YOUR SIGNAL ARCHIVE</p><h2>成就档案</h2><p class="page-intro">每一段节拍，都留下痕迹。已发现 ${save.achievements.length} 项成就。</p><div class="ach-grid">${visible.map(a=>{let done=save.achievements.includes(a.id);return `<article class="achievement ${done?'':'locked'}"><div class="ach-symbol">${a.icon}</div><h3>${a.name}</h3><p>${a.desc}</p><small>${done?'SIGNAL VERIFIED ✓':'AWAITING SIGNAL'}</small>${a.id==='secret'?'<button class="secondary" id="achievementSecret" style="display:block;margin-top:16px">连接异常频段 ↗</button>':''}</article>`}).join('')}</div>`}
function renderSettings(){const s=save.settings;$('settingsPage').innerHTML=`<p class="eyebrow">TUNE YOUR EXPERIENCE</p><h2>音频与设置</h2><p class="page-intro">找到适合自己的速度，让每一次击打刚好落在节拍上。</p><div class="settings-grid"><section class="settings-card"><h3>音频 / 轨道</h3><div class="setting-row"><label>主音量 <span id="volumeValue">${Math.round(s.volume*100)}%</span></label><input aria-label="主音量" type="range" min="0" max="100" value="${s.volume*100}" data-setting="volume"></div><div class="setting-row"><label>下落速度 <span id="speedValue">${s.speed.toFixed(2)}×</span></label><input aria-label="下落速度" type="range" min="65" max="180" value="${s.speed*100}" data-setting="speed"><small>只改变视觉速度，判定时机保持相同。</small></div><div class="setting-row"><label>音频偏移 <span id="offsetValue">${s.offset} ms</span></label><input aria-label="音频偏移" type="range" min="-150" max="150" step="5" value="${s.offset}" data-setting="offset"><small>习惯晚按时调为正值；结算页会显示平均偏差。</small></div><div class="setting-row"><label><span><input type="checkbox" data-setting="reduceMotion" ${s.reduceMotion?'checked':''}> 减少动态效果</span></label><small>关闭闪烁、脉冲动画与额外粒子。</small></div><div class="setting-row"><label><span><input type="checkbox" data-setting="assist" ${s.assist?'checked':''}> 观谱练习</span></label><small>自动演奏谱面，用于学习和观赏；不记成绩，不解锁内容。</small></div></section><section class="settings-card"><h3>舞台 / 存档</h3><div class="setting-row"><label>舞台配色</label><select aria-label="舞台配色" data-setting="background"><option value="orbit" ${s.background==='orbit'?'selected':''}>紫色轨道 / 默认</option><option value="grid" ${s.background==='grid'?'selected':''} ${save.plays<3?'disabled':''}>青色网格 / 完成 3 次游玩解锁</option><option value="aurora" ${s.background==='aurora'?'selected':''} ${save.clears<6?'disabled':''}>玫瑰极光 / 通关 6 次解锁</option></select></div><div class="setting-row"><label>游戏进度 <span>${save.plays} 次游玩 / ${save.clears} 次通关</span></label><small>成绩、解锁、收藏和设置会自动保存。网页与 EXE 之间可用存档文件迁移进度。</small></div><div class="button-row"><button class="secondary" id="exportBtn">导出存档 ↓</button><button class="secondary" id="importBtn">导入存档 ↑</button></div><div class="setting-row"><label>操作说明</label><small>普通音符按一下；长按保持到尾部；滑动按亮起的方向换轨。空格 / Esc 暂停。</small><button class="secondary" id="settingsHelp" style="margin-top:15px">查看操作指南</button></div><button class="secondary" id="calibrateBtn">听节拍校准 ↗</button></section></div>`}
function showDialog(html){modalOrigin=document.activeElement;$('dialog').innerHTML=html;$('overlay').classList.remove('hidden');setTimeout(()=>$('dialog').querySelector('button,input')?.focus(),0)}
function closeDialog(){if(playing&&paused)return;$('overlay').classList.add('hidden');modalOrigin?.focus()}
function showHelp(){showDialog(`<button class="close" data-action="close" aria-label="关闭">×</button><p class="eyebrow">WELCOME TO YOUR FREQUENCY</p><h2>准备好，进入节拍。</h2><p>音符到达底部的亮线时，按下对应轨道的按键。也可以用鼠标或手指操作四条轨道。</p><div class="tutorial-row"><div class="tutorial-symbol">━</div><p><b>普通点击</b><br>按下 <span class="keycap">D</span> <span class="keycap">F</span> <span class="keycap">J</span> <span class="keycap">K</span> 对应的一轨。</p></div><div class="tutorial-row"><div class="tutorial-symbol">┃</div><p><b>长按音符</b><br>按住亮条，保持到尾部经过判定线。太早松开会 MISS。</p></div><div class="tutorial-row"><div class="tutorial-symbol">↗</div><p><b>滑动音符</b><br>先击打起点，再跟随斜线切换到相邻轨道。键盘再按目标键，触屏拖过去。</p></div><p>PERFECT ±45ms · GREAT ±95ms · GOOD ±150ms<br>空格 / Esc 暂停。建议佩戴耳机，首次从 EASY 开始。</p><div class="button-row"><button class="primary" data-action="close">明白了，保持连接 →</button></div>`)}
function openTerminal(){
  if(playing||loading)return;
  showDialog(`<button type="button" class="close" data-action="close" aria-label="关闭">×</button><p class="eyebrow">BEAT OS / SYSTEM CONSOLE</p><h2>系统连接</h2><p>输入频段访问代码。</p><form id="terminalForm"><label class="sr-only" for="terminalCode">频段访问代码</label><input id="terminalCode" class="terminal" name="code" placeholder="ACCESS CODE_" autocomplete="off" autocapitalize="none" autocorrect="off" inputmode="text" enterkeyhint="go" spellcheck="false" maxlength="64"><p id="terminalError" class="terminal-error" role="alert"></p><div class="button-row"><button type="submit" class="primary" id="terminalConnect">连接频段 →</button></div></form>`);
  setTimeout(()=>$('terminalCode')?.focus({preventScroll:true}),0);
}
function connectSecret(){
  if(playing||loading)return;
  save.hiddenUnlocked=true;selected=pack.song.id;difficulty='EASY';
  // Reach media.play() before keyboard dismissal, storage or rebuilding the library on iOS.
  startGame();document.activeElement?.blur();awardAchievement('secret');persist();toast('UNKNOWN_07 · 连接已建立');
}
function chartFor(s){return content.charts[s.id]?.[difficulty]||[]}
async function startGame(){
  if(loading)return;const s=song();if(!unlocked(s)||!unlockedDiff(difficulty))return;
  const token=++launchToken;loading=true;stopMedia();lastResult=null;assist=save.settings.assist;session=new E.Session(chartFor(s),onJudge,difficulty);phase=-1;lastTime=0;held.clear();particles=[];flashes=[0,0,0,0];clearPointers();
  $('overlay').classList.add('hidden');$('app').classList.add('hidden');$('playScreen').className='play-screen '+save.settings.background;document.body.classList.add('playing');$('playTitle').textContent=s.title;$('playMeta').textContent=`${difficulty} / ${s.bpm} BPM${assist?' / 观谱练习':''}`;$('liveScore').textContent='0000000';$('liveAccuracy').textContent='100.00%';$('comboDisplay').querySelector('b').textContent='0';$('judgement').textContent='';$('songProgress').style.width='0';$('healthBar').style.height='100%';$('stageStatus').textContent='STAY ON FREQUENCY';$('memoryBackdrop').style.opacity=0;$('bossStage').style.opacity=0;
  const p=s.hidden?activePack(s):null,video=$('stageVideo');
  if(p){$('bossImage').src=p.bossImage;$('bossName').textContent=p.bossName;}
  if(p?.video&&p.videoIncludesIntro){
    // The intro music and the later original video audio share this one clock and element.
    audio=video;video.src=BeatMedia.videoSource(p,mobileMedia);video.muted=false;video.loop=false;video.playsInline=true;video.setAttribute('webkit-playsinline','');video.preload='auto';video.classList.remove('hidden');
  }else{
    audio=new Audio(s.audio);audio.id='soundtrack';audio.className='hidden';$('playScreen').appendChild(audio);audio.preload='auto';
  }
  audio.volume=save.settings.volume;const activeAudio=audio;
  $('countdown').classList.remove('hidden');$('countdown').textContent='正在连接音轨…';
  // Do not defer play() until after network loading or a timer: touch activation must reach it.
  const request=BeatMedia.beginPlayback(activeAudio);
  prepareMissPhotos(p);
  resizeCanvas();drawStage(0);
  try{await request;if(token!==launchToken){if(audio!==activeAudio)activeAudio.pause();return;}
    loading=false;playing=true;paused=false;$('countdown').classList.add('hidden');raf=requestAnimationFrame(frame);
  }catch(err){if(token===launchToken){loading=false;activeAudio.pause();$('countdown').classList.add('hidden');showDialog(`<p class="eyebrow">CONNECTION WAITING</p><h2>点一下，继续连接。</h2><p>${esc(err.name==='NotAllowedError'?'浏览器需要你直接点击按钮，才能播放有声内容。':err.message)}</p><div class="button-row"><button class="primary" data-action="retry">播放并进入 ▶</button><button class="secondary" data-action="menu">回到曲目库</button></div>`);}}
}
function stopMedia(){
  missFlash.clear();missPhotos.clear();$('missPhotoFlash').replaceChildren();
  const video=$('stageVideo');
  if(audio){audio.pause();audio.removeAttribute('src');audio.load();if(audio!==video)audio.remove();audio=null;}
  video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden');video.muted=false;video.loop=false;
  $('playScreen').classList.remove('video-visible');clearTimeout(timer);cancelAnimationFrame(raf);
}
function clockTime(){return audio?audio.currentTime-save.settings.offset/1000:0}
function frame(){if(!playing||paused)return;const t=clockTime();lastTime=t;session.update(t,held,assist);if(song().hidden&&activePack().continueOnMiss){session.health=Math.max(1,session.health);session.failed=false;}updatePhase(audio.currentTime);drawStage(t);$('liveScore').textContent=String(session.score).padStart(7,'0');$('liveAccuracy').textContent=session.accuracy.toFixed(2)+'%';$('healthBar').style.height=session.health+'%';$('songProgress').style.width=Math.min(100,audio.currentTime/song().duration*100)+'%';if(session.failed&&!assist){finishGame(true);return}if(audio.ended||audio.currentTime>=song().duration-.035){finishGame(false);return}raf=requestAnimationFrame(frame)}
function onJudge({grade,n,tail}){const colors={PERFECT:'#c7b0ff',GREAT:'#93e7d1',GOOD:'#f5cd8e',MISS:'#ee8d9b'};$('judgement').textContent=grade;$('judgement').style.color=colors[grade];$('judgement').classList.remove('pop');void $('judgement').offsetWidth;$('judgement').classList.add('pop');judgeUntil=performance.now()+500;$('comboDisplay').querySelector('b').textContent=session.combo;flashes[tail&&n.type==='slide'?n.target:n.lane]=grade==='MISS'?.15:.8;if(playing&&!paused)missFlash.trigger(grade,audio.currentTime,activePack(),song().hidden);if(!save.settings.reduceMotion&&grade!=='MISS')for(let i=0;i<8;i++)particles.push({lane:tail&&n.type==='slide'?n.target:n.lane,x:(Math.random()-.5)*70,y:0,vx:(Math.random()-.5)*3,vy:-Math.random()*4-1,life:1,color:colors[grade]})}
function updatePhase(t){
  if(!song().hidden)return;
  const p=activePack(),next=BeatMedia.phaseAt(t,p);if(next===phase)return;phase=next;
  $('playScreen').classList.toggle('anomaly',phase===1&&!save.settings.reduceMotion);
  $('playScreen').classList.toggle('video-visible',phase===2&&Boolean(p.video));
  $('stageStatus').textContent=['STAY ON FREQUENCY','PLAYER SIGNATURE DETECTED','HIDDEN PLAYER · LIVE'][phase];
  $('bossStage').style.opacity=phase===1?1:0;$('memoryBackdrop').style.opacity=0;
  if(phase===2&&p.video)$('playMeta').textContent=`${difficulty} / 视频原声${assist?' / 观谱练习':''}`;
  resizeCanvas();
}
const canvas=$('stageCanvas'),ctx=canvas.getContext('2d');let cw=innerWidth,ch=innerHeight,geometry;
function resizeCanvas(){cw=innerWidth;ch=innerHeight;const ratio=Math.min(devicePixelRatio||1,mobileMedia?1.25:2);canvas.width=cw*ratio;canvas.height=ch*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);let width=Math.min(520,cw*.9),left=(cw-width)/2,hit=ch*.79,top=$('playScreen').classList.contains('video-visible')?Math.max(130,ch*.46):95;geometry={width,left,hit,top,lane:width/4,travel:(hit-top)/(1.75/save.settings.speed)}}
function drawStage(t){if(!geometry)resizeCanvas();const {width,left,hit,top,lane,travel}=geometry;ctx.clearRect(0,0,cw,ch);
  if(!save.settings.reduceMotion){ctx.fillStyle='#b9a0ed44';for(let i=0;i<35;i++){let x=(i*197.3)%cw,y=(i*83.7+t*(7+i%5))%ch;ctx.fillRect(x,y,i%3===0?2:1,i%3===0?2:1)}if(cw>900){ctx.strokeStyle='#a48ac322';ctx.lineWidth=1;for(const side of [-1,1]){ctx.beginPath();for(let i=0;i<100;i++){const x=cw/2+side*(width/2+35+i*2),y=ch*.57+Math.sin(i*.2+t*song().bpm/30)*Math.sin(i*.04)*20;ctx.lineTo(x,y)}ctx.stroke()}}}
  const bg=ctx.createLinearGradient(0,top,0,hit+20);bg.addColorStop(0,'#12101810');bg.addColorStop(1,song().hidden&&phase>=2?'#0d0b15dd':'#181323dd');ctx.fillStyle=bg;ctx.fillRect(left,top,width,hit-top+20);
  for(let l=0;l<=4;l++){ctx.strokeStyle=l===0||l===4?'#9780ba55':'#89709e25';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left+l*lane,top);ctx.lineTo(left+l*lane,hit+25);ctx.stroke()}
  const beat=60/song().bpm;ctx.strokeStyle='#9b85b811';for(let i=0;i<8;i++){let y=hit-(((t%beat)+i*beat)*travel);if(y>top){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+width,y);ctx.stroke()}}
  for(let l=0;l<4;l++){if(held.has(l)||flashes[l]>.03){const g=ctx.createLinearGradient(0,hit-180,0,hit);g.addColorStop(0,'#c9a7ff00');g.addColorStop(1,`rgba(193,154,249,${held.has(l)?.28:flashes[l]*.24})`);ctx.fillStyle=g;ctx.fillRect(left+l*lane,hit-180,lane,180)}flashes[l]*=.9}
  ctx.strokeStyle='#c2a1ff';ctx.lineWidth=2;ctx.shadowColor='#ba91ff';ctx.shadowBlur=15;ctx.beginPath();ctx.moveTo(left,hit);ctx.lineTo(left+width,hit);ctx.stroke();ctx.shadowBlur=0;
  for(const n of session?.notes||[]){if(n.state===2||n.t-t>3||n.t+n.duration<t-.3)continue;const x=left+n.lane*lane+9,w=lane-18,y=hit-(n.t-t)*travel,ey=hit-(n.t+n.duration-t)*travel;if(y<top-100&&ey<top-100)continue;let color=n.type==='slide'?'#91e8c9':n.type==='hold'?'#df99ea':'#bba5ff';ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=save.settings.reduceMotion?0:10;
    if(n.type==='hold'){let gy=ctx.createLinearGradient(0,Math.max(ey,top),0,Math.min(y,hit));gy.addColorStop(0,'#cf90eab0');gy.addColorStop(1,'#9c66c944');ctx.fillStyle=gy;ctx.fillRect(x+9,Math.max(top,ey),w-18,Math.max(0,Math.min(y,hit)-Math.max(top,ey)));ctx.fillStyle=color;ctx.fillRect(x,ey,w,5);if(n.state===1){ctx.fillRect(x,hit-4,w,8)}else ctx.fillRect(x,y-4,w,8);
    }else if(n.type==='slide'){let tx=left+n.target*lane+lane/2;ctx.strokeStyle='#8edabe88';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x+w/2,n.state===1?hit:y);ctx.lineTo(tx,ey);ctx.stroke();ctx.fillStyle=color;ctx.fillRect(x,y-4,w,8);ctx.beginPath();ctx.moveTo(tx-13,ey);ctx.lineTo(tx,ey-9);ctx.lineTo(tx+13,ey);ctx.lineTo(tx,ey+9);ctx.fill();if(n.state===0){ctx.fillStyle='#192920';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(n.target>n.lane?'→':'←',x+w/2,y+4)}
    }else{ctx.fillRect(x,y-4,w,8);ctx.fillStyle='#eee2ff';ctx.fillRect(x+3,y-4,w-6,2)}ctx.shadowBlur=0;
  }
  if(!save.settings.reduceMotion)for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.life-=.028;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(left+(p.lane+.5)*lane+p.x,hit+p.y,3,3)}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);if(performance.now()>judgeUntil)$('judgement').textContent='';
}
function press(lane){if(!playing||paused||assist||held.has(lane))return;held.add(lane);session.press(lane,clockTime());setLane(lane,true);flashes[lane]=.55}
function release(lane){if(!held.has(lane))return;held.delete(lane);if(playing&&!paused&&!assist)session.release(lane,clockTime());setLane(lane,false)}
function setLane(lane,down){$('laneControls').querySelector(`[data-lane="${lane}"]`).classList.toggle('down',down)}
function clearPointers(){pointerLanes.clear();held.clear();document.querySelectorAll('.lane-controls button').forEach(b=>b.classList.remove('down'))}
function pauseGame(){if(loading){returnToMenu();return}if(!playing||paused)return;paused=true;missFlash.clear();audio.pause();$('stageVideo').pause();cancelAnimationFrame(raf);clearPointers();showDialog(`<p class="eyebrow">CONNECTION ON HOLD</p><h2>暂停。节拍等你。</h2><p>${esc(song().title)} / ${difficulty}<br>恢复后，长按音符可重新按住。音频与谱面将同步继续。</p><div class="button-row"><button class="primary" data-action="resume">继续游戏 ▶</button><button class="secondary" data-action="retry">重新开始 ↻</button><button class="secondary" data-action="menu">回到曲目库</button></div>`)}
function resumeGame(){
  if(!paused||loading)return;loading=true;const token=launchToken;
  const request=BeatMedia.beginPlayback(audio);
  request.then(()=>{if(token!==launchToken)return;paused=false;loading=false;$('overlay').classList.add('hidden');$('countdown').classList.add('hidden');raf=requestAnimationFrame(frame);}).catch(()=>{if(token===launchToken){loading=false;toast('请再次点击继续游戏，以恢复有声播放');}});
}
function returnToMenu(){++launchToken;playing=false;paused=false;loading=false;stopMedia();clearPointers();$('overlay').classList.add('hidden');$('playScreen').classList.add('hidden');$('app').classList.remove('hidden');document.body.classList.remove('playing');navigate('library')}
function finishGame(failed){if(!playing)return;playing=false;missFlash.clear();audio.pause();cancelAnimationFrame(raf);clearPointers();let result=failed?session.result():session.finish();result.failed=failed||result.failed;if(result.failed)result.grade='F';lastResult=result;const s=song(),prev=save.records[`${s.id}:${difficulty}`];let newBest=!result.failed&&(!prev||prev.grade==='F'||result.score>prev.score),recordBest=!prev||newBest||!prev.cleared&&result.score>prev.score,fragment=false;
  if(!assist){save.plays++;if(!result.failed){save.clears++;if(!s.hidden)awardAchievement('first');if(s.hidden){save.hiddenCleared=true;awardAchievement('boss')}}
    if(result.maxCombo>=50)awardAchievement('combo');if(!s.hidden&&result.accuracy>=90&&!result.failed)awardAchievement('grade');if(save.plays>=3)awardAchievement('three');if(result.fullCombo&&!result.failed)awardAchievement('fc');
    let key=`${s.id}:${difficulty}`;save.records[key]={...(recordBest?{score:result.score,accuracy:result.accuracy,maxCombo:result.maxCombo,grade:result.grade,fullCombo:result.fullCombo}:prev),maxCombo:Math.max(result.maxCombo,prev?.maxCombo||0),cleared:!result.failed||prev?.cleared===true,plays:(prev?.plays||0)+1};
    let distinct=new Set(Object.entries(save.records).filter(([k,v])=>v.cleared&&!songs.find(s=>s.id===k.split(':')[0])?.hidden).map(([k])=>k.split(':')[0]));if(distinct.size>=6)awardAchievement('six');
    const rule=pack.unlock||{plays:3,accuracy:90,song:'neon'};if(save.plays>=rule.plays&&Object.entries(save.records).some(([k,r])=>k.startsWith(rule.song+':')&&r.cleared&&r.accuracy>=rule.accuracy)){if(!save.hiddenUnlocked){save.hiddenUnlocked=true;toast('曲目库发现一个未识别信号')}}
    fragment=!s.hidden&&!result.failed&&(save.plays===2||Math.random()<.25);persist();
  }
  $('dialog').className='dialog';showDialog(`<p class="eyebrow">${assist?'PRACTICE / UNRANKED':result.failed?'SIGNAL LOST':'STAGE CLEAR'}${!assist&&newBest?' · PERSONAL BEST':''}</p><h2>${esc(s.title)}</h2>${s.hidden&&!result.failed?`<div class="result-boss"><img src="${esc(activePack().bossImage)}" alt="隐藏角色"><div><b>${esc(activePack().title)}</b><p>${esc(activePack().bossName)} / ${esc(activePack().verdict)}</p></div></div>`:''}<div class="result-top"><div class="grade ${result.grade}">${result.grade}</div><div class="result-score">${String(result.score).padStart(7,'0')}<small>${assist?'观谱练习 · 不保存成绩':result.fullCombo&&!result.failed?'FULL COMBO / 完美连接':newBest?'NEW PERSONAL BEST':'FINAL SCORE'}</small></div></div><div class="result-metrics"><span>准确率<b>${result.accuracy.toFixed(2)}%</b></span><span>最大连击<b>${result.maxCombo}</b></span><span>平均偏差<b>${result.offset>=0?'+':''}${Math.round(result.offset)} ms</b></span></div><div class="result-counts">${Object.entries(result.counts).map(([g,n])=>`<span>${g}<b>${n}</b></span>`).join('')}</div><p>${result.failed?'信号暂时中断。试试 EASY 或调整下落速度，再连接一次。':s.hidden?'你击败了最终隐藏角色。下一次，换一段频率再见。':assist?'跟上熟悉的节奏后，关闭观谱练习，挑战自己的最佳成绩。':result.accuracy>=90?'频率稳定，连接漂亮。下一段节拍等你。':'每一次连接都在进步。保持节拍，下一局会更好。'}</p><div class="button-row"><button class="primary" data-action="retry">再来一次 ↻</button><button class="secondary" data-action="menu">返回曲目库 →</button></div>${fragment?'<button class="fragment" id="fragmentBtn">[ LOG ] PLAYER_DATA_FRAGMENT_07 <span style="float:right">↗</span></button>':''}`)
}
function exportSave(){const b=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=`BEAT-exe-save-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('存档已导出')}
async function importSave(file){if(!file)return;try{if(file.size>2*1024*1024)throw Error('存档文件过大');const data=E.validateSave(JSON.parse(await file.text()));showDialog(`<p class="eyebrow">RESTORE YOUR FREQUENCY</p><h2>导入这份进度？</h2><p>存档包含 ${data.plays} 次游玩、${Object.keys(data.records).length} 条成绩记录。导入会替换当前进度，当前存档会自动导出一份备份。</p><div class="button-row"><button class="primary" id="confirmImport">导入并保留备份</button><button class="secondary" data-action="close">取消</button></div>`);$('confirmImport').onclick=()=>{exportSave();save=data;persist();applySettings();closeDialog();render();toast('进度恢复成功')}}catch(err){toast('导入失败：'+err.message)}$('importSave').value=''}
function calibrate(){showDialog(`<button class="close" data-action="close" aria-label="关闭">×</button><p class="eyebrow">AUDIO CALIBRATION / 120 BPM</p><h2>跟着节拍按空格</h2><p>先听四拍，再在每次听到声音时按空格。记录 8 次后自动计算偏移。</p><button class="primary" id="calibrationStart">开始校准 ▶</button><p id="calibrationStatus"></p>`);$('calibrationStart').onclick=()=>{try{const ac=new(window.AudioContext||window.webkitAudioContext)();ac.resume();const start=ac.currentTime+.7;for(let i=0;i<24;i++){const osc=ac.createOscillator(),g=ac.createGain();osc.type='sine';osc.frequency.value=i%4?800:1200;g.gain.setValueAtTime(save.settings.volume*.3,start+i*.5);g.gain.exponentialRampToValueAtTime(.001,start+i*.5+.07);osc.connect(g).connect(ac.destination);osc.start(start+i*.5);osc.stop(start+i*.5+.08)}let errors=[];let handler=e=>{if(e.code!=='Space'||e.repeat)return;e.preventDefault();const now=ac.currentTime;if(now<start+1.7)return;let nearest=Math.round((now-start)/.5),error=(now-start-nearest*.5)*1000;if(Math.abs(error)>200)return;errors.push(error);$('calibrationStatus').textContent=`已记录 ${errors.length} / 8`;if(errors.length>=8){errors.sort((a,b)=>a-b);save.settings.offset=Math.max(-150,Math.min(150,Math.round(((errors[3]+errors[4])/2)/5)*5));persist();cleanup();closeDialog();renderSettings();toast(`校准完成 · ${save.settings.offset} ms`)}};const cleanup=()=>{document.removeEventListener('keydown',handler);clearInterval(watch);ac.close().catch(()=>{})};document.addEventListener('keydown',handler);const watch=setInterval(()=>{if($('overlay').classList.contains('hidden')||!$('calibrationStatus'))cleanup()},250);$('calibrationStart').disabled=true;$('calibrationStatus').textContent='聆听四拍，然后跟拍…'}catch{toast('此浏览器不支持音频校准')}}}
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;if(action){if(action==='close')closeDialog();if(action==='resume')resumeGame();if(action==='retry'){returnToMenu();startGame()}if(action==='menu')returnToMenu();return}
  const nav=e.target.closest('[data-page]');if(nav){navigate(nav.dataset.page);return}
  const favorite=e.target.closest('[data-favorite]');if(favorite){const id=favorite.dataset.favorite;save.favorites=save.favorites.includes(id)?save.favorites.filter(x=>x!==id):[...save.favorites,id];persist();renderTracks();return}
  const card=e.target.closest('[data-song]');if(card){selected=card.dataset.song;render();return}
  const d=e.target.closest('[data-diff]');if(d){difficulty=d.dataset.diff;render();return}
  const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===f));renderTracks();return}
  const id=e.target.closest('button')?.id;
  if(id==='startBtn')startGame();if(id==='heroPlay'){selected='neon';difficulty='NORMAL';startGame()}if(['helpOpen','settingsHelp'].includes(id))showHelp();if(['terminalOpen','mobileTerminalOpen'].includes(id))openTerminal();
  if(['fragmentBtn','achievementSecret'].includes(id))connectSecret();if(id==='exportBtn')exportSave();if(id==='importBtn')$('importSave').click();if(id==='calibrateBtn')calibrate();if(id==='pauseBtn')pauseGame();
});
document.addEventListener('submit',e=>{
  if(e.target.id!=='terminalForm')return;e.preventDefault();
  const code=$('terminalCode').value.trim().toLowerCase();
  if(code===(pack.code||'zxx').toLowerCase())connectSecret();else $('terminalError').textContent='未找到该频段，请检查访问代码。';
});
function resizeModal(){const view=window.visualViewport;$('overlay').style.setProperty('--modal-height',`${view?.height||innerHeight}px`);$('overlay').style.setProperty('--modal-top',`${view?.offsetTop||0}px`);}
window.visualViewport?.addEventListener('resize',resizeModal);window.visualViewport?.addEventListener('scroll',resizeModal);addEventListener('resize',resizeModal);resizeModal();
document.addEventListener('input',e=>{const k=e.target.dataset.setting;if(!k)return;let value=e.target.type==='checkbox'?e.target.checked:e.target.tagName==='SELECT'?e.target.value:Number(e.target.value);if(['volume','speed'].includes(k))value/=100;save.settings[k]=value;applySettings();persist();if($(k+'Value'))$(k+'Value').textContent=k==='volume'?Math.round(value*100)+'%':k==='speed'?value.toFixed(2)+'×':value+' ms'});
$('importSave').onchange=e=>importSave(e.target.files[0]);
document.addEventListener('keydown',e=>{
  if(e.key==='Tab'&&!$('overlay').classList.contains('hidden')){const items=[...$('dialog').querySelectorAll('button:not(:disabled),input,select')];const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
  if(e.repeat)return;
  if(e.target.matches('input,select,textarea'))return;
  if(playing||loading){if(['Space','Escape'].includes(e.code)){e.preventDefault();if(loading&&!paused)pauseGame();else if(paused)resumeGame();else pauseGame();return}const lane=['KeyD','KeyF','KeyJ','KeyK'].indexOf(e.code);if(lane>=0){e.preventDefault();press(lane)}return}
  if(e.key==='Escape'){closeDialog();return}
  if(e.key==='Enter'&&e.target.matches('[data-song]')){e.preventDefault();selected=e.target.dataset.song;render();return}
  if(e.key.length===1&&/^[a-z]$/i.test(e.key)){let now=Date.now();if(now-secretAt>1800)secretBuffer='';secretAt=now;secretBuffer=(secretBuffer+e.key.toLowerCase()).slice(-3);if(secretBuffer==='zxx'){secretBuffer='';connectSecret()}}
});
document.addEventListener('keyup',e=>{const lane=['KeyD','KeyF','KeyJ','KeyK'].indexOf(e.code);if(lane>=0)release(lane)});
function laneAt(e){let {left,width,lane}=geometry;return e.clientX>=left&&e.clientX<left+width?Math.max(0,Math.min(3,Math.floor((e.clientX-left)/lane))):null}
$('playScreen').addEventListener('pointerdown',e=>{if(e.target.closest('#pauseBtn')||!playing||paused)return;const lane=laneAt(e);if(lane!==null){e.preventDefault();pointerLanes.set(e.pointerId,lane);$('playScreen').setPointerCapture(e.pointerId);press(lane)}});
$('playScreen').addEventListener('pointermove',e=>{if(!pointerLanes.has(e.pointerId))return;let next=laneAt(e),prev=pointerLanes.get(e.pointerId);if(next!==null&&next!==prev){release(prev);pointerLanes.set(e.pointerId,next);press(next)}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('playScreen').addEventListener(type,e=>{const lane=pointerLanes.get(e.pointerId);if(lane!==undefined){pointerLanes.delete(e.pointerId);if(![...pointerLanes.values()].includes(lane))release(lane)}});
window.addEventListener('blur',()=>{if(playing&&!paused)pauseGame()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)pauseGame()});window.addEventListener('resize',()=>{resizeCanvas();if(playing)drawStage(lastTime)});window.addEventListener('beforeunload',()=>{if(desktop)navigator.sendBeacon('/api/save',new Blob([JSON.stringify(save)],{type:'application/json'}))});
init();
})();
