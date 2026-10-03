/* Local full-text search. The article index is loaded only when a search field is used. */
(() => {
  'use strict';
  const normalize = text => String(text).normalize('NFKC').toLocaleLowerCase();
  const terms = query => normalize(query).trim().split(/\s+/u).filter(Boolean);
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const documents = new Map();
  let indexPromise;

  function documentFor(post) {
    return documents.get(post.id) || {text: post.content, normalized: normalize(post.content)};
  }
  function find(posts, query) {
    const tokens = terms(query);
    return posts.map(post => {
      const title = normalize(post.title), summary = normalize(post.content);
      const text = documentFor(post).normalized;
      const haystack = `${title} ${summary} ${text}`;
      if (!tokens.every(token => haystack.includes(token))) return null;
      const score = tokens.reduce((n, token) => n + (title.includes(token) ? 8 : summary.includes(token) ? 3 : 1), 0);
      return {post, score};
    }).filter(Boolean).sort((a, b) => b.score - a.score || String(b.post.date).localeCompare(String(a.post.date))).map(item => item.post);
  }
  function excerpt(post, query) {
    const tokens = terms(query);
    if (!tokens.length || tokens.some(t => normalize(post.content).includes(t))) return post.content;
    const {text, normalized} = documentFor(post);
    const positions = tokens.map(t => normalized.indexOf(t)).filter(n => n >= 0);
    if (!positions.length) return post.content;
    const start = Math.max(0, Math.min(...positions) - 28), end = Math.min(text.length, start + 130);
    return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }
  function highlight(text, query) {
    const tokens = terms(query).sort((a, b) => b.length - a.length);
    if (!tokens.length) return escape(text);
    // Escape regular-expression syntax before matching; HTML is always escaped separately.
    const pattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const expression = new RegExp(`(${pattern})`, 'giu');
    return String(text).split(expression).map((part, i) => i % 2 ? `<mark>${escape(part)}</mark>` : escape(part)).join('');
  }
  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/blog-search-index.js?v=20261003-search-v2';
      script.onload = () => {
        if (!Array.isArray(globalThis.ChenCBlogIndex)) { reject(new Error('Invalid index')); return; }
        globalThis.ChenCBlogIndex.forEach(item => documents.set(item.id, {text:item.text, normalized:normalize(item.text)}));
        resolve();
      };
      script.onerror = () => { script.remove(); indexPromise = null; reject(new Error('Index unavailable')); };
      document.head.append(script);
    });
    return indexPromise;
  }

  function connect({getPosts, onQuery, destination}) {
    const forms = [...document.querySelectorAll('[data-blog-search]')];
    const navbar = document.querySelector('.nav-search');
    const navInput = navbar.querySelector('input');
    const panel = document.getElementById('navSearchResults');
    const list = document.getElementById('navSearchList');
    const status = document.getElementById('navSearchStatus');
    let query = '', active = -1, matches = [], composing = false, timer;

    function close() {
      panel.hidden = true;
      navInput.setAttribute('aria-expanded', 'false');
      navInput.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function preview() {
      if (document.activeElement !== navInput || !query.trim() || composing) { close(); return; }
      matches = find(getPosts(), query).filter(p => destination(p));
      active = -1;
      navInput.removeAttribute('aria-activedescendant');
      status.textContent = matches.length ? `找到 ${matches.length} 篇文章` : '没有找到文章，换个关键词试试';
      list.innerHTML = matches.slice(0, 4).map((p, i) => `<li role="option" aria-selected="false" id="search-result-${i}"><a tabindex="-1" href="${escape(destination(p))}"><span class="search-result-meta">${p.category === 'study' ? '学习' : '生活'} · ${escape(p.date.replaceAll('/', '.'))}</span><strong>${highlight(p.title, query)}</strong><span class="search-result-excerpt">${highlight(excerpt(p, query), query)}</span><span class="search-result-arrow" aria-hidden="true">↗</span></a></li>`).join('');
      navbar.querySelector('[data-search-all]').hidden = !matches.length;
      panel.hidden = false;
      navInput.setAttribute('aria-expanded', 'true');
    }
    function change(value, source) {
      query = value;
      forms.forEach(form => {
        const input = form.querySelector('input');
        if (input !== source) input.value = value;
        form.querySelector('[data-search-clear]').hidden = !value;
      });
      onQuery(value.trim());
      preview();
    }
    function refreshIndex() {
      loadIndex().then(() => {
        forms.forEach(f => f.querySelector('[data-search-hint]').textContent = '搜索全部文章 · 标题 / 正文');
        onQuery(query.trim());
        preview();
      }).catch(() => {
        forms.forEach(f => f.querySelector('[data-search-hint]').textContent = '正文索引暂不可用 · 可搜索标题和摘要');
      });
    }
    forms.forEach(form => {
      const input = form.querySelector('input');
      input.addEventListener('focus', () => { refreshIndex(); preview(); });
      input.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); close(); });
      input.addEventListener('compositionend', () => { composing = false; change(input.value, input); });
      input.addEventListener('input', event => {
        clearTimeout(timer);
        form.querySelector('[data-search-clear]').hidden = !input.value;
        if (!event.isComposing && !composing) timer = setTimeout(() => change(input.value, input), 80);
      });
      // Native search cancellation (including the browser's clear affordance).
      input.addEventListener('search', () => { if (!composing) { clearTimeout(timer); change(input.value, input); } });
      form.querySelector('[data-search-clear]').addEventListener('click', () => { clearTimeout(timer); change('', input); input.value = ''; input.focus(); });
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (composing) return;
        clearTimeout(timer); change(input.value, input);
        document.querySelector('[data-filter="all"]').click();
        input.blur(); close();
        document.getElementById('blog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
      });
      input.addEventListener('keydown', event => {
        if (event.isComposing || composing || event.keyCode === 229) return;
        if (event.key === 'Escape') { event.preventDefault(); input.blur(); close(); }
        if (input !== navInput || panel.hidden) return;
        const options = [...list.querySelectorAll('[role="option"]')];
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
          event.preventDefault();
          active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
          options.forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
          navInput.setAttribute('aria-activedescendant', options[active].id);
          options[active].scrollIntoView({block:'nearest'});
        }
        if (event.key === 'Enter' && active >= 0) { event.preventDefault(); options[active].querySelector('a').click(); }
      });
    });
    // Keep touch/click navigation in the suggestions alive when the input loses focus.
    navbar.addEventListener('focusout', event => {
      if (event.relatedTarget) { if (!navbar.contains(event.relatedTarget)) close(); }
      else setTimeout(() => { if (!navbar.contains(document.activeElement)) close(); },200);
    });
    document.addEventListener('pointerdown', event => { if (!navbar.contains(event.target)) close(); });
    return {refresh: () => { onQuery(query.trim()); preview(); }};
  }
  globalThis.ChenCBlogSearch = {find, excerpt, highlight, connect};
})();
