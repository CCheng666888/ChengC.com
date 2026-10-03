"""Build the reviewed work galleries and personal page without changing home layout."""
from pathlib import Path
from html import escape
import hashlib
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / 'preview/before-work-galleries'
BACKUP.mkdir(exist_ok=True)
for name in ['index.html', 'games.html', 'tools.html', 'js/collection.js', 'js/landscape.js']:
    destination = BACKUP / name
    if not destination.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, destination)

copies = [
    (ROOT.parent / '大明风华录/release/大明风华录-v2.1.0-网页版.html', ROOT / 'play/mingchronicles.html'),
    (ROOT.parent / '羽毛球/dist/羽境-1.3.2.html', ROOT / 'play/yujing.html'),
]
for source, destination in copies:
    destination.parent.mkdir(exist_ok=True)
    shutil.copy2(source, destination)
    assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(destination.read_bytes()).digest()

plugin_files = ['manifest.json', 'main.js', 'styles.css', 'README.md']
plugin_zip = ROOT / 'downloads/note-to-site-v1.1.0.zip'
with zipfile.ZipFile(plugin_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in plugin_files:
        archive.write(ROOT / 'obsidian-note-to-site' / name, 'note-to-site/' + name)
with zipfile.ZipFile(plugin_zip) as archive:
    assert archive.testzip() is None

catalog = {item['id']: item for item in json.loads((ROOT / 'preview/products-catalog.json').read_text(encoding='utf-8-sig'))}
games = [dict(catalog[key]) for key in ['ming', 'badminton', 'fish', 'defense']]
tools = [dict(catalog[key]) for key in ['qa', 'notes']]
games[0].update(version='v2.1.0 · 网页游戏', status='可直接试玩', href='play/mingchronicles.html', cta='开始试玩',
    description='从元末明初出发，在单人大战略中统筹钱粮、任命文武、经营辖区与调兵征战。另有靖难与秦篇剧本，体验不同的历史路线。',
    features=['40 个战略辖区', '建设、科研与调兵', '历史事件与多剧本'], note='历史疆界与数值为游戏化设计，作品仍在持续完善。')
games[1].update(version='v1.3.2 · 网页游戏', status='可直接试玩', href='play/yujing.html', cta='开始试玩',
    features=['故事 / 冒险双模式', '移动、跳跃与扣杀', '键盘与触屏操作'], note='建议横屏游玩；故事模式包含剧情比分设计。')
games[2].update(features=['网页直接试玩', 'Windows 版可下载', '挑战更高分数'], note='同人小游戏。')
games[3].update(image='assets/products/defense-cover-v1.png', generated=True,
    features=['海底主题塔防', '布置伙伴', '挑战多波敌人'], note='同人塔防作品，在独立游戏网站打开。')
tools[0].update(image='assets/products/qa-cover-v1.png', generated=True,
    features=['6 本教材', '326 条知识点', '语义检索与出处引用'], note='首次使用需加载语义模型；答案来自已收录的知识点。')
tools[1].update(image='assets/products/notes-cover-v1.png', generated=True, status='可下载插件',
    href='downloads/note-to-site-v1.1.0.zip', cta='下载插件', primaryDownload=True,
    features=['笔记转文章 HTML', '导语与正文大纲', '彩色思维导图'],
    note='解压后将 note-to-site 文件夹放到笔记库的 .obsidian/plugins/ 中，再在 Obsidian 中启用。')

def anchor(href, label, primary=False, download=False):
    attributes = ' download' if download else (' target="_blank" rel="noopener noreferrer"' if href.startswith('https://') else ' data-animate')
    return f'<a class="button {"primary" if primary else "ghost secondary"} portal-link" href="{escape(href)}"{attributes}><span>{escape(label)}</span></a>'

def card(item, index, total):
    cover = escape(item['image'])
    actions = anchor(item['href'], item['cta'], True, item.get('primaryDownload', False))
    if item.get('secondaryHref'):
        actions += anchor(item['secondaryHref'], item['secondaryLabel'], download=item.get('download', False))
    features = ''.join(f'<li>{escape(text)}</li>' for text in item['features'])
    caption = '<figcaption>概念封面</figcaption>' if item.get('generated') else ''
    return f'''<article class="work-card" data-title="{escape(item['name'])}" role="group" aria-label="{index + 1} / {total}：{escape(item['name'])}">
      <figure class="work-art" style="--cover:url('../{cover}')"><img src="{cover}" alt="{escape(item['name'])}的封面" width="1600" height="900" loading="{'eager' if index == 0 else 'lazy'}" draggable="false">{caption}</figure>
      <div class="work-copy"><div class="work-meta"><span>{escape(item['version'])}</span><span>{escape(item['status'])}</span></div>
        <h2>{escape(item['name'])}</h2><p class="work-tagline">{escape(item['tagline'])}</p><p class="work-description">{escape(item['description'])}</p>
        <ul class="work-features">{features}</ul><div class="work-actions">{actions}</div><p class="work-note">{escape(item['note'])}</p>
      </div></article>'''

def gallery(kind, items):
    title = '游戏' if kind == 'games' else '工具'
    label = 'GAMES & PLAY' if kind == 'games' else 'TOOLS & IDEAS'
    total = len(items) + 1
    cards = '\n'.join(card(item, index, total) for index, item in enumerate(items))
    cards += f'''<article class="work-card coming-card" data-title="即将更新，敬请期待" role="group" aria-label="{total} / {total}：即将更新，敬请期待">
      <div class="work-art coming-art" aria-hidden="true"><span class="coming-symbol">＋</span></div>
      <div class="work-copy"><div class="work-meta"><span>COMING SOON</span></div><h2>即将更新<span>敬请期待</span></h2><p class="work-description">新的{'游戏' if kind == 'games' else '工具'}，正在慢慢成形。<br>下次来，或许就会有新的发现。</p></div></article>'''
    titles = [item['name'] for item in items] + ['即将更新，敬请期待']
    dots = ''.join(f'<button class="carousel-dot" type="button" data-work-index="{index}" aria-label="查看{text}" aria-pressed="{str(index == 0).lower()}"></button>' for index, text in enumerate(titles))
    return f'''<main id="main" class="showcase-main"><section aria-labelledby="collectionTitle">
      <div class="showcase-head"><div><p class="eyebrow">{label}</p><h1 id="collectionTitle">{'一点好玩的想法。' if kind == 'games' else '让日常，轻松一点。'}</h1></div><p>{len(items)} 款{'游戏' if kind == 'games' else '工具'} · ChenC 的创作<br>左右滑动，逐个发现</p></div>
      <div class="carousel-track" id="workTrack" tabindex="0" role="region" aria-label="{title}横向滑动窗口">{cards}</div>
      <div class="carousel-controls"><p class="carousel-position" id="workPosition" role="status" aria-live="polite" aria-atomic="true">01 / {total:02d} · {escape(items[0]['name'])}</p>
        <div class="carousel-navigation" hidden><div class="carousel-dots" aria-label="选择作品">{dots}</div><div class="carousel-buttons">
          <button class="carousel-button" id="workPrevious" type="button" aria-label="上一个作品" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>
          <button class="carousel-button" id="workNext" type="button" aria-label="下一个作品"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>
        </div></div></div><span id="sceneHint" hidden>点水拨动倒影 · 点山吹动云雾</span></section></main>'''

templates = {name: (BACKUP / name).read_text(encoding='utf-8-sig') for name in ['games.html', 'tools.html']}
for kind, items in [('games', games), ('tools', tools)]:
    html = templates[kind + '.html']
    html = html.replace('collection-page ', 'collection-page showcase-page ')
    html = html.replace('<script src="js/theme.js">', '<link rel="stylesheet" href="css/showcase.css"><script src="js/theme.js">')
    html = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="ChenC 的{len(items)}款{"游戏" if kind == "games" else "工具"}作品，左右滑动查看介绍与封面。">', html)
    html = re.sub(r'<main id="main">.*?</main>', gallery(kind, items), html, flags=re.S)
    other = anchor('tools.html' if kind == 'games' else 'games.html', '查看工具' if kind == 'games' else '试玩游戏')
    footer = f'<footer class="showcase-footer"><p>© 2026 ChenC · 用好奇心持续创造</p><div><a href="index.html" data-animate>返回首页</a> · <a href="{"tools.html" if kind == "games" else "games.html"}" data-animate>{"查看工具" if kind == "games" else "试玩游戏"}</a></div></footer>'
    html = html.replace('<div class="collection-footer">© 2026 ChenC</div>', footer)
    html = html.replace('<script src="js/navigation.js">', '<script src="js/carousel.js"></script><script src="js/navigation.js">')
    (ROOT / (kind + '.html')).write_text(html, encoding='utf-8')

home = (ROOT / 'index.html').read_text(encoding='utf-8-sig')
if 'css/showcase.css' not in home:
    home = home.replace('<script src="js/theme.js">', '<link rel="stylesheet" href="css/showcase.css"><script src="js/theme.js">')
home = home.replace('<a class="brand" href="#main">ChenC</a>', '<button class="brand private-brand js-only" id="privateBtn" type="button" aria-haspopup="dialog">ChenC</button><noscript><a class="brand" href="#main">ChenC</a></noscript>')
home = home.replace('<button id="privateBtn" class="footer-top js-only" type="button" aria-haspopup="dialog">个人保险箱</button>', '')
home = home.replace('<h2>关于 ChenC</h2>', '<h2><a class="about-profile-link" href="about.html" data-animate>关于 ChenC<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M7 6h11v11"/></svg></a></h2>')
(ROOT / 'index.html').write_text(home, encoding='utf-8')

profile = templates['tools.html']
profile = profile.replace('<title>工具 · ChenC</title>', '<title>关于 ChenC · 个人空间</title>')
profile = profile.replace('collection-page tools-page', 'collection-page profile-page')
profile = profile.replace('<script src="js/theme.js">', '<link rel="stylesheet" href="css/showcase.css"><script src="js/theme.js">')
profile = profile.replace(' data-animate aria-current="page"', ' data-animate')
profile = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="关于 ChenC：记录学习与生活，分享从想法到成品的创作过程。">', profile)
profile = profile.replace('<meta property="og:title" content="工具 · ChenC">', '<meta property="og:title" content="关于 ChenC · 个人空间">')
profile = profile.replace('<meta property="og:description" content="让日常，轻松一点。">', '<meta property="og:description" content="学习、生活与创造，在这里相遇。">')
profile_main = '''<main id="main" class="profile-main"><section class="profile-card" aria-labelledby="profileTitle">
  <img class="profile-portrait" src="assets/avatar.jpg" width="240" height="300" alt="ChenC 的个人头像">
  <div><p class="eyebrow">ABOUT ME</p><h1 id="profileTitle">ChenC</h1><p class="profile-lead">学习、生活与创造，<br>在这里相遇。</p><p class="profile-copy">这里是我的数字花园。我会记录正在学习的知识、生活中的小事，以及从想法到成品的创作过程。希望这些内容和作品也能给你一点灵感。</p>
  <div class="profile-actions"><a class="button ghost portal-link" href="tools.html" data-animate><span>查看工具</span></a><a class="button ghost portal-link" href="index.html#blog" data-animate><span>阅读文章</span></a><a class="button ghost portal-link" href="games.html" data-animate><span>试玩游戏</span></a></div></div></section>
  <section class="profile-interests" aria-label="我在记录什么"><div><h2>学习</h2><p>把正在理解的知识整理成笔记，也试着做成更顺手的工具。</p></div><div><h2>生活</h2><p>留住日常里的小事，记录支教、乡村实践与一路遇到的故事。</p></div><div><h2>创造</h2><p>从一个想法出发，一点点做成作品，再把游戏分享给每一位玩家。</p></div></section><span id="sceneHint" hidden>点水拨动倒影 · 点山吹动云雾</span></main>'''
profile = re.sub(r'<main id="main">.*?</main>', profile_main, profile, flags=re.S)
profile = profile.replace('<div class="collection-footer">© 2026 ChenC</div>', '<footer class="showcase-footer"><p>© 2026 ChenC · 用好奇心持续创造</p><a href="index.html" data-animate>返回首页</a></footer>')
(ROOT / 'about.html').write_text(profile, encoding='utf-8')
(ROOT / 'preview/work-galleries-catalog.json').write_text(json.dumps({'games': games, 'tools': tools, 'comingSoonCards': 2}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Built games.html (4 games + coming soon), tools.html (2 tools + coming soon), about.html; homepage entry links updated.')
