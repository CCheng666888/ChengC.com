"""One-time migration record. Do not rerun over later edits."""
from pathlib import Path
import re, json, shutil

ROOT = Path(__file__).resolve().parents[1]
backup = ROOT / 'preview/before-profile-products-v4'
backup.mkdir(parents=True, exist_ok=True)
for name in ['about.html', 'products.html', 'index.html']:
    shutil.copy2(ROOT / name, backup / name)
source = (ROOT / 'products.html').read_text(encoding='utf-8-sig')
profile = (ROOT / 'about.html').read_text(encoding='utf-8-sig')
css = re.search(r'<style>([\s\S]*?)</style>', source).group(1)

def split_selectors(text):
    result, begin, depth, quote = [], 0, 0, ''
    for i, char in enumerate(text):
        if quote:
            if char == quote and (i == 0 or text[i - 1] != '\\'): quote = ''
        elif char in '\"\'': quote = char
        elif char in '([': depth += 1
        elif char in ')]': depth -= 1
        elif char == ',' and depth == 0:
            result.append(text[begin:i].strip()); begin = i + 1
    result.append(text[begin:].strip())
    return result

def scoped_css(text):
    output, pos = [], 0
    while pos < len(text):
        opening = text.find('{', pos)
        if opening < 0: break
        header = text[pos:opening].strip()
        level, end, quote = 1, opening + 1, ''
        while end < len(text) and level:
            char = text[end]
            if quote:
                if char == quote and text[end - 1] != '\\': quote = ''
            elif char in '\"\'': quote = char
            elif char == '{': level += 1
            elif char == '}': level -= 1
            end += 1
        body = text[opening + 1:end - 1]
        if header.startswith('@media'):
            output.append(header + '{' + scoped_css(body) + '}')
        elif header.startswith('@'):
            output.append(header + '{' + body + '}')
        else:
            selectors = ['.profile-portfolio' if s in [':root', 'html', 'body'] else '.profile-portfolio ' + s for s in split_selectors(header)]
            output.append(','.join(selectors) + '{' + body + '}')
        pos = end
    return '\n'.join(output)

(ROOT / 'css/profile-products-base.css').write_text('/* Layout migrated from products.html, scoped to the personal portfolio. */\n' + scoped_css(css) + '\n', encoding='utf-8')

main = re.search(r'<main id="main">([\s\S]*?)</main>', source).group(1)
# Continue below the existing three chapters; the original duplicate hero/overview are unnecessary.
main = main[main.index('<section class="site-feature'):]
main = re.sub(r'<article class="feature-card schedule-feature[\s\S]*?</article>', '', main)
main = re.sub(r'<article class="catalog-card" data-category="tools" data-product="schedule">[\s\S]*?</article>', '', main)
main = main.replace('全部 9 个作品与项目', '全部 8 个作品')
main = main.replace('从一次复习、一张课表、<br>一篇笔记开始。', '从一次复习，<br>一篇笔记开始。')
main = main.replace('；组织排班，可以使用<a href="Free-Schedule-Query-System/index.html">空课查询系统</a>。', '。')
main = main.replace('问答台和空课查询都附有开发记录与使用说明', '问答台附有开发记录，笔记工具附有使用说明')
main = main.replace('项目与下载', '作品与下载')
main = main.replace('项目文件夹保留离线成品', 'Windows 版可离线游玩')
main = main.replace('项目文件夹保留对应版本离线成品', 'Windows 版可离线游玩')
main = main.replace('相关游戏文件夹也保留对应版本的离线成品。', 'Windows 版支持离线游玩。')
main = main.replace('相关项目文件夹也保留对应版本的单文件 HTML 与 Windows 成品。', '网页直接试玩，Windows 版支持离线游玩。')
main = main.replace('相关项目文件夹也保留同版本完整版。', '')
main = main.replace('网页版 / 离线版', '网页 / Windows')
main = main.replace('在线试玩完整版', '开始试玩')
for remote, local in [('https://chencgamedemo.netlify.app/games/mingchronicles.html', 'play/mingchronicles.html'), ('https://chencgamedemo.netlify.app/games/yujing.html', 'play/yujing.html')]:
    main = main.replace('href="' + remote + '" target="_blank" rel="noopener noreferrer"', 'href="' + local + '" data-animate')

data = json.loads(re.search(r'<script type="application/json" id="productData">([\s\S]*?)</script>', source).group(1))
data = [p for p in data if p['id'] != 'schedule']
for product in data:
    product.pop('source', None)
    product['features'] = [f.replace('项目文件夹保留对应版本离线成品', 'Windows 版可离线游玩').replace('和项目文件夹中的离线 HTML', '与离线游玩') for f in product['features']]
    if product['id'] in ['ming', 'badminton']:
        product['href'] = 'play/' + ('mingchronicles.html' if product['id'] == 'ming' else 'yujing.html')
        product['cta'] = '开始试玩'
        product['note'] = product.get('note', '').replace('相关项目文件夹也保留同版本完整版。', '')

