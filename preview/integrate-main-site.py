"""Integrate the approved landscape into the local main site, with original backups."""
from pathlib import Path
import re, json, shutil, html, hashlib

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / 'preview' / 'before-main-restructure'
files = ['index.html', 'css/style.css', 'js/app.js', 'js/private.js', 'js/music.js']
files += [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / 'posts').glob('*.html'))]
for name in files:
    target = BACKUP / name
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)

original = (BACKUP / 'index.html').read_text(encoding='utf-8-sig')
oldapp = (BACKUP / 'js/app.js').read_text(encoding='utf-8-sig')
rawposts = re.search(r'const DEFAULT_POSTS=(\[.*?\]);let', oldapp, re.S).group(1)
rawposts = re.sub(r'([,{])(\w+):', r'\1"\2":', rawposts).replace("'", '"')
posts = sorted(json.loads(rawposts), key=lambda p: p['date'], reverse=True)
private = original[original.index('<div id="privateOverlay"'):original.index('<script src="js/app.js"')]
private = private.replace('role="listbox"', 'role="list"')
private = private.replace('id="musicPanel" class="music-panel"', 'id="musicPanel" class="music-panel" hidden')
private = private.replace('id="musicMini" class="music-mini"', 'id="musicMini" class="music-mini" hidden')
private = private.replace('<span class="music-hint">选择歌曲</span>', '<button id="musicClose" class="panel-close" type="button" aria-label="关闭音乐播放器">×</button>')
timeline = re.search(r'<div class="timeline">(.*?)</div></div></section>', original, re.S).group(1)
items = re.findall(r'<article class="timeline-item">.*?</article>', timeline, re.S)
timeline = '\n'.join(items[:3]) + '\n<div id="journalHistory">' + '\n'.join(items[3:]) + '</div>'
games = re.search(r'<div class="games-list">(.*?)</div></section>', original, re.S).group(1)
games = games.replace('assets/game-cover.png', 'assets/game-bg.jpg')
games = games.replace('83.74 MB', '83.74 MiB')
for filename, oldsize, oldhash in [('spongebob-vs-zombie-fish-windows.zip', '20.00 MB', 'ED7FD173E4AF4DD51B63D38E6BB16E3907FC6A18A384499501C05C519AB2C488')]:
    data = (ROOT / 'downloads' / filename).read_bytes()
    digest = hashlib.sha256(data).hexdigest().upper()
    games = games.replace(oldsize, f'{len(data)/1024**2:.2f} MiB').replace(oldhash, digest)
    games = games.replace('ED7FD173E4AF…AB2C488', digest[:12] + '…' + digest[-8:])
games = games.replace('来自指定目录的原版 Windows 游戏程序，已单独打包供下载，不与本站原有游戏混淆。', '抖音来源的 Godot 4 游戏，提供独立的 Windows 下载包。')

def post_markup(p):
    esc = html.escape
    category = '学习' if p['category'] == 'study' else '生活'
    return f'''<article class="post-card"><a class="post-link" href="{esc(p['url'])}"><div class="post-top"><span class="post-tag tag-{p['category']}">{category}</span><time datetime="{p['date'].replace('/', '-')}">{p['date'].replace('/', '.')}</time></div><h3 class="post-title">{esc(p['title'])}</h3><p class="post-content">{esc(p['content'])}</p><span class="read-more">阅读全文 <span aria-hidden="true">↗</span></span></a></article>'''

