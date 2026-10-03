"""Restore the original scrolling timeline without changing other homepage sections."""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
backup = ROOT / 'preview/before-journal-restore'
backup.mkdir(exist_ok=True)
targets = ['index.html', 'css/style.css', 'js/app.js', 'preview/glass-refinements-v2.css', 'preview/integrate-main-site.py']
for name in targets:
    saved = backup / name
    if not saved.exists():
        saved.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, saved)

section_pattern = r'<section class="section muted-section" id="journal">.*?</section>'
page = (ROOT / 'index.html').read_text(encoding='utf-8')
current = re.search(section_pattern, page, re.S).group(0)
original_page = (ROOT / 'preview/before-main-restructure/index.html').read_text(encoding='utf-8-sig')
original = re.search(section_pattern, original_page, re.S).group(0)
items = re.findall(r'<article class="timeline-item">.*?</article>', current, re.S)
assert len(items) == 10, 'Unexpected journal content; restore stopped.'
# Preserve current entry text while restoring the original wrapper and scroll behavior.
restored = re.sub(r'(<div class="timeline">).*?(</div></div></section>)', lambda m: m.group(1) + ''.join(items) + m.group(2), original, flags=re.S)
page = page[:page.index(current)] + restored + page[page.index(current) + len(current):]
(ROOT / 'index.html').write_text(page, encoding='utf-8')

old_rules = '''/* A single transparent panel for the existing timeline, not a panel inside a panel. */
.timeline{margin:0;padding:32px 34px 6px;border-radius:11px}.timeline-item{grid-template-columns:120px 1fr;gap:26px;padding:0 0 26px 18px;margin-bottom:24px;border-bottom:1px solid var(--border)}
.timeline-item:before{width:5px;height:5px;top:8px;left:0;background:var(--soft);box-shadow:none}.timeline time{font-size:11px;letter-spacing:.06em;color:var(--soft)}
.timeline h3{font-size:16px;font-weight:550;line-height:1.7;margin-bottom:7px}.timeline p{font-size:13px;line-height:1.9;color:var(--muted)}.timeline-item:last-of-type{border-bottom:0;margin-bottom:0}'''
new_rules = '''/* Original scrolling timeline: one continuous line, no card or row frames. */
#journal .timeline-scroll{max-height:330px;padding:5px 18px 5px 8px;overflow-y:auto;overscroll-behavior:contain;scrollbar-color:#e4ece477 transparent;scrollbar-width:thin}
#journal .timeline{margin-left:8px;padding:0;border:0;border-left:1px solid #ffffff55;border-radius:0;background:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
#journal .timeline-item{grid-template-columns:130px 1fr;gap:24px;padding:0 0 36px 28px;margin:0;border:0;border-radius:0;background:none;box-shadow:none}
#journal .timeline-item:before{left:-6px;top:7px;width:11px;height:11px;background:#e5ece1;box-shadow:0 0 0 5px #e5ece11f}
#journal .timeline time{font-size:13px;letter-spacing:0;color:#f2f5eb;text-shadow:0 1px 7px #071b3480}
#journal .timeline h3{font-size:18px;font-weight:600;line-height:1.7;margin-bottom:8px;color:#fff;text-shadow:0 1px 8px #071b3499}
#journal .timeline p{font-size:14px;line-height:1.9;color:#f0f4ed;text-shadow:0 1px 7px #071b3499}
@media(max-width:800px){#journal .timeline-item{grid-template-columns:1fr;gap:6px}}'''
for name in ['css/style.css', 'preview/glass-refinements-v2.css']:
    text = (ROOT / name).read_text(encoding='utf-8')
    assert old_rules in text, f'Unexpected timeline styles in {name}; restore stopped.'
    text = text.replace('.post-card,.game-card,.about-card,.timeline,.article-shell{', '.post-card,.game-card,.about-card,.article-shell{')
    text = text.replace(old_rules, new_rules)
    text = text.replace('.timeline{padding:28px 26px 4px}', '')
    (ROOT / name).write_text(text, encoding='utf-8')

app = ROOT / 'js/app.js'
source = app.read_text(encoding='utf-8')
source, count = re.subn(r"  \$\('journalHistory'\)\.hidden = true;.*?\n  \}\);\n", '', source, count=1, flags=re.S)
assert count == 1, 'Expected history toggle setup not found.'
app.write_text(source, encoding='utf-8')

# Keep the historical builder aligned; do not run it against the current site.
builder = ROOT / 'preview/integrate-main-site.py'
source = builder.read_text(encoding='utf-8')
source = '\n'.join(line for line in source.split('\n') if not line.startswith("page = page.replace('<span class=\"timeline-hint\">") and not line.startswith("page = re.sub(r'<div class=\"timeline-scroll\""))
builder.write_text(source, encoding='utf-8')
print('Restored original scrolling timeline with all 10 current entries; other homepage sections unchanged.')