dialog = re.search(r'<dialog[\s\S]*?</dialog>', source).group(0)
header = '''<section class="profile-portfolio" id="portfolio" aria-labelledby="portfolioTitle">
    <div class="portfolio-heading wrap">
      <p class="section-kicker"><span class="portfolio-rule"></span> WORKS &amp; PRODUCTS</p>
      <div class="portfolio-intro-line"><h2 id="portfolioTitle">好奇心，<br>有了作品。</h2><div><p>为日常做的工具，为想象打开的世界。<br>这些作品，是学习与创造留下的另一种笔记。</p><p class="portfolio-stat">02 网站 <span>/</span> 02 工具 <span>/</span> 04 游戏</p></div></div>
    </div>
    <nav class="portfolio-nav" aria-label="探索我的作品"><div class="wrap"><a href="#web">01 <span>网站</span></a><a href="#tools">02 <span>工具</span></a><a href="#games">03 <span>游戏</span></a><a href="#catalog">04 <span>全部作品</span></a><a href="#guide">05 <span>从哪里开始</span></a></div></nav>
'''
block = header + main + '\n    <p class="portfolio-footnote wrap">作品持续更新，功能与版本以实际作品页面为准。工具界面为功能示意。</p>\n' + dialog + '\n<script type="application/json" id="productData">' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '</script>\n</section>\n'
profile = profile.replace('</main>', block + '</main>', 1)
profile = profile.replace('<link rel="stylesheet" href="css/profile-titles.css">', '<link rel="stylesheet" href="css/profile-titles.css"><link rel="stylesheet" href="css/profile-products-base.css?v=20261002-v4"><link rel="stylesheet" href="css/profile-products.css?v=20261002-v4">')
profile = profile.replace('<script src="js/profile.js', '<script src="js/profile-products.js?v=20261002-v4"></script><script src="js/profile.js', 1)
profile = profile.replace('href="games.html" data-animate>游戏</a>', 'href="games.html" data-animate>游戏</a><a href="#portfolio">作品介绍</a>', 1)
profile = profile.replace('关于 ChenC：记录学习与生活，分享从想法到成品的创作过程。', '关于 ChenC：学习、生活与创造，以及网站、工具与游戏作品的介绍和体验入口。')
(ROOT / 'about.html').write_text(profile, encoding='utf-8')
home = (ROOT / 'index.html').read_text(encoding='utf-8-sig')
home = home.replace('href="products.html" data-animate>产品介绍', 'href="about.html#portfolio" data-animate>作品介绍').replace('href="products.html">产品介绍', 'href="about.html#portfolio" data-animate>作品介绍')
(ROOT / 'index.html').write_text(home, encoding='utf-8')

script = re.search(r'<script>\s*([\s\S]*?)</script>\s*</body>', source).group(1)
start = script.index('  const nav=document.getElementById')
end = script.index("  const media=matchMedia", start)
script = script[:start] + script[end:]
script = script.replace("const labels = {all:'全部',web:'网站',tools:'学习与效率',games:'游戏'};", "const labels = {all:'全部',web:'网站',tools:'学习与效率',games:'游戏'};")
script = script.replace("' 个作品与项目'", "' 个作品'")
script = script.replace("document.body.classList.add('dialog-open')", "document.body.classList.add('product-dialog-open')")
script = script.replace("document.body.classList.remove('dialog-open')", "document.body.classList.remove('product-dialog-open')")
script = script.replace("document.documentElement.classList.add('motion')", "document.getElementById('portfolio').classList.add('portfolio-motion')")
script = script.replace("document.documentElement.classList.remove('motion')", "document.getElementById('portfolio').classList.remove('portfolio-motion')")
script = script.replace("document.querySelectorAll('.reveal')", "document.querySelectorAll('#portfolio .reveal')")
script = script.replace("document.querySelectorAll('.pending')", "document.querySelectorAll('#portfolio .pending')")
script = script.replace("a.className = secondary ? 'text-link' : 'button';a.href=href;", "a.className = secondary ? 'text-link' : 'button';a.href=href;if(!href.startsWith('https://'))a.setAttribute('data-animate','');")
(ROOT / 'js/profile-products.js').write_text(script, encoding='utf-8')
print(json.dumps({'products':len(data), 'categories':{key:sum(p['category']==key for p in data) for key in ['web','tools','games']}, 'source_backup':str(backup)}, ensure_ascii=False))
