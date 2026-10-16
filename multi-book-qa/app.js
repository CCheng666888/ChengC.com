/* Lightweight UI and keyword retrieval. No model or inference library on the critical path. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!window.QAKnowledge) {
    $('modelBadge').textContent='知识库未能载入，请刷新页面重试。';
    $('engineTitle').textContent='知识库待加载';
    $('welcomeTitle').textContent='知识库暂未加载完成';
    $('loadModel').disabled=true;$('sendButton').disabled=true;
    $('q').placeholder='请刷新页面以重新加载知识库';
    return;
  }
  const {books, items} = window.QAKnowledge;
  const shortNames = ['信息安全数学基础','密码学','Web 安全','数据库原理','计算机组成原理','数字电子技术'];
  const examples = [
    ['什么是完全剩余类？','信息安全数学基础','NUMBER THEORY','info-math'],
    ['RSA 怎样加密和解密？','密码学','CRYPTOGRAPHY','crypto'],
    ['卡诺图怎么化简？','数字电子技术','DIGITAL LOGIC','digital'],
    ['SQL 注入的原理是什么？','Web 安全','WEB SECURITY','websec'],
    ['数据库有哪些范式？','数据库原理','DATABASE','db'],
    ['Cache 的映射方式有哪些？','计算机组成原理','COMPUTER SYSTEMS','coc']
  ];
  const byId = new Map(items.map(item => [item.id,item]));
  let scope = 'all', searchIndex, worker, modelTask, modelReady = false, sequence = 0, active = null;
  const pending = new Map();
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const scopeName = key => key === 'all' ? '全部教材' : shortNames[books.findIndex(book => book.key === key)];
  const announce = text => { $('announcement').textContent = text; };
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  function tokens(text) {
    const output = [];
    for (const word of String(text).toLowerCase().match(/[\u4e00-\u9fff]{2,}|[a-z0-9]+/g) || []) {
      if (/^[a-z0-9]/.test(word) || word.length === 2) output.push(word);
      else for (let i=0; i<word.length-1; i++) output.push(word.slice(i,i+2));
    }
    return output;
  }
  function buildIndex() {
    const df = new Map();
    let total = 0;
    const docs = items.map(item => {
      const words = tokens([item.t,...(item.keywords || []),item.answer,item.formula || '',item.example || ''].join(' '));
      const counts = new Map();
      for (const word of words) counts.set(word,(counts.get(word)||0)+1);
      for (const word of counts.keys()) df.set(word,(df.get(word)||0)+1);
      total += words.length;
      return {counts,length:words.length,head:new Set(tokens([item.t,...(item.keywords || [])].join(' ')))};
    });
    searchIndex = {docs,avg:total/items.length,idf:new Map([...df].map(([word,count]) => [word,Math.log(1+(items.length-count+.5)/(count+.5))]))};
  }
  function bm25(query, selected = scope) {
    if (!searchIndex) buildIndex();
    const queryTokens = [...new Set(tokens(query))], {docs,avg,idf} = searchIndex, results=[];
    docs.forEach((doc,i) => {
      if (selected !== 'all' && items[i].bk !== selected) return;
      let score = 0, headMatch = false;
      for (const word of queryTokens) {
        const count = doc.counts.get(word) || 0;
        if (count) score += (idf.get(word)||0)*count*2.2/(count+1.2*(.25+.75*doc.length/avg));
        if (doc.head.has(word)) { score += (idf.get(word)||0)*.6; headMatch = true; }
      }
      if (score > 0) results.push({i,s:score,relevant:headMatch && score >= 3});
    });
    return results.sort((a,b) => b.s-a.s).slice(0,5);
  }
  function renderBooks() {
    books.forEach((book,i) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'bk-item'; button.dataset.bk = book.key;
      button.title = book.title; button.setAttribute('aria-pressed','false');
      button.innerHTML = `<span class="book-number">0${i+1}</span><span class="book-label">${shortNames[i]}</span><span class="book-count">${items.filter(item=>item.bk===book.key).length}</span>`;
      $('bkList').append(button);
    });
    $('bkList').addEventListener('click',event => {
      const button = event.target.closest('[data-bk]');
      if (button) pickBook(button.dataset.bk);
    });
  }
  function pickBook(key) {
    if (key !== 'all' && !books.some(book => book.key === key)) return;
    scope = key;
    document.querySelectorAll('.bk-item').forEach(button => {
      button.classList.toggle('on',button.dataset.bk===key);
      button.setAttribute('aria-pressed',String(button.dataset.bk===key));
    });
    $('scopeLabel').textContent = scopeName(key);
    $('inputScope').textContent = key === 'all' ? '全部 6 本教材' : scopeName(key);
    $('q').placeholder = key === 'all' ? '输入问题，例如：RSA 怎样加密？' : `问一问${scopeName(key)}里的知识点…`;
    renderSuggestions();
  }
  function renderSuggestions() {
    const choices = scope === 'all' ? examples.slice(0,4) : examples.filter(example => example[3]===scope);
    if (scope !== 'all') {
      for (const item of items.filter(item=>item.bk===scope).slice(0,3)) {
        choices.push([`${item.t}是什么？`,scopeName(scope),'EXPLORE THE CONCEPT',scope]);
      }
    }
    $('chips').replaceChildren();
    choices.forEach((example,i) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className='suggestion'; button.disabled=!!active;
      button.innerHTML = `<span class="suggestion-top"><span>${esc(example[1])}</span><b>0${i+1}</b></span><span class="suggestion-question">${esc(example[0])}</span><span class="suggestion-arrow" aria-hidden="true">↗</span>`;
      button.addEventListener('click',()=>askText(example[0]));
      $('chips').append(button);
    });
  }
  function setBusy(busy) {
    $('sendButton').hidden = busy; $('stopButton').hidden = !busy;
    document.querySelectorAll('.suggestion,.related button').forEach(button=>button.disabled=busy);
    $('q').setAttribute('aria-busy',String(busy));
  }
  function scrollConversation(force = false) {
    const box=$('conversation');
    if (force || box.scrollHeight-box.scrollTop-box.clientHeight < 170) box.scrollTop=box.scrollHeight;
  }
  function message(role,content) {
    const node=document.createElement('article'); node.className=`msg ${role}`;
    if (role==='user') node.textContent=content;
    else node.innerHTML=`<span class="bot-mark" aria-hidden="true">${icon('spark')}</span><div class="answer-meta"><strong>知识问答</strong><span></span></div><div class="answer-content"></div>`;
    $('qa').append(node); return node;
  }
  function localAnswer(node,hits) {
    const item=items[hits[0].i];
    node.innerHTML=`<h2 class="lead">${esc(item.t)}</h2><p>${esc(item.answer)}</p>${item.formula?`<div class="formula">公式 · ${esc(item.formula)}</div>`:''}${item.example?`<div class="example">示例 · ${esc(item.example)}</div>`:''}`;
  }
  function addNote(node,text,warning=false) {
    const note=document.createElement('div'); note.className='answer-note'+(warning?' warning':''); note.textContent=text; node.append(note); return note;
  }
  function addSources(node,hits) {
    const sources=document.createElement('section'); sources.className='sources'; sources.setAttribute('aria-label','检索引用');
    sources.innerHTML=`<div class="sources-heading">${icon('book')}回答依据 · ${hits.length} 条知识点 · 展开核对原文</div>`;
    hits.forEach((hit,i) => {
      const item=items[hit.i], detail=document.createElement('details'); detail.className='source';
      detail.innerHTML=`<summary><span class="source-index">0${i+1}</span><span class="source-title">${esc(item.t)}<small>${esc(item.bkt)} · ${esc(item.ch)}</small></span></summary><div class="source-body">${esc(item.answer)}${item.formula?'\n\n公式：'+esc(item.formula):''}${item.example?'\n\n示例：'+esc(item.example):''}</div>`;
      sources.append(detail);
    });
    node.append(sources);
    const related=(items[hits[0].i].related||[]).map(id=>byId.get(id)).filter(Boolean).slice(0,3);
    if (related.length) {
      const box=document.createElement('div'); box.className='related'; box.innerHTML='<span class="related-label">继续理解</span>';
      related.forEach(item=>{const button=document.createElement('button');button.type='button';button.textContent=item.t;button.disabled=!!active;button.addEventListener('click',()=>askText(item.t));box.append(button);});
      node.append(box);
    }
  }
  function markdown(text) {
    const blocks=[];
    let safe=esc(text).replace(/```(?:[a-z0-9_-]*\n)?([\s\S]*?)```/gi,(_,code)=>{blocks.push(`<pre><code>${code}</code></pre>`);return `\u0000${blocks.length-1}\u0000`;});
    safe=safe.replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    return safe.replace(/\u0000(\d+)\u0000/g,(_,i)=>blocks[Number(i)]);
  }
  async function chat(query,hits,signal,onToken) {
    const context=hits.map((hit,i)=>{const item=items[hit.i];return `[${i+1}]（${item.bkt}·${item.ch}）${item.t}：${item.answer}${item.formula?'（公式：'+item.formula+'）':''}${item.example?'（示例：'+item.example+'）':''}`;}).join('\n');
    const response=await fetch('https://ai.chenc.com.cn/api/chat',{
      method:'POST',signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'deepseek-chat',messages:[{role:'system',content:'你是《多书知识问答》助手。回答必须完全基于知识库资料，禁止编造或补充资料之外的知识。用通俗中文组织要点，涉及公式和例子时一并给出，使用 [1] 等标注资料来源。资料不足时明确说明知识库中没有相关内容，只列出最接近的知识点标题作为参考。'},{role:'user',content:'【知识库资料】\n'+context+'\n\n【用户问题】'+query}],stream:true,temperature:.4,max_tokens:1200})
    });
    if(!response.ok) throw Error(`服务暂不可用（${response.status}）`);
    if(!response.body) throw Error('未收到回答内容');
    const reader=response.body.getReader(),decoder=new TextDecoder();
    let buffer='',received=false,done=false;
    const line=value=>{
      if(!value.startsWith('data:'))return;
      const data=value.slice(5).trim();
      if(data==='[DONE]'){done=true;return;}
      let event;try{event=JSON.parse(data);}catch{return;}
      if(event.error)throw Error('AI 返回异常');
      const token=event.choices?.[0]?.delta?.content;
      if(token){received=true;onToken(token);}
    };
    try {
      while(!done){
        const result=await reader.read();
        buffer+=decoder.decode(result.value||new Uint8Array(),{stream:!result.done});
        const lines=buffer.split(/\r?\n/);buffer=lines.pop();
        for(const value of lines)line(value);
        if(result.done){if(buffer.trim())line(buffer);break;}
      }
      if(!received)throw Error('AI 暂未返回有效内容');
    } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  function abortCurrent(reason='user') {
    if(active){active.reason=reason;active.controller.abort();}
  }
  function resizeInput() { const q=$('q');q.style.height='auto';q.style.height=Math.min(q.scrollHeight,112)+'px'; }
  async function askText(text) { if(active)return; $('q').value=text; await ask(); }
  async function ask() {
    const query=$('q').value.trim().slice(0,2000);
    if(!query || active)return;
    const run={controller:new AbortController(),reason:'',id:++sequence};active=run;
    const selected=scope,useAI=$('aiEnabled').checked;
    $('welcome').hidden=true;$('qa').hidden=false;setBusy(true);
    message('user',query);$('q').value='';resizeInput();
    const answer=message('bot'),meta=answer.querySelector('.answer-meta span'),content=answer.querySelector('.answer-content');
    meta.textContent='正在检索 · '+scopeName(selected);content.textContent='正在查找相关知识点…';
    scrollConversation(true);announce('正在检索知识库');
    let hits,usedSemantic=modelReady,text='',paint=0,idleTimer,totalTimer;
    const resetIdle=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{run.reason='timeout';run.controller.abort();},35000);};
    try {
      await nextFrame();
      if(usedSemantic){
        try{hits=(await workerRequest('search',{query})).filter(hit=>selected==='all'||items[hit.i].bk===selected).slice(0,5);}
        catch{usedSemantic=false;modelFailure('语义检索暂不可用');hits=bm25(query,selected);}
      }else hits=bm25(query,selected);
      if(active!==run||run.controller.signal.aborted)return;
      if(!hits.length){meta.textContent='本地检索 · '+scopeName(selected);content.textContent='这本知识库里还没有找到相关内容。试试更具体的知识点名称，或切换到「全部教材」。';announce('未找到相关知识点');return;}
      const relevant=usedSemantic?hits[0].s>=.42:hits[0].relevant;
      localAnswer(content,hits);addSources(answer,hits);
      meta.textContent=(usedSemantic?'语义检索':'本地检索')+' · '+scopeName(selected);
      scrollConversation(true);
      if(!relevant){addNote(content,'相关度不足，暂不启用 AI。这里展示最接近的知识库原文，供你核对。',true);return;}
      if(!useAI){addNote(content,'以上为知识库原文。可在输入框开启 AI 整理后再次提问。');announce('已找到知识库原文与章节引用');return;}
      meta.textContent='原文已找到 · AI 正在整理';
      resetIdle();totalTimer=setTimeout(()=>{run.reason='timeout';run.controller.abort();},120000);
      try {
        await chat(query,hits,run.controller.signal,token=>{
          if(active!==run)return;
          text+=token;resetIdle();
          if(!paint)paint=requestAnimationFrame(()=>{paint=0;if(active!==run)return;content.classList.add('stream');content.innerHTML=markdown(text);meta.textContent='AI 正在回答 · '+(usedSemantic?'语义检索':'本地检索');scrollConversation();});
        });
        if(active!==run)return;
        cancelAnimationFrame(paint);paint=0;content.classList.add('stream');content.innerHTML=markdown(text);
        meta.textContent='DeepSeek 整理 · '+(usedSemantic?'语义检索':'本地检索');
        announce('回答已完成，可展开来源核对原文');
      }catch(error){
        if(active!==run)return;
        cancelAnimationFrame(paint);paint=0;
        if(run.reason==='user'){
          if(text){content.classList.add('stream');content.innerHTML=markdown(text);addNote(content,'已停止生成，当前回答可能不完整；可展开下方原文核对。');}
          else{localAnswer(content,hits);addNote(content,'已停止 AI 整理，保留知识库原文。');}
          meta.textContent='已停止 · '+scopeName(selected);
        }else{
          content.classList.remove('stream');localAnswer(content,hits);
          addNote(content,run.reason==='timeout'?'AI 响应较慢，已显示知识库原文。你可以稍后重试。':'AI 暂时无法完成回答，已显示知识库原文。',true);
          meta.textContent='知识库原文 · '+scopeName(selected);
        }
        announce('已显示回答与知识库原文');
      }
    }catch(error){if(active===run){content.textContent='检索暂时遇到问题，请重新提问。';meta.textContent='请重试';}}
    finally {
      clearTimeout(idleTimer);clearTimeout(totalTimer);cancelAnimationFrame(paint);
      if(active===run){active=null;setBusy(false);scrollConversation();}
    }
  }
  function newChat() {
    abortCurrent('reset');active=null;setBusy(false);$('qa').replaceChildren();$('qa').hidden=true;$('welcome').hidden=false;
    $('q').value='';resizeInput();$('conversation').scrollTop=0;announce('已开启新问答');$('q').focus({preventScroll:true});
  }
  function modelFailure(message) {
    modelReady=false;worker?.terminate();worker=null;modelTask=null;
    for(const task of pending.values()){clearTimeout(task.timer);task.reject(Error(message));}pending.clear();
    $('modelDot').className='status-dot';$('engineTitle').textContent='本地检索可用';$('engineMode').textContent='轻快模式';
    $('modelBadge').textContent=message+'，可继续使用本地检索。';$('progress').hidden=true;$('loadModel').disabled=false;
    $('loadModel').querySelector('span').textContent='重试语义增强';
  }
  function workerRequest(type,payload={}) {
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      const timer=setTimeout(()=>{pending.delete(id);reject(Error('语义引擎响应超时'));},type==='load'?180000:20000);
      pending.set(id,{resolve,reject,timer});worker.postMessage({id,type,...payload});
    });
  }
  async function loadModel() {
    if(modelReady)return true;if(modelTask)return modelTask;
    if(location.protocol==='file:'){$('modelBadge').textContent='直接打开文件时支持本地关键词检索；语义增强请在网站中启用。';return false;}
    if(!window.Worker){$('modelBadge').textContent='此浏览器暂不支持语义增强，可继续本地检索。';return false;}
    $('loadModel').disabled=true;$('progress').hidden=false;$('progressBar').style.width='3%';$('progText').textContent='正在加载语义资源，提问仍然可用…';
    $('modelDot').className='status-dot busy';$('engineTitle').textContent='准备语义增强';$('engineMode').textContent='后台加载';$('modelBadge').textContent='正在后台准备，不影响本地检索。';
    try {
      worker=new Worker('semantic-worker.js?v=20261016',{type:'module'});
      worker.onmessage=event=>{
        const data=event.data;
        if(data.type==='progress'){
          if(data.total){$('progressBar').style.width=Math.max(3,Math.min(95,data.loaded/data.total*95))+'%';$('progText').textContent=`模型 ${(data.loaded/1048576).toFixed(1)} / ${(data.total/1048576).toFixed(1)} MB · 首次还需准备推理运行时`;}
          else $('progText').textContent=data.text||'正在初始化语义引擎…';
          return;
        }
        const task=pending.get(data.id);if(!task)return;clearTimeout(task.timer);pending.delete(data.id);
        if(data.error)task.reject(Error(data.error));else task.resolve(data.result);
      };
      worker.onerror=()=>modelFailure('语义资源加载失败');
      modelTask=workerRequest('load').then(()=>{
        modelReady=true;$('modelDot').className='status-dot';$('engineTitle').textContent='语义增强已就绪';$('engineMode').textContent='增强模式';$('modelBadge').textContent='后续提问将使用语义检索，已有回答保持原样。';$('progress').hidden=true;$('loadModel').querySelector('span').textContent='语义增强已启用';announce('语义增强已就绪');return true;
      }).catch(()=>{modelFailure(navigator.onLine?'语义资源加载失败，请稍后重试':'当前离线，语义资源尚未缓存');return false;});
      return await modelTask;
    }catch{modelFailure('此环境暂时无法启动语义增强');return false;}
  }
  $('questionForm').addEventListener('submit',event=>{event.preventDefault();ask();});
  $('q').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();ask();}});
  $('q').addEventListener('input',resizeInput);
  $('stopButton').addEventListener('click',()=>abortCurrent());
  $('newChat').addEventListener('click',newChat);
  $('loadModel').addEventListener('click',loadModel);
  if(matchMedia('(max-width:760px)').matches)$('engineDetails').open=false;
  renderBooks();renderSuggestions();
  window.__api={ask,askText,bm25,pickBook,loadEmb:loadModel,items,get state(){return {EMB:modelReady,ds:$('aiEnabled').checked,scope,busy:!!active,badge:$('modelBadge').textContent};}};
})();
