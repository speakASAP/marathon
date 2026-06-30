from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


OUT = Path("/private/tmp/marathon-certificate-from-source")
SRC = Path("/var/folders/mg/j43_tvc53kzfxcggj49_b3_00000gn/T/TemporaryItems/NSIRD_screencaptureui_i5UUSi/Screenshot 2026-06-30 at 12.36.45.png")
CLEAN = Path("/Users/Sergej.Stasok/.codex/generated_images/019f181a-df9b-78c0-8a34-2d35762588b4/ig_0c75383276eb0e07016a439e5fce788191814bb18c8bf728fb.png")

W, H = 936, 1320
INK = (126, 91, 36, 255)
WHITE_STROKE = (248, 242, 220, 165)
FONT_GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
FONT_GEORGIA_ITALIC = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
FONT_TIMES_BOLD = "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf"


def f(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def center(d: ImageDraw.ImageDraw, text: str, y: int, font, fill=INK, stroke=0):
    box = d.textbbox((0, 0), text, font=font, stroke_width=stroke)
    d.text(((W - (box[2] - box[0])) / 2, y), text, font=font, fill=fill, stroke_width=stroke, stroke_fill=WHITE_STROKE)


def prepare_base() -> Image.Image:
    base = Image.open(CLEAN).convert("RGBA").resize((W, H), Image.Resampling.LANCZOS)
    extend_watermarks(base)
    base.save(OUT / "certificate-base-clean-from-your-image.png")
    return base


def watermark_patch(source: Image.Image, box: tuple[int, int, int, int], rotate: int = 0, flip: bool = False) -> Image.Image:
    patch = source.crop(box).convert("RGBA")
    if flip:
        patch = ImageOps.mirror(patch)
    if rotate:
        patch = patch.rotate(rotate, expand=True, resample=Image.Resampling.BICUBIC)

    gray = patch.convert("L")
    local = gray.filter(ImageFilter.GaussianBlur(28))
    diff = ImageChops.subtract(gray, local)
    alpha = diff.point(lambda p: max(0, min(58, int((p - 18) * 2.7))))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))

    edge = Image.new("L", patch.size, 0)
    ed = ImageDraw.Draw(edge)
    feather = 42
    ed.rectangle((feather, feather, patch.width - feather, patch.height - feather), fill=255)
    edge = edge.filter(ImageFilter.GaussianBlur(feather / 2))
    alpha = ImageChops.multiply(alpha, edge)

    white = Image.new("RGBA", patch.size, (255, 255, 250, 0))
    white.putalpha(alpha)
    return white


def extend_watermarks(base: Image.Image) -> None:
    source = base.copy()
    pattern = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    seed_a = watermark_patch(source, (570, 105, 865, 475))
    seed_b = watermark_patch(source, (575, 120, 870, 470), rotate=-4, flip=True)

    # Continue the existing pale damask as a background pattern across the full
    # certificate interior, using only motifs extracted from the supplied PNG.
    for row, y in enumerate(range(70, H - 170, 205)):
        for col, x in enumerate(range(74, W - 230, 235)):
            seed = seed_a if (row + col) % 2 == 0 else seed_b
            tile = seed.copy()
            if col % 2:
                tile = ImageOps.mirror(tile)
            if row % 2:
                tile = ImageOps.flip(tile)
            if (row + col) % 3 == 1:
                tile = tile.rotate(7, expand=True, resample=Image.Resampling.BICUBIC)
            elif (row + col) % 3 == 2:
                tile = tile.rotate(-6, expand=True, resample=Image.Resampling.BICUBIC)

            opacity = 0.34 if 270 < y < 910 else 0.46
            if row in (0, 5) or col in (0, 3):
                opacity *= 0.9
            a = tile.getchannel("A").point(lambda p, op=opacity: int(p * op))
            tile.putalpha(a)
            pattern.alpha_composite(tile, (x - 85, y - 70))

    # Keep the watermark inside the parchment background and away from the gold
    # ornament/text strokes by allowing it only over already-light pixels.
    mask = Image.new("L", (W, H), 0)
    mp = mask.load()
    px = source.convert("RGB").load()
    for y in range(22, H - 22):
        for x in range(22, W - 22):
            r, g, b = px[x, y]
            if r > 176 and g > 168 and b > 145 and max(r, g, b) - min(r, g, b) < 44:
                mp[x, y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    alpha = ImageChops.multiply(pattern.getchannel("A"), mask)
    pattern.putalpha(alpha)
    base.alpha_composite(pattern)


def extract_gold_trophy() -> Image.Image:
    src = Image.open(SRC).convert("RGBA")
    crop = src.crop((315, 525, 620, 820)).convert("RGBA")
    hsv = crop.convert("HSV")
    pix = crop.load()
    hpix = hsv.load()
    alpha = Image.new("L", crop.size, 0)
    ap = alpha.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = pix[x, y]
            h, s, v = hpix[x, y]
            goldish = s > 42 and v > 35 and not (r > 232 and g > 226 and b > 205)
            dark_edge = v < 110 and s > 18
            if goldish or dark_edge:
                ap[x, y] = 255
    alpha = alpha.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.45))
    crop.putalpha(alpha)
    bbox = crop.getbbox()
    trophy = crop.crop(bbox) if bbox else crop
    trophy = trophy.resize((250, int(trophy.height * 250 / trophy.width)), Image.Resampling.LANCZOS)
    trophy.save(OUT / "trophy-gold-from-your-image-transparent.png")
    return trophy


