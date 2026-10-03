(() => {
  'use strict';
  const STORAGE_KEY = 'chengc_posts';
  const DEFAULT_POSTS = [
  {
    "id": "multi-book-qa",
    "title": "我把 6 本书的知识点，做成了一个离线问答台",
    "category": "study",
    "content": "一个多书语义问答：6 本书 326 条知识点，语义检索 + 引用溯源，语义引擎随站托管、打开即用，回答每句都能找到出处。",
    "date": "2026/09/22",
    "builtin": true,
    "url": "posts/multi-book-qa.html"
  },
  {
    "id": "linux-commands",
    "title": "Linux 命令速查：增删查改，一篇讲清楚",
    "category": "study",
    "content": "整理 WSL / Linux 终端里最常用的文件操作命令，按查、增、改、删四类分类，每条都配了人话解释，附 nano 与 vi 编辑器用法。",
    "date": "2026/09/18",
    "builtin": true,
    "url": "posts/linux-commands.html"
  },
  {
    "id": "schedule-query",
    "title": "我开源了一个「空课查询系统」",
    "category": "study",
    "content": "一个纯前端的空课查询网页，支持课节多选、全天交集与值班表，选择周数、星期、课节即可查看该时段有空的干事与干部名单，MIT 开源。",
    "date": "2026/09/14",
    "builtin": true,
    "url": "posts/schedule-query.html"
  },
  {
    "id": "summer-support-teaching",
    "title": "我的“三下乡”丨岁月留夏韵，支教启新程",
    "category": "life",
    "content": "七日乡村支教里，少儿编程启蒙、红色诗歌朗诵和文艺展演串起了一段双向成长的青春记忆。",
    "date": "2026/08/13",
    "builtin": true,
    "url": "posts/summer-support-teaching.html"
  },
  {
    "id": "painting-the-countryside",
    "title": "我的“三下乡”丨以丹青妆乡野，以热爱润童心",
    "category": "life",
    "content": "从支教课堂到“和美石章”墙绘，再到雨中的文艺展演，一次乡村实践记录了陪伴、协作与成长。",
    "date": "2026/07/24",
    "builtin": true,
    "url": "posts/painting-the-countryside.html"
  },
  {
    "id": "hello-world",
    "title": "Hello World",
    "category": "life",
    "content": "你好，世界！欢迎来到 ChengC 的网站。这是我的第一篇博客，也是这个数字空间正式启程的记录。",
    "date": "2026/06/19",
    "builtin": true,
    "url": "posts/hello-world.html"
  }
];
  let currentFilter = 'all', searchQuery = '', posts = [];
  const $ = id => document.getElementById(id);
  function loadPosts() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const local = Array.isArray(data) ? data.filter(p => p && typeof p.id === 'string' && typeof p.title === 'string' && typeof p.content === 'string' && typeof p.date === 'string' && ['study', 'life'].includes(p.category)) : [];
      // Built-in entries always retain their canonical destinations. Local records stay intact.
      const custom = local.filter(p => !DEFAULT_POSTS.some(d => d.id === p.id));
      posts = [...custom, ...DEFAULT_POSTS];
    } catch { posts = [...DEFAULT_POSTS]; }
  }
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function destination(post) {
    if (typeof post.url !== 'string' || !post.url.trim()) return '';
    try {
      const url = new URL(post.url, location.href);
      return ['http:', 'https:', 'file:'].includes(url.protocol) ? post.url : '';
    } catch { return ''; }
  }
  function renderPosts() {
    const shown = posts.filter(p => (currentFilter === 'all' || p.category === currentFilter) && (!searchQuery || `${p.title} ${p.content}`.toLowerCase().includes(searchQuery))).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    $('postCount').textContent = `共 ${shown.length} 条`;
    if (!shown.length) {
      $('postsContainer').innerHTML = '<div class="empty-state"><strong>没有找到匹配记录</strong><p>换个关键词或分类试试。</p></div>';
      return;
    }
    $('postsContainer').innerHTML = shown.map(p => {
      const url = destination(p), id = escapeHtml(p.id), title = escapeHtml(p.title);
      const info = `<div class="post-top"><span class="post-tag tag-${p.category}">${p.category === 'study' ? '学习' : '生活'}</span><time>${escapeHtml(p.date.replaceAll('/', '.'))}</time></div><h3 class="post-title">${title}</h3><p class="post-content" id="content-${id}">${escapeHtml(p.content)}</p>`;
      const body = url ? `<a class="post-link" href="${escapeHtml(url)}">${info}<span class="read-more">阅读全文 <span aria-hidden="true">↗</span></span></a>` : `<div class="local-post">${info}<button class="text-button" type="button" data-expand="${id}" aria-expanded="false" aria-controls="content-${id}">展开全文 ↓</button></div>`;
      return `<article class="post-card" data-post-id="${id}">${body}${p.builtin ? '' : `<div class="post-actions"><button class="delete-btn" type="button" data-delete-id="${id}" aria-label="删除《${title}》">删除</button></div>`}</article>`;
    }).join('');
  }
  document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => {
      const active = b.dataset.filter === currentFilter;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    renderPosts();
  }));
  $('searchInput').addEventListener('input', event => { searchQuery = event.target.value.trim().toLowerCase(); renderPosts(); });
  $('postsContainer').addEventListener('click', event => {
    const expand = event.target.closest('[data-expand]');
    if (expand) {
      const open = expand.closest('.post-card').classList.toggle('expanded');
      expand.setAttribute('aria-expanded', String(open));
      expand.textContent = open ? '收起全文 ↑' : '展开全文 ↓';
    }
    const remove = event.target.closest('[data-delete-id]');
    if (!remove || !confirm('确定要删除这条记录吗？')) return;
    const next = posts.filter(p => p.id !== remove.dataset.deleteId || p.builtin);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); posts = next; renderPosts(); }
    catch { alert('保存失败：浏览器存储不可用或空间已满。'); }
  });
  const menu = $('menuToggle'), links = $('navLinks');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  }
  menu.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && links.classList.contains('open')) { setMenu(false); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.nav-shell')) setMenu(false); });
  $('backToTop').addEventListener('click', () => scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
  const header = document.querySelector('.site-header');
  const refreshHeader = () => header.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', refreshHeader, {passive:true}); refreshHeader();
  loadPosts(); renderPosts();
})();
