from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path.cwd()
SOURCE = ROOT / 'docs/assets/certificate-template'
FRONTEND_CERTS = ROOT / 'frontend/public/img/certificates'
PUBLIC_CERTS = ROOT / 'public/img/certificates'
EXAMPLES = FRONTEND_CERTS / 'examples'
PUBLIC_EXAMPLES = PUBLIC_CERTS / 'examples'
DOC_TEMPLATES = SOURCE / 'generated/templates'
DOC_EXAMPLES = SOURCE / 'generated/examples'
W, H = 936, 1320
CERTIFICATE_SIGNATURE = 'Елена Шипилова'
CERTIFICATE_SITE_URL = 'speakasap.com'
LEGACY_SEAL = 'legacy-marathon-seal.png'

FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'
FONT_ITALIC = '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf'

PALETTE = {
    'gold': {
        'ink': (126, 91, 36, 255),
        'dark': (86, 56, 20, 255),
        'mid': (150, 108, 38, 255),
        'light': (232, 194, 83, 255),
        'award': 'Золотым кубком',
        'demo': ('Елена Прекрасная', 'немецкому', '29.06.2026'),
    },
    'silver': {
        'ink': (91, 96, 98, 255),
        'dark': (66, 72, 75, 255),
        'mid': (130, 138, 142, 255),
        'light': (226, 229, 228, 255),
        'award': 'Серебряным кубком',
        'demo': ('Анна Быстрая', 'испанскому', '30.06.2026'),
    },
    'bronze': {
        'ink': (134, 73, 43, 255),
        'dark': (91, 47, 28, 255),
        'mid': (164, 89, 50, 255),
        'light': (220, 142, 92, 255),
        'award': 'Бронзовым кубком',
        'demo': ('Дмитрий Смелый', 'французскому', '01.07.2026'),
    },
}


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def fit_font(draw: ImageDraw.ImageDraw, text: str, font_path: str, size: int, max_width: int) -> ImageFont.FreeTypeFont:
    while size > 18:
        fnt = font(font_path, size)
        if draw.textlength(text, font=fnt) <= max_width:
            return fnt
        size -= 2
    return font(font_path, size)


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt: ImageFont.FreeTypeFont, fill, max_width: int | None = None, stroke_width: int = 0):
    if max_width:
        fnt = fit_font(draw, text, getattr(fnt, 'path', FONT_BOLD), fnt.size, max_width)
    box = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke_width)
    x = (W - (box[2] - box[0])) / 2
    draw.text((x, y), text, font=fnt, fill=fill, stroke_width=stroke_width, stroke_fill=(248, 242, 220, 150))


def centered_at(draw: ImageDraw.ImageDraw, text: str, center_x: int, y: int, fnt: ImageFont.FreeTypeFont, fill, max_width: int | None = None, stroke_width: int = 0):
    if max_width:
        fnt = fit_font(draw, text, getattr(fnt, 'path', FONT_BOLD), fnt.size, max_width)
    box = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke_width)
    x = center_x - (box[2] - box[0]) / 2
    draw.text((x, y), text, font=fnt, fill=fill, stroke_width=stroke_width, stroke_fill=(248, 242, 220, 150))


def recolor_base(base: Image.Image, tone: str) -> Image.Image:
    if tone == 'gold':
        return base.copy()
    pal = PALETTE[tone]
    img = base.convert('RGBA')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            if mx - mn > 16 and not (r > 218 and g > 211 and b > 190):
                lum = int(0.299 * r + 0.587 * g + 0.114 * b)
                if lum < 96:
                    target = pal['dark']
                elif lum < 170:
                    target = pal['mid']
                else:
                    target = pal['light']
                blend = 0.72 if tone == 'silver' else 0.82
                px[x, y] = (
                    int(r * (1 - blend) + target[0] * blend),
                    int(g * (1 - blend) + target[1] * blend),
                    int(b * (1 - blend) + target[2] * blend),
                    a,
                )
    if tone == 'silver':
        img = ImageEnhance.Color(img).enhance(0.72)
    elif tone == 'bronze':
        img = ImageEnhance.Color(img).enhance(1.16)
        img = ImageEnhance.Contrast(img).enhance(1.04)
    return img


