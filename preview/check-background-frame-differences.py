"""Measure saved browser screenshots; never access or modify browser internals."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json

directory = Path(__file__).resolve().parent
water_rectangle = (120, 430, 960, 610)  # Excludes birds, text and all controls at 1280 x 720.
results = {}
for mode in ['day-running', 'day-ambient', 'day-paused', 'night-running']:
    frames = [Image.open(directory / f'local-background-{mode}-{suffix}.jpg').convert('RGB')
              for suffix in ['a', 'b']]
    assert all(frame.size == (1280, 720) for frame in frames)
    difference = ImageChops.difference(*[frame.crop(water_rectangle) for frame in frames])
    changed = sum(max(pixel) > 5 for pixel in difference.get_flattened_data())
    results[mode] = {'water_pixels_changed_over_5': round(100 * changed / (840 * 180), 2),
                     'mean_absolute_rgb_difference': round(sum(ImageStat.Stat(difference).mean) / 3, 3)}
assert results['day-paused']['water_pixels_changed_over_5'] == 0, 'Paused water changed.'
for mode in ['day-running', 'day-ambient', 'night-running']:
    assert results[mode]['water_pixels_changed_over_5'] > 10, f'{mode} appears static.'
results['scope'] = 'HTTP browser preview using embedded photos, not direct file-origin verification.'
(directory / 'background-frame-check-v5.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(results, ensure_ascii=False))
