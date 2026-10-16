(() => {
  'use strict';
  const app=document.getElementById('app');
  const mode=document.body.dataset.mode;
  let state=newRun(), busy=false, composing=false, native=false, saving=Promise.resolve(), warningShown=false;
  const flame='<svg class="brand-mark" viewBox="0 0 22 28" fill="none" aria-hidden="true"><path d="M10 1C14 9 6 9 7 15c-4-2-3-6-3-6C-3 20 6 28 12 26c11-4 10-14 4-19 1 7-2 8-2 8C17 8 10 1 10 1Z" fill="currentColor"/></svg>';
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const activeRoute=()=>mode==='single'?(location.hash.slice(1)||'intro'):(document.body.dataset.route||'intro');
  const routeUrl=route=>mode==='single'?'#'+route:(route==='intro'?'index':route)+'.html?v='+VERSION;
  function readCandidate(text) { try {const v=JSON.parse(text);return validState(v)?v:null;} catch{return null;} }
  function browserLoad() {
    const candidates=[];
    try {const v=readCandidate(localStorage.getItem(SAVE_KEY));if(v)candidates.push(v);} catch{}
    try {if(window.name.startsWith(SAVE_KEY+':')){const v=readCandidate(window.name.slice(SAVE_KEY.length+1));if(v)candidates.push(v);}} catch{}
    return candidates.sort((a,b)=>b.stamp-a.stamp)[0]||newRun();
  }
  function warn(text) {
    if(warningShown)return;warningShown=true;
    const message=document.createElement('div');message.className='save-warning';message.role='status';message.textContent=text;document.body.append(message);
    setTimeout(()=>message.remove(),7000);
  }
  function persist() {
    state.stamp=Math.max(Date.now(),state.stamp+1);
    const snapshot=JSON.stringify(state);
    if(native) {
      saving=saving.catch(()=>{}).then(async()=>{
        const result=await window.pywebview.api.save_dispatch(JSON.parse(snapshot));
        if(!result||!result.ok)throw new Error('disk');
      }).catch(()=>warn('进度暂时无法保存到磁盘，请保留当前窗口。'));
    } else {
      let stored=false;
      try {localStorage.setItem(SAVE_KEY,snapshot);stored=true;} catch{}
      try {window.name=SAVE_KEY+':'+snapshot;stored=true;} catch{}
      if(!stored)warn('浏览器暂时无法保存进度，请使用单文件版并保留当前窗口。');
    }
    return saving;
  }
  async function go(route) {
    if(busy)return;
    busy=true;state.where=route;await persist();
    if(mode==='single') {if(activeRoute()===route){busy=false;render();}else location.hash=route;}
    else location.assign(routeUrl(route));
  }
  function dispatchList() {
    return '<div class="dispatch"><div class="dispatch-title">子夜军令 · 今夜七条约定</div><ol>'+STORY.map(q=>'<li><strong>'+q.name+'：</strong>'+q.clue+'<small class="dispatch-note">“'+q.note+'”</small></li>').join('')+'</ol></div>';
  }
  function shell(inner,route) {
    const m=route.match(/(?:chat|receipt)-(\d)/),index=m?Number(m[1]):0;
    return '<div class="app-shell"><aside class="sidebar" aria-label="军报导航"><div class="brand">'+flame+'<span>烽火来信</span></div><div class="nav-group"><button class="nav-item" data-action="new"><i class="nav-dot fill"></i><span>新建军报</span></button><button class="nav-item" data-action="background"><i class="nav-dot"></i><span>初始军令</span></button></div><div class="nav-label">本夜来信</div><div class="nav-group"><button class="nav-item active" data-action="current"><i class="nav-dot"></i><span>'+(index?STORY[index-1].name+' · 接力回报':route==='ending'?'长夜之后':'子夜 · 北境急报')+'</span></button></div><div class="sidebar-spacer"></div><button class="nav-item" data-action="help"><i class="nav-dot"></i><span>操作说明</span></button><div class="user-card"><div class="avatar">守</div><div class="user-meta"><div class="user-name">无名守燧人</div><div class="user-plan">北境 · 子夜值守</div></div></div></aside><main class="main"><header class="topbar"><button class="pill button-pill mobile-new" data-action="new">重新开始</button><span class="pill">'+(index?'第 '+index+' / 7 程':route==='ending'?'天将明':'北境 · 子夜')+'</span><button class="pill button-pill" data-action="background">查看军令</button><button class="pill button-pill" data-action="help" aria-label="操作说明">?</button></header><div class="page"><div class="'+(route==='ending'?'ending-card':'center-stack '+(route.startsWith('chat')?'wide':'medium'))+' route-enter">'+inner+'</div></div></main></div>';
  }
  function intro() {
    return '<div class="stage-head"><div class="eyebrow">'+flame+' 一封必须在天亮前抵达的军报</div><h1 class="preface-title">烽火来信</h1><p class="stage-desc">七座烽燧，一夜山河。请把正确的消息，送到最后一座关城。</p></div><section class="card story-card"><div class="intro-art"><img src="'+ENDING_IMAGE+'" alt="暮色中的山脊与连绵烽台"></div><div class="prologue"><p>朔风封山，驿骑未归。你是北境新来的守燧人。今夜，一支敌骑正在接近关城；山间的七座烽燧，是仅剩的传讯之路。</p><p>老卒把一封军令压在灯下：“别凭火光猜。每到一燧，只答它问的那一个数。话一出口，就随烽火传下去了。”</p><p>纸上有古文，也夹着通事未译的异文。抄令人偶在行间留字；那些不成军令的短句，也许藏着他走过长夜的方法。</p></div>'+dispatchList()+'<p class="mini-note">各燧的人物、编号与时序均依本程军令定义；拼接密语时，请按题目指定的先后顺序。答题时可随时翻阅。此为虚构故事，无需查阅史实。</p><div class="actions">'+(state.started?'<button class="secondary" data-action="new">重启这一夜</button>':'')+'<button class="primary" id="begin">'+(state.started?'继续传讯':'读完军令，接入烽燧')+' →</button></div></section>';
  }
  function chat(n) {
    const q=STORY[n-1],r=state.responses[n-1];
    return '<div class="stage-head"><div class="stage-step">第 '+n+' / 7 程 · '+q.name+'</div><h1 class="stage-title">'+q.title+'</h1><p class="stage-desc">值守人已接入。请根据子夜军令，回报一个数。</p></div><div class="manual-banner"><span></span><div><strong>'+q.name+' · 值守人</strong><small>烽火接力已连接 · 等待军报</small></div></div><div class="manual-shell"><section class="chat-card" aria-label="'+q.name+'聊天框"><div class="chat-head"><span class="chat-title">'+q.name+' · 来信</span><span class="chat-status">● 值守中</span></div><div class="chat-log" role="log" aria-label="对话记录"><div class="reviewer"><b>值守人</b><p>风大，听得见吗？我是'+q.name+'的值守人。</p></div><div class="reviewer"><b>值守人</b><p>'+q.question+'</p></div>'+(r?'<div class="you"><b>你</b><p>'+escape(r.text)+'</p></div><div class="reviewer"><b>值守人</b><p>这份回报已发出。请到回执中继续传讯。</p></div>':'')+'</div>'+(r?'<button class="primary full" id="view-receipt">查看回执 →</button>':'<form class="composer" id="answer-form" autocomplete="off"><label class="sr-only" for="answer">输入你的答案</label><textarea id="answer" rows="2" maxlength="64" placeholder="写下你的回报…" spellcheck="false" enterkeyhint="send" aria-describedby="input-hint answer-error"></textarea><div class="composer-foot"><span class="composer-hint" id="input-hint">Enter 发送 · Shift + Enter 换行</span><button class="primary send-button" type="submit">发送 ↑</button></div><div class="inline-error" id="answer-error" role="status" hidden></div></form>')+'<p class="mini-note">回报一经确认，即刻传往下一座烽燧。</p></section><aside class="card metadata-card"><div class="card-title">今夜军报</div><div class="card-sub">守住每一程，也守住每一个数字。</div><div class="metadata"><div class="meta-row"><span class="meta-key">当前烽燧</span><span class="meta-val">'+q.name+'</span></div><div class="meta-row"><span class="meta-key">传讯方向</span><span class="meta-val">'+(n<7?STORY[n].name:'北境关城')+'</span></div><div class="meta-row"><span class="meta-key">回报方式</span><span class="meta-val">数值密语</span></div></div><details class="evidence"><summary>翻阅本程军令</summary><p>'+q.clue+'</p></details><p class="marginalia">“'+q.note+'”</p><p class="mini-note">可输入阿拉伯数字、中文数字或英文数词。</p></aside></div>';
  }
  function receipt(n,branch) {
    const q=STORY[n-1],r=state.responses[n-1];
    const actual=r?(isCorrect(r,n-1)?'good':'bad'):null;
    if(actual!==branch) return '<div class="stage-head"><div class="stage-step">'+q.name+' · 回执</div><h1 class="stage-title">尚未收到这份回报</h1><p class="stage-desc">请先回到烽燧，与值守人核对来信。</p></div><button class="primary full" id="return-chat">返回'+q.name+' →</button>';
    // Only an actual response and its matching result page can add this receipt.
    state.trail['r'+n]=state.id+':'+r.nonce;
    persist();
    const good=branch==='good';
    return '<div class="stage-head"><div class="stage-step">第 '+n+' / 7 程 · '+q.name+'回执</div><h1 class="stage-title">'+(good?'火光已被接住':'山间传来杂音')+'</h1><p class="stage-desc">'+q.name+'的值守人发来了一封回信。</p></div><section class="card story-card"><div class="receipt-status '+(good?'':'bad')+'">'+(good?'✓ 回报正确':'× 回报有误')+'</div><p class="receipt-copy">'+(good?q.good:q.bad)+'</p><div class="your-answer">你的回报：<strong>'+escape(r.text)+'</strong></div><p class="receipt-note">军令核对：'+q.explanation+'</p><div class="actions"><button class="primary" id="next">'+(n<7?'前往'+STORY[n].name:'把军报送入关城')+' →</button></div></section>';
  }
  function ending() {
    const result=endingFor(state),bad=result==='bad';
    return '<div class="ending-code">'+(bad?'THE NIGHT WITHOUT AN ANSWER':'WHEN THE LAST BEACON REACHES HOME')+'</div><h1>'+(bad?'火还亮着，关城已静':'山河无恙，长夜将明')+'</h1><p>'+(bad?'至少一份军报在传递中失了真。关城错过了最后的应援时机，守燧人等到天亮，也没有等来那一声回火。':'最后一道烽火抵达关城。守军在破晓前合围，百姓平安越过山口。你把那封军令放回灯下，远处终于传来归人的脚步声。')+'</p><figure class="ending-figure '+(bad?'bad':'')+'"><img src="'+ENDING_IMAGE+'" alt="'+(bad?'冷夜中等待回音的烽台':'晨光下连绵的山河与烽台')+'" width="1000" height="560">'+(result==='echo'?'<svg class="variation" viewBox="0 0 1000 560" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="smoke-density" x1="880" y1="279" x2="890" y2="350" gradientUnits="userSpaceOnUse"><stop stop-color="#707a6c" stop-opacity="0"/><stop offset=".32" stop-color="#707a6c" stop-opacity=".12"/><stop offset=".68" stop-color="#707a6c" stop-opacity=".3"/><stop offset="1" stop-color="#707a6c" stop-opacity=".55"/></linearGradient><linearGradient id="smoke-core" x1="880" y1="290" x2="890" y2="350" gradientUnits="userSpaceOnUse"><stop stop-color="#657061" stop-opacity="0"/><stop offset=".6" stop-color="#657061" stop-opacity=".12"/><stop offset="1" stop-color="#657061" stop-opacity=".26"/></linearGradient><filter id="smoke-soft" x="-40%" y="-15%" width="180%" height="130%"><feGaussianBlur stdDeviation="1.8"/></filter></defs><g filter="url(#smoke-soft)"><path d="M889 349c-5-4-4-8-2-12 4-7-6-8-8-13-4-2-4-7-1-11-7 0-11-4-10-8-7-1-11-7-7-12-4-5 0-12 5-12 3-6 13-5 17 0 7-1 13 5 11 10 6 5 2 11-4 14-3 2 1 7 0 12 8 6 8 13 3 18-4 5 0 9-1 14Z" fill="url(#smoke-density)"/><path d="M889 349c-4-5-1-9 1-13 4-5-1-10-6-13-6-4-4-9-1-13 4-5 0-9-4-12-7-5-4-10-2-12-3 7 6 8 10 12 6 5 5 11 1 15-3 4 0 8 4 10 7 6 4 12 1 16-2 4 0 7-1 10Z" fill="url(#smoke-core)"/></g></svg>':'')+'</figure><p>'+(bad?'有些错误，火光不会替人纠正。':'这一夜，你的名字没有写进军报。山河记得。')+'</p><div class="actions"><button class="secondary" data-action="background">再读军令</button><button class="primary" data-action="new">重走这一夜 →</button></div>';
  }
  function showModal(title,body,buttons) {
    document.getElementById('modal')?.remove();
    const dialog=document.createElement('dialog');dialog.id='modal';dialog.className='modal';dialog.setAttribute('aria-labelledby','modal-title');
    dialog.innerHTML='<div class="modal-head"><h2 id="modal-title">'+title+'</h2><button class="icon-btn" id="close-modal" aria-label="关闭弹窗">×</button></div><div class="modal-body">'+body+'</div><div class="actions" id="modal-actions"></div>';
    document.body.append(dialog);
    const close=()=>{dialog.close();dialog.remove();};
    dialog.querySelector('#close-modal').onclick=close;
    for(const [label,kind,action] of buttons){const button=document.createElement('button');button.type='button';button.textContent=label;button.className=kind;button.onclick=()=>{close();action?.();};dialog.querySelector('#modal-actions').append(button);}
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.showModal();
    (dialog.querySelector('#modal-actions button')||dialog.querySelector('button')).focus();
    return dialog;
  }
  function background() {showModal('灯下的子夜军令','<p>朔风封山，七座烽燧依次接力。今夜各燧的见闻、约定与残存记录，均记在这里。</p>'+dispatchList(),[['合上军令','primary']]);}
  function help() {showModal('如何传递这封来信','<p>先读军令，再回答值守人的问题。每次只输入一个数；按 Enter 或点击发送，会先请你确认。确认后进入回执，再继续下一程。</p><p>数字之间可以留空格，也可以使用中文数字或英文数词。例如数值 42 可写作「4 2」「四十二」「四二」或「forty-two」。请只写答案，不要附带解释、单位或其他字符。</p><p>每份回报只能确认一次；回看旧页面不会修改已发出的内容。进度自动保存在当前设备，可继续未完成的军报。</p><p>手机直接点击发送即可；电脑 Shift + Enter 可以换行。</p>',[['明白了','primary']]);}
  function restart() {showModal('重走这一夜？','<p>当前这封军报将被新的值守记录替代，故事会从子夜重新开始。</p>',[['继续当前军报','secondary'],['重新开始','primary',async()=>{state=newRun();await go('intro');}]]);}
  function bind(route) {
    app.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.action;
      if(action==='background')background();else if(action==='help')help();else if(action==='new')restart();else if(action==='current')window.scrollTo({top:0,behavior:'smooth'});
    }));
    document.getElementById('begin')?.addEventListener('click',async()=>{
      if(state.started){await go(state.where!=='intro'?state.where:'chat-1');return;}
      state.started=true;await go('chat-1');
    });
    const match=route.match(/^(chat|receipt)-(\d)(?:-(good|bad))?$/);
    if(!match)return;
    const n=Number(match[2]),r=state.responses[n-1];
    document.getElementById('view-receipt')?.addEventListener('click',()=>go('receipt-'+n+'-'+(isCorrect(r,n-1)?'good':'bad')));
    document.getElementById('return-chat')?.addEventListener('click',()=>go('chat-'+n));
    document.getElementById('next')?.addEventListener('click',()=>go(n<7?'chat-'+(n+1):'ending'));
    const form=document.getElementById('answer-form'),input=document.getElementById('answer');
    if(!form)return;
    input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>composing=false);
    input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!composing&&event.keyCode!==229){event.preventDefault();form.requestSubmit();}});
    form.addEventListener('submit',event=>{
      event.preventDefault();if(busy||composing||document.getElementById('modal'))return;
      const text=input.value.trim();
      if(!text){const error=document.getElementById('answer-error');error.textContent='先写下你的回报。';error.hidden=false;input.focus();return;}
      const dialog=showModal('确认发出这份回报？','<p>请再核对一次。确认后，这个答案会立即传出，无法撤回。</p><div class="answer-preview" id="answer-preview"></div>',[['返回修改','secondary',()=>input.focus()],['确认发送','primary',async()=>{
        if(busy||state.responses[n-1])return;
        state.responses[n-1]={text,nonce:Date.now().toString(36)+Math.random().toString(36).slice(2)};
        await go('receipt-'+n+'-'+(isCorrect(state.responses[n-1],n-1)?'good':'bad'));
      }]]);
      dialog.querySelector('#answer-preview').textContent=text;
    });
  }
  function render() {
    busy=false;composing=false;
    document.getElementById('modal')?.remove();
    let route=activeRoute();
    if(!/^(intro|ending|chat-[1-7]|receipt-[1-7]-(good|bad))$/.test(route))route='intro';
    if(!state.started&&route!=='intro')route='intro';
    const previousWhere=state.where;
    if(route!=='intro')state.where=route;
    const m=route.match(/^(chat|receipt)-(\d)(?:-(good|bad))?$/);
    const inner=route==='intro'?intro():route==='ending'?ending():m[1]==='chat'?chat(Number(m[2])):receipt(Number(m[2]),m[3]);
    app.innerHTML=shell(inner,route);
    document.title='烽火来信 · '+(route==='intro'?'子夜军令':route==='ending'?'长夜之后':STORY[Number(m[2])-1].name);
    bind(route);
    if(route==='intro')state.where=previousWhere;
    persist();window.scrollTo(0,0);
    const heading=app.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  async function init() {
    state=browserLoad();
    if(window.BEACON_NATIVE) {
      window.addEventListener('pywebviewready',async()=>{
        native=true;
        try {const loaded=await window.pywebview.api.load_dispatch();if(validState(loaded))state=loaded;} catch{warn('暂时无法读取本地存档。');}
        if(state.started&&state.where!=='intro'&&mode==='single'&&activeRoute()==='intro'){location.hash=state.where;return;}
        render();
      },{once:true});
      return;
    }
    render();
  }
  window.addEventListener('hashchange',()=>{if(mode==='single')render();});
  window.addEventListener('pageshow',event=>{if(event.persisted){state=browserLoad();render();}});
  init();
})();
