"""Convert the generated transparent asset, preserve alpha, and record its visible bounds."""
from pathlib import Path
from PIL import Image
import json
import re
import sys

folder = Path(__file__).resolve().parent
with Image.open(sys.argv[1]) as source:
    assert source.mode == 'RGBA', source.mode
    assert source.getchannel('A').getextrema()[0] == 0, 'Expected transparent alpha.'
    bbox = source.getchannel('A').point(lambda value: 255 if value >= 64 else 0).getbbox()
    assert bbox
    left, top, right, bottom = bbox
    metadata = dict(x=left/source.width,y=top/source.height,w=(right-left)/source.width,h=(bottom-top)/source.height,aspect=(right-left)/(bottom-top))
    source.save(folder/'assets'/'boat-realistic.webp', format='WEBP', quality=92, method=6)
(folder/'assets'/'boat-realistic.json').write_text(json.dumps(metadata),encoding='utf-8')
js_path=folder/'scene-v4.js'
script=js_path.read_text(encoding='utf-8')
script,count=re.subn(r'^  const boatCrop = .*?;$',lambda _: '  const boatCrop = '+json.dumps(metadata)+';',script,flags=re.M)
assert count == 1,count
js_path.write_text(script,encoding='utf-8')
print('Visible bounds:', bbox)
print('Aspect:', round(metadata['aspect'],3))
print('Asset bytes:', (folder/'assets'/'boat-realistic.webp').stat().st_size)