preview = (ROOT / 'preview/cangshan-erhai.html').read_text(encoding='utf-8')
tools = preview[preview.index('  <div class="tools"'):preview.index('  <script>')]
tools = tools.replace('背景预览工具', '风景控制')
navicons = '''<button id="musicToggle" class="music-btn" type="button" aria-label="音乐播放器" aria-expanded="false" aria-controls="musicPanel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 18V5l11-2v13M9 6l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg></button><button id="themeToggle" class="theme-btn" type="button" aria-label="切换主题"><svg class="sun-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg><svg class="moon-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5z"/></svg></button>'''
page = f'''<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ChengC · 学习、生活与创作</title>
  <meta name="description" content="ChengC 的个人网站：记录学习与生活，分享实用工具、项目作品和独立游戏。">
  <meta name="theme-color" content="#0b2431">
  <meta property="og:title" content="ChengC · 学习、生活与创作"><meta property="og:description" content="山海之间，记录日常。学习笔记、生活故事与项目作品。"><meta property="og:image" content="assets/cangshan-erhai.webp">
  <link rel="stylesheet" href="css/style.css"><script src="js/theme.js"></script>
</head>
<body class="home-page">
<a class="skip-link" href="#main">跳到主要内容</a>
<div class="landscape" aria-hidden="true"><div class="landscape-art" id="landscapeArt"></div><canvas id="water"></canvas><canvas id="particles"></canvas><div class="scene-shade"></div></div>
<header class="site-header" id="top"><nav class="nav-shell" aria-label="主导航">
  <a class="brand" href="#main">ChengC<span aria-hidden="true">·</span></a>
  <button class="menu-toggle" id="menuToggle" type="button" aria-expanded="false" aria-controls="navLinks" aria-label="打开导航菜单"><span></span><span></span><span></span></button>
  <div class="nav-links" id="navLinks"><a href="#blog">博客</a><a href="#journal">日志</a><a href="#projects">项目</a><a href="#about">关于</a><div class="nav-utilities">{navicons}</div></div>
</nav></header>
<main id="main">
  <section class="hero" aria-labelledby="heroTitle"><div class="hero-content"><p class="eyebrow">学习 · 生活 · 创作</p><h1 id="heroTitle">ChengC</h1><p class="hero-line">山海之间，记录日常。</p><p class="hero-copy">记录灵感、生活与创造过程，<br>也把做出来的游戏分享给每一位玩家。</p><div class="hero-actions"><a class="button primary" href="#blog">阅读文章</a><a class="button ghost" href="#projects">查看项目 <span aria-hidden="true">↗</span></a></div></div><div class="scene-caption"><span class="scene-number">01 /</span><p>苍山 · 洱海<small id="sceneHint">点水拨动倒影 · 点山吹动云雾</small></p></div><a class="scroll-link" href="#blog">向下阅读 <span aria-hidden="true">↓</span></a>{tools}</section>
  <div class="site-body">
  <section class="section" id="blog" aria-labelledby="blogTitle"><div class="section-heading"><div><p class="section-kicker">01 / WRITING</p><h2 id="blogTitle">最近写下的</h2><p class="section-description">学习的痕迹，也有生活的回声。</p></div><span class="post-count" id="postCount" aria-live="polite">共 6 条</span></div><div class="toolbar js-only"><label class="search-box"><span class="sr-only">搜索记录</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="searchInput" type="search" placeholder="搜索标题或内容…"></label><div class="filters" role="group" aria-label="按分类筛选"><button type="button" class="filter-btn active" data-filter="all" aria-pressed="true">全部</button><button type="button" class="filter-btn" data-filter="study" aria-pressed="false">学习</button><button type="button" class="filter-btn" data-filter="life" aria-pressed="false">生活</button></div></div><div id="postsContainer" class="posts-grid">{''.join(post_markup(p) for p in posts)}</div><noscript><p class="section-description">文章与项目可直接访问；搜索和动态控制需要启用 JavaScript。</p></noscript></section>
  <section class="section journal-section" id="journal" aria-labelledby="journalTitle"><div class="section-heading"><div><p class="section-kicker">02 / JOURNAL</p><h2 id="journalTitle">最近动态</h2><p class="section-description">一些进展，一些值得记住的小事。</p></div><span class="timeline-hint">持续更新中</span></div><div class="timeline">{timeline}</div><button class="text-button js-only" id="journalToggle" type="button" aria-expanded="false" aria-controls="journalHistory">查看全部动态 <span aria-hidden="true">↓</span></button></section>
  <section class="section" id="projects" aria-labelledby="projectsTitle"><div class="section-heading"><div><p class="section-kicker">03 / PROJECTS</p><h2 id="projectsTitle">从想法，到作品</h2><p class="section-description">为日常做的工具，为好奇心做的游戏。</p></div></div><div class="tools-grid"><article class="project-tool"><div class="project-symbol" aria-hidden="true">问</div><div class="badges"><span>学习工具</span><span>浏览器运行</span></div><h3>多书知识问答台</h3><p>把六本书的知识点串起来，用语义检索找到答案，也找到答案的出处。</p><div class="project-links"><a class="button primary" href="multi-book-qa/index.html">打开问答台 ↗</a><a class="text-link" href="posts/multi-book-qa.html">读开发记录 →</a></div></article><article class="project-tool"><div class="project-symbol" aria-hidden="true">课</div><div class="badges"><span>实用工具</span><span>MIT 开源</span></div><h3>空课查询系统</h3><p>选择周数、星期与课节，查询空课名单，让组织排班少一点重复工作。</p><div class="project-links"><a class="button primary" href="Free-Schedule-Query-System/index.html">打开查询工具 ↗</a><a class="text-link" href="posts/schedule-query.html">文档与下载 →</a></div></article></div><div class="project-subhead"><h3>独立游戏</h3><span>在线试玩与 Windows 下载</span></div><div class="games-list">{games}</div></section>
  <section class="section about-section" id="about" aria-labelledby="aboutTitle"><div class="about-card"><img class="about-photo" src="assets/avatar.jpg" width="144" height="144" alt="ChengC 的个人头像" loading="lazy"><div><p class="section-kicker">04 / ABOUT</p><h2 id="aboutTitle">你好，我是 ChengC。</h2><p>这里是我的数字花园。我会记录正在学习的知识、生活中的小事，以及从想法到成品的创作过程。希望这些内容和作品也能给你一点灵感。</p><div class="about-links"><a class="text-link" href="#blog">看看我写的 →</a><a class="text-link" href="#projects">看看我做的 →</a></div></div></div></section>
  <footer class="site-footer"><p>© 2026 ChengC · 用好奇心持续创造</p><div class="footer-actions"><button id="privateBtn" class="footer-top js-only" type="button" aria-haspopup="dialog">个人保险箱</button><button id="backToTop" class="footer-top js-only" type="button">回到顶部 ↑</button><a href="#main" class="no-js-only">回到顶部 ↑</a></div></footer>
  </div>
</main>
{private}
<script src="js/lake-projection.js"></script><script src="js/landscape.js"></script><script src="js/app.js"></script><script src="js/private.js"></script><script src="js/music.js"></script>
</body></html>
'''
(ROOT / 'index.html').write_text(page, encoding='utf-8')
app = (ROOT / 'preview/main-app.js').read_text(encoding='utf-8').replace('/* POST_DATA */', json.dumps(posts, ensure_ascii=False, indent=2))
(ROOT / 'js/app.js').write_text(app, encoding='utf-8')
oldcss = (BACKUP / 'css/style.css').read_text(encoding='utf-8-sig')
retained = oldcss[oldcss.index('/* Full article page */'):]
for old, new in [('177,92,255', '108,178,158'), ('#b15cff', '#83baa5')]:
    retained = retained.replace(old, new)
