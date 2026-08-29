const STORAGE_KEY = 'chengc_posts';
let currentFilter = 'all';
let posts = [];

function loadPosts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    posts = Array.isArray(parsed) ? parsed.filter(post => (
      post && typeof post === 'object' &&
      typeof post.id === 'string' &&
      typeof post.title === 'string' &&
      typeof post.content === 'string' &&
      typeof post.date === 'string' &&
      ['study', 'life'].includes(post.category)
    )) : [];
  } catch (error) {
    console.warn('记录数据无法读取，已使用空列表。', error);
    posts = [];
  }
}

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error('记录保存失败，请检查浏览器存储空间。', error);
    alert('保存失败：浏览器存储空间可能已满。');
  }
}

function getFilteredPosts() {
  if (currentFilter === 'all') return posts;
  return posts.filter(p => p.category === currentFilter);
}

function renderPosts() {
  const container = document.getElementById('postsContainer');
  const filtered = getFilteredPosts();
  const countEl = document.getElementById('postCount');

  countEl.textContent = `共 ${filtered.length} 条`;

  if (filtered.length === 0) {
    const message = currentFilter === 'all' ? '还没有任何记录' : '这个分类暂无记录';
    container.innerHTML = `<div class="empty-state"><strong>${message}</strong><p>点击“写记录”，留下此刻的想法。</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(post => `
    <div class="post-card" data-id="${post.id}">
      <div class="post-tags">
        <span class="post-tag tag-${post.category}">${post.category === 'study' ? '学习' : '生活'}</span>
      </div>
      <div class="post-date">${post.date}</div>
      <div class="post-title">${escapeHtml(post.title)}</div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-actions">
        <button class="delete-btn" type="button" data-delete-id="${escapeHtml(String(post.id))}" aria-label="删除《${escapeHtml(post.title)}》">删除</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addPost(title, category, content) {
  const post = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title.trim(),
    category,
    content: content.trim(),
    date: new Date().toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }),
    timestamp: Date.now()
  };
  posts.unshift(post);
  savePosts();
  renderPosts();
}

function deletePost(id) {
  if (!confirm('确定要删除吗？')) return;
  posts = posts.filter(p => p.id !== id);
  savePosts();
  renderPosts();
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
  });
  renderPosts();
}

// Theme
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  if (saved === 'light' || (!saved && prefersLight)) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
});

// Modal
const modalOverlay = document.getElementById('modalOverlay');
const titleInput = document.getElementById('title');
let lastFocusedElement = null;

function openModal() {
  lastFocusedElement = document.activeElement;
  modalOverlay.classList.remove('hidden');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => titleInput.focus());
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (lastFocusedElement) lastFocusedElement.focus();
}

document.getElementById('writeBtn').addEventListener('click', () => {
  openModal();
});

document.getElementById('modalClose').addEventListener('click', () => {
  closeModal();
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
});

document.getElementById('postForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const category = document.getElementById('category').value;
  const content = document.getElementById('content').value;
  if (!title || !content) return;
  addPost(title, category, content);
  this.reset();
  closeModal();
});

document.getElementById('postsContainer').addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-id]');
  if (button) deletePost(button.dataset.deleteId);
});

document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', function() {
    setFilter(this.dataset.filter);
  });
});

initTheme();
loadPosts();
renderPosts();
