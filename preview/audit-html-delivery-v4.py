"""Audit active local HTML and create an overlay update package for this website."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import Counter
import json, re, zipfile, hashlib

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIRS = ['posts', 'play', 'multi-book-qa', 'Free-Schedule-Query-System', 'obsidian-note-to-site', 'birthday', '违规外联阻断提示']
pages = sorted(ROOT.glob('*.html'))
for name in PUBLIC_DIRS:
    pages.extend(sorted((ROOT / name).rglob('*.html')))

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids, self.links = [], []
        self.feed(path.read_text(encoding='utf-8-sig'))
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'): self.ids.append(attrs['id'])
        for key in ['href', 'src']:
            if attrs.get(key): self.links.append((self.getpos()[0], attrs[key]))

parsed = {p.resolve(): Page(p) for p in pages}
broken, checked = [], 0
for page in pages:
    for line, value in parsed[page.resolve()].links:
        url = urlsplit(value)
        if url.scheme or url.netloc: continue
        checked += 1
        target = (ROOT / unquote(url.path.lstrip('/'))) if url.path.startswith('/') else (page.parent / unquote(url.path)) if url.path else page
        target = target.resolve()
        reason = ''
        if not target.exists(): reason = 'missing file'
        elif url.fragment and target.suffix.lower() == '.html':
            if target not in parsed: parsed[target] = Page(target)
            if unquote(url.fragment) not in parsed[target].ids: reason = 'missing anchor'
        if reason: broken.append({'page':str(page.relative_to(ROOT)), 'line':line, 'link':value, 'reason':reason})

about = (ROOT / 'about.html').read_text(encoding='utf-8')
data = json.loads(re.search(r'<script type="application/json" id="productData">([\s\S]*?)</script>', about).group(1))
for item in data:
    for key in ['href', 'secondaryHref']:
        value = item.get(key)
        if value and not urlsplit(value).scheme and not (ROOT / value).exists():
            broken.append({'product':item['id'], 'link':value, 'reason':'missing product entry'})
duplicate_ids = [name for name, count in Counter(parsed[(ROOT / 'about.html').resolve()].ids).items() if count > 1]
result = {'html_pages':len(pages), 'local_references':checked, 'broken':broken, 'profile_duplicate_ids':duplicate_ids, 'portfolio_products':len(data), 'categories':dict(Counter(p['category'] for p in data)), 'legacy_redirect':'products.html → about.html#portfolio', 'deployment':'local only'}
(ROOT / 'preview/local-html-audit-v4.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
assert not broken and not duplicate_ids, 'Local HTML audit failed.'

files = set(pages)
for directory in ['css', 'js']:
    files.update(p for p in (ROOT / directory).rglob('*') if p.is_file())
# This is an overlay update; large unchanged audio, models, downloads and private data stay in place.
image_suffixes = {'.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.ico', '.woff', '.woff2'}
files.update(p for p in (ROOT / 'assets').rglob('*') if p.is_file() and p.suffix.lower() in image_suffixes)
manifest = [{'path':p.relative_to(ROOT).as_posix(), 'bytes':p.stat().st_size, 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]
readme = '''ChenC 本地 HTML 与样式更新包 · 2026-10-02

解压到当前 ChengC.com 站点目录，保留目录层级并覆盖同名文件。
这是覆盖更新包，不是独立运行的完整站点备份。

包内包含全部当前公开 HTML、css/、js/ 与图片资源。
个人空间：about.html；作品介绍入口：about.html#portfolio。
首页：index.html；游戏：games.html；工具：tools.html。
products.html 保留为兼容跳转入口，旧分类锚点会接到个人页相应位置。

原目录中的音乐、模型、下载包、工具数据及其他未修改的资源继续使用。
未打包 Git、样例、历史预览、构建缓存或课表成员数据。
本轮只更新本地文件，未部署线上网站。

manifest.json 记录相对路径、文件大小与 SHA-256。
'''
destination = ROOT / 'preview/chenc-local-html-update-20261002.zip'
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as bundle:
    for path in sorted(files): bundle.write(path, path.relative_to(ROOT).as_posix())
    bundle.writestr('本地更新说明.txt', readme)
    bundle.writestr('manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
with zipfile.ZipFile(destination, 'r') as delivered:
    assert delivered.testzip() is None
    for item in manifest:
        assert hashlib.sha256(delivered.read(item['path'])).hexdigest() == item['sha256']
print(json.dumps({'package':str(destination), 'files':len(files), 'html_pages':len(pages), 'MiB':round(destination.stat().st_size/1048576,2)}, ensure_ascii=False))