def template_for(tone: str) -> Image.Image:
    pal = PALETTE[tone]
    base = Image.open(SOURCE / 'certificate-base-clean-from-user-reference.png').convert('RGBA').resize((W, H), Image.Resampling.LANCZOS)
    img = recolor_base(base, tone)
    d = ImageDraw.Draw(img)
    centered(d, pal['award'], 488, font(FONT_BOLD, 43), pal['ink'], stroke_width=1)

    trophy = Image.open(SOURCE / f'trophy-{tone}-transparent.png').convert('RGBA')
    trophy_w = 218
    trophy = trophy.resize((trophy_w, int(trophy.height * trophy_w / trophy.width)), Image.Resampling.LANCZOS)
    img.alpha_composite(trophy, ((W - trophy.width) // 2, 548))

    d.line((160, 1054, 370, 1054), fill=pal['ink'], width=2)
    d.line((565, 1054, 766, 1054), fill=pal['ink'], width=2)
    seal = Image.open(SOURCE / LEGACY_SEAL).convert('RGBA')
    seal_size = 148
    seal = seal.resize((seal_size, seal_size), Image.Resampling.LANCZOS)
    seal = ImageEnhance.Color(seal).enhance(1.2)
    seal = ImageEnhance.Contrast(seal).enhance(1.15)
    alpha = seal.getchannel('A').point(lambda value: min(255, int(value * 1.35)))
    seal.putalpha(alpha)
    img.alpha_composite(seal, ((W - seal_size) // 2, 1062 - seal_size // 2))
    return img


def draw_fields(img: Image.Image, tone: str, name: str, language_dative: str, date: str) -> Image.Image:
    pal = PALETTE[tone]
    out = img.copy()
    d = ImageDraw.Draw(out)
    ink = pal['ink']
    stroke = (248, 242, 220, 160)

    name_font = fit_font(d, name, FONT_BOLD, 44, int(W * 0.68))
    box = d.textbbox((0, 0), name, font=name_font, stroke_width=1)
    d.text(((W - (box[2] - box[0])) / 2, 812), name, font=name_font, fill=ink, stroke_width=1, stroke_fill=stroke)

    centered(d, 'За успешный забег по', 895, font(FONT_BOLD, 30), ink)
    centered(d, f'{language_dative} языку', 937, font(FONT_BOLD, 30), ink)
    d.text((165, 1022), CERTIFICATE_SIGNATURE, font=font(FONT_ITALIC, 24), fill=ink, stroke_width=1, stroke_fill=stroke)
    centered_at(d, date, 665, 1018, font(FONT_BOLD, 27), ink, max_width=190)
    centered(d, CERTIFICATE_SITE_URL, 1132, font(FONT_ITALIC, 30), ink, stroke_width=1)
    return out


def main() -> None:
    for directory in (FRONTEND_CERTS, PUBLIC_CERTS, EXAMPLES, PUBLIC_EXAMPLES, DOC_TEMPLATES, DOC_EXAMPLES):
        directory.mkdir(parents=True, exist_ok=True)

    for tone in ('gold', 'silver', 'bronze'):
        template = template_for(tone)
        template.save(FRONTEND_CERTS / f'{tone}_en.png')
        template.save(PUBLIC_CERTS / f'{tone}_en.png')
        template.save(DOC_TEMPLATES / f'{tone}_en.png')
        name, language, date = PALETTE[tone]['demo']
        demo = draw_fields(template, tone, name, language, date)
        demo.save(EXAMPLES / f'{tone}_demo.png')
        demo.save(PUBLIC_EXAMPLES / f'{tone}_demo.png')
        demo.save(DOC_EXAMPLES / f'{tone}_demo.png')

    readme = '''# Certificate assets

Runtime templates:
- `gold_en.png`
- `silver_en.png`
- `bronze_en.png`

These are empty medal-specific templates. They include the frame, award title, trophy, and signature/date guide lines, but not participant-specific name/language/date text.

Demo homepage images are generated by `docs/assets/certificate-template/generate_certificate_assets.py` into `examples/*_demo.png` with mock participant data.

Real participant certificates are generated in the browser from these templates by `frontend/src/certificateRenderer.ts` using participant name, language/marathon copy, and finish date.
'''
    (FRONTEND_CERTS / 'README.md').write_text(readme, encoding='utf-8')
    (PUBLIC_CERTS / 'README.md').write_text(readme, encoding='utf-8')


if __name__ == '__main__':
    main()
