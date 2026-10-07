(() => {
  'use strict';
  const C=YinianContent,E=YinianEngine,KEY=E.KEY,assets=globalThis.YinianAssets||{
    background:['background.webp','background.png'],handan:['handan.webp','handan.png'],court:['qin-court.webp','qin-court.png'],portraits:['portraits.webp','portraits.png']
  };
  const app=document.getElementById('app'),box=document.getElementById('modal');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=E.fresh(),screen='menu',locked=false,notice='',lastRaw=null,protectedRaw=null,saveText='尚未开始',diskQueue=Promise.resolve(),pendingDisk=0,pendingImport=null;
  const level=()=>C.levels[state.level],turn=()=>level().rounds[state.attempt?.round||0];
  const toast=text=>{const el=document.getElementById('toast');el.textContent=text;el.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),3500);};
  const label=text=>{saveText=text;document.querySelectorAll('[data-save-label]').forEach(el=>el.textContent=text);};
  async function boot(){
    let raw=null,storageError=false;
    try{raw=localStorage.getItem(KEY);lastRaw=raw;}catch{storageError=true;}
    if(globalThis.YINIAN_DESKTOP){try{const r=await fetch('/__save',{headers:{'X-Yinian-Token':globalThis.YINIAN_SAVE_TOKEN}});if(!r.ok)throw Error();const text=await r.text();if(text&&text!=='null')raw=text;}catch{locked=true;notice='桌面存档读取失败，已暂停写入。请重启或先导出备份，避免覆盖未知进度。';}}
    if(raw){
      try{const v=JSON.parse(raw);state=E.migrate(v);if(v.version===1){try{if(!localStorage.getItem(KEY+'.migration-v1'))localStorage.setItem(KEY+'.migration-v1',raw);}catch{}notice='旧版进度已兼容：已完成章节、标签与关系保留；未完成关卡从新版第 1 回合开始。原档已保留升级备份。';}}
      catch(err){
        let recovered=false;
        // A newer schema is not corruption: never replace it with an older backup.
        let future=false;try{future=JSON.parse(raw).version>E.SCHEMA;}catch{}
        if(!future&&!globalThis.YINIAN_DESKTOP){for(const key of [KEY+'.pending',KEY+'.backup']){try{const backup=localStorage.getItem(key);if(!backup)continue;state=E.migrate(JSON.parse(backup));localStorage.setItem(KEY+'.damaged-'+Date.now(),raw);localStorage.setItem(KEY+'.recovered-original',backup);notice='主存档异常，已从完整备份恢复；异常原档和恢复用原档都已保留，可导出检查。';recovered=true;break;}catch{}}}
        if(!recovered){locked=true;protectedRaw=raw;notice=err.message+' 自动保存已暂停，请导入正确备份或使用原版本打开。';}
      }
    }else if(storageError&&!globalThis.YINIAN_DESKTOP){notice='浏览器不允许本地保存。可试玩，但请用“导出存档”保留进度。';}
    if(!locked&&!globalThis.YINIAN_DESKTOP){try{const pending=localStorage.getItem(KEY+'.pending');if(pending){const newer=E.migrate(JSON.parse(pending));if(newer.revision>state.revision){state=newer;notice='已恢复上次中断写入的完整回合，原存档仍保留在备份中。';}}}catch{}}
    label(locked?'写入已暂停':raw?'已读取存档':'本机自动保存');render('menu',true);loadArt();
  }
  function save(archive=''){
    if(locked){label('写入已暂停');return false;}
    state.version=E.SCHEMA;state.gameVersion=C.VERSION;state.revision=(state.revision||0)+1;state.savedAt=Date.now();
    const raw=JSON.stringify(state);let localOK=false;
    try{
      const actual=localStorage.getItem(KEY);
      if(actual!==lastRaw){locked=true;notice='另一个窗口已经更新存档，当前窗口暂停写入。请导出本窗口进度后重新加载，避免互相覆盖。';label('存档冲突 · 未写入');toast(notice);return false;}
      localStorage.setItem(KEY+'.pending',raw);
      if(actual)localStorage.setItem(KEY+'.backup',actual);
      localStorage.setItem(KEY,raw);lastRaw=raw;localOK=true;localStorage.removeItem(KEY+'.pending');
    }catch{label('本地保存失败 · 请导出');}
    if(globalThis.YINIAN_DESKTOP){
      pendingDisk++;
      label('正在保存到磁盘');
      diskQueue=diskQueue.then(async()=>{if(locked)return;try{const r=await fetch('/__save',{method:'POST',headers:{'Content-Type':'application/json','X-Yinian-Token':globalThis.YINIAN_SAVE_TOKEN,'X-Yinian-Archive':archive},body:raw});if(!r.ok)throw Error();label(pendingDisk>1?'正在保存到磁盘':'磁盘已保存');}catch{locked=true;label('磁盘保存失败 · 请导出');toast('桌面存档写入失败；已暂停后续写入。不要关闭窗口，请先导出存档。');}}).finally(()=>pendingDisk--);
    }else if(localOK)label('已自动保存');
    else toast('自动保存失败，请通过菜单导出存档。');
    return localOK||!!globalThis.YINIAN_DESKTOP;
  }
  window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue!==lastRaw){locked=true;notice='另一个窗口改变了存档，当前窗口暂停写入。请先导出当前进度再刷新。';label('存档冲突 · 未写入');toast(notice);}});
  window.addEventListener('beforeunload',e=>{if(globalThis.YINIAN_DESKTOP&&pendingDisk>0){e.preventDefault();e.returnValue='正在保存进度，请稍候。';}});
  function route(next,replace=false){screen=next;if(next==='game'||next==='result')state.resumeScreen=next;history[replace?'replaceState':'pushState']({screen:next},'',next==='menu'?'#home':'#'+next);render(next);}
  window.addEventListener('popstate',e=>{closeModal();render(e.state?.screen||'menu');});
  function render(next=screen,replace=false){
    screen=next;document.querySelector('.coach')?.remove();
    if(screen==='game'&&!state.attempt)E.start(state,state.level);
    app.innerHTML=(notice?`<div class="storage-notice" role="status">${esc(notice)}</div>`:'')+(screen==='menu'?menu():screen==='chapters'?chapters():screen==='result'?result():game());
    bind(app);hydrateImages();coach();if(replace)history.replaceState({screen},'','#home');window.scrollTo({top:0,behavior:'instant'});
  }
  const btn=(text,attrs='',primary=false)=>`<button class="btn ${primary?'primary':''}" ${attrs}>${text}</button>`;
  function menu(){const has=!!state.attempt||state.completed.length;return `<section class="screen menu"><div><div class="seal">秦</div><p class="kicker">历史剧情 · 卡牌策略 · v${C.VERSION}</p><h1 class="title">一念天下</h1><p class="motto">历史提供背景，卡牌代表权力，选择创造未来。</p><div class="menu-actions">${btn(has?'继续游戏':'开始游戏','data-continue',true)}${btn('章节选择','data-go="chapters"')}${btn('卡牌手册','data-modal="guide"')}${btn('存档管理','data-modal="saves"')}</div></div><aside class="menu-side"><p class="section-label">当前进度</p><h2>${level().chapter}</h2><p>${level().title}${state.attempt?` · 第 ${state.attempt.round+1} 回合`:''}</p><div class="save-row"><span>已完成章节</span><b>${state.completed.length} / ${C.levels.length}</b></div><div class="save-row"><span>历史标签</span><b>${state.tags.length}</b></div><div class="save-row"><span>保存状态</span><b data-save-label>${saveText}</b></div><p class="hint">网页存档属于当前浏览器和站点；HTML 文件、网页及 Windows 版可通过导入/导出转移。不清理原始存档，不随版本更新重置进度。</p></aside></section>`;}
  function chapters(){return `<section class="screen chapter-select"><header><div><p class="kicker">v${C.VERSION} · 多回合试玩</p><h1>章节选择</h1></div>${btn('主菜单','data-go="menu"')}</header><div class="chapter-grid">${C.levels.map((l,i)=>`<article class="chapter-card ${i>state.unlocked?'locked':''}"><div class="chapter-art" data-art="${l.art}"></div><small>${l.chapter} · ${l.rounds.length} 回合</small><h2>${l.title}</h2><p>${l.objective}</p><p>${state.completed.includes(l.id)?'已完成 · 旧版完成记录也保留':'未完成'}</p>${btn(state.attempt?.level===l.id&&!state.attempt.finished?'继续本关':state.completed.includes(l.id)?'重玩本关':'进入本关',`data-level="${i}" ${i>state.unlocked?'disabled':''}`,true)}</article>`).join('')}</div></section>`;}
  function goals(){const l=level(),a=state.attempt;return `<p class="section-label">最终大目标 · 不随回合改变</p><h2>${l.objective}</h2><ul class="goal-list">${l.required.map(f=>`<li class="${a.flags.includes(f)?'done':''}">${a.flags.includes(f)?'✓':'○'} ${l.goals[f]}</li>`).join('')}</ul>${l.id==='tutorial'?`<p class="hint">五类卡牌实践：${a.lessons.length} / 5</p>`:''}`;}
  function game(){const l=level(),a=state.attempt,r=turn();return `<section class="screen"><header class="topbar"><div class="brand">一念天下</div><div class="crumb">${l.title} · ${a.round+1}/${l.rounds.length} 回合</div><div class="top-stats"><span class="pill" data-ap>行动 <b>${E.budget(state)-E.cost(state.selected)}</b> / ${E.budget(state)}</span><span class="pill">王权 <b>${state.stats.王权}</b></span><span class="pill save-indicator" data-save-label>${saveText}</span></div><button class="icon-btn" data-modal="pause" aria-label="打开菜单">☰</button></header><div class="game-shell"><aside class="rail"><div data-goals>${goals()}</div><p class="section-label">人物关系</p><div class="relations">${l.relations.map(([name,n,text])=>`<div class="relation"><b>${name}</b><span>${Math.max(0,Math.min(100,n+(state.relations[name]||0)))}</span><small>${text}</small></div>`).join('')}</div><p class="section-label">历史标签</p><div class="tags">${state.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="empty">尚未形成</span>'}</div></aside><article class="scene"><div class="scene-head"><div class="chapter-line"><span>${l.chapter} · ${l.year}</span><span class="status-badge">史实框架 / 艺术加工</span></div><h1>${l.title}</h1><div class="scene-art" data-art="${l.art}"><span>游戏概念场景 · 非史实影像</span></div><p class="background">${l.background}</p></div><div class="scene-body"><section class="round-target"><p class="section-label">第 ${a.round+1} / ${l.rounds.length} 回合 · 行动点已重置</p><h2>${r.title}</h2><p><b>本回合小目标：</b>${r.objective}</p><p class="hint">${r.hint}</p></section>${a.log.length?`<div class="round-feedback ${a.log.at(-1).ok?'ok':'fail'}" role="status">${esc(a.log.at(-1).text)}${a.log.at(-1).ok?'':' 未通关，不解锁下一关；可以在本回合重拟方案。风险 +1。'}</div>`:''}${a.flags.length?`<div class="intel"><b>已验证的线索与进度</b><p>${a.log.filter(x=>x.ok).map(x=>level().rounds[x.round-1].intel||level().rounds[x.round-1].objective).map(esc).join('<br>')}</p></div>`:''}<div class="plan" data-plan></div><div class="hand-title"><h3>本回合手牌</h3>${btn('五类卡牌说明','data-modal="guide"')}</div><p class="hint">有限时间库存 ${a.supplies} 份 · 行动点每回合恢复，资源库存不恢复。选牌可撤回，执行才结算。</p><div class="hand">${r.cards.map(id=>card(C.cards[id])).join('')}</div><div class="actions"><span class="hint" data-plan-hint></span>${btn('执行本回合方案','data-execute',true)}</div></div></article><aside class="record"><p class="section-label">本关回合记录</p><div class="record-list">${a.log.slice(-6).reverse().map(x=>`<div class="record-item"><strong>第 ${x.round} 回合 · ${x.title}</strong><span>${x.ok?'小目标达成':'未达成 · 补救中'}</span></div>`).join('')||'<p class="empty">还未执行行动。</p>'}</div><div class="truth"><b>史实与虚构</b><p>${l.truth}</p><a href="${l.sourceUrl}" target="_blank" rel="noopener">史实依据：${l.source}</a></div></aside></div></section>`;}
  function card(c){const portrait={attendant:'0%',zhaoFriend:'50%',lv:'100%'}[c.id],name=c.id==='observe'&&level().id==='handan'?'观察环境':c.name;return `<button class="card card-${c.type}" data-card="${c.id}" aria-pressed="false">${portrait!==undefined?`<span class="card-art" data-art="portraits" style="display:block;background-position:${portrait} center"></span>`:`<span class="card-glyph">${C.types[c.type].glyph}</span>`}<span class="card-type">${C.types[c.type].name}</span><span class="card-cost">${c.cost}</span><h4>${name}</h4><p>${c.text}</p></button>`;}
  function sync(){
    if(screen!=='game')return;
    const a=state.attempt,left=E.budget(state)-E.cost(state.selected);
    document.querySelector('[data-ap]').innerHTML=`行动 <b>${left}</b> / ${E.budget(state)}`;
    document.querySelector('[data-plan]').innerHTML=`<span class="section-label">待执行方案</span>${state.selected.map(id=>`<span class="plan-chip">${C.cards[id].name}</span>`).join('')||'<span class="empty">选牌不代表目标已完成；执行后才核验。</span>'}`;
    document.querySelectorAll('[data-card]').forEach(el=>{const id=el.dataset.card,selected=state.selected.includes(id),trial=E.clone(state);el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));el.disabled=locked||!E.select(trial,id);el.title=el.disabled?(id==='time'&&a.supplies<=0?'有限时间库存耗尽':'行动点不足；若撤回时间会超预算，先撤回其他牌'):C.types[C.cards[id].type].use;});
    document.querySelector('[data-plan-hint]').textContent=`本回合已计划 ${E.cost(state.selected)} 点 · ${E.preview(state)?'连携可执行，仍需结算核验':'还未形成完整解法，请对照小目标'} · 未达成最终目标不能通关`;
    document.querySelector('[data-execute]').disabled=locked||!state.selected.length||guided()&&!STEPS[a.coach]?.execute;
  }
  function guided(){return level().id==='tutorial'&&!state.completed.includes('tutorial')&&!state.attempt.finished;}
  const STEPS=[
    ['先读两层目标','左边大目标整关不变，中间小目标每回合推进。任何一个大目标条件没完成，都不能解锁下一关。','[data-goals]'],
    ['人物牌：谁来帮你办事？',C.types.person.use+' '+C.types.person.limit,'[data-card="attendant"]'],
    ['情报牌：为什么不能相信第一句话？',C.types.intel.use+' '+C.types.intel.limit,'[data-card="observe"]'],
    ['费用、组合与撤回','右上角是卡牌费用，顶部是当前预算。点选只是计划，不消耗人物、不揭示已验证线索；再次点击可撤回。','[data-ap]'],
    ['选取人物牌','点击少年侍从，把近身见闻加入方案。','[data-card="attendant"]','attendant'],
    ['再加入情报牌','点击观察朝堂。它与人物形成核验连携；此时情报仍是计划，执行才会保存。','[data-card="observe"]','observe'],
    ['练习撤回','再次点击少年侍从，撤回人物牌。你会看到预算返还，但方案变得不完整。','[data-card="attendant"]','!attendant'],
    ['恢复执行者','重新选少年侍从，使调查有具体的信息来源。','[data-card="attendant"]','attendant'],
    ['执行第 1 回合','点击执行。只有小目标达成才进入下一回合；还不能通关整关。','[data-execute]',null,true],
    ['回合开始：预算恢复','行动点恢复为 3；刚才核实的事实保留。资源库存、人物关系和风险不会被重置。','[data-ap]'],
    ['资源牌：补执行能力而不是赢牌',C.types.resource.use+' '+C.types.resource.limit,'[data-card="time"]'],
    ['谋略牌：改变做事的方法',C.types.strategy.use+' '+C.types.strategy.limit,'[data-card="silence"]'],
    ['使用资源','点击有限时间，观察预算变为 4。现在只是预留，执行后才扣一份库存。','[data-card="time"]','time'],
    ['加入缓兵的方法','点击保持沉默，为试探留出余地。','[data-card="silence"]','silence'],
    ['核验你的表达方式','点击试探。时间 + 沉默 + 试探，形成这个回合的可行方案。','[data-card="probe"]','probe'],
    ['执行第 2 回合','资源不是独立胜利条件；它和谋略一起达成本轮准备目标。','[data-execute]',null,true],
    ['权柄牌：命令需要执行路径',C.types.authority.use+' '+C.types.authority.limit,'[data-card="identity"]'],
    ['提出正式要求','点击王的身份。它花费 2 点，不是因为它一定更强，而是要求需要付出政治行动。','[data-card="identity"]','identity'],
    ['为命令配执行者','点击少年侍从，用剩余 1 点指定传达者。身份 + 执行者才是完整方案。','[data-card="attendant"]','attendant'],
    ['执行第 3 回合','命令已经发出，但最后的回报仍没核验，不能通关。','[data-execute]',null,true],
    ['最后一课：什么叫完成？','检查左边：还缺真实回报。行动点恢复，之前的成果保留。你不能把“发出命令”误认为“事情办成”。','[data-goals]'],
    ['核查回报','点击观察朝堂，准备检查文书和朝臣说法。','[data-card="observe"]','observe'],
    ['给核验留下空间','点击保持沉默，等待相互矛盾的口供。人物、权柄、情报、资源、谋略五类已经分别实践。','[data-card="silence"]','silence'],
    ['核验最终大目标','执行后核验四项大目标与五类实践。全部达成才通关；标签、回合、库存与选牌都有自动存档。','[data-execute]',null,true]
  ].map(([title,text,target,card,execute])=>({title,text,target,card,execute}));
  function coach(){
    document.querySelector('.coach')?.remove();document.querySelectorAll('.coach-focus').forEach(x=>x.classList.remove('coach-focus'));
    if(screen!=='game')return;sync();if(!guided())return;
    const step=STEPS[state.attempt.coach];if(!step)return;
    document.querySelector(step.target)?.classList.add('coach-focus');
    app.insertAdjacentHTML('beforeend',`<aside class="coach"><div class="coach-step">${state.attempt.coach+1}/${STEPS.length}</div><div><h3>${step.title}</h3><p>${step.text}</p></div>${step.execute?btn('执行本回合','data-execute-coach',true):step.card?'':btn('我理解了，下一步','data-coach-next',true)}</aside>`);
    document.querySelector('[data-coach-next]')?.addEventListener('click',()=>{state.attempt.coach++;save();coach();document.querySelector('.coach-focus')?.scrollIntoView({block:'center',behavior:'smooth'});});
    document.querySelector('[data-execute-coach]')?.addEventListener('click',execute);
  }
  function choose(id){if(locked||!E.select(state,id))return;const st=STEPS[state.attempt.coach];if(guided()&&st?.card&&(st.card===id&&state.selected.includes(id)||st.card==='!'+id&&!state.selected.includes(id)))state.attempt.coach++;save();coach();}
  function execute(){
    if(locked||guided()&&!STEPS[state.attempt.coach]?.execute)return;
    const before=state.attempt.round,out=E.execute(state);if(!out)return;
    if(out.ok&&level().id==='tutorial'&&!state.completed.includes('tutorial'))state.attempt.coach++;
    if(out.complete&&level().id==='tutorial')state.attempt.coach=STEPS.length;
    save();if(out.complete)route('result');else{render('game');if(!out.ok)toast('小目标未达成，请重拟方案。没有解锁下一关。');else if(before!==state.attempt.round)toast('小目标达成，新回合行动点已重置。');}
  }
  function result(){const a=state.attempt,l=level(),h=state.history.filter(x=>x.level===l.id).at(-1);if(!a?.finished||!h)return menu();return `<section class="screen result"><p class="result-mark">最终目标已核验 · ${l.chapter}</p><span class="grade">${esc(h.grade)}</span><h1>${l.title}</h1><p class="result-copy">${esc(h.result.text)}</p><div>${goals()}</div><div class="consequences"><div class="consequence">累计 ${a.log.length} 次行动 / ${l.rounds.length} 个回合</div><div class="consequence">补救 ${a.failures} 次 · 剩余时间 ${a.supplies} 份</div></div><p class="history-note">${l.epilogue}</p><div class="tags">${state.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>${l.id==='tutorial'?'<section class="tutorial-summary"><h2>你已经练过五类卡牌</h2><p>先读小目标，再按预算组合资源，执行并核验；完成所有大目标才过关。卡牌手册随时可打开，后续关卡不再强制走教程路线。</p></section>':''}<div class="result-actions">${state.level<C.levels.length-1?btn('进入下一关','data-next',true):btn('查看全部章节','data-go="chapters"',true)}${btn('重玩本关','data-replay')}${btn('存档管理','data-modal="saves"')}${btn('主菜单','data-go="menu"')}</div></section>`;}
  function begin(i,replay=false){if(locked){toast(notice);return;}if(state.attempt?.level===C.levels[i].id&&!state.attempt.finished&&!replay){route('game');return;}if(state.attempt&&!state.attempt.finished&&state.attempt.level!==C.levels[i].id){pendingImport=null;modal('switch',i);return;}E.start(state,i);save();route('game');}
  function modal(kind,index){
    let text='';
    if(kind==='guide')text=`<h2>五类卡牌手册</h2><div class="type-guide">${Object.entries(C.types).map(([type,t])=>`<section class="card-${type}"><h3>${t.name}</h3><p>${t.use}</p><p class="hint">${t.limit}</p><p class="example">${t.example}</p></section>`).join('')}</div><p>每回合行动点恢复；未执行选牌可撤回。只有明确达成小目标才推进回合，只有全部大目标达成才解锁章节。失败仍保留本关，可以补救，但风险增加。</p>`;
    if(kind==='pause')text=`<h2>游戏菜单</h2><p>当前回合与待执行卡牌会保存，未完成的大目标不能被跳过。</p><div class="modal-actions">${btn('卡牌手册','data-modal="guide"')}${btn('存档管理','data-modal="saves"')}${btn('历史记录','data-modal="records"')}${btn('章节选择','data-go="chapters"')}${btn('主菜单','data-go="menu"')}</div>`;
    if(kind==='saves')text=`<h2>存档管理</h2><p data-save-label>${saveText}</p><p>固定存档标识，升级迁移不清空已完成章节、标签和关系；每次写入保留上一份完整备份。${globalThis.YINIAN_DESKTOP?'Windows 版同时保存到固定用户目录，与安装版本和启动端口无关。':'网页存档属于当前浏览器与站点，清理网站数据会删除它。'}</p><p>请定期导出 JSON。网页、独立 HTML 与 Windows 版不会自动共享浏览器存档，可以手动转移。旧桌面版的随机地址存档仍留在原浏览器配置中；若仍能打开原进度，应先在原页面导出/复制旧存档再导入，不声称自动找到所有旧地址。</p><div class="modal-actions">${btn('导出存档','data-export',true)}<label class="btn">选择存档文件<input type="file" accept=".json,application/json" data-import hidden></label>${btn('重置全部进度','data-modal="reset"')}</div><p class="hint">不会因更新自动重置。导入和重置需要再次确认，原进度会先备份。</p>`;
    if(kind==='records')text=`<h2>历史记录</h2>${state.history.map(h=>`<p>${esc(h.title)}：${esc(h.grade)} / ${esc(h.tag)}</p>`).join('')||'<p>还没有完成章节；未完成行动见本关回合记录。</p>'}`;
    if(kind==='reset')text=`<h2>确认重置全部进度？</h2><p>这是你主动发起的重置，不是版本更新操作。请先导出；确认后会保留重置前备份，再开始新档。</p>${btn('导出当前存档','data-export')}${btn('确认重置','data-reset')}`;
    if(kind==='import')text=`<h2>确认载入这个存档？</h2><p>已验证格式，已完成 ${pendingImport.completed.length} 章。导入会替换当前进度，当前原档先保留导入前备份。建议先导出。</p>${btn('导出当前存档','data-export')}${btn('确认导入','data-confirm-import',true)}`;
    if(kind==='switch')text=`<h2>切换关卡会重新开始本关吗？</h2><p>当前未完成回合不会与另一个关卡同时推进。请先导出保存当前尝试；已经完成的章节、标签与历史记录不清除。</p>${btn('导出当前存档','data-export')}${btn('确认切换',`data-switch="${index}"`)}`;
    box.innerHTML=`<div class="modal-box">${text}<div class="modal-actions">${btn('关闭 / 取消','data-close')}</div></div>`;box.classList.remove('hidden');document.querySelector('.coach')?.classList.add('hidden');bind(box);box.querySelector('button')?.focus();
  }
  function closeModal(){box.classList.add('hidden');document.querySelector('.coach')?.classList.remove('hidden');}
  function exportSave(){let data=JSON.stringify({game:'一念天下',exportVersion:1,state},null,2);if(locked&&protectedRaw){data=protectedRaw;}const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`一念天下-存档-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function preserve(suffix){try{const actual=localStorage.getItem(KEY);if(actual)localStorage.setItem(KEY+'.'+suffix+'-'+Date.now(),actual);}catch{throw Error('无法备份原档，请先导出，不执行替换。');}}
  function bind(root){
    root.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>{closeModal();route(x.dataset.go);});
    root.querySelectorAll('[data-level]').forEach(x=>x.onclick=()=>begin(+x.dataset.level));
    root.querySelectorAll('[data-card]').forEach(x=>x.onclick=()=>choose(x.dataset.card));
    root.querySelectorAll('[data-modal]').forEach(x=>x.onclick=()=>modal(x.dataset.modal));
    root.querySelectorAll('[data-close]').forEach(x=>x.onclick=closeModal);
    root.querySelectorAll('[data-export]').forEach(x=>x.onclick=exportSave);
    root.querySelectorAll('[data-continue]').forEach(x=>x.onclick=()=>{if(!state.attempt){route('chapters');return;}route(state.attempt.finished?'result':'game');});
    root.querySelector('[data-execute]')?.addEventListener('click',execute);
    root.querySelector('[data-next]')?.addEventListener('click',()=>{if(!state.attempt?.finished||!E.goal(state))return;begin(state.level+1);});
    root.querySelector('[data-replay]')?.addEventListener('click',()=>begin(state.level,true));
    root.querySelector('[data-import]')?.addEventListener('change',async e=>{try{const text=await e.target.files[0].text();if(text.length>2000000)throw Error('存档文件过大。');const v=JSON.parse(text);pendingImport=E.migrate(v.state||v);modal('import');}catch(err){toast('导入未执行：'+err.message);}});
    root.querySelector('[data-confirm-import]')?.addEventListener('click',()=>{try{preserve('before-import');const revision=state.revision;state=pendingImport;state.revision=Math.max(revision,state.revision);pendingImport=null;locked=false;notice='已导入存档，导入前原档保留。';lastRaw=localStorage.getItem(KEY);closeModal();save('before-import');route('menu');}catch(err){toast(err.message);}});
    root.querySelector('[data-reset]')?.addEventListener('click',()=>{try{preserve('before-reset');const revision=state.revision;state=E.fresh();state.revision=revision;locked=false;notice='你已确认重置，原档保存在重置前备份中。';lastRaw=localStorage.getItem(KEY);closeModal();save('before-reset');route('menu');}catch(err){toast(err.message);}});
    root.querySelector('[data-switch]')?.addEventListener('click',e=>{try{preserve('before-switch');E.start(state,+e.target.dataset.switch);closeModal();save('before-switch');route('game');}catch(err){toast(err.message);}});
  }
  box.addEventListener('click',e=>{if(e.target===box)closeModal();});window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  const artPromises=new Map();
  function imageURL(src,retry=false){return src.startsWith('data:')||location.protocol==='file:'?src:`${src}?v=${C.VERSION}${retry?'&retry=1':''}`;}
  function fetchArt(id,force=false){
    if(!force&&artPromises.has(id))return artPromises.get(id);
    const promise=(async()=>{for(const src of assets[id]||[]){for(let retry=0;retry<2;retry++){try{const url=imageURL(src,!!retry),image=new Image();image.src=url;await image.decode();return url;}catch{if(src.startsWith('data:')||location.protocol==='file:')break;}}}throw Error('图片暂时不可用');})();
    artPromises.set(id,promise);return promise;
  }
  function hydrateImages(){document.querySelectorAll('[data-art]').forEach(el=>{const id=el.dataset.art;fetchArt(id).then(url=>{if(el.isConnected){el.style.backgroundImage=`url("${url}")`;el.classList.add('art-ready');el.querySelector('.art-retry')?.remove();}}).catch(()=>{if(el.isConnected&&!el.querySelector('.art-retry')){const b=document.createElement('button');b.className='btn art-retry';b.textContent='图片暂未加载 · 点击重试';b.onclick=()=>{artPromises.delete(id);b.remove();hydrateImages();};el.append(b);}});});}
  function loadArt(){fetchArt('background').then(url=>app.style.setProperty('--game-art',`url("${url}")`)).catch(()=>{});}
  boot();
})();
