"""Bundle current animation source into the existing standalone preview."""
from pathlib import Path
import re

folder = Path(__file__).resolve().parent
page = folder / 'cangshan-erhai.html'
html = page.read_text(encoding='utf-8')
script = (folder / 'lake-projection.js').read_text(encoding='utf-8') + '\n' + (folder / 'scene-v8.js').read_text(encoding='utf-8')
html = html.replace('点水拨动湖面 · 按住山间轻轻拖动', '点水拨动倒影 · 点山吹动云雾')
html = html.replace('点水或拖动：拨动湖水与倒影。按住山间轻轻拖动：原画面跟着移动，松开后回弹。点击山体不会触发鸟群。',
                    '点水或拖动：波动沿湖面透视扩散，远处更细、更扁，近处更明显，带动倒影和水光。点山：山间云雾随风移动，山体保持稳定，不触发鸟群。')
html, count = re.subn(r'<script>.*?</script>', lambda _: '<script>\n' + script + '\n  </script>', html, flags=re.S)
assert count == 1, count
page.write_text(html, encoding='utf-8')
print('Bundled V8 scene into self-contained HTML:', page.stat().st_size, 'bytes')
