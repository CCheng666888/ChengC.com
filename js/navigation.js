/* Native navigation, bounded prefetch and versioned caching. No exit delay. */
(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:800px), (pointer:coarse)').matches;
  const connection = navigator.connection;
  const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const mainPages = ['index.html', 'tools.html', 'games.html', 'about.html', 'contact.html'];
  const pending = new Map();
  let worker = null;
  function destination(value) {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname) || url.search) return null;
      const relative = url.pathname.slice(root.pathname.length) || 'index.html';
      if (!mainPages.includes(relative) && !/^(posts|work)\/[a-z0-9-]+\.html$/.test(relative)) return null;
      if (url.pathname === location.pathname || (relative === 'index.html' && location.pathname === root.pathname)) return null;
      url.hash = '';
      return url;
    } catch { return null; }
  }
  function warm(value, urgent = false) {
    const url = destination(value);
    if (!url || constrained || document.hidden || pending.has(url.href)) return Promise.resolve();
    const job = worker ? Promise.resolve(worker.postMessage({type:'WARM_PAGE', url:url.href, mobile:matchMedia('(max-width:800px)').matches, urgent})) :
      fetch(url.href, {priority:'low'}).then(async response => {
        if (!response.ok) return;
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const resources = [...doc.querySelectorAll('link[rel="stylesheet"][href], script[src]')].map(node => new URL(node.getAttribute('href') || node.getAttribute('src'), url));
        const image = doc.querySelector('img[loading="eager"]');
        const mobileImage = matchMedia('(max-width:800px)').matches ? doc.querySelector('picture source[media="(max-width:800px)"]') : null;
        if (image) resources.push(new URL(mobileImage?.getAttribute('srcset') || image.getAttribute('src'), url));
        await Promise.allSettled(resources.filter(asset=>asset.origin===root.origin).map(asset=>fetch(asset.href,{priority:'low'})));
      });
    pending.set(url.href, job);
    job.catch(()=>pending.delete(url.href));
    return job;
  }
  window.ChenCNavigation = {warm};
  function intent(event) {
    if (mobile) return;
    const target = event.target.closest?.('a[href], .work-card[data-detail]');
    if (!target || target.hasAttribute('download') || target.dataset.workClone || (target.target && target.target !== '_self')) return;
    warm(target.href || target.dataset.detail, true);
  }
  document.addEventListener('pointerover', intent, {passive:true});
  document.addEventListener('focusin', intent);
  document.addEventListener('pointerdown', intent, {passive:true});
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-animate].portal-link');
    if (!link || reduced.matches || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const box = link.getBoundingClientRect(), ripple = document.createElement('span');
    ripple.className = 'link-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.setProperty('--ripple-x', `${event.detail ? event.clientX-box.left : box.width/2}px`);
    ripple.style.setProperty('--ripple-y', `${event.detail ? event.clientY-box.top : box.height/2}px`);
    link.append(ripple);
    ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
  });
  addEventListener('pageshow',()=>document.body.classList.remove('page-leaving'));
  function speculate() {
    if (mobile || constrained || !HTMLScriptElement.supports?.('speculationrules')) return;
    // Only editorial pages; games, downloads, models and private pages are excluded.
    const selectors = mainPages.map(page=>`a[href="${page}"], a[href="../${page}"], a[href^="${page}#"], a[href^="../${page}#"]`);
    selectors.push('a[href^="posts/"]', 'a[href^="../posts/"]', 'a[href^="work/"]', 'a[href^="../work/"]');
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({prerender:[{where:{and:[{selector_matches:selectors.join(',')},{not:{selector_matches:'[download], [target="_blank"], [rel~="nofollow"]'}}]},eagerness:'moderate'}]});
    document.head.append(rules);
  }
  async function prepare() {
    if (document.hidden || location.protocol === 'file:') return;
    if ('serviceWorker' in navigator && isSecureContext) {
      try {
        await navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname,updateViaCache:'none'});
        const registration = await navigator.serviceWorker.ready;
        worker = registration.active;
        if (!navigator.serviceWorker.controller) await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
        pending.clear();
        if (!mobile && !constrained) worker.postMessage({type:'WARM_PAGE',url:location.href,mobile:false});
      } catch { /* Native links and HTTP caching still work when storage is disabled. */ }
    }
    speculate();
    if (mobile || constrained) return;
    // Prepare at most two destinations after the current page has painted.
    const links = [...document.querySelectorAll('.nav-links a[href], .hero-actions a[href], .contact-header a[href], .article-footer a[href]')];
    const next = [...new Set(links.map(link=>destination(link.href)?.href).filter(Boolean))].slice(0,2);
    for (const url of next) await warm(url);
  }
  function queue() {
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if ('requestIdleCallback' in window) requestIdleCallback(prepare,{timeout:1500});
      else setTimeout(prepare,300);
    }));
  }
  if (document.prerendering || document.hidden) {
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue();},{once:true});
  } else if (document.readyState === 'complete') queue();
  else addEventListener('load',queue,{once:true});
})();
