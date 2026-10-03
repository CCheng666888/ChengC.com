"""Authored 48x64 pixel grids, not resized/posterized reference PNGs.
Eight frames: idle, blink, four walking poses, two persona actions.
Original images are visual references only; this script never opens them.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageColor
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/contact/pixel';OUT.mkdir(parents=True,exist_ok=True)
INK='#292538';SKIN='#f5cfb0';SHADE='#d49f8f';LIGHT='#fff0ce';GOLD='#d7b466'
DATA=[
 ('firefly','流萤','#d9dccf','#93a6a0','#ecebd9','#38575b','#87cdb1','#9a77ac','long','cake'),
 ('sparkle','花火','#513333','#2e232c','#bc364b','#302635','#e8ba72','#bc4160','pony','trick'),
 ('sparxie','火花','#fff0ed','#d5aabb','#c73b56','#292937','#ef94bd','#be567f','twins','stream'),
 ('castorice','遐蝶','#dbc5ef','#9c7fb8','#7856a3','#352c4d','#de9ae8','#ad61be','long','butterfly'),
 ('jingyuan','景元','#e9e5d9','#b6b6b1','#e5dfc9','#3c3b48','#bf9456','#ba9551','mane','nap'),
 ('robin','知更鸟','#b7cbed','#7c96c4','#eee9f3','#8171ac','#e1cc83','#7899c7','long','sing'),
 ('sunday','星期日','#9cb4c9','#6b829e','#dfdee2','#3d486b','#d5b976','#c0a15a','short','conduct'),
 ('aventurine','砂金','#e5c486','#bd9863','#359585','#333947','#dbb56c','#9768b1','short','coin'),
 ('yingzheng','嬴政','#332f39','#211f28','#302e36','#702e36','#d7b466','#70564b','bound','edict'),
 ('lisi','李斯','#443b36','#28242b','#433d37','#713d36','#c4a86f','#604c43','bound','scroll'),
 ('mengtian','蒙恬','#ded8c3','#969b94','#454c49','#833f41','#bcb69a','#685348','helmet','patrol'),
 ('wangjian','王翦','#554239','#302e30','#51554b','#8a4136','#b89b68','#67534c','bound','map')]

def lighter(color):
    rgb=ImageColor.getrgb(color)
    return tuple(min(255,int(c*.80+255*.20)) for c in rgb)

def sprite(data,frame):
    id,name,hair,hshade,cloth,dark,accent,iris,style,action=data
    im=Image.new('RGBA',(48,64));d=ImageDraw.Draw(im)
    walking=2<=frame<=5;acting=frame>=6;blink=frame==1 or (acting and action=='nap')
    phase=(frame-2)%4;bob=-1 if walking and phase in (1,3) else 0
    def rect(box,color):d.rectangle((box[0],box[1]+bob,box[2],box[3]+bob),fill=color)
    def poly(points,color):d.polygon([(x,y+bob) for x,y in points],fill=color)
    def line(points,color,width=1):d.line([(x,y+bob) for x,y in points],fill=color,width=width)
    def outlined(points,color):poly(points,INK);inner=None
    # Hair back: deliberate stepped contours, never smooth scaled reference art.
    if style in ('long','mane','pony','twins'):
        poly([(14,13),(34,13),(37,19),(37,30),(40,41),(37,46),(30,44),(18,44),(10,46),(7,41),(11,30),(11,19)],INK)
        poly([(14,15),(33,15),(35,20),(35,30),(38,41),(35,43),(28,40),(18,40),(11,43),(9,40),(13,29),(13,20)],hshade)
        for x in (12,15,31,34):rect((x,24,x+1,39),hair)
    if style=='twins':
        for left in (True,False):
            x=6 if left else 35
            poly([(x+3,15),(x+6,15),(x+7,20),(x+6,35),(x+8,42),(x+3,45),(x,40),(x+1,30),(x,22)],INK)
            rect((x+2,21,x+5,36),hair);rect((x+1,34,x+5,41),accent);rect((x+1,17,x+6,20),dark)
    if style=='pony':
        poly([(33,12),(38,12),(42,18),(42,30),(45,35),(42,40),(38,37),(37,25),(35,21)],INK)
        rect((38,18,40,32),hshade);rect((37,12,41,14),cloth)
    # Boots / trousers with four actual alternating gait silhouettes.
    left_raise=2 if walking and phase==0 else 0;right_raise=2 if walking and phase==2 else 0
    for x,raise_by in ((18,left_raise),(26,right_raise)):
        if walking and phase in (1,3):x+=(1 if x==18 else -1)*(1 if phase==3 else -1)
        d.rectangle((x,51,x+4,59-raise_by),fill=INK)
        d.rectangle((x+1,52,x+3,58-raise_by),fill=dark)
        d.rectangle((x-1,59-raise_by,x+5,62-raise_by),fill=INK)
        d.rectangle((x,59-raise_by,x+4,61-raise_by),fill=hshade if id=='sunday' else dark)
        d.point((x+1,59-raise_by),fill=accent)
    qin=id in ('yingzheng','lisi','mengtian','wangjian')
    male=qin or id in ('jingyuan','sunday','aventurine')
    # Costume outline and deliberate flat shades/trim, distinct silhouettes.
    poly([(18,35),(29,35),(32,38),(31,46),(34,55),(31,57),(16,57),(13,55),(17,46),(16,39)],INK)
    poly([(19,36),(28,36),(30,39),(28,46),(32,54),(29,55),(18,55),(15,54),(19,45),(18,39)],cloth)
    rect((18,39,20,46),lighter(cloth));rect((28,40,29,48),dark)
    if qin:
        poly([(19,36),(22,37),(27,46),(25,47)],dark);poly([(29,36),(27,36),(20,44),(19,42)],dark)
        rect((17,46,30,47),accent);rect((17,54,30,55),accent if id=='yingzheng' else dark)
        for x in (19,22,25,28):rect((x,49,x,53),dark)
    elif not male:
        rect((17,45,30,47),dark)
        for x in (18,22,26,30):rect((x,49,x,53),dark)
        rect((17,54,30,55),accent);rect((22,39,25,42),accent)
    else:
        poly([(19,36),(22,38),(21,46),(19,46)],dark);poly([(28,36),(25,39),(26,46),(29,46)],dark)
        rect((18,47,29,48),accent);rect((20,50,22,55),cloth);rect((26,50,28,55),cloth)
    # Separate arm silhouettes change pose; no whole-image CSS gait substitute.
    swing=1 if walking and phase==0 else -1 if walking and phase==2 else 0
    for side in (-1,1):
        x=12 if side==-1 else 30;y=37+side*swing
        if acting and side==1:
            rect((30,36,34,41),INK);rect((31,37,33,40),dark if qin else cloth)
            rect((34,35 if frame==6 else 34,37,38),INK);rect((35,35,36,37),SKIN)
        else:
            rect((x,y,x+5,y+9),INK);rect((x+1,y+1,x+4,y+7),dark if qin else cloth)
            rect((x+1,y+8,x+4,y+11),INK);rect((x+2,y+8,x+3,y+10),SKIN)
            rect((x+1,y+7,x+4,y+7),accent)
    rect((22,33,25,37),SHADE);rect((22,34,24,35),SKIN)
    # Stepped face, ears, hair crown and bangs.
    poly([(15,12),(31,12),(35,16),(36,25),(34,30),(29,34),(18,34),(13,30),(11,25),(12,17)],INK)
    poly([(16,14),(30,14),(33,18),(34,25),(32,29),(28,32),(19,32),(15,29),(13,25),(14,18)],SKIN)
    line([(15,27),(17,30),(20,32),(28,32),(32,28)],SHADE)
    rect((11,22,13,26),SHADE);rect((34,22,36,26),SHADE)
    poly([(12,18),(12,13),(15,10),(19,9),(28,9),(32,11),(35,14),(35,20),(31,18),(29,20),(26,17),(24,20),(21,18),(18,21),(17,18)],INK)
    poly([(13,17),(14,13),(18,10),(27,10),(31,12),(33,15),(33,18),(30,16),(28,18),(26,15),(23,18),(21,16),(18,19),(17,16)],hair)
    rect((16,12,25,12),lighter(hair));line([(28,12),(31,14),(31,16)],hshade)
    # Eyes remain tiny pixel clusters, with separate blink/action frames.
    for x in (17,27):
        if blink:line([(x,24),(x+3,24)],INK)
        else:
            rect((x-1,22,x+3,25),INK);rect((x,23,x+2,25),LIGHT);rect((x+1,23,x+2,25),iris);rect((x+1,23,x+1,24),INK);rect((x,23,x,23),'#ffffff')
    rect((23,27,23,27),SHADE);rect((22,29,24,29),INK)
    if acting and action=='sing':rect((22,29,24,30),dark)
    if id=='firefly':
        line([(13,15),(18,11),(28,11),(34,15)],dark,2)
        rect((33,13,37,16),accent);rect((35,11,36,18),accent);rect((34,14,35,15),LIGHT)
        rect((19,39,20,45),dark);rect((27,39,28,45),dark);rect((23,43,25,45),accent)
    if id=='sparkle':
        # Fox mask and flower cluster.
        poly([(8,12),(11,14),(14,12),(15,17),(13,21),(9,19)],INK)
        poly([(9,14),(11,15),(13,14),(14,17),(12,19),(10,18)],LIGHT)
        rect((10,17,10,17),cloth);rect((13,17,13,17),cloth)
        rect((31,11,35,13),cloth);rect((33,9,33,15),cloth);rect((33,12,33,12),GOLD)
        rect((29,14,32,16),accent);rect((21,47,26,48),accent)
    if id=='sparxie':
        poly([(19,9),(17,4),(20,4),(23,9)],INK);poly([(26,9),(28,4),(31,4),(29,10)],INK)
        rect((18,32,29,34),dark);rect((23,39,25,41),LIGHT);rect((20,47,28,48),accent)
    if id=='castorice':
        for x,y in ((14,11),(19,9),(25,9),(30,11),(34,14)):
            rect((x-1,y,x+1,y+2),accent);rect((x,y-1,x,y+3),accent);rect((x,y+1,x,y+1),LIGHT)
        rect((22,39,25,41),accent);poly([(16,40),(15,53),(10,51),(13,39)],dark)
    if id in ('robin','sunday'):
        # Pixel halo, feather ears and the reference's gold ornaments.
        line([(17,6),(17,4),(20,3),(27,3),(30,4),(30,6),(27,7),(20,7),(17,6)],GOLD)
        for side in (-1,1):
            x=9 if side==-1 else 36
            poly([(x,21),(x+3,19),(x+3,25),(x+1,28),(x-1,26)],INK);rect((x,21,x+2,25),LIGHT);rect((x-1,24,x,26),hair)
        if id=='robin':rect((11,32,15,34),dark);rect((13,30,13,36),dark);rect((23,38,25,40),GOLD)
        else:rect((18,39,19,45),GOLD);rect((28,39,29,45),GOLD)
    if id=='jingyuan':
        for x,y in ((14,8),(18,7),(22,6),(27,7),(31,9)):
            poly([(x,y+5),(x,y),(x+3,y+2),(x+4,y+6)],hair)
        rect((29,36,33,39),accent);rect((30,35,32,40),accent);rect((22,39,24,45),dark)
        rect((33,28,36,29),'#9a3e40')
    if id=='aventurine':
        # Sunglasses on the forehead, green coat and gold lapels.
        rect((16,17,21,20),GOLD);rect((26,17,31,20),GOLD);rect((17,18,20,19),'#705e88');rect((27,18,30,19),'#705e88');rect((22,18,25,18),GOLD)
        rect((18,37,20,40),LIGHT);rect((28,37,30,40),LIGHT);rect((23,40,24,44),accent)
    if qin:
        # Minister silhouettes differ from the astral characters.
        if id in ('yingzheng','lisi'):
            rect((13,7,34,12),INK);rect((15,8,32,11),hair)
            rect((9,5,38,7),INK);rect((10,5,37,5),accent);rect((10,7,37,7),accent)
            if id=='yingzheng':
                for x in (12,17,22,27,32,37):
                    line([(x,8),(x,16)],accent);rect((x,11,x,12),LIGHT);rect((x,15,x,16),GOLD)
                for x in (18,28):line([(x,49),(x-1,51),(x,53)],accent)
                line([(16,23),(19,22)],INK);line([(27,22),(30,23)],INK)
            else:
                for x in (10,35):rect((x,10,x+2,32),INK);rect((x+1,11,x+1,31),dark)
                line([(22,30),(24,31),(24,34),(22,36)],hair);rect((22,29,25,29),hair)
        if id in ('mengtian','wangjian'):
            for y in (39,42,45):
                for x in (18,22,26):rect((x,y,x+2,y+1),hshade)
            rect((13,36,18,39),hshade);rect((29,36,34,39),hshade)
            if id=='mengtian':
                poly([(10,20),(11,12),(15,8),(20,6),(28,6),(33,9),(36,13),(37,20)],INK)
                poly([(12,18),(13,13),(17,9),(28,8),(32,11),(34,15),(35,18)],cloth)
                rect((11,18,36,20),accent);rect((10,20,12,27),cloth);rect((35,20,37,27),cloth)
                poly([(23,7),(23,2),(26,0),(29,2),(27,4),(28,6)],INK);rect((24,2,26,6),hair)
            else:
                rect((21,6,28,9),INK);rect((22,6,26,7),hair);rect((23,4,25,5),dark)
                poly([(19,30),(23,31),(27,30),(26,34),(23,36),(21,34)],hair)
    if acting:
        # Persona gestures and props are drawn into actual pixel animation frames.
        y=33 if frame==6 else 31
        if action=='cake':rect((34,y,41,y+6),INK);rect((35,y+1,40,y+2),LIGHT);rect((35,y+3,40,y+5),'#bc8d5a');rect((38,y-1,39,y),'#ab3e4d')
        if action=='trick':rect((35,y-2,41,y+5),INK);rect((36,y-1,40,y+4),LIGHT);rect((38,y+1,38,y+2),cloth)
        if action=='stream':
            rect((35,y-1,40,y+6),INK);rect((36,y,39,y+4),accent)
            poly([(36,23),(38,21),(40,23),(42,21),(44,23),(44,25),(40,29),(36,25)],accent)
        if action=='butterfly':
            x=40;y=29 if frame==6 else 26
            rect((x,y,x,y+4),INK)
            poly([(x-1,y+1),(x-4,y-1),(x-4,y+3),(x-1,y+2)],accent)
            poly([(x+1,y+1),(x+4,y-1),(x+4,y+3),(x+1,y+2)],accent)
        if action=='nap':
            line([(38,18),(41,18),(38,21),(41,21)],accent);line([(42,12),(45,12),(42,15),(45,15)],accent)
        if action=='sing':
            rect((35,y+1,36,y+8),INK);rect((34,y-2,37,y),hshade);rect((35,y-3,36,y-3),LIGHT)
            line([(42,23),(42,16),(45,17)],dark);rect((40,22,42,24),accent)
        if action=='conduct':line([(35,35),(42,26 if frame==6 else 23)],LIGHT,1)
        if action=='coin':
            yy=24 if frame==6 else 17
            rect((39,yy,42,yy+3),INK);rect((40,yy,41,yy+3),GOLD);rect((39,yy+1,42,yy+2),GOLD);rect((40,yy+1,40,yy+1),LIGHT)
        if action in ('edict','scroll','map'):
            rect((30,35,42,45),INK);rect((31,36,41,44),accent)
            for x in (33,36,39):line([(x,37),(x,43)],dark)
            if action=='map':line([(32,42),(35,39),(38,41),(40,38)],hshade)
        if action=='patrol':
            line([(40,17),(40,53)],INK,2);line([(40,18),(40,51)],accent)
            poly([(40,12),(37,18),(40,21),(43,18)],accent)
    return im

review=Image.new('RGB',(1392,600),'#171b25');rd=ImageDraw.Draw(review);manifest=[]
for i,data in enumerate(DATA):
    atlas=Image.new('RGBA',(48*8,64))
    for frame in range(8):atlas.paste(sprite(data,frame),(frame*48,0))
    atlas.save(OUT/(data[0]+'.png'))
    enlarged=sprite(data,0).resize((192,256),Image.Resampling.NEAREST)
    x=(i%6)*232+20;y=(i//6)*300+12;review.paste(enlarged,(x,y),enlarged)
    rd.text((x+50,y+269),data[0],fill='#d8d7cb')
    manifest.append({'id':data[0],'name':data[1],'frameSize':[48,64],'frames':['idle','blink','walk-1','walk-2','walk-3','walk-4','action-1','action-2'],'source':'authored pixel grid; reference PNG not loaded'})
review.save(ROOT/'preview/pixel-characters-review.png')
emperor=next(data for data in DATA if data[0]=='yingzheng')
sprite(emperor,0).resize((384,512),Image.Resampling.NEAREST).save(ROOT/'preview/yingzheng-pixel-review.png')
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pixel_characters':len(DATA),'frame_size':[48,64],'frames_each':8,'reference_images_loaded':0}))
