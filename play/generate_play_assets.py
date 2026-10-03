"""Generate Google Play listing graphics from the Ašis vector geometry."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out = Path(__file__).resolve().parent
scale = 4
size = 512 * scale
image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
s = lambda value: round(value * scale)
draw.rounded_rectangle((0, 0, s(512), s(512)), radius=s(108), fill='#101216')
draw.line((s(84), s(370), s(428), s(142)), fill='#ed3948', width=s(24), joint='curve')
draw.ellipse((s(208), s(208), s(304), s(304)), fill='#101216', outline='#ffffff', width=s(15))
draw.ellipse((s(240), s(240), s(272), s(272)), fill='#ed3948')
image.resize((512, 512), Image.Resampling.LANCZOS).save(out / 'asis-icon-512.png')

graphic = Image.new('RGB', (1024, 500), '#101216')
g = ImageDraw.Draw(graphic)
g.line((570, 410, 960, 100), fill='#ed3948', width=23, joint='curve')
g.ellipse((710, 215, 806, 311), fill='#101216', outline='#ffffff', width=14)
g.ellipse((744, 249, 772, 277), fill='#ed3948')
g.rectangle((80, 90, 150, 98), fill='#ed3948')
bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 86)
regular = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 34)
g.text((76, 120), 'Ašis', font=bold, fill='#ffffff')
g.text((80, 290), 'Geodezinė vieta\nir piketažas', font=regular, fill='#d6dce3', spacing=10)
graphic.save(out / 'asis-feature-1024x500.png')
