"""Save current scope and remove abandoned code from the local integration helper."""
from pathlib import Path
import re

folder = Path(__file__).resolve().parent
builder = folder / 'integrate-main-site.py'
source = builder.read_text(encoding='utf-8')
if 'navicons = ' in source:
    start = source.index('navicons = ')
    end = source.index('# The user revised scope:')
    source = source[:start] + source[end:]
if 'retained = oldcss[' in source:
    start = source.index('retained = oldcss[')
    end = source.index('# Reuse original layout rules')
    source = source[:start] + source[end:]
source = source.replace("page = page.replace('<p class=\"eyebrow\">PERSONAL BLOG · INDIE GAME</p>', '<p class=\"eyebrow\">PERSONAL BLOG · INDIE GAME</p>')\n", '')
builder.write_text(source, encoding='utf-8')

oldplan = folder / '改进方案-待审核.md'
history = folder / '改进方案-待审核-历史.md'
if not history.exists():
    history.write_text(oldplan.read_text(encoding='utf-8'), encoding='utf-8')
oldplan.write_text('''# 当前审核范围已更新

2026 年 10 月 2 日。用户最新要求：保留原网站大框架，只做细节优化，内容框透明，让背景持续可见。此前的大结构改版建议已撤回，不代表当前批准范围。

当前本地实施、测试和审核材料见 [主站审核说明](主站审核说明.md)。打开 [本地主站](http://127.0.0.1:8765/index.html)。尚未部署。

此前结构审计仅作历史依据，保存在 [历史方案](改进方案-待审核-历史.md)。不要按其中的大改版建议继续实施。
''', encoding='utf-8')
record = folder / '继续工作记录.md'
oldrecord = record.read_text(encoding='utf-8')
if not oldrecord.startswith('# 当前记录 · 主站透明框'):
    prefix = '''# 当前记录 · 主站透明框，保留原框架，待审核

2026 年 10 月 2 日。用户先允许主站改版，随后明确纠正“大框架不能动，小地方优化没问题”，并要求透明框和全程可见的背景。后者优先。已恢复原居中头像首屏、原导航顺序、双列文章及原有模块/两款游戏；删除大改版的工具卡片、三列文章和整块青蓝底色。

当前交付以根目录 `index.html` 为准：苍山洱海固定背景，内容和卡片半透明；6 篇文章也用透明阅读框和静态山水背景。保留用户认可的 V8 互动、无船、点山不出鸟。小修复和已测试的操作细节见 `preview/主站审核说明.md`。

正式本地文件已获授权修改；尚未获得部署批准。原工作目录版本在 `preview/before-main-restructure/`，保留已有未提交改动。没有提交、推送或部署。

生成脚本 `preview/integrate-main-site.py` 使用原备份；直接编辑主站后不要重跑覆盖新修改。`preview/main-style.css` 是已放弃的大改版样式草案；当前样式由原 CSS 加 `preview/glass-refinements.css` 组成。独立 V8 预览仍保留，不能当作当前整站审核版本。

本地预览 `http://127.0.0.1:8765/index.html`，服务会话 94827。实际截图保存在 `preview/main-glass-*.jpg`。真实触屏及用户视觉认可待确认。

以下为此前背景阶段历史记录，文件作用和“只修改 preview”的状态均已被上面的主站进展更新：

---

'''
    record.write_text(prefix + oldrecord, encoding='utf-8')

# Confirm the original framework and heading labels survived the narrowed scope.
root = folder.parent
old = (folder / 'before-main-restructure/index.html').read_text(encoding='utf-8-sig')
new = (root / 'index.html').read_text(encoding='utf-8')
old_main = old[old.index('<main'):old.index('</main>')]
new_main = new[new.index('<main'):new.index('</main>')]
for pattern in [r'<section class="section[^\"]*" id="([^\"]+)"', r'<h2>(.*?)</h2>']:
    assert re.findall(pattern, new_main) == re.findall(pattern, old_main), pattern
assert len(re.findall('class="game-card', new)) == len(re.findall('class="game-card', old)) == 2
assert 'tools-grid' not in new
print('Preserved original section order, heading labels and two game cards. Review record updated.')
