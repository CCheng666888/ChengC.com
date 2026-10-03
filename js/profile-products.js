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
