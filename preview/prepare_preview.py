"""Package the approved preview artwork without modifying the existing site."""
from pathlib import Path
from html.parser import HTMLParser
import base64
import sys
from PIL import Image

folder = Path(__file__).resolve().parent
assets = folder / 'assets'
assets.mkdir(exist_ok=True)
with Image.open(sys.argv[1]) as artwork:
    artwork.save(assets / 'cangshan-erhai.webp', format='WEBP', quality=88, method=6)
data = base64.b64encode((assets / 'cangshan-erhai.webp').read_bytes()).decode('ascii')
page = folder / 'cangshan-erhai.html'
html = page.read_text(encoding='utf-8')
assert '__LANDSCAPE_ASSET__' in html, 'The HTML is already packaged.'
html = html.replace('__LANDSCAPE_ASSET__', 'data:image/webp;base64,' + data)
page.write_text(html, encoding='utf-8')

class ScriptExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inside_script = False
        self.source = []
        self.ids = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if tag == 'script':
            self.inside_script = True
    def handle_endtag(self, tag):
        if tag == 'script':
            self.inside_script = False
    def handle_data(self, text):
        if self.inside_script:
            self.source.append(text)

parser = ScriptExtractor()
parser.feed(html)
assert len(parser.ids) == len(set(parser.ids)), 'Duplicate element IDs.'
(folder / 'preview-script-check.js').write_text('\n'.join(parser.source), encoding='utf-8')
print('Packaged self-contained HTML:', page)
print('HTML bytes:', page.stat().st_size)
print('Artwork bytes:', (assets / 'cangshan-erhai.webp').stat().st_size)
print('Unique IDs:', len(parser.ids))
