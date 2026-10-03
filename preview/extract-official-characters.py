from PIL import Image, ImageDraw
import numpy as np
from collections import deque
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TMP=Path(r'C:\Users\19152\AppData\Local\Temp\browser-use\assets')
OUT=ROOT/'assets/contact'; OUT.mkdir(parents=True,exist_ok=True)
FILES={
'15':TMP/'76df637b-1c11-4a7d-aa0a-81196a9f3bd2/761f36d4c30da3b1.jpg',
'22':TMP/'c3812d8f-aa11-4553-bf1e-f0296ee18711/92ac1ba4656866ab.jpg',
'14':TMP/'f5a14ef4-0a06-4e98-9ec5-1f75541a91ac/11317539345390f0.jpg',
'13':TMP/'373f3bc0-f6ed-4c5d-a5d3-ea78892dadb3/0f28caa6dbdd45e5.jpg',
'26':TMP/'1c018f57-f2a4-43ce-9e68-9da541ceb68e/4ef1167e4ed21204.jpg',
'4':TMP/'454ca1e1-a34c-4104-a6bb-86f2961d8941/61b2c02ed97b141b.webp'}
def cut_sticker(path,box):
    im=Image.open(path).convert('RGBA').crop(box)
    rgb=np.array(im)[:,:,:3]; dark=rgb.mean(axis=2)<115
    h,w=dark.shape; seen=np.zeros((h,w),bool); best=[]
    for yy,xx in zip(*np.where(dark)):
        if seen[yy,xx]:continue
        q=deque([(yy,xx)]);seen[yy,xx]=True;group=[]
        while q:
            y,x=q.popleft();group.append((y,x))
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1),(1,-1),(-1,1)]:
                ny,nx=y+dy,x+dx
                if 0<=ny<h and 0<=nx<w and dark[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((ny,nx))
        if len(group)>len(best):best=group
    mask=np.zeros((h,w),bool)
    for y,x in best:mask[y,x]=True
    # Dilate the original outline by one pixel; then fill enclosed original pixels.
    grown=mask.copy()
    for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:grown|=np.roll(np.roll(mask,dy,axis=0),dx,axis=1)
    mask=grown; outside=np.zeros((h,w),bool);q=deque()
    for y in range(h):
        for x in [0,w-1]:
            if not mask[y,x]:outside[y,x]=True;q.append((y,x))
    for x in range(w):
        for y in [0,h-1]:
            if not mask[y,x] and not outside[y,x]:outside[y,x]=True;q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and not mask[ny,nx] and not outside[ny,nx]:outside[ny,nx]=True;q.append((ny,nx))
    im.putalpha(Image.fromarray((~outside).astype('uint8')*255));return im.crop(im.getbbox())
SPECS=[('firefly','15',(30,620,230,805)),('sparkle','15',(25,1365,232,1575)),('sunday','15',(663,1105,865,1310)),('castorice','22',(25,590,237,815)),('robin','14',(27,605,236,810)),('aventurine','13',(244,846,446,1040)),('sparxie','26',(657,875,853,1088)),('jingyuan','4',(668,594,861,791))]
sheet=Image.new('RGB',(960,260),'#1a2230');draw=ImageDraw.Draw(sheet)
for i,(name,source,box) in enumerate(SPECS):
    im=cut_sticker(FILES[source],box);im.save(OUT/(name+'.png'))
    p=im.copy();p.thumbnail((108,185));sheet.paste(p,(i*120+(120-p.width)//2,25),p);draw.text((i*120+8,222),name,fill='white')
sheet.save(ROOT/'preview/official-astral-review.png')
print('Extracted 8 original official stickers without generating or redrawing characters.')
