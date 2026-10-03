from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
ids=['firefly','sparkle','sparxie','castorice','jingyuan','robin','sunday','aventurine','yingzheng','lisi','mengtian','wangjian']
results=[]
for id in ids:
    im=Image.open(root/'assets/contact'/f'{id}.png')
    assert im.mode=='RGBA' and im.getchannel('A').getbbox(),id
    alpha=im.getchannel('A')
    assert alpha.getextrema()[0]==0,id+' needs transparent surroundings'
    opaque=[pixel[:3] for pixel in im.getdata() if pixel[3]>128]
    assert opaque and any(max(pixel)>80 for pixel in opaque),id+' must not be a black silhouette'
    results.append({'id':id,'size':list(im.size)})
print(json.dumps({'transparent_cutouts':len(results),'black_silhouettes':0,'assets':results}))
