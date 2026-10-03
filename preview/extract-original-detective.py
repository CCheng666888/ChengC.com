"""Extract the existing title artwork; no generated or redrawn character pixels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'preview/magpie-source/original-poster.png'
image = Image.open(source).convert('RGB')
# Original male figure, on the black half of the title card.
box = (690, 110, 960, 1080)
rgb = np.asarray(image.crop(box)).copy()
v = rgb.astype(float)
red = (v[:,:,0] > 80) & (v[:,:,1] < 45) & (v[:,:,2] < 115) & (v[:,:,0] > v[:,:,2]*1.5+12)
mask = red.copy()
# Retain the original white collar; exclude the superimposed series lettering.
collar = (v[:,:,0] > 135) & (v[:,:,1] > 120) & (v[:,:,2] > 105)
collar[:140] = False
collar[295:] = False
collar[:,:75] = False
collar[:,170:] = False
mask |= collar

# Text covers the coat in the poster. Interpolate only that overprint from
# neighboring rows of this same source image, retaining the photographed edges.
left = np.zeros(rgb.shape[0], dtype=float)
right = np.zeros_like(left)
for y in range(300, 795):
    xs = np.flatnonzero(red[y])
    if len(xs):
        left[y], right[y] = xs[0], xs[-1]
overprints = [(335, 425), (435, 520)]
for first, last in overprints:
    for y in range(first, last):
        t = (y-first+1)/(last-first+1)
        x0 = round(left[first-1]*(1-t)+left[last]*t)
        x1 = round(right[first-1]*(1-t)+right[last]*t)
        mask[y] = False
        mask[y,x0:x1+1] = True
        for x in range(x0, x1+1):
            # Copy an existing nearby red coat pixel, never synthesize a shape.
            candidates = [(abs(yy-y), yy) for yy in range(max(0,y-120),min(rgb.shape[0],y+121)) if red[yy,x] and not any(a <= yy < b for a,b in overprints)]
            if candidates:
                rgb[y,x] = rgb[min(candidates)[1],x]
            else:
                mask[y,x] = False

rgb[~mask] = 0
rgba = np.dstack((rgb, mask.astype(np.uint8)*255))
output = Image.fromarray(rgba).crop(Image.fromarray(rgba).getbbox())
target = root / 'assets/magpie-original-detective.png'
output.save(target)
(root / 'preview/magpie-source/provenance.json').write_text(json.dumps({
    'source_page':'https://hugedesigns.co.uk/project/magpie-murders/',
    'video':'https://player.vimeo.com/video/676323296?app_id=122963&dnt=1&h=d1695c2b9d',
    'source_image':'original-poster.png', 'source_size':image.size,
    'crop':box, 'asset':'assets/magpie-original-detective.png',
    'processing':'Original artwork crop; color-based background removal; title overprint removed by copying nearby pixels from the same original coat. No image generation or vector redrawing.',
    'size':output.size
},ensure_ascii=False,indent=2),encoding='utf-8')
print(output.size)
