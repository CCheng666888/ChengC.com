from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
TMP=Path(r'C:\Users\19152\AppData\Local\Temp\browser-use\assets')
# Hand-traced alpha masks retain original game pixels. No AI repaint or upscaling.
specs=[
('lisi',Path(r'C:\Users\19152\Downloads\FrPDoXnOJ4wMORJTQFlqOgzm1IpU.jpg'),(1420,1165,1570,1345),[(24,43),(31,37),(47,41),(48,17),(52,16),(58,18),(91,18),(104,26),(111,40),(121,41),(123,44),(132,44),(134,48),(126,52),(128,115),(116,115),(116,138),(105,145),(104,157),(91,159),(91,168),(81,168),(81,158),(77,158),(77,168),(68,168),(68,158),(58,158),(58,141),(51,137),(49,123),(55,115),(49,115),(47,119),(32,115),(38,52),(28,51),(23,47)]),
('mengtian',TMP/'1019ea69-961f-4638-a0b9-2bf268bf8459/8dd6516897acf256.jpg',(650,352,706,426),[(34,7),(31,8),(30,13),(22,13),(19,21),(14,25),(15,36),(8,40),(10,50),(16,53),(15,63),(19,65),(21,68),(25,68),(25,65),(31,65),(31,68),(35,67),(37,64),(39,56),(45,52),(43,42),(38,37),(40,23),(35,18),(36,11)]),
('wangjian',TMP/'c8dd9440-67fc-4182-9eb1-a905e9f23e3b/213c61be6e500a67.jpg',(603,485,675,565),[(30,4),(24,9),(20,17),(22,21),(17,22),(17,29),(14,34),(14,44),(10,48),(9,55),(4,72),(11,74),(20,73),(24,76),(27,76),(27,72),(32,72),(33,76),(36,76),(38,71),(42,71),(43,61),(51,71),(57,72),(61,66),(68,70),(68,59),(71,50),(68,48),(68,36),(61,32),(68,26),(67,23),(64,22),(60,25),(55,26),(53,29),(51,35),(44,38),(41,27),(36,24),(37,20),(35,14),(34,7)])]
sheet=Image.new('RGB',(640,260),'#29251e');draw=ImageDraw.Draw(sheet)
for i,(name,path,box,poly) in enumerate(specs):
    if name=='mengtian':
        high=Path(r'C:\Users\19152\Downloads\FkJAZdEtpw19FnvyDbxXXHiDmHLp.jpg')
        if high.exists():
            path=high;scale=1920/1080;box=tuple(round(v*scale) for v in box);poly=[(round(x*scale),round(y*scale)) for x,y in poly]
    im=Image.open(path).convert('RGBA').crop(box);mask=Image.new('L',im.size,0);ImageDraw.Draw(mask).polygon(poly,fill=255);im.putalpha(mask);im=im.crop(im.getbbox());im.save(ROOT/'assets/contact'/f'{name}.png')
    p=im.copy();p.thumbnail((150,185));sheet.paste(p,(30+i*210,20),p);draw.text((30+i*210,230),name,fill='white')
sheet.save(ROOT/'preview/official-qin-review.png');print('Extracted three original game models.')
