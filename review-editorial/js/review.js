(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 800px), (pointer: coarse)');
  const editionConfig = window.ChenCCoverEditions;
  const now = Date.now();
  const active = editionConfig.editions.filter(e => Number.isFinite(Date.parse(e.startsAt)) && Number.isFinite(Date.parse(e.endsAt)) && Date.parse(e.startsAt) <= now && now < Date.parse(e.endsAt)).sort((a,b) => (b.priority || 0) - (a.priority || 0));
  const edition = active[0] || editionConfig.default;
  const picture = $('coverPicture'), image = $('coverImage'), art = $('landscapeArt');
  let legacyLoaded = false, legacyLoading = false;
  const defaults = {density:65, speed:35, mist:40, glow:60, lanterns:55};
  art.style.setProperty('--cover-focus', edition.focus || '50% 50%');
  art.style.setProperty('--cover-mobile-focus', edition.mobileFocus || edition.focus || '50% 50%');
  image.alt = edition.alt;
  $('editionTitle').textContent = edition.title;
  $('settings').querySelector('h2').textContent = edition.title;
  art.dataset.nightImage = edition.night || '';
  art.dataset.nightImageMobile = edition.nightMobile || edition.night || '';
  $('top').setAttribute('aria-label', '当前封面：' + edition.title);
  function syncCover() {
    const night = document.body.classList.contains('night') && edition.night;
    const desktop = night ? edition.night : edition.desktop;
    const mobile = night ? (edition.nightMobile || edition.night) : (edition.mobile || edition.desktop);
    picture.querySelector('source').srcset = mobile;
    image.src = desktop;
    art.style.backgroundImage = `url("${compact.matches ? mobile : desktop}")`;
  }
  syncCover();
  compact.addEventListener('change', syncCover);
  $('nightToggle').hidden = !edition.night;
  $('legacyControls').hidden = !edition.legacyLandscape;
  $('pauseToggle').hidden = !edition.legacyLandscape;
  Object.keys(defaults).forEach(key => {
    const input = $(key);
    input.closest('label').hidden = !edition.controls?.includes(key);
    input.addEventListener('input', () => { $(key+'Value').value = input.value+'%'; });
  });
  function panel(open) {
    $('settings').hidden = !open;
    $('settingsToggle').setAttribute('aria-expanded', String(open));
    (open ? $('settingsClose') : $('settingsToggle')).focus({preventScroll:true});
  }
  $('settingsToggle').addEventListener('click', () => { if (!legacyLoaded) panel($('settings').hidden); });
  $('settingsClose').addEventListener('click', () => { if (!legacyLoaded) panel(false); });
  document.addEventListener('click', e => { if (!legacyLoaded && !$('settings').hidden && !e.target.closest('#settings, #settingsToggle')) { $('settings').hidden=true; $('settingsToggle').setAttribute('aria-expanded','false'); } });
  document.addEventListener('keydown', e => { if (e.key==='Escape' && !$('settings').hidden && !legacyLoaded) panel(false); });
  $('nightToggle').addEventListener('click', () => {
    if (!legacyLoaded) {
      const night = document.body.classList.toggle('night');
      $('nightToggle').textContent = night ? '切换晨光' : '切换夜色';
      $('nightToggle').setAttribute('aria-pressed', String(night));
    }
    queueMicrotask(syncCover);
  });
  $('reset').addEventListener('click', () => {
    if (!legacyLoaded) {
      Object.entries(defaults).forEach(([key,value]) => { $(key).value=value; $(key+'Value').value=value+'%'; });
      document.body.classList.remove('night');
      $('nightToggle').textContent='切换夜色'; $('nightToggle').setAttribute('aria-pressed','false');
    }
    queueMicrotask(syncCover);
  });
  $('sceneToggle').addEventListener('click', () => {
    if (legacyLoaded) return;
    const only = document.body.classList.toggle('scene-only');
    $('sceneToggle').textContent = only ? '显示封面信息' : '只看风景';
    $('sceneToggle').setAttribute('aria-pressed', String(only));
  });
  function loadScript(src) {
    return new Promise((resolve,reject) => {
      const script=document.createElement('script'); script.src=src; script.onload=resolve; script.onerror=()=>{script.remove();reject(new Error('背景动画资源暂不可用'));}; document.head.append(script);
    });
  }
  $('pauseToggle').addEventListener('click', async e => {
    if (legacyLoaded) return;
    e.stopImmediatePropagation();
    if (legacyLoading) return;
    if (reduced.matches) { $('motionNote').textContent='已根据减少动画偏好保留静态照片，照片与内容可正常浏览。'; return; }
    legacyLoading = true;
    const button=$('pauseToggle'); button.disabled=true; button.textContent='正在准备动画…';
    const values=Object.fromEntries(Object.keys(defaults).map(k=>[k,$(k).value]));
    try {
      await loadScript('../js/lake-projection.js');
      await loadScript('../js/scene-images.js');
      // Keep the engine's base texture on the day photo when opened at night.
      art.style.backgroundImage=`url("${compact.matches ? (edition.mobile || edition.desktop) : edition.desktop}")`;
      await loadScript('../js/landscape.js');
      legacyLoaded=true; document.body.classList.add('legacy-loaded');
      syncCover();
      Object.entries(values).forEach(([key,value])=>{$(key).value=value;$(key).dispatchEvent(new Event('input'));});
      button.disabled=false;
      if (button.getAttribute('aria-pressed')==='true') button.click();
      $('motionNote').textContent='沿用原站的湖面、云雾与夜色调节。离开封面或切到后台时，动画自动停止。';
    } catch {
      button.disabled=false;button.textContent='重试山水动画';
      $('motionNote').textContent='动画暂不可用，静态封面与内容浏览不受影响。';
    } finally { legacyLoading=false; }
  }, true);

  const searchToggle=$('mobileSearchToggle');
  searchToggle.addEventListener('click', () => {
    const open=document.body.classList.toggle('search-open');
    searchToggle.setAttribute('aria-expanded', String(open));
    if(open) $('navSearchInput').focus({preventScroll:true}); else $('navSearchInput').blur();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('search-open')){document.body.classList.remove('search-open');searchToggle.setAttribute('aria-expanded','false');searchToggle.focus({preventScroll:true});}});
  // Music remains accessible through the mobile menu without crowding the main links.
  const mobileMusic=document.createElement('button');mobileMusic.type='button';mobileMusic.className='mobile-music';mobileMusic.textContent='音乐 ♫';mobileMusic.addEventListener('click',()=>{$('musicToggle').click();$('navLinks').classList.remove('open');$('menuToggle').setAttribute('aria-expanded','false');});$('navLinks').append(mobileMusic);

  // Native page flow is the transition. Optional papers follow scroll position once;
  // no wheel/touch interception, timers, pinned sections, or hidden content.
  const masthead=document.querySelector('.blog-masthead');
  const papers=[...document.querySelectorAll('.stage-paper')];
  let frame=0, settled=false, watching=false;
  const clamp=n=>Math.max(0,Math.min(1,n));
  function finish() {
    settled=true;document.body.classList.remove('stage-active');document.body.classList.add('stage-settled');
    picture.style.transform='';picture.style.opacity='';
    removeEventListener('scroll',schedule);watching=false;
    window.ChenCReview.stageSettled=true;
  }
  function render() {
    frame=0;
    if(settled||reduced.matches||compact.matches)return;
    const photoRect=$('top').getBoundingClientRect(), rect=masthead.getBoundingClientRect();
    const progress=clamp((innerHeight*.96-rect.top)/(innerHeight*.65));
    if(progress>=1){finish();return;}
    const retreat=clamp(-photoRect.top/photoRect.height);
    picture.style.transform=`translateY(${-retreat*22}px) scale(${1-retreat*.025})`;
    picture.style.opacity=String(1-retreat*.18);
    const active=progress>0;
    document.body.classList.toggle('stage-active',active);
    if(!active)return;
    const ease=1-Math.pow(1-progress,3), fade=Math.min(1,progress*9)*Math.max(0,1-Math.max(0,progress-.74)/.26);
    const entries=[[-innerWidth*.65,110,-31],[innerWidth*.52,180,34],[innerWidth*.24,-120,19]];
    papers.forEach((paper,i)=>{
      const [x,y,angle]=entries[i];
      paper.style.transform=`translate3d(${x*(1-ease)}px,${y*(1-ease)}px,0) rotate(${angle*(1-ease)+(i-1)*7}deg)`;
      paper.style.opacity=String(fade);
    });
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render);}
  function configureMotion(){
    if(reduced.matches||compact.matches){document.body.classList.remove('stage-enabled','stage-active');picture.style.transform='';picture.style.opacity='';removeEventListener('scroll',schedule);watching=false;return;}
    if(settled)return;
    document.body.classList.add('stage-enabled');
    if(!watching){addEventListener('scroll',schedule,{passive:true});watching=true;}
    schedule();
  }
  window.ChenCReview={edition:edition.id,stageSettled:false};
  reduced.addEventListener('change',configureMotion);compact.addEventListener('change',configureMotion);
  addEventListener('resize',()=>{if(!settled)schedule();},{passive:true});
  configureMotion();
})();
