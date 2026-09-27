"""Render the Android mipmaps from the matching vector icon geometry."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
scale = 4
image = Image.new('RGBA', (512 * scale, 512 * scale), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
s = lambda x: round(x * scale)
draw.rounded_rectangle((0, 0, s(512), s(512)), radius=s(108), fill='#101216')
draw.line((s(84), s(370), s(428), s(142)), fill='#ed3948', width=s(24), joint='curve')
draw.ellipse((s(208), s(208), s(304), s(304)), fill='#101216', outline='white', width=s(15))
draw.ellipse((s(240), s(240), s(272), s(272)), fill='#ed3948')
for density, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    target = root / f'android/app/src/main/res/mipmap-{density}/ic_launcher.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(target)
