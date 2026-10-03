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
# The user revised scope: retain the original site framework and modules.
# Start from their exact original HTML, applying only local enhancements.
page = original.replace('<body>', '<body class="home-page">')
page = page.replace('<button class="brand" id="privateBtn" type="button" aria-label="打开个人保险箱">ChengC</button>', '<a class="brand" href="#main">ChengC</a>')
page = page.replace('<div class="hero-bg"></div><div class="hero-shade"></div>', '')
page = page.replace('<div class="avatar">C</div>', '<img class="avatar" src="assets/avatar.jpg" width="118" height="118" alt="ChengC 的个人头像">')
page = page.replace('<div id="postsContainer" class="posts-grid" aria-live="polite"></div>', '<div id="postsContainer" class="posts-grid">' + ''.join(post_markup(p) for p in posts) + '</div>')
page = page.replace('共 0 条', '共 6 条')
page = page.replace('class="toolbar"', 'class="toolbar js-only"')
page = page.replace('<span class="timeline-hint">上下滑动查看历史</span>', '<span class="timeline-hint">持续更新中</span>')
page = re.sub(r'<div class="timeline-scroll".*?</div></div></section>', '<div class="timeline">' + timeline + '</div><button class="text-button js-only" id="journalToggle" type="button" aria-expanded="false" aria-controls="journalHistory">查看全部动态 ↓</button></section>', page, flags=re.S)
page = re.sub(r'<div class="games-list">.*?</div></section>', '<div class="games-list">' + games + '</div></section>', page, flags=re.S)
page = page.replace('<div class="about-mark">C</div>', '<img class="about-mark" src="assets/avatar.jpg" width="120" height="120" alt="ChengC 的个人头像" loading="lazy">')
page = page.replace('<button id="backToTop"', '<button id="privateBtn" class="footer-top js-only" type="button" aria-haspopup="dialog">个人保险箱</button><button id="backToTop"')
page = page.replace('class="footer-top" type="button">回到顶部', 'class="footer-top js-only" type="button">回到顶部')
page = page.replace('assets/game-bg.jpg', 'assets/cangshan-erhai.webp', 1) # Social image only; game covers stay original.
page = re.sub(r'  <link rel="preconnect".*?<link rel="stylesheet" href="css/style.css">', '  <link rel="stylesheet" href="css/style.css"><script src="js/theme.js"></script>', page, flags=re.S)
page = page.replace('<a class="skip-link"', '<div class="landscape" aria-hidden="true"><div class="landscape-art" id="landscapeArt"></div><canvas id="water"></canvas><canvas id="particles"></canvas><div class="scene-shade"></div></div>\n<a class="skip-link"', 1)
page = page.replace('<div class="avatar">C</div>', '<img class="avatar" src="assets/avatar.jpg" width="118" height="118" alt="ChengC 的个人头像">')
page = page.replace('<a class="scroll-hint"', '<div class="scene-caption"><p>苍山 · 洱海<small id="sceneHint">点水拨动倒影 · 点山吹动云雾</small></p></div><a class="scroll-hint"')
private_start = page.index('<div id="privateOverlay"')
page = page[:private_start] + private + tools + '<script src="js/lake-projection.js"></script><script src="js/landscape.js"></script><script src="js/app.js"></script><script src="js/private.js"></script><script src="js/music.js"></script></body></html>\n'
(ROOT / 'index.html').write_text(page, encoding='utf-8')
app = (ROOT / 'preview/main-app.js').read_text(encoding='utf-8').replace('/* POST_DATA */', json.dumps(posts, ensure_ascii=False, indent=2))
(ROOT / 'js/app.js').write_text(app, encoding='utf-8')
oldcss = (BACKUP / 'css/style.css').read_text(encoding='utf-8-sig')
# Reuse original layout rules, eliminating false metadata and image overrides.
original_css = oldcss
original_css = re.sub(r'/\* Current downloadable build metadata \*/.*?/\* Blog card open/close interaction \*/', '/* Blog card open/close interaction */', original_css, flags=re.S)
original_css = re.sub(r'\.game-cover img\{content:url\(.*?\)\}', '', original_css)
original_css = re.sub(r'\.about-mark\{font-size:0;background:url\(.*?\) center 35%/cover no-repeat\}', '', original_css)
original_css = re.sub(r'\.avatar\{font-size:0;background:url\(.*?\) center 35%/cover no-repeat\}', '', original_css)
for old, new in [('177,92,255','218,234,228'), ('#b15cff','#cddfd6')]:
    original_css = original_css.replace(old, new)
style = original_css + '\n' + (ROOT / 'preview/glass-refinements-v2.css').read_text(encoding='utf-8')
(ROOT / 'css/style.css').write_text(style, encoding='utf-8')
shutil.copy2(ROOT / 'preview/assets/cangshan-erhai-realistic.webp', ROOT / 'assets/cangshan-erhai.webp')
shutil.copy2(ROOT / 'preview/lake-projection.js', ROOT / 'js/lake-projection.js')
scene = (ROOT / 'preview/scene-v8.js').read_text(encoding='utf-8')
scene = scene.replace("'a,button,input,.settings'", "'a,button,input,textarea,.settings,.site-body,.site-header,.music-panel,.music-mini,.modal-overlay'")
scene = scene.replace(".site-body,.site-header", ".section,footer,.site-header")
scene = scene.replace("document.querySelectorAll('a[href=\"#writing\"]')", "document.querySelectorAll('.nav-links a, a[href=\"#blog\"], a[href=\"#projects\"], .brand')")
scene = scene.replace(".observe(document.querySelector('.hero'))", ".observe(document.querySelector('.landscape'))")
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
    content = content.replace('<body class="article-page">', '<body class="article-page">\n  <div class="landscape" aria-hidden="true"><div class="landscape-art"></div><div class="scene-shade"></div></div>')
    path.write_text(content, encoding='utf-8')
print('Integrated local homepage and six article pages. Original files preserved in', BACKUP)
