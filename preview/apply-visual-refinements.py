"""Apply CSS only, without regenerating the homepage or article contents."""
from pathlib import Path
import re, shutil

ROOT = Path(__file__).resolve().parents[1]
folder = ROOT / 'preview'
backup = folder / 'before-visual-refinement-v2'
backup.mkdir(exist_ok=True)
if not (backup / 'style.css').exists():
    shutil.copy2(ROOT / 'css/style.css', backup / 'style.css')
base = (folder / 'before-main-restructure/css/style.css').read_text(encoding='utf-8-sig')
base = re.sub(r'/\* Current downloadable build metadata \*/.*?/\* Blog card open/close interaction \*/', '/* Blog card open/close interaction */', base, flags=re.S)
base = re.sub(r'\.game-cover img\{content:url\(.*?\)\}', '', base)
base = re.sub(r'\.(?:about-mark|avatar)\{font-size:0;background:url\(.*?\) center 35%/cover no-repeat\}', '', base)
for old, new in [('177,92,255','218,234,228'),('#b15cff','#cddfd6')]:
    base = base.replace(old,new)
refinements = (folder / 'glass-refinements-v2.css').read_text(encoding='utf-8')
(ROOT / 'css/style.css').write_text(base + '\n' + refinements, encoding='utf-8')
builder = folder / 'integrate-main-site.py'
source = builder.read_text(encoding='utf-8').replace("'preview/glass-refinements.css'", "'preview/glass-refinements-v2.css'")
builder.write_text(source, encoding='utf-8')
print('Applied visual refinements only. Previous stylesheet preserved; site HTML and scripts untouched.')
