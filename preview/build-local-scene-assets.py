"""Keep direct-file WebGL texture bundles byte-identical to the existing photos."""
from pathlib import Path
import base64, hashlib, json

root = Path(__file__).resolve().parents[1]
assets = [('day', 'assets/cangshan-erhai.webp', 'image/webp'),
          ('night', 'assets/cangshan-erhai-night-v2.png', 'image/png')]
record = []
for key, relative, mime in assets:
    image = (root / relative).read_bytes()
    url = f'data:{mime};base64,' + base64.b64encode(image).decode('ascii')
    destination = root / f'js/scene-{key}-data.js'
    destination.write_text('// Generated from ' + relative + '; do not edit image bytes.\n'
                           + 'window.SceneImages.register(' + json.dumps(key) + ', '
                           + json.dumps(url) + ');\n', encoding='utf-8')
    record.append({'source': relative, 'bundle': str(destination.relative_to(root)),
                   'bytes': len(image), 'sha256': hashlib.sha256(image).hexdigest()})

# HTTP fixture exercises the bundled-image branch. It is NOT a file-origin browser test.
fixture = (root / 'index.html').read_text(encoding='utf-8')
fixture = fixture.replace('<head>', '<head><base href="../">', 1)
fixture = fixture.replace('id="landscapeArt"', 'id="landscapeArt" data-texture-mode="embedded"', 1)
(root / 'preview/local-background-check.html').write_text(fixture, encoding='utf-8')
(root / 'preview/local-scene-assets-v5.json').write_text(
    json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(record, ensure_ascii=False))
