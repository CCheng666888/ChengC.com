"""Check active navigation targets, including fragments after removing #projects."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.ids = set()
        self.links = []
        self.feed(path.read_text(encoding='utf-8-sig'))
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        for attr in ['href', 'src']:
            if attrs.get(attr):
                self.links.append((self.getpos()[0], attrs[attr]))

pages = [ROOT / name for name in ['index.html', 'tools.html', 'games.html', 'about.html', 'products.html']] + sorted((ROOT / 'posts').glob('*.html'))
parsed = {path.resolve(): Page(path) for path in pages}
broken = []
checked = 0
for path in pages:
    for line, href in parsed[path.resolve()].links:
        url = urlsplit(href)
        if url.scheme or url.netloc:
            continue
        checked += 1
        target = (ROOT / unquote(url.path.lstrip('/'))) if url.path.startswith('/') else (path.parent / unquote(url.path)) if url.path else path
        target = target.resolve()
        reason = ''
        if not target.exists():
            reason = 'missing file'
        elif url.fragment and target.suffix == '.html':
            if target not in parsed:
                parsed[target] = Page(target)
            if unquote(url.fragment) not in parsed[target].ids:
                reason = 'missing anchor'
        if reason:
            broken.append({'file':str(path.relative_to(ROOT)), 'line':line, 'href':href, 'reason':reason})
result = {'pages':len(pages), 'local_links':checked, 'broken':broken}
(ROOT / 'preview/portal-link-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
assert not broken, 'Navigation audit failed.'
