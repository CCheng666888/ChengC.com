from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('记录学习、生活与创造。关于我的页面沿用熟悉的星空背景，也留了一处安静看风景的空间。','记录学习、生活与创造。从关于我的入口，可以继续阅读文章、发现工具与游戏。')
p.write_text(s,encoding='utf-8')
print('Recent update copy now describes the personal page without overriding its concurrent design task.')
