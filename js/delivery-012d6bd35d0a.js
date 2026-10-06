/* js/profile-products.js */
(() => {
  'use strict';
  const products = JSON.parse(document.getElementById('productData').textContent);
  const catalog = new Map(products.map(p => [p.id,p]));
  const filters = document.getElementById('filters');
  filters.hidden = false;
  const cards = Array.from(document.querySelectorAll('.catalog-card'));
  const labels = {all:'全部',web:'网站',tools:'学习与效率',games:'游戏'};
  filters.addEventListener('click', e => {
    const button = e.target.closest('[data-filter]');
    if (!button) return;
    const category = button.dataset.filter;
    filters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
    let count = 0;
    cards.forEach(card => {card.hidden = category !== 'all' && card.dataset.category !== category;if (!card.hidden) count++;});
    document.getElementById('catalogCount').textContent = labels[category] + ' ' + count + ' 个作品';
  });
  const dialog = document.getElementById('productDialog');
  let returnFocus;
  function addLink(p,secondary=false) {
    const href = secondary ? p.secondaryHref : p.href;
    if (!href) return;
    const a = document.createElement('a');
    a.className = secondary ? 'text-link' : 'button';a.href=href;if(!href.startsWith('https://'))a.setAttribute('data-animate','');
    a.textContent = secondary ? p.secondaryLabel : p.cta;
    if (p.download && (secondary || !p.secondaryHref)) {a.setAttribute('download','');a.textContent += ' ↓';}
    else if (href.startsWith('https://')) {a.target='_blank';a.rel='noopener noreferrer';a.textContent += ' ↗';}
    document.getElementById('dialogLinks').append(a);
  }
  function openProduct(id,trigger) {
    const p = catalog.get(id);if (!p) return;
    if (typeof dialog.showModal !== 'function') {const detail=document.querySelector('[data-product="'+id+'"] details');if(detail){detail.open=true;detail.scrollIntoView({block:'center'});}return;}
    returnFocus=trigger;
    document.getElementById('dialogStatus').textContent=p.status;
    document.getElementById('dialogTitle').textContent=p.name;
    document.getElementById('dialogTagline').textContent=p.tagline;
    document.getElementById('dialogDescription').textContent=p.description;
    const list=document.getElementById('dialogFeatures');list.replaceChildren();p.features.forEach(f=>{const li=document.createElement('li');li.textContent=f;list.append(li);});
    const note=document.getElementById('dialogNote');note.textContent=p.note || '';note.hidden=!p.note;
    document.getElementById('dialogVersion').textContent=p.version;
    document.getElementById('dialogLinks').replaceChildren();addLink(p);addLink(p,true);
    if (!p.href) {const span=document.createElement('span');span.className='local-status';span.textContent='本地作品 · 暂无公开入口';document.getElementById('dialogLinks').append(span);}
    dialog.showModal();document.body.classList.add('product-dialog-open');
  }
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-detail],[data-open]');if(!trigger)return;if(typeof dialog.showModal==='function')e.preventDefault();openProduct(trigger.dataset.detail || trigger.dataset.open,trigger);});
  document.getElementById('dialogClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('product-dialog-open');returnFocus?.focus({preventScroll:true});});
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  if (!media.matches && 'IntersectionObserver' in window) {
    document.getElementById('portfolio').classList.add('portfolio-motion');
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('pending');observer.unobserve(entry.target);}});},{threshold:.08});
    document.querySelectorAll('#portfolio .reveal').forEach(el=>{el.classList.add('pending');observer.observe(el);});
    media.addEventListener?.('change',e=>{if(e.matches){document.getElementById('portfolio').classList.remove('portfolio-motion');document.querySelectorAll('#portfolio .pending').forEach(el=>el.classList.remove('pending'));observer.disconnect();}});
  }
})();

