"""Update the self-contained preview with the realistic artwork and scene code."""
from pathlib import Path
from PIL import Image
import base64
import re
import sys

folder = Path(__file__).resolve().parent
asset = folder / 'assets' / 'cangshan-erhai-realistic.webp'
with Image.open(sys.argv[1]) as image:
    image.save(asset, format='WEBP', quality=90, method=6)
html_path = folder / 'cangshan-erhai.html'
html = html_path.read_text(encoding='utf-8')
data_uri = 'data:image/webp;base64,' + base64.b64encode(asset.read_bytes()).decode('ascii')
html, count = re.subn(r'data:image/webp;base64,[A-Za-z0-9+/=]+', lambda _: data_uri, html)
assert count == 1, count
script = (folder / 'scene-v2.js').read_text(encoding='utf-8')
html, count = re.subn(r'<script>.*?</script>', lambda _: '<script>\n' + script + '\n  </script>', html, flags=re.S)
assert count == 1, count
html = html.replace('苍山、洱海、层叠山水与动态粒子。', '写实苍山洱海、动态湖水、飞鸟云雾与点击涟漪。')
html_path.write_text(html, encoding='utf-8')
print('HTML bytes:', html_path.stat().st_size)
print('Realistic artwork bytes:', asset.stat().st_size)
