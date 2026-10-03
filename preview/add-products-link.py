from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'index.html'
content = path.read_text(encoding='utf-8')
needle = '<a href="#projects">项目</a>'
if 'href="products.html"' not in content:
    assert needle in content, 'Existing project navigation link not found'
    content = content.replace(needle, needle + '<a href="products.html">产品介绍</a>', 1)
    path.write_text(content, encoding='utf-8')
    print('Added the product introduction navigation link.')
else:
    print('Product introduction navigation link already exists.')