;
/* js/profile.js */
(() => {
  'use strict';
  const body = document.body;
  const sceneToggle = document.getElementById('sceneToggle');
  const pauseToggle = document.getElementById('pauseToggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = {
    study: {number:'01', caption:'把每一页，变成下一步。', label:'阅读我的文章', href:'index.html#blog', name:'学习'},
    life: {number:'02', caption:'沿着日常，走进故事。', label:'翻开生活记录', href:'index.html#journal', name:'生活'},
    create: {number:'03', caption:'让一个想法，有了形状。', label:'试玩我的游戏', href:'games.html', name:'创造'}
  };
  const buttons = [...document.querySelectorAll('.chapter-button')];
  function selectChapter(chapter) {
    const item = chapters[chapter];
    if (!item) return;
    body.dataset.chapter = chapter;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chapter === chapter)));
    document.getElementById('artChapter').textContent = `CHAPTER ${item.number}`;
    document.getElementById('artNumber').textContent = item.number;
    document.getElementById('artCaption').textContent = item.caption;
    document.getElementById('chapterEntry').setAttribute('href', item.href);
    document.getElementById('chapterEntryLabel').textContent = item.label;
    document.getElementById('chapterStatus').textContent = `已切换到${item.name}章节。${item.caption}`;
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => selectChapter(button.dataset.chapter));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      buttons[next].focus();
      selectChapter(buttons[next].dataset.chapter);
    });
  });
  function setScene(only) {
    body.classList.toggle('scene-only', only);
    sceneToggle.textContent = only ? '显示个人页' : '只看画面';
    sceneToggle.setAttribute('aria-pressed', String(only));
    if (only) scrollTo({top:0,behavior:'instant'});
  }
  sceneToggle.addEventListener('click', () => setScene(!body.classList.contains('scene-only')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && body.classList.contains('scene-only')) { setScene(false); sceneToggle.focus(); } });
  let userPaused = matchMedia('(max-width:800px), (pointer:coarse)').matches || Boolean(navigator.connection?.saveData);
  function updateMotion() {
    const paused = userPaused || reduced.matches;
    body.classList.toggle('motion-paused', paused);
    pauseToggle.setAttribute('aria-pressed', String(paused));
    pauseToggle.textContent = reduced.matches ? '已减少动态' : paused ? '继续动画' : '暂停动画';
    pauseToggle.disabled = reduced.matches;
  }
  pauseToggle.addEventListener('click', () => { userPaused = !userPaused; updateMotion(); });
  reduced.addEventListener('change', updateMotion);
  updateMotion();
  const meta = document.querySelector('meta[name="theme-color"]');
  const updateThemeColor = () => { if (meta) meta.content = document.documentElement.classList.contains('light') ? '#eee9dc' : '#131311'; };
  new MutationObserver(updateThemeColor).observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  updateThemeColor();
})();

;
/* js/collection.js */
(() => {
  'use strict';
  const menu = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  }
  menu.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', event => { if (!event.target.closest('.nav-shell')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links.classList.contains('open')) { setMenu(false); menu.focus(); }
  });
  const header = document.querySelector('.site-header');
  const updateHeader = () => header.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', updateHeader, {passive:true});
  updateHeader();
  // A browser back/forward restore should not leave a stale mobile menu over the page.
  addEventListener('pageshow', () => { setMenu(false); updateHeader(); });
  matchMedia('(max-width:800px)').addEventListener('change', () => setMenu(false));
})();

