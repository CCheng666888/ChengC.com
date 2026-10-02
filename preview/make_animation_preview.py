"""Convert actual browser capture frames to a small animation for review."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json

folder = Path(__file__).resolve().parent
sources = sorted((folder / 'animation-frames').glob('frame-*.jpg'))
times = json.loads((folder / 'animation-frames' / 'times.json').read_text(encoding='utf-8'))
frames = []
for source in sources:
    with Image.open(source) as capture:
        frame = capture.convert('RGB')
        frame.thumbnail((960, 600))
        frames.append(frame)
durations = [max(100, min(500, times[i+1]-times[i])) for i in range(len(times)-1)]
durations.append(durations[-1])
frames[0].save(folder / 'scene-v3-motion.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=False)
frames[0].save(folder / 'scene-v3-motion.webp', format='WEBP', save_all=True, append_images=frames[1:], duration=durations, loop=0, quality=76, method=4)
diff = ImageStat.Stat(ImageChops.difference(frames[0],frames[-1])).mean
print('Captured frames:', len(frames))
print('Actual recorded duration ms:', sum(durations))
print('Mean RGB change between first and final frames:', [round(v,3) for v in diff])
print('Animation bytes:', (folder / 'scene-v3-motion.gif').stat().st_size)
print('Animated WebP bytes:', (folder / 'scene-v3-motion.webp').stat().st_size)