style = (ROOT / 'preview/main-style.css').read_text(encoding='utf-8')
style += '\n' + retained + '\n/* Article and music refinements */\n'
style += '.article-page .brand{background:none;color:var(--text)}.article-shell{padding-top:130px}.article-header h1{font-size:clamp(34px,6vw,64px);line-height:1.3;background:none;color:var(--text);letter-spacing:-.025em}.article-body{overflow-wrap:anywhere}.article-body table{display:block;max-width:100%;overflow-x:auto}.article-source{display:inline-flex;margin:18px auto 0;padding:9px 14px;border:1px solid var(--border);border-radius:5px;color:var(--accent);font-size:13px}.music-item button{display:block;width:100%;text-align:left;padding:10px 12px;background:none;border:0;color:inherit;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.music-item{padding:0}.music-mini{z-index:1150}.music-mini button{min-width:32px;min-height:32px}.article-footer{width:100%;padding-bottom:0}.private-modal{max-height:calc(100svh - 40px);overflow:auto}\n'
(ROOT / 'css/style.css').write_text(style, encoding='utf-8')
shutil.copy2(ROOT / 'preview/assets/cangshan-erhai-realistic.webp', ROOT / 'assets/cangshan-erhai.webp')
shutil.copy2(ROOT / 'preview/lake-projection.js', ROOT / 'js/lake-projection.js')
scene = (ROOT / 'preview/scene-v8.js').read_text(encoding='utf-8')
scene = scene.replace("'a,button,input,.settings'", "'a,button,input,textarea,.settings,.site-body,.site-header,.music-panel,.music-mini,.modal-overlay'")
scene = scene.replace("document.querySelectorAll('a[href=\"#writing\"]')", "document.querySelectorAll('.nav-links a, a[href=\"#blog\"], a[href=\"#projects\"], .brand')")
(ROOT / 'js/landscape.js').write_text(scene, encoding='utf-8')
vault = (BACKUP / 'js/private.js').read_text(encoding='utf-8-sig')
vault = vault.replace("document.body.classList.add('modal-open');", "document.body.classList.add('modal-open');\n    document.querySelector('main').inert = true;\n    document.querySelector('.site-header').inert = true;")
vault = vault.replace("document.body.classList.remove('modal-open');", "document.body.classList.remove('modal-open');\n    document.querySelector('main').inert = false;\n    document.querySelector('.site-header').inert = false;")
vault = vault.replace("if (event.key === 'Escape' && !overlay.classList.contains('hidden')) closePrivate();", """if (overlay.classList.contains('hidden')) return;
    if (event.key === 'Escape') { event.preventDefault(); closePrivate(); return; }
    if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll('button,input,textarea,a[href],[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }""")