;
/* js/secret-arcade.js */
(() => {
  'use strict';
  const dialog = document.getElementById('secretArcade');
  if (!dialog) return;
  const canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d');
  const title = dialog.querySelector('h2'), status = dialog.querySelector('[data-status]');
  const scoreEl = dialog.querySelector('[data-score]'), bestEl = dialog.querySelector('[data-best]');
  const pauseButton = dialog.querySelector('[data-action="pause"]');
  const nextCanvas = dialog.querySelector('[data-next]'), nextCtx = nextCanvas.getContext('2d');
  let mode, game, timer, running = false, finished = false, best = 0;
  const snakeGrid = {cols:30,rows:20,cell:12,interval:180};
  const snakeLCD = {background:'#aabc82',ink:'#263820'};
  const shapes = [ [[1,1,1,1]], [[2,2],[2,2]], [[0,3,0],[3,3,3]], [[0,4,4],[4,4,0]], [[5,5,0],[0,5,5]], [[6,0,0],[6,6,6]], [[0,0,7],[7,7,7]] ];
  const colors = ['#101614','#75e9d1','#eac876','#b69be9','#98ca9b','#e17c88','#87a5e3','#dca66b'];
  function bestKey() { return 'chenc-secret-' + (mode === 'snake' ? 'snake-classic' : mode); }
  function saveBest() { if (game.score > best) { best = game.score; try { localStorage.setItem(bestKey(), best); } catch {} } }
  function stop() { clearInterval(timer); timer = null; }
  function message(text) { status.textContent = text; }
  function schedule() { stop(); if (running) timer = setInterval(tick, mode === 'snake' ? snakeGrid.interval : Math.max(110, 650 - game.lines * 16)); }
  function end(text) { running = false; finished = true; stop(); saveBest(); message(text); pauseButton.disabled = true; draw(); }
  function reset() {
    stop(); running = false; finished = false;
    if (mode === 'snake') game = {snake:[{x:10,y:10},{x:9,y:10},{x:8,y:10},{x:7,y:10}],dir:{x:1,y:0},queued:null,food:null,score:0};
    else game = {board:Array.from({length:20},()=>Array(10).fill(0)),bag:[],piece:null,next:null,score:0,lines:0};
    if (mode === 'snake') food(); else { game.next = take(); spawn(); }
    pauseButton.disabled = false; pauseButton.textContent = '开始'; message(mode === 'snake' ? '吃点心，慢慢长大。方向键 / WASD 或下方按键移动。' : '方向键移动，↑ 旋转，空格落到底。'); draw();
  }
  function food() {
    const free = [];
    for(let y=0;y<snakeGrid.rows;y++) for(let x=0;x<snakeGrid.cols;x++) if(!game.snake.some(p=>p.x===x&&p.y===y)) free.push({x,y});
    game.food = free.length ? free[Math.floor(Math.random()*free.length)] : null;
  }
  function take() {
    if(!game.bag.length) { game.bag = [0,1,2,3,4,5,6]; for(let i=6;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [game.bag[i],game.bag[j]]=[game.bag[j],game.bag[i]]; } }
    return shapes[game.bag.pop()].map(row=>row.slice());
  }
  function spawn() { game.piece={shape:game.next,x:3,y:0}; game.next=take(); if(hit(game.piece)) end('方块堆满了。再来一局？'); }
  function hit(p) { return p.shape.some((row,y)=>row.some((v,x)=>v&&(p.x+x<0||p.x+x>=10||p.y+y>=20||(p.y+y>=0&&game.board[p.y+y][p.x+x])))); }
  function lock() {
    const p=game.piece;
    p.shape.forEach((row,y)=>row.forEach((v,x)=>{if(v&&p.y+y>=0) game.board[p.y+y][p.x+x]=v;}));
    const remaining=game.board.filter(row=>row.some(v=>!v)), cleared=20-remaining.length;
    game.board=[...Array.from({length:cleared},()=>Array(10).fill(0)),...remaining];
    game.score += [0,100,300,500,800][cleared] * (1+Math.floor(game.lines/10)); game.lines+=cleared;
    spawn(); saveBest(); schedule();
  }
  function tick() {
    if(!running) return;
    if(mode==='snake') {
      if(game.queued) { game.dir=game.queued; game.queued=null; }
      const head={x:game.snake[0].x+game.dir.x,y:game.snake[0].y+game.dir.y};
      const eat=head.x===game.food.x&&head.y===game.food.y;
      const body=eat?game.snake:game.snake.slice(0,-1);
      if(head.x<0||head.y<0||head.x>=snakeGrid.cols||head.y>=snakeGrid.rows||body.some(p=>p.x===head.x&&p.y===head.y)) return end('撞到了！再来一局？');
      game.snake.unshift(head); if(!eat) game.snake.pop(); else { game.score++; saveBest(); food(); if(!game.food) return end('整个屏幕都填满了，你赢了！'); }
    } else {
      game.piece.y++; if(hit(game.piece)) { game.piece.y--; lock(); }
    }
    draw();
  }
  function input(action) {
    if(action==='pause') { if(finished) return; running=!running; pauseButton.textContent=running?'暂停':'继续'; message(running?'游戏中 · P 暂停':'已暂停'); schedule(); return; }
    if(action==='restart') { reset(); return; }
    if(!running) return;
    if(mode==='snake') {
      const directions={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}};
      const d=directions[action]; if(d&&!game.queued&&!(d.x===-game.dir.x&&d.y===-game.dir.y)) game.queued=d;
    } else {
      const p=game.piece;
      if(action==='left'||action==='right') { const dx=action==='left'?-1:1; p.x+=dx; if(hit(p)) p.x-=dx; }
      else if(action==='up') {
        const rotated=p.shape[0].map((_,i)=>p.shape.map(row=>row[i]).reverse());
        for(const offset of [0,-1,1,-2,2]) { const candidate={shape:rotated,x:p.x+offset,y:p.y}; if(!hit(candidate)) { game.piece=candidate; break; } }
      } else if(action==='down') { p.y++; if(hit(p)) {p.y--;lock();} else game.score++; }
      else if(action==='drop') { while(!hit({...p,y:p.y+1})) {p.y++;game.score+=2;} lock(); }
      saveBest(); draw();
    }
  }
  function block(c,x,y,size,color) { c.fillStyle=color; c.fillRect(x*size+2,y*size+2,size-4,size-4); c.fillStyle='#ffffff22'; c.fillRect(x*size+4,y*size+4,size-8,3); }
  function draw() {
    scoreEl.textContent=game.score; bestEl.textContent=best;
    ctx.fillStyle=mode==='snake'?snakeLCD.background:colors[0]; ctx.fillRect(0,0,canvas.width,canvas.height);
    const size=mode==='snake'?snakeGrid.cell:24;
    if(mode==='snake') {
      ctx.fillStyle=snakeLCD.ink;
      game.snake.forEach(p=>ctx.fillRect(p.x*size+1,p.y*size+1,size-1,size-1));
      if(game.food) {
        const x=game.food.x*size,y=game.food.y*size;
        ctx.fillRect(x+4,y+2,4,8); ctx.fillRect(x+2,y+4,8,4);
      }
    }
    else {
      ctx.strokeStyle='#ffffff0b';ctx.lineWidth=1;
      for(let x=0;x<=10;x++){ctx.beginPath();ctx.moveTo(x*size,0);ctx.lineTo(x*size,20*size);ctx.stroke();}
      for(let y=0;y<=20;y++){ctx.beginPath();ctx.moveTo(0,y*size);ctx.lineTo(10*size,y*size);ctx.stroke();}
      game.board.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(ctx,x,y,size,colors[v]);}));
      const p=game.piece;
      p.shape.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(ctx,p.x+x,p.y+y,size,colors[v]);}));
      nextCtx.clearRect(0,0,96,96);game.next.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(nextCtx,x,y,22,colors[v]);}));
    }
    canvas.setAttribute('aria-label',(mode==='snake'?'经典贪吃蛇':'俄罗斯方块')+'，得分 '+game.score);
  }
  document.querySelectorAll('[data-secret-game]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.secretGame; dialog.dataset.game=mode; title.textContent=mode==='snake'?'经典贪吃蛇':'俄罗斯方块';
    canvas.width=mode==='snake'?snakeGrid.cols*snakeGrid.cell:240;canvas.height=mode==='snake'?snakeGrid.rows*snakeGrid.cell:480;
    try { best=Number(localStorage.getItem(bestKey()))||0; } catch { best=0; }
    reset();dialog.showModal();document.body.classList.add('arcade-open');
  }));
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>input(button.dataset.action)));
  dialog.addEventListener('close',()=>{running=false;stop();document.body.classList.remove('arcade-open');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running) input('pause');});
  window.addEventListener('blur',()=>{if(running) input('pause');});
  document.addEventListener('keydown',event=>{
    if(!dialog.open||event.ctrlKey||event.metaKey||event.altKey) return;
    const action={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',' ':'drop',p:'pause',P:'pause'}[event.key];
    if(action) { if(action==='drop'&&mode==='snake')return; event.preventDefault();if(action==='pause'&&event.repeat)return;input(action); }
  });
})();