def recolor_trophy(gold: Image.Image, mode: str) -> Image.Image:
    rgba = gold.convert("RGBA")
    gray = rgba.convert("LA")
    if mode == "silver":
        color = Image.new("RGBA", rgba.size, (210, 210, 205, 255))
        shaded = Image.merge("RGBA", (*gray.split()[:1] * 3, rgba.getchannel("A")))
        out = Image.blend(color, shaded, 0.68)
        out.putalpha(rgba.getchannel("A"))
    elif mode == "bronze":
        base = Image.new("RGBA", rgba.size, (158, 86, 42, 255))
        shaded = Image.merge("RGBA", (*gray.split()[:1] * 3, rgba.getchannel("A")))
        out = Image.blend(base, shaded, 0.48)
        out = ImageEnhance.Color(out).enhance(1.25)
        out.putalpha(rgba.getchannel("A"))
    else:
        out = rgba
    out.save(OUT / f"trophy-{mode}-from-your-image-transparent.png")
    return out


def make_overlay(tone: str, trophy: Image.Image) -> Image.Image:
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    award = {
        "gold": "Золотым кубком",
        "silver": "Серебряным кубком",
        "bronze": "Бронзовым кубком",
    }[tone]
    center(d, award, 485, f(FONT_GEORGIA_BOLD, 42), stroke=1)
    ov.alpha_composite(trophy, ((W - trophy.width) // 2, 555))
    center(d, "{{ИМЯ УЧАСТНИКА}}", 820, f(FONT_TIMES_BOLD, 55), stroke=1)
    center(d, "За успешный забег по", 900, f(FONT_GEORGIA_BOLD, 36), stroke=0)
    center(d, "{{ЯЗЫК}} языку", 944, f(FONT_GEORGIA_BOLD, 36), stroke=0)
    d.text((163, 1019), "{{ПОДПИСЬ}}", font=f(FONT_GEORGIA_ITALIC, 28), fill=INK, stroke_width=1, stroke_fill=WHITE_STROKE)
    d.line((160, 1050, 370, 1050), fill=INK, width=2)
    center(d, "{{ДАТА}}", 1038, f(FONT_GEORGIA_BOLD, 31), stroke=0)
    d.line((565, 1050, 766, 1050), fill=INK, width=2)
    d.rectangle((205, 1100, 731, 1194), fill=(245, 240, 221, 130))
    d.line((205, 1150, 731, 1150), fill=INK, width=2)
    center(d, "{{SITE_URL}}", 1155, f(FONT_GEORGIA_ITALIC, 35), stroke=1)
    ov.save(OUT / f"overlay-fields-{tone}-from-your-image.png")
    return ov


def make_svg():
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <image href="certificate-base-clean-from-your-image.png" x="0" y="0" width="{W}" height="{H}"/>
  <style>
    .ink {{ fill:#7e5b24; font-family: Georgia, "Times New Roman", serif; }}
    .center {{ text-anchor: middle; }}
    .bold {{ font-weight:700; }}
    .italic {{ font-style:italic; }}
    .line {{ stroke:#7e5b24; stroke-width:2; }}
  </style>
  <text id="award_title" class="ink center bold" x="468" y="527" font-size="42">Золотым кубком</text>
  <image id="trophy" href="trophy-gold-from-your-image-transparent.png" x="343" y="555" width="250" height="242"/>
  <text id="recipient_name" class="ink center bold" x="468" y="863" font-size="55">{{{{ИМЯ УЧАСТНИКА}}}}</text>
  <text class="ink center bold" x="468" y="929" font-size="36">За успешный забег по</text>
  <text id="language" class="ink center bold" x="468" y="974" font-size="36">{{{{ЯЗЫК}}}} языку</text>
  <text id="signature" class="ink italic" x="163" y="1048" font-size="28">{{{{ПОДПИСЬ}}}}</text>
  <line class="line" x1="160" y1="1050" x2="370" y2="1050"/>
  <text id="date" class="ink center bold" x="468" y="1069" font-size="31">{{{{ДАТА}}}}</text>
  <line class="line" x1="565" y1="1050" x2="766" y2="1050"/>
  <rect x="205" y="1100" width="526" height="94" fill="#f5f0dd" opacity=".52"/>
  <line class="line" x1="205" y1="1150" x2="731" y2="1150"/>
  <text id="site_url" class="ink center italic" x="468" y="1184" font-size="35">{{{{SITE_URL}}}}</text>
</svg>
'''
    (OUT / "certificate-editable-from-your-image.svg").write_text(svg, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    base = prepare_base()
    gold = extract_gold_trophy()
    trophies = {tone: recolor_trophy(gold, tone) for tone in ("gold", "silver", "bronze")}
    for tone, trophy in trophies.items():
        overlay = make_overlay(tone, trophy)
        composed = base.copy()
        composed.alpha_composite(overlay)
        composed.save(OUT / f"certificate-template-{tone}-from-your-image.png")
    make_svg()
    spec = {
        "source": str(SRC),
        "canvas": {"width": W, "height": H},
        "base": "certificate-base-clean-from-your-image.png",
        "overlays": {
            "gold": "overlay-fields-gold-from-your-image.png",
            "silver": "overlay-fields-silver-from-your-image.png",
            "bronze": "overlay-fields-bronze-from-your-image.png",
        },
        "fields": [
            {"id": "award_title", "x": 468, "y": 527, "anchor": "center"},
            {"id": "trophy", "x": 343, "y": 555, "width": 250},
            {"id": "recipient_name", "x": 468, "y": 863, "anchor": "center"},
            {"id": "language", "x": 468, "y": 974, "anchor": "center"},
            {"id": "signature", "x": 163, "y": 1048, "anchor": "left"},
            {"id": "date", "x": 468, "y": 1069, "anchor": "center"},
            {"id": "site_url", "x": 468, "y": 1184, "anchor": "center"},
        ],
    }
    (OUT / "certificate-layers-from-your-image.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "README.md").write_text(
        "# Шаблон диплома из предоставленного PNG\n\n"
        "Сделано из вашего скриншота, размер приведен к исходным 936x1320 px.\n\n"
        "- `certificate-base-clean-from-your-image.png` — очищенная база из вашего диплома.\n"
        "- `certificate-template-gold-from-your-image.png`, `certificate-template-silver-from-your-image.png`, `certificate-template-bronze-from-your-image.png` — готовые варианты.\n"
        "- `overlay-fields-*-from-your-image.png` — прозрачные слои для наложения на базу.\n"
        "- `trophy-*-from-your-image-transparent.png` — кубки на прозрачном фоне; золотой извлечен из исходного PNG.\n"
        "- `certificate-editable-from-your-image.svg` — редактируемый шаблон поверх базы.\n"
        "- `certificate-layers-from-your-image.json` — координаты слоев.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
