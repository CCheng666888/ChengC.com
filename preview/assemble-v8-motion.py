"""Assemble actual browser captures, preserving capture timing, for visual review."""
from pathlib import Path
from PIL import Image
import json

folder=Path(__file__).resolve().parent
files=sorted(folder.glob('v8-water-frame-*.jpg'))
times=json.loads((folder/'v8-water-times.json').read_text())
assert len(files)==len(times)>1
frames=[Image.open(p).convert('RGB').resize((960,540),Image.Resampling.LANCZOS) for p in files]
durations=[max(20,min(500,b-a)) for a,b in zip(times,times[1:])]+[500]
output=folder/'scene-v8-motion.webp'
frames[0].save(output,save_all=True,append_images=frames[1:],duration=durations,loop=0,quality=80,method=4)
print('Actual browser animation:',len(frames),'frames,',sum(durations),'ms,',output.stat().st_size,'bytes')
