"""Apply the requested ChenC brand and three homepage entrances; build two empty pages."""
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / 'preview/before-chenc-portals'
BACKUP.mkdir(exist_ok=True)

def save_before(path):
    target = BACKUP / path.relative_to(ROOT)
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

def write(path, text):
    if path.exists():
        save_before(path)
    path.write_text(text, encoding='utf-8')

# Public labels and generated article defaults. Existing storage keys and real hostnames
# stay compatible; archives are preserved as history instead of mass-renaming them.
names = ['index.html', 'products.html', 'js/app.js', 'multi-book-qa/index.html',
         'obsidian-note-to-site/main.js', 'obsidian-note-to-site/demo-mindmap.html',
         'obsidian-note-to-site/manifest.json', 'obsidian-note-to-site/package.json',
         'obsidian-note-to-site/README.md', 'preview/products-catalog.json',
         'preview/build-product-intro.py']
paths = [ROOT / name for name in names] + list((ROOT / 'posts').glob('*.html'))
for path in paths:
    old = path.read_text(encoding='utf-8-sig')
    text = old.replace('ChengC.com', 'ChenC').replace('ChengC', 'ChenC').replace('CHENGC', 'CHENC')
    if path.name in ['products.html', 'products-catalog.json']:
        text = text.replace('"chengc"', '"chenc"')
    if text != old:
        write(path, text)

index = ROOT / 'index.html'
page = index.read_text(encoding='utf-8')
original = page
assert '<div class="hero-actions">' in page
icons = {
    'tools': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7m-3.5-3.5v7"/></svg>',
    'blog': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h6a4 4 0 0 1 3 1.5A4 4 0 0 1 15 4h6v15h-6a4 4 0 0 0-3 1.5A4 4 0 0 0 9 19H3zM12 5.5v15"/></svg>',
    'games': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10a4 4 0 0 1 4 3.5l1 7a2 2 0 0 1-3.4 1.7L16 17H8l-2.6 2.2A2 2 0 0 1 2 17.5l1-7A4 4 0 0 1 7 7zM6 12h4m-2-2v4M16 11h.01M19 14h.01"/></svg>',
}
actions = '<div class="hero-actions">' + ''.join([
    f'<a class="button ghost portal-link" href="tools.html" data-animate>{icons["tools"]}<span>查看工具</span></a>',
    f'<a class="button primary portal-link" href="#blog" data-animate>{icons["blog"]}<span>阅读文章</span></a>',
    f'<a class="button ghost portal-link" href="games.html" data-animate>{icons["games"]}<span>试玩游戏</span></a>',
]) + '</div>'
page, count = re.subn(r'<div class="hero-actions">.*?</div>', actions, page, count=1, flags=re.S)
assert count == 1
page = page.replace('<a href="#projects">项目</a>', '<a href="tools.html" data-animate>工具</a><a href="games.html" data-animate>游戏</a>')
page, count = re.subn(r'<section class="section" id="projects">.*?</section>\s*', '', page, count=1, flags=re.S)
assert count == 1
page = page.replace('学习笔记、生活日志、项目作品与独立游戏下载。', '学习笔记、生活日志、实用工具与游戏作品。')
page = page.replace('<link rel="stylesheet" href="css/style.css">', '<link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/navigation.css">')
page = page.replace('<script src="js/app.js"></script>', '<script src="js/app.js"></script><script src="js/navigation.js"></script>')
write(index, page)

hello = ROOT / 'posts/hello-world.html'
text = hello.read_text(encoding='utf-8').replace('<a class="button primary" href="../index.html#projects">看看我的项目</a>', '<a class="button primary" href="../games.html">试玩游戏</a>')
write(hello, text)

for name in ['products.html', 'preview/products-catalog.json', 'preview/build-product-intro.py']:
    path = ROOT / name
    text = path.read_text(encoding='utf-8').replace('index.html#projects', 'game.html')
    write(path, text)

landscape = ROOT / 'js/landscape.js'
text = landscape.read_text(encoding='utf-8').replace('a[href="#projects"]', 'a[data-animate]')
write(landscape, text)

scene = re.search(r'<div class="landscape".*?</div></div>', page, re.S).group(0)
controls = page[page.index('  <div class="tools"'):page.index('<script src="js/lake-projection.js">')]
theme_button = re.search(r'<button id="themeToggle".*?</button>', page, re.S).group(0)
menu_button = re.search(r'<button class="menu-toggle".*?</button>', page, re.S).group(0)

for kind, title, kicker, lead, future, other_kind, other_title in [
    ('tools', '工具', 'TOOLS & IDEAS', '让日常，轻松一点。', '实用工具将在这里陆续更新。', 'games', '试玩游戏'),
    ('games', '游戏', 'PLAY & EXPLORE', '留一点时间，玩一会儿。', '游戏作品将在这里陆续更新。', 'tools', '查看工具'),
]:
    nav = ''.join(f'<a href="{href}" data-animate{current}>{label}</a>' for href, label, current in [
        ('tools.html', '工具', ' aria-current="page"' if kind == 'tools' else ''),
        ('index.html#blog', '文章', ''),
        ('games.html', '游戏', ' aria-current="page"' if kind == 'games' else ''),
    ])
    content = f'''<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title} · ChenC</title><meta name="description" content="ChenC 的{title}空间，内容即将更新。"><meta name="theme-color" content="#0b2431">
  <meta property="og:title" content="{title} · ChenC"><meta property="og:description" content="{lead}"><meta property="og:image" content="assets/cangshan-erhai.webp">
  <link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/navigation.css"><script src="js/theme.js"></script>
</head>
<body class="home-page collection-page {kind}-page">
{scene}
<a class="skip-link" href="#main">跳到主要内容</a>
<header class="site-header"><nav class="nav-shell" aria-label="主导航"><a class="brand" href="index.html" data-animate>ChenC</a>{menu_button}<div class="nav-links" id="navLinks">{nav}{theme_button}</div></nav></header>
<main id="main"><section class="hero collection-hero" aria-labelledby="collectionTitle"><div class="hero-content">
  <div class="collection-emblem" aria-hidden="true">{icons[kind]}</div><p class="eyebrow">{kicker}</p><h1 id="collectionTitle">{title}</h1><p class="hero-copy">{lead}</p>
  <div class="collection-content" id="{kind}Collection"><span class="collection-status">即将更新</span><p>{future}</p></div>
  <div class="hero-actions"><a class="button ghost portal-link" href="index.html" data-animate><span>返回首页</span></a><a class="button ghost portal-link" href="{other_kind}.html" data-animate>{icons[other_kind]}<span>{other_title}</span></a></div>
</div><div class="scene-caption"><p>苍山 · 洱海<small id="sceneHint">点水拨动倒影 · 点山吹动云雾</small></p></div></section></main>
<div class="collection-footer">© 2026 ChenC</div>
{controls}
<script src="js/lake-projection.js"></script><script src="js/landscape.js"></script><script src="js/collection.js"></script><script src="js/navigation.js"></script>
</body></html>
'''
    write(ROOT / f'{kind}.html', content)

print('Updated ChenC labels, removed the homepage projects section, and created tools.html / games.html without product content.')
