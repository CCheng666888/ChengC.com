"""Read-only audit of the current homepage and article entry points."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        for attr in ('href', 'src'):
            if value := attrs.get(attr):
                parsed = urlsplit(value)
                if parsed.scheme or parsed.netloc or not parsed.path:
                    continue
                self.references.append((self.getpos()[0], tag, attr, unquote(parsed.path)))

pages = [ROOT / 'index.html', *sorted((ROOT / 'posts').glob('*.html'))]
broken = []
references = 0
for page in pages:
    parser = References()
    parser.feed(page.read_text(encoding='utf-8-sig'))
    for line, tag, attr, path in parser.references:
        references += 1
        destination = ROOT / path.lstrip('/') if path.startswith('/') else page.parent / path
        if not destination.exists():
            broken.append({'file': page.relative_to(ROOT).as_posix(), 'line': line, 'element': tag, 'attribute': attr, 'target': path})

downloads = []
for filename in ['spongebob-vs-zombie-fish-windows.zip', 'spongebob-vs-zombiefish-douyin-windows.zip']:
    path = ROOT / 'downloads' / filename
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    downloads.append({'filename': filename, 'bytes': path.stat().st_size, 'MiB': round(path.stat().st_size / 1024**2, 2), 'sha256': digest.hexdigest().upper()})

result = {'pages_checked': len(pages), 'local_references_checked': references, 'broken_local_references': broken, 'downloads': downloads}
(ROOT / 'preview' / 'site-audit.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2, ensure_ascii=False))
