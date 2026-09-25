"""Render the Android mipmaps from the matching vector icon geometry."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
scale = 4
image = Image.new('RGBA', (512 * scale, 512 * scale), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
s = lambda x: round(x * scale)
draw.rounded_rectangle((0, 0, s(512), s(512)), radius=s(108), fill='#101216')
draw.line((s(256), s(70), s(256), s(442)), fill='#ed3948', width=s(16))
for y in (155, 332):
    draw.line((s(181), s(y), s(331), s(y)), fill='#ed3948', width=s(11))
draw.ellipse((s(225), s(213), s(287), s(275)), fill='#101216', outline='white', width=s(11))
draw.rounded_rectangle((s(113), s(362), s(399), s(433)), radius=s(15), fill='#242a30', outline='#ed3948', width=s(4))
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s(40))
draw.text((s(256), s(397)), 'PK 0+00', font=font, fill='white', anchor='mm')
for density, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    target = root / f'android/app/src/main/res/mipmap-{density}/ic_launcher.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    image.resize((size, size), Image.Resampling.LANCZOS).save(target)
