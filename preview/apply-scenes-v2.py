from pathlib import Path
import re, shutil, json

ROOT = Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def save(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def replace(s,old,new):
    assert old in s, old[:100]
    return s.replace(old,new)

for p, scenes in [('games.html',['ming','badminton','fish','defense','soon']),('tools.html',['qa','notes','soon'])]:
    s=read(p)
    s=replace(s,'<script src="js/theme.js">','<link rel="stylesheet" href="css/work-gallery-v2.css"><script src="js/theme.js">')
    s=re.sub(r'<div class="landscape" aria-hidden="true">.*?</div></div>', '<div class="landscape work-landscape" aria-hidden="true"><canvas id="workScene"></canvas><div class="scene-shade"></div></div>',s,count=1)
    count=iter(scenes)
    s=re.sub(r'<article class="work-card([^\"]*)"',lambda m:f'<article class="work-card{m[1]}" data-scene="{next(count)}"',s)
    arrows=re.search(r'<div class="carousel-buttons">(.*?)</div>',s,re.S)[1]
    s=re.sub(r'<div class="carousel-buttons">.*?</div>','',s,count=1,flags=re.S)
    s=replace(s,'<div class="carousel-track"','<div class="carousel-shell"><div class="carousel-track"')
    s=replace(s,'<div class="carousel-controls">',f'<div class="carousel-sides" hidden>{arrows}</div></div><div class="carousel-controls">')
    s=s.replace('只看风景','只看背景').replace('湖面起伏','环境粒子').replace('风的速度','动画速度').replace('山间云雾','环境光').replace('水面微光','微光强度').replace('切换夜色','柔和背景')
    s=replace(s,'<script src="js/lake-projection.js"></script><script src="js/landscape.js"></script>','<script src="js/work-scenes.js"></script>')
    s=s.replace('点水拨动倒影 · 点山吹动云雾','点击背景，让微光荡开')
    save(p,s)

s=read('about.html')
s=replace(s,'<script src="js/theme.js">','<link rel="stylesheet" href="css/work-gallery-v2.css"><script src="js/theme.js">')
s=s.replace('content="assets/cangshan-erhai.webp"','content="assets/home-bg.png"')
s=s.replace('<canvas id="water"></canvas><canvas id="particles"></canvas>','')
s=re.sub(r'  <div class="tools" aria-label="风景控制">.*?</aside>', '<div class="tools" aria-label="背景控制"><button class="tool" id="sceneToggle" type="button" aria-pressed="false">只看背景</button></div>',s,count=1,flags=re.S)
s=replace(s,'<script src="js/lake-projection.js"></script><script src="js/landscape.js"></script>','<script src="js/profile.js"></script>')
save('about.html',s)

s=read('js/carousel.js')
s=replace(s,".carousel-controls [hidden]",".carousel-controls [hidden], .carousel-sides[hidden]")
s=replace(s,"cards.forEach((card, i) => card.classList.toggle('is-current', i === index));","""cards.forEach((card, i) => {
      card.classList.toggle('is-current', i === index);
      card.querySelectorAll('a').forEach(link => { if (i === index) link.removeAttribute('tabindex'); else link.setAttribute('tabindex','-1'); });
    });
    window.WorkScenes?.setTheme(cards[index].dataset.scene);""")
s=replace(s,"if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }","""if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); return; }
    const card = event.target.closest('.work-card');
    if (card && cards.indexOf(card) !== active) { event.preventDefault(); event.stopPropagation(); show(cards.indexOf(card)); }""")
s=replace(s,'  reflect(0);','  show(0, false);')
save('js/carousel.js',s)
s=read('js/work-scenes.js')
s=replace(s,'    for(const e of effects)',"""    // Ambient light is drawn inside this same raster scene, rather than over the page.
    x.globalAlpha=(100-settings.mist)/400;x.fillStyle='#071326';x.fillRect(0,0,W,H);x.globalAlpha=1;
    for(const e of effects)""")
save('js/work-scenes.js',s)

s=read('index.html')
rows=''.join(f'<article class="timeline-item"><time datetime="2026-10-02">2026.10.02</time><div><h3>{title}</h3><p>{copy}</p></div></article>' for title,copy in [
('整理游戏与工具作品','把四款游戏与两款工具整理成独立作品页。左右切换，可以逐个查看介绍、试玩入口和下载方式。'),
('新增个人空间','记录学习、生活与创造。关于我的页面沿用熟悉的星空背景，也留了一处安静看风景的空间。'),
('山海之间，多了一点夜色','苍山与洱海的夜色正在完善：岸灯亮起，湖面泛起细碎微光。作品页也有了各自的动态场景。')])
s=replace(s,'<div class="timeline"><article','<div class="timeline">'+rows+'<article')
s=replace(s,'<link rel="stylesheet" href="css/navigation.css">','<link rel="stylesheet" href="css/navigation.css"><link rel="stylesheet" href="css/night-lake.css">')
s=replace(s,'id="landscapeArt"','id="landscapeArt" data-night-image="assets/cangshan-erhai-night-v2.png"')
save('index.html',s)
s=read('preview/check-main-fallback.cjs').replace(').length,10)',').length,13)').replace('ten retained timeline entries','thirteen timeline entries, including ten retained historical entries')
save('preview/check-main-fallback.cjs',s)

shutil.copy2(ROOT/'js/landscape.js',ROOT/'preview/before-work-scenes-v2/landscape.js')
src=Path('C:/Users/19152/.codex/generated_images/01a0f7b5-5b5e-7c10-bcb4-a1b2c4a67b3d/exec-60a94d5d-b449-4eee-82a7-85d0943d3715.png')
shutil.copy2(src,ROOT/'assets/cangshan-erhai-night-v2.png')
print('Integrated compact themed galleries, original personal background, three recent updates, and versioned night asset.')