(ROOT / 'js/private.js').write_text(vault, encoding='utf-8')
music = (BACKUP / 'js/music.js').read_text(encoding='utf-8-sig')
music = music.replace("li.textContent = s.title;\n    li.setAttribute('role', 'option');\n    li.addEventListener('click', () => playSong(i));", """const button = document.createElement('button');
    button.type = 'button';
    button.textContent = s.title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => playSong(i));
    li.appendChild(button);""")
music = music.replace("Array.prototype.forEach.call(list.children, (li, i) => li.classList.toggle('active', i === index));", """Array.prototype.forEach.call(list.children, (li, i) => {
      li.classList.toggle('active', i === index);
      li.querySelector('button').setAttribute('aria-pressed', String(i === index));
    });""")
music = music.replace("mini.classList.toggle('show', visible);", "mini.hidden = !visible;\n    mini.classList.toggle('show', visible);")
music = music.replace("panelOpen = next;", "panelOpen = next;\n    panel.hidden = !next;\n    toggle.setAttribute('aria-expanded', String(next));")
music = music.replace("if (index >= 0) stop();\n    else setPanelOpen(!panelOpen);", "setPanelOpen(!panelOpen);")
music = music.replace("miniPrev.addEventListener('click', prev);", """$('musicClose').addEventListener('click', () => { setPanelOpen(false); toggle.focus(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panelOpen) { setPanelOpen(false); toggle.focus(); }
  });
  miniPrev.addEventListener('click', prev);""")
(ROOT / 'js/music.js').write_text(music, encoding='utf-8')
for path in (ROOT / 'posts').glob('*.html'):
    content = (BACKUP / path.relative_to(ROOT)).read_text(encoding='utf-8-sig')
    content = content.replace('../multi-book-qa.html', '../multi-book-qa/index.html')
    content = re.sub(r'<script>\s*const saved=localStorage.*?</script>', '<script src="../js/theme.js"></script>', content, flags=re.S)
    # Load theme before paint; the same script also wires the article button at DOM ready.
    content = content.replace('<script src="../js/theme.js"></script>', '')
    content = content.replace('</head>', '  <script src="../js/theme.js"></script>\n</head>')
    path.write_text(content, encoding='utf-8')
print('Integrated local homepage and six article pages. Original files preserved in', BACKUP)
