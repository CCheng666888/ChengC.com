from pathlib import Path
from PIL import Image, ImageChops
import json
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'assets/contact/pixel/manifest.json').read_text(encoding='utf-8'))
for character in manifest:
    atlas=Image.open(root/'assets/contact/pixel'/f"{character['id']}.png")
    assert atlas.size==(384,64) and atlas.mode=='RGBA'
    frames=[atlas.crop((i*48,0,(i+1)*48,64)) for i in range(8)]
    for frame in frames:
        assert set(frame.getchannel('A').get_flattened_data())<={0,255},'Pixel sprites must have hard pixel edges'
        bounds=frame.getbbox();assert bounds and bounds[3]<=63
    assert len({frame.tobytes() for frame in frames[2:6]})==4,character['id']+' needs four different walking poses'
    assert frames[0].tobytes()!=frames[1].tobytes(),character['id']+' blink must change the face'
    assert frames[0].tobytes()!=frames[6].tobytes(),character['id']+' action must differ from idle'
    assert frames[6].tobytes()!=frames[7].tobytes(),character['id']+' action has two poses'
assert len(manifest)==12
print(json.dumps({'pixel_characters':12,'frames':96,'four_unique_walk_frames_each':True,'hard_pixel_alpha':True}))
