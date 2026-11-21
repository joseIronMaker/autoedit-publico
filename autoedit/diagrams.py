"""Animaciones programadas (Rama A): flow, list, compare, bars, neural_net y big_text.

Se dibujan frame a frame con PIL: aparición con rebote (ease-out-back), flotación sutil,
fondo con degradado + brillo que deriva. Todo el contenido vive ARRIBA de content_bottom
(~70% de la altura) para no mezclarse jamás con los subtítulos.
"""
from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

_ASSETS = Path(__file__).resolve().parent / "assets"
FONT_BOLD = str(_ASSETS / "Anton-Regular.ttf")  # display de marca (títulos, big_text, números)
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"  # cuerpo legible

# Colores activos (se sobreescriben por _apply_theme en cada render según el tema del video).
# PALETA SOBRIA (feedback de José 11-ago-2026: "esos fondos fosforescentes no van, mejor
# sobrios"). El look pasa de neón saturado a documental: fondos de grafito/tinta con muy poca
# saturación y acentos apagados. El contraste lo da el VALOR (claro sobre oscuro), no el brillo.
BG_TOP = (30, 32, 38)       # grafito
BG_BOTTOM = (18, 19, 24)    # tinta
CARD = (40, 43, 50)
CARD_ALT = (32, 34, 41)
ACCENT = (222, 176, 92)     # ámbar apagado (editorial, no fluorescente)
ACCENT2 = (140, 165, 178)   # azul acero
TEXT = (238, 236, 232)      # hueso cálido
MUTED = (150, 148, 145)
RED = (198, 104, 100)       # ladrillo, no rojo láser
GREEN = (140, 176, 132)     # salvia, no verde lima

CONTENT_BOTTOM = 0.70  # nada de contenido debajo de esta fracción (zona de subtítulos)

# Paletas de marca (regla Kurzgesagt: paleta LIMITADA). Una por video para variar el mood
# entre videos sin perder coherencia dentro de cada uno. El contraste lo da el VALOR, no la
# saturación: fondo oscuro y desaturado, un acento cálido y otro frío, ambos apagados.
THEMES = {
    # PALETA SOBRIA. Se conservan las CLAVES (los guiones ya escritos las piden por nombre)
    # pero los valores pasaron de jewel tones saturados a grafito/tinta con acentos apagados.
    # Regla: saturación baja en el fondo, contraste por VALOR, un solo acento cálido por tema.
    "neon":    {"bg_top": (30, 32, 38),  "bg_bottom": (18, 19, 24),  "accent": (222, 176, 92),
                "accent2": (140, 165, 178), "card": (40, 43, 50), "card_alt": (32, 34, 41)},
    "cyber":   {"bg_top": (26, 34, 46),  "bg_bottom": (15, 19, 27),  "accent": (154, 182, 202),
                "accent2": (208, 168, 110), "card": (36, 46, 60), "card_alt": (26, 33, 44)},
    "matrix":  {"bg_top": (26, 36, 34),  "bg_bottom": (16, 21, 21),  "accent": (150, 186, 158),
                "accent2": (205, 178, 120), "card": (34, 46, 44), "card_alt": (24, 32, 31)},
    "sunset":  {"bg_top": (44, 32, 30),  "bg_bottom": (24, 18, 19),  "accent": (208, 138, 96),
                "accent2": (196, 176, 148), "card": (54, 40, 37), "card_alt": (36, 27, 26)},
    "violeta": {"bg_top": (36, 32, 46),  "bg_bottom": (20, 18, 26),  "accent": (172, 158, 196),
                "accent2": (212, 178, 120), "card": (46, 41, 58), "card_alt": (31, 28, 39)},
    "ambar":   {"bg_top": (40, 33, 24),  "bg_bottom": (22, 18, 15),  "accent": (224, 172, 88),
                "accent2": (176, 122, 82),  "card": (50, 41, 30), "card_alt": (33, 27, 21)},
    "menta":   {"bg_top": (24, 34, 38),  "bg_bottom": (15, 20, 23),  "accent": (140, 186, 180),
                "accent2": (206, 178, 126), "card": (32, 44, 48), "card_alt": (22, 30, 33)},
    "carmin":  {"bg_top": (44, 28, 32),  "bg_bottom": (23, 16, 19),  "accent": (198, 116, 116),
                "accent2": (202, 180, 142), "card": (54, 35, 39), "card_alt": (35, 23, 26)},
    "hielo":   {"bg_top": (28, 34, 44),  "bg_bottom": (16, 20, 26),  "accent": (168, 192, 208),
                "accent2": (222, 222, 218), "card": (38, 45, 57), "card_alt": (25, 30, 38)},
    "selva":   {"bg_top": (26, 36, 30),  "bg_bottom": (16, 22, 19),  "accent": (152, 180, 138),
                "accent2": (206, 172, 112), "card": (34, 46, 38), "card_alt": (23, 31, 26)},
    # el CURSO de Python: la misma que Remotion aplica por defecto (dorado sobre grafito), para
    # que un diagrama que caiga a PIL no salga violeta junto a las animaciones doradas
    "curso python con ia": {"bg_top": (30, 32, 38), "bg_bottom": (18, 19, 24), "accent": (222, 176, 92),
                            "accent2": (140, 165, 178), "card": (40, 43, 50), "card_alt": (32, 34, 41)},
}


def _apply_theme(name: str) -> None:
    """Fija la paleta activa del render según el tema del video (globals leídos por el dibujo)."""
    global BG_TOP, BG_BOTTOM, ACCENT, ACCENT2, CARD, CARD_ALT
    # "indigo" dejó de existir con la paleta sobria y un guion con un theme que no es
    # nombre de paleta ("curso python con ia") reventaba aquí con KeyError
    th = THEMES.get(name) or THEMES.get("violeta") or next(iter(THEMES.values()))
    BG_TOP, BG_BOTTOM = th["bg_top"], th["bg_bottom"]
    ACCENT, ACCENT2 = th["accent"], th["accent2"]
    CARD, CARD_ALT = th["card"], th["card_alt"]


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, max(1, int(size)))


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _smooth(t: float, start: float, dur: float = 0.45) -> float:
    x = _clamp01((t - start) / dur)
    return x * x * (3 - 2 * x)


def _back(t: float, start: float, dur: float = 0.55) -> float:
    """ease-out-back: llega con un rebote que se pasa un poco y regresa."""
    x = _clamp01((t - start) / dur)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int, max_lines: int = 3) -> list[str]:
    return _wrap_full(draw, text, font, max_w)[:max_lines]


def _wrap_full(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    """Envuelve SIN límite de líneas; trocea palabras más anchas que la caja."""
    words: list[str] = []
    for w_ in str(text).split():
        if draw.textlength(w_, font=font) > max_w:
            chunk = ""
            for ch in w_:
                if draw.textlength(chunk + ch, font=font) > max_w and chunk:
                    words.append(chunk)
                    chunk = ch
                else:
                    chunk += ch
            if chunk:
                words.append(chunk)
        else:
            words.append(w_)
    lines, cur = [], ""
    for word in words:
        cand = f"{cur} {word}".strip()
        if draw.textlength(cand, font=font) <= max_w:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def _fit(draw, text: str, max_w: int, max_h: int, base: int, min_size: int,
         bold: bool = False, lf: float = 1.35):
    """Busca el tamaño de fuente más grande con el que el texto COMPLETO cabe.
    Solo si ni el mínimo alcanza, trunca con '…' visible (nunca a media frase muda)."""
    size = base
    while size >= min_size:
        f = _font(size, bold)
        lines = _wrap_full(draw, text, f, max_w)
        lh = int(size * lf)
        if len(lines) * lh <= max_h:
            return f, lines, lh
        size -= 2
    f = _font(min_size, bold)
    lines = _wrap_full(draw, text, f, max_w)
    lh = int(min_size * lf)
    keep = max(1, max_h // lh)
    if len(lines) > keep:
        lines = lines[:keep]
        lines[-1] = lines[-1].rstrip(".,;: ") + "…"
    return f, lines, lh


def _bg_context(w: int, h: int) -> dict:
    """Precomputa (una vez) el degradado base + 2 sprites de glow difuminados para animar el fondo."""
    base = Image.new("RGB", (w, h))
    px = base.load()
    for y in range(h):
        f = y / h
        row = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * f) for i in range(3))
        for x in range(w):
            px[x, y] = row

    def sprite(color, cx, cy, r, alpha):
        s = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(s).ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, alpha))
        return s.filter(ImageFilter.GaussianBlur(int(w * 0.10)))

    # Glows DISCRETOS. Antes iban a alfa 165/150/90 y el fondo salía fosforescente —
    # feedback de José (11-ago-2026): "esos fondos fosforescentes no van, mejor sobrios".
    # Aquí solo dan profundidad: se notan como una veladura, no como una lámpara.
    return {
        "base": base.convert("RGBA"),
        "g1": sprite(ACCENT, int(w * 0.82), int(h * 0.12), int(w * 0.64), 46),
        "g2": sprite(ACCENT2, int(w * 0.14), int(h * 0.60), int(w * 0.60), 40),
        "g3": sprite(ACCENT, int(w * 0.55), int(h * 0.42), int(w * 0.52), 26),
    }


def _frame_bg(ctx: dict, t: float, w: int, h: int) -> Image.Image:
    """Fondo del frame: base + glows a la deriva (senoidal desfasado) + partículas lentas.
    Esto mata el 'fondo congelado' — el delator #1 del look de plantilla."""
    img = ctx["base"].copy()
    for key, fx, fy, sp in (("g1", 0.06, 0.03, 0.11), ("g2", 0.05, 0.05, 0.08), ("g3", 0.045, 0.05, 0.06)):
        dx = int(math.sin(2 * math.pi * sp * t) * w * fx)
        dy = int(math.cos(2 * math.pi * sp * 0.8 * t) * h * fy)
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        layer.paste(ctx[key], (dx, dy), ctx[key])
        img = Image.alpha_composite(img, layer)
    # Partículas: de 22 puntos de colores a 9 motas tenues del mismo tono del texto. Antes
    # se leían como confeti de neón sobre el degradado; el fondo tiene que dar profundidad,
    # no competir con el contenido.
    d = ImageDraw.Draw(img)
    for i in range(9):
        px_ = (i * 131 % 100) / 100 * w + math.cos(0.15 * t + i * 1.3) * 24
        py_ = h * 0.06 + ((i * 71 % 100) / 100) * h * 0.62 + math.sin(0.2 * t + i) * 18
        rr = 2 + i % 3
        d.ellipse((px_ - rr, py_ - rr, px_ + rr, py_ + rr), fill=(*MUTED, 34))
    return img


def _title(layer: ImageDraw.ImageDraw, draw, title: str, t: float, w: int, h: int) -> int:
    """Título con barra de acento; devuelve la Y donde empieza el contenido."""
    ta = _smooth(t, 0.0)
    tb = _back(t, 0.0)
    tf, tlines, tlh = _fit(draw, title, int(w * 0.86), int(h * 0.09),
                           int(h * 0.034), int(h * 0.024), bold=True, lf=1.26)
    ty = int(h * 0.085) + int((1 - tb) * 40)
    for li, line in enumerate(tlines):
        lw = layer.textlength(line, font=tf)
        layer.text(((w - lw) / 2, ty + li * tlh), line, font=tf,
                   fill=(*TEXT, int(255 * ta)))
    bar_w = int(w * 0.26 * _back(t, 0.15))
    bar_y = ty + len(tlines) * tlh + 16
    if bar_w > 0:
        layer.rounded_rectangle((w // 2 - bar_w, bar_y, w // 2 + bar_w, bar_y + 9),
                                radius=5, fill=(*ACCENT, int(255 * ta)))
    return bar_y + int(h * 0.045)


def _float_y(t: float, i: int) -> int:
    # flotación sostenida (amplitud mayor + una segunda onda) para que nada quede congelado
    return int(9 * math.sin(2 * math.pi * 0.4 * t + i * 1.7)
               + 3 * math.sin(2 * math.pi * 0.9 * t + i))


def _rows(layer, draw, spec, t, w, h, top, dtype) -> None:
    items = [str(i) for i in spec.get("items", [])][:5]
    bottom = int(h * CONTENT_BOTTOM)
    n = max(1, len(items))
    # con 3 o menos filas la lista dejaba media pantalla vacía (visto en el curso, clase 3):
    # las filas crecen para ocupar la franja, y la letra con ellas
    tope = 0.125 if n > 3 else 0.17
    row_h = min(int(h * tope), (bottom - top) // n)
    nf = _font(int(h * (0.027 if n > 3 else 0.034)))
    box_w = int(w * 0.82)
    for i, item in enumerate(items):
        start = 0.5 + i * 0.55
        a = _smooth(t, start)
        if a <= 0:
            continue
        b = _back(t, start)
        y = top + i * row_h + int((1 - b) * 70) + _float_y(t, i)
        box_h = row_h - 24
        x0 = (w - box_w) // 2
        fill = CARD if i % 2 == 0 else CARD_ALT
        layer.rounded_rectangle((x0, y, x0 + box_w, y + box_h), radius=22,
                                fill=(*fill, int(240 * a)),
                                outline=(*ACCENT, int(150 * a)), width=3)
        r = int(box_h * 0.27)
        ccx, ccy = x0 + r + 28, y + box_h // 2
        layer.ellipse((ccx - r - 5, ccy - r - 5, ccx + r + 5, ccy + r + 5),
                      outline=(*ACCENT2, int(160 * a)), width=3)
        layer.ellipse((ccx - r, ccy - r, ccx + r, ccy + r), fill=(*ACCENT, int(255 * a)))
        num = str(i + 1)
        nw = layer.textlength(num, font=nf)
        layer.text((ccx - nw / 2, ccy - nf.size * 0.58), num, font=nf,
                   fill=(255, 255, 255, int(255 * a)))
        tx0 = ccx + r + 26
        f, lines, line_h = _fit(draw, item, x0 + box_w - tx0 - 26, box_h - 12,
                                int(h * 0.025), int(h * 0.016))
        th = len(lines) * line_h
        for li, line in enumerate(lines):
            layer.text((tx0, y + (box_h - th) // 2 + li * line_h),
                       line, font=f, fill=(*TEXT, int(255 * a)))
        if dtype == "flow" and i < n - 1:
            aa = _smooth(t, start + 0.35)
            if aa > 0:
                ax, ay = w // 2, y + box_h + 1
                layer.polygon([(ax - 18, ay + 3), (ax + 18, ay + 3), (ax, ay + 21)],
                              fill=(*ACCENT2, int(230 * aa)))


def _compare(layer, draw, spec, t, w, h, top) -> None:
    items = [str(i) for i in spec.get("items", [])][:6]
    bottom = int(h * CONTENT_BOTTOM)
    col_w = int(w * 0.43)
    lx, rx = int(w * 0.265), int(w * 0.735)
    hf = _font(int(h * 0.05), bold=False)  # DejaVu tiene ✗/✓; Anton no
    ha = _smooth(t, 0.3)
    hb = int((1 - _back(t, 0.3)) * 30)
    layer.text((lx - hf.size / 2, top + hb), "✗", font=hf, fill=(*RED, int(255 * ha)))
    layer.text((rx - hf.size / 2, top + hb), "✓", font=hf, fill=(*GREEN, int(255 * ha)))
    rows = max(1, (len(items) + 1) // 2)
    row_h = min(int(h * 0.13), (bottom - top - 90) // rows)
    for i, item in enumerate(items):
        start = 0.6 + i * 0.5
        a = _smooth(t, start)
        if a <= 0:
            continue
        b = _back(t, start)
        cx = lx if i % 2 == 0 else rx
        color = RED if i % 2 == 0 else GREEN
        y = top + 92 + (i // 2) * row_h + int((1 - b) * 55) + _float_y(t, i)
        box_h = row_h - 16
        layer.rounded_rectangle((cx - col_w // 2, y, cx + col_w // 2, y + box_h),
                                radius=18, fill=(*CARD, int(240 * a)))
        layer.rounded_rectangle((cx - col_w // 2, y, cx - col_w // 2 + 8, y + box_h),
                                radius=4, fill=(*color, int(220 * a)))
        f, lines, line_h = _fit(draw, item, col_w - 60, box_h - 12,
                                int(h * 0.021), int(h * 0.0145))
        th = len(lines) * line_h
        for li, line in enumerate(lines):
            lw = layer.textlength(line, font=f)
            layer.text((cx - lw / 2 + 4, y + (box_h - th) // 2 + li * line_h),
                       line, font=f, fill=(*TEXT, int(255 * a)))


def _big_text(layer, draw, spec, t, w, h, dur: float) -> None:
    """Frases gigantes secuenciales con pop; palabra final en color de acento."""
    items = [str(i) for i in spec.get("items", [])][:3]
    if not items:
        return
    slot = max(0.8, (dur * 0.9) / len(items))
    idx = min(int(t / slot), len(items) - 1)
    local_t = t - idx * slot
    # aparición CASI instantánea (nada de arranque vacío/negro): el texto está cargado desde el
    # frame ~2-3. Un arranque vacío mata la retención inicial, que es la señal #1 de 2026.
    a = _smooth(local_t, 0.0, 0.12)
    b = _back(local_t, 0.0, 0.30)
    words = items[idx].split()
    f, lines, line_h = _fit(draw, items[idx], int(w * 0.84), int(h * 0.28),
                            int(h * 0.052), int(h * 0.034), bold=True, lf=1.25)
    cy = int(h * 0.38) - (len(lines) * line_h) // 2 + int((1 - b) * 60)
    accent_word = words[-1] if words else ""
    for li, line in enumerate(lines):
        lw = layer.textlength(line, font=f)
        x = (w - lw) / 2
        for word in line.split():
            color = ACCENT2 if word == accent_word else TEXT
            layer.text((x, cy + li * line_h), word, font=f, fill=(*color, int(255 * a)))
            x += layer.textlength(word + " ", font=f)
    if a > 0.9:
        uw = int(w * 0.14)
        uy = cy + len(lines) * line_h + 22
        layer.rounded_rectangle((w // 2 - uw, uy, w // 2 + uw, uy + 10), radius=5,
                                fill=(*ACCENT, 255))


def _neural_net(layer, draw, spec, t, w, h, top) -> None:
    """Red neuronal animada: capas que aparecen y pulsos viajando entrada→salida."""
    layers = [max(1, min(6, int(n))) for n in (spec.get("layers") or [3, 4, 4, 2])][:5]
    if len(layers) < 2:
        layers = [3, 2]
    bottom = int(h * CONTENT_BOTTOM) - 60
    x0, x1 = int(w * 0.14), int(w * 0.86)
    L = len(layers)
    xs = [x0 + i * (x1 - x0) // (L - 1) for i in range(L)]
    r = max(14, min(30, int((bottom - top) / (max(layers) * 3))))

    def node_pos(li: int) -> list[tuple[int, int]]:
        n = layers[li]
        span = bottom - top
        gap = span // (n + 1)
        return [(xs[li], top + gap * (k + 1)) for k in range(n)]

    all_in = 0.4 + (L - 1) * 0.45 + 0.5
    phase = ((t - all_in) % 1.8) / 1.8 if t > all_in else -1
    active = int(phase * L) if phase >= 0 else -1

    # conexiones
    for li in range(L - 1):
        a = _smooth(t, 0.4 + (li + 1) * 0.45)
        if a <= 0:
            continue
        hot = li == active
        color = ACCENT2 if hot else MUTED
        alpha = int((170 if hot else 55) * a)
        for p1 in node_pos(li):
            for p2 in node_pos(li + 1):
                layer.line([p1, p2], fill=(*color, alpha), width=3 if hot else 2)
    # nodos
    for li in range(L):
        a = _smooth(t, 0.4 + li * 0.45)
        b = _back(t, 0.4 + li * 0.45)
        if a <= 0:
            continue
        hot = li == active or li == active + 1 and phase * L - active > 0.5
        rr = int(r * (0.5 + 0.5 * b) * (1.25 if li == active else 1.0))
        for (cx, cy) in node_pos(li):
            if li == active:
                layer.ellipse((cx - rr - 8, cy - rr - 8, cx + rr + 8, cy + rr + 8),
                              fill=(*ACCENT2, int(60 * a)))
            layer.ellipse((cx - rr, cy - rr, cx + rr, cy + rr),
                          fill=(*(ACCENT2 if li == active else CARD), int(255 * a)),
                          outline=(*ACCENT, int(220 * a)), width=3)
    # etiquetas
    lf = _font(int(h * 0.018), bold=False)
    la = _smooth(t, 0.5)
    for text, x in ((spec.get("in_label", "entrada"), xs[0]),
                    (spec.get("out_label", "salida"), xs[-1])):
        tw = layer.textlength(str(text), font=lf)
        layer.text((x - tw / 2, bottom + 24), str(text), font=lf,
                   fill=(*MUTED, int(255 * la)))


def _bars(layer, draw, spec, t, w, h, top) -> None:
    """Barras horizontales animadas para comparaciones con números."""
    items = spec.get("items") or []
    items = [it for it in items if isinstance(it, dict) and it.get("label")][:5]
    if not items:
        return
    vals = [abs(float(it.get("value", 1)) or 1) for it in items]
    vmax = max(vals)
    bottom = int(h * CONTENT_BOTTOM)
    row_h = min(int(h * 0.11), (bottom - top) // len(items))
    bar_h = int(row_h * 0.42)
    x0 = int(w * 0.10)
    max_w = int(w * 0.66)
    lf = _font(int(h * 0.02), bold=False)
    vf = _font(int(h * 0.022))
    for i, it in enumerate(items):
        start = 0.5 + i * 0.5
        a = _smooth(t, start)
        if a <= 0:
            continue
        b = _back(t, start, 0.7)
        y = top + i * row_h + _float_y(t, i)
        layer.text((x0, y), str(it["label"]), font=lf, fill=(*TEXT, int(255 * a)))
        by = y + int(lf.size * 1.5)
        bw_ = int(max_w * (vals[i] / vmax) * max(0.0, min(1.0, b)))
        color = ACCENT if i % 2 == 0 else ACCENT2
        layer.rounded_rectangle((x0, by, x0 + max(bw_, 8), by + bar_h),
                                radius=bar_h // 2, fill=(*color, int(235 * a)))
        val_txt = str(it.get("display", it.get("value", "")))
        vw = layer.textlength(val_txt, font=vf)
        vx = x0 + max(bw_, 8) + 16
        if vx + vw > w * 0.96:  # barra larga: el valor va dentro, alineado a la derecha
            vx = x0 + bw_ - vw - 20
            layer.text((vx, by + (bar_h - vf.size) // 2), val_txt, font=vf,
                       fill=(255, 255, 255, int(255 * a)))
        else:
            layer.text((vx, by + (bar_h - vf.size) // 2), val_txt, font=vf,
                       fill=(*TEXT, int(255 * a)))


def _outro(layer, draw, spec, t, w, h) -> None:
    """Cierre de marca: handle del canal + botón seguir."""
    handle = str(spec.get("handle", ""))
    sub = str(spec.get("sub", ""))
    a = _smooth(t, 0.1, 0.4)
    b = _back(t, 0.1, 0.55)
    f, lines, lh = _fit(draw, handle, int(w * 0.88), int(h * 0.16),
                        int(h * 0.058), int(h * 0.038), bold=True, lf=1.2)
    cy = int(h * 0.36) - (len(lines) * lh) // 2 + int((1 - b) * 70)
    for li, line in enumerate(lines):
        lw = layer.textlength(line, font=f)
        layer.text(((w - lw) / 2, cy + li * lh), line, font=f,
                   fill=(*ACCENT2, int(255 * a)))
    y = cy + len(lines) * lh + 18
    bar_w = int(w * 0.18 * _back(t, 0.35))
    if bar_w > 0:
        layer.rounded_rectangle((w // 2 - bar_w, y, w // 2 + bar_w, y + 9),
                                radius=5, fill=(*ACCENT, int(255 * a)))
    sa = _smooth(t, 0.55, 0.4)
    if sa > 0 and sub:
        sf = _font(int(h * 0.021), bold=False)
        sw = layer.textlength(sub, font=sf)
        layer.text(((w - sw) / 2, y + 34), sub, font=sf, fill=(*MUTED, int(255 * sa)))
    # botón "+ Seguir"
    ba = _smooth(t, 0.85, 0.4)
    bb = _back(t, 0.85, 0.55)
    if ba > 0:
        bf = _font(int(h * 0.024))
        txt = "+ Seguir"
        tw = layer.textlength(txt, font=bf)
        bw_, bh_ = int(tw + 70), int(bf.size * 2.1)
        bx, by = (w - bw_) // 2, y + 34 + 70 + int((1 - bb) * 40)
        layer.rounded_rectangle((bx, by, bx + bw_, by + bh_), radius=bh_ // 2,
                                fill=(*ACCENT, int(255 * ba)))
        layer.text((bx + 35, by + (bh_ - bf.size) // 2 - 2), txt, font=bf,
                   fill=(255, 255, 255, int(255 * ba)))


# ---------- Animaciones a medida: Gemini escribe el código ----------

CODE_PROMPT = '''Escribe una animación en Python para una escena de video vertical de \
divulgación de IA.

CONCEPTO A ANIMAR: {description}
NARRACIÓN de la escena (la animación debe ilustrarla): {narration}
DURACIÓN: {dur:.1f} segundos.

Define EXACTAMENTE esta función:

def draw(L, D, t, W, H):
    ...

- L: ImageDraw RGBA donde dibujas → L.ellipse(xy, fill=, outline=, width=), L.rectangle, \
L.rounded_rectangle(xy, radius=), L.line(puntos, fill=, width=), L.polygon(puntos, fill=), \
L.text((x,y), txt, font=, fill=), L.textlength(txt, font=). Colores RGBA: (r,g,b,alpha).
- D: ImageDraw solo para medir texto.
- t: segundos transcurridos (0 → {dur:.1f}). W, H: 1080, 1920.
- Helpers disponibles (globales): smooth(t, inicio, dur=0.45) y back(t, inicio, dur=0.55) \
easing 0→1 (back rebota); font(tamaño, bold=True); wrap(D, texto, font, ancho_max) → líneas; \
fit(D, texto, ancho_max, alto_max, tam_base, tam_min, bold=False, lf=1.35) → (font, líneas, alto_línea); \
math; paleta RGB: ACCENT (azul), ACCENT2 (teal), TEXT, MUTED, CARD, CARD_ALT, RED, GREEN.

REGLAS:
1. FRANJAS SEPARADAS, no se invaden nunca:
   - TÍTULO (si lo pones): SOLO entre y=H*0.06 y y=H*0.16. Una línea, MÁXIMO 4 PALABRAS
     CORTAS. Y tiene que CABER a lo ancho: mide con D.textlength antes de dibujarlo y baja
     el tamaño hasta que quepa entre x=W*0.08 y x=W*0.92. Un título que se sale por los
     lados arruina la escena (pasó dos veces; José: "la animación pedorra que hiciste").
   - CONTENIDO: SOLO entre y=H*0.20 y y=H*0.70. Ni un pixel del dibujo puede subir
     arriba de H*0.20 ni bajar de H*0.70 (ahí van los subtítulos).
   Si el contenido no cabe en esa franja, HAZLO MÁS CHICO o muestra menos elementos —
   jamás lo dejes crecer hacia el título. Un título encimado con el dibujo arruina la
   escena (pasó el 3-ago-2026 y José lo cachó: "la animación pedorra que hiciste").
2. LLENA ESA FRANJA. Es de 1080 de ancho por ~1230 de alto: es MUCHO espacio y tiene que \
verse OCUPADO. Esto se ve en un celular a un brazo de distancia — lo pequeño no se lee y \
aburre. Obligatorio:
   - los elementos principales ocupan al menos el 80% del ancho (de x≈W*0.08 a x≈W*0.92);
   - NADA de recuadros chiquitos centrados con aire negro alrededor;
   - texto de etiquetas: font(int(H*0.030)) como MÍNIMO, y el título font(int(H*0.045), \
bold=True);
   - líneas y bordes de 5 px para arriba (width=5+); un trazo de 1-2 px no se ve;
   - círculos/nodos de radio ≥ H*0.022.
2b. GRANDE PERO SIN CHOCAR. Al agrandar los elementos es facilísimo que se encimen o se
salgan; eso es peor que tenerlos chicos. Obligatorio:
   - NADA se sale del marco: todo entre x=W*0.06 y x=W*0.94;
   - NINGÚN elemento se encima con otro. Calcula las posiciones con separación explícita
     (por ejemplo, reparte en filas/columnas con un paso fijo) en vez de ponerlas a ojo;
   - antes de dibujar texto MIDE con D.textlength(txt, font=f) y, si no cabe en su caja,
     baja el tamaño de fuente o usa fit(...) — JAMÁS dejes que se corte;
   - si son muchas etiquetas, muestra MENOS elementos más grandes; nunca las apiles.
3. ANIMA con t: apariciones escalonadas (smooth/back con inicios distintos), movimiento \
continuo (math.sin/cos con t), pulsos. Nada debe quedar estático NI UN SEGUNDO — si un \
elemento ya llegó a su sitio, que siga latiendo, girando o desplazándose un poco.
3c. DIBUJA LO QUE SE TRANSFORMA, no un objeto quieto. Una animación sirve cuando algo
CAMBIA: se mueve, se apila, se apaga, se convierte en otra cosa. Si lo que hay que mostrar
es un OBJETO o un ESTADO (una cara con un recuadro, un ojo, una pantalla), la animación se
va a ver pobre — eso se resuelve con una foto, no con código. Y si dibujas una silueta o
una figura, que se reconozca: nada de amasijos de burbujas.
3b. NUNCA HAY PANTALLA VACÍA. En t=0 ya se ve el título y el primer elemento principal; \
el resto entra antes de t={dur:.1f}*0.5. Prohibido que la franja quede en fondo pelado en \
cualquier instante: si el espectador pausa donde sea, tiene que haber algo que mirar.
4. Incluye un título corto arriba si ayuda a entender.
5. Sin imports, sin bucles infinitos, máximo ~70 líneas. Texto EN ESPAÑOL, con acentos \
y ñ correctos. PROHIBIDO emoji y símbolos raros en el texto dibujado (la fuente no los \
tiene y salen como un cuadrito): usa palabras, flechas → y ✓/✗ como mucho.
5b. CERO CIFRAS INVENTADAS. No escribas porcentajes, multiplicadores, años ni cantidades \
que no aparezcan LITERALMENTE en la narración o en la descripción. El canal se sostiene \
en que sus números son verificables: si no te dieron el dato, la animación se explica sin \
número (tamaños, colores, posiciones).
6. Estética: fondo ya existe (oscuro); usa la paleta, bordes redondeados, glow con \
elipses de alpha bajo.

Devuelve SOLO el código dentro de un bloque ```python```.'''

# Builtins que puede usar una animación a medida. La lista corta hacía fallar el primer
# intento por cosas triviales ("NameError: name 'divmod' is not defined" al colocar una
# rejilla de N elementos, 11-ago-2026) y obligaba a una segunda llamada al modelo. Todas
# estas son puras: ninguna toca disco, red ni el intérprete.
_NOMBRES_SEGUROS = (
    "range", "len", "min", "max", "abs", "int", "float", "str", "enumerate",
    "zip", "round", "list", "dict", "tuple", "sorted", "sum", "bool", "reversed",
    "divmod", "pow", "any", "all", "set", "frozenset", "map", "filter", "slice",
    "chr", "ord", "repr", "format", "isinstance", "hash", "iter", "next",
)
_SAFE_BUILTINS = ({n: __builtins__[n] for n in _NOMBRES_SEGUROS if n in __builtins__}
                  if isinstance(__builtins__, dict)
                  else {n: b for n, b in vars(__builtins__).items() if n in _NOMBRES_SEGUROS})


_TOFU: dict[tuple[str, int], bytes] = {}


def _faltan_glifos(font, txt: str) -> bool:
    """True si a ``font`` le falta algún glifo del texto (lo pintaría como cuadrito).

    Se compara contra el .notdef de la propia fuente (U+E000, zona privada):
    si un carácter se dibuja idéntico a él, no existe en la fuente.
    """
    clave = (getattr(font, "path", ""), int(getattr(font, "size", 0)))
    patron = _TOFU.get(clave)
    if patron is None:
        try:
            patron = bytes(font.getmask(""))
        except Exception:  # noqa: BLE001
            patron = b""
        _TOFU[clave] = patron
    if not patron:
        return False
    for ch in set(txt):
        if ch.isspace() or ord(ch) < 0x80:
            continue
        try:
            if bytes(font.getmask(ch)) == patron:
                return True
        except Exception:  # noqa: BLE001
            continue
    return False


class _SafeDraw:
    """Envuelve un ImageDraw para que el código custom de Gemini no truene por
    geometría inválida en frames intermedios (x1<x0, y1<y0, radio excesivo):
    normaliza el bounding box y clampea el radio. Cualquier otra excepción de
    dibujo se traga (un elemento no pintado es mejor que tumbar el video)."""
    _BBOX = frozenset({"rectangle", "rounded_rectangle", "ellipse",
                       "arc", "chord", "pieslice"})

    def __init__(self, d):
        self._d = d

    def text(self, xy, txt, *args, font=None, **kwargs):
        """Dibuja texto cambiando de fuente si a la elegida le falta un glifo.

        Anton (la display de marca) NO tiene ✓ ni ✗: PIL pinta el .notdef, un
        cuadrito. Salió publicado en ln13 ('IRONÍA DETECTADA ▯', 29-jul). Si el
        texto trae algo que la fuente no soporta, se pinta con DejaVu, que sí
        cubre símbolos — feo es mejor que un cuadrito.
        """
        try:
            if font is not None and txt and _faltan_glifos(font, str(txt)):
                font = _font(getattr(font, "size", 40), bold=False)
        except Exception:  # noqa: BLE001 — nunca impedir el dibujo por esto
            pass
        try:
            return self._d.text(xy, txt, *args, font=font, **kwargs)
        except Exception:  # noqa: BLE001
            return None

    @staticmethod
    def _norm(xy):
        # acepta [x0,y0,x1,y1] o [(x0,y0),(x1,y1)]
        if len(xy) == 2 and hasattr(xy[0], "__len__"):
            (x0, y0), (x1, y1) = xy
        else:
            x0, y0, x1, y1 = xy
        if x1 < x0:
            x0, x1 = x1, x0
        if y1 < y0:
            y0, y1 = y1, y0
        return [x0, y0, x1, y1]

    def __getattr__(self, name):
        attr = getattr(self._d, name)
        if name not in self._BBOX:
            return attr

        def wrapped(xy, *args, **kwargs):
            try:
                box = self._norm(xy)
            except Exception:  # noqa: BLE001 — geometría no interpretable: no pintes
                return None
            if name == "rounded_rectangle":
                rmax = max(0.0, min(box[2] - box[0], box[3] - box[1]) / 2)
                if "radius" in kwargs:
                    kwargs["radius"] = max(0.0, min(kwargs["radius"], rmax))
                elif args:
                    args = (max(0.0, min(args[0], rmax)), *args[1:])
            try:
                return attr(box, *args, **kwargs)
            except Exception:  # noqa: BLE001
                return None

        return wrapped


MIN_TIPO = 34   # px en un lienzo 1080×1920; por debajo no se lee en un celular


def _font_legible(size, bold: bool = True):
    """font() del sandbox con PISO de tamaño: el modelo pide 18-20 px y en el
    celular no se lee (ln13, 29-jul). Se sube al mínimo legible."""
    return _font(max(MIN_TIPO, int(size or 0)), bold=bold)


def _compile_custom(code: str, dur: float):
    """Compila el código generado en un namespace restringido y devuelve draw()."""
    g = {
        "__builtins__": _SAFE_BUILTINS, "math": math,
        "smooth": _smooth, "back": _back, "fit": _fit, "font": _font_legible,
        "wrap": _wrap_full, "DUR": dur,
        "ACCENT": ACCENT, "ACCENT2": ACCENT2, "TEXT": TEXT, "MUTED": MUTED,
        "CARD": CARD, "CARD_ALT": CARD_ALT, "RED": RED, "GREEN": GREEN,
    }
    exec(code, g)  # noqa: S102 — código propio del pipeline, namespace restringido
    fn = g.get("draw")
    if not callable(fn):
        raise ValueError("el código no define draw(L, D, t, W, H)")
    return fn


def _probe_custom(fn, w: int, h: int, dur: float) -> None:
    """Ejecuta draw() muestreando toda la duración (no solo 3 instantes): así se
    detectan errores dependientes de t que no sean de geometría (ya saneada por
    _SafeDraw), para reintentar con Gemini o caer al fallback."""
    steps = 16
    for i in range(steps + 1):
        t = dur * i / steps
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        probe = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        fn(_SafeDraw(ImageDraw.Draw(overlay)), _SafeDraw(ImageDraw.Draw(probe)), t, w, h)


def _sin_glifos_rotos(code: str) -> str:
    """Quita emoji del código dibujado: la fuente no los tiene y salen como ▯
    (pasó en ln13, tarjeta 'IRONÍA DETECTADA' con un cuadrito delante)."""
    # (no se toca el espaciado: es código Python, la indentación es sintaxis)
    return "".join(c for c in code if ord(c) < 0x2500 or 0x2713 <= ord(c) <= 0x2717)


def build_custom_spec(description: str, narration: str, router, gcfg: dict,
                      dur: float) -> dict:
    """Pide el código de la animación (Codex primero, Gemini de respaldo), lo valida
    con un reintento devolviéndole el error, y si no lo logra cae a big_text.

    El mandato de José es delegar el CÓDIGO DE ANIMACIONES a Codex (plan ChatGPT,
    costo 0). Hasta el 30-jul solo las imágenes iban por ahí y esto lo escribía
    Gemini, gastando créditos sin necesidad.
    """
    import re as _re
    import tempfile

    w, h = gcfg["width"], gcfg["height"]
    prompt = CODE_PROMPT.format(description=description, narration=narration, dur=dur)
    last_err = ""
    for attempt in range(2):
        try:
            pedido = (prompt if attempt == 0 else
                      prompt + f"\n\nTu intento anterior falló con este error, corrígelo:\n{last_err}")
            text = ""
            try:
                from .codex_client import codex_available, codex_code

                if codex_available():
                    with tempfile.TemporaryDirectory() as tmp:
                        text = codex_code(pedido, tmp)
            except Exception as e:  # noqa: BLE001 — codex caído: sigue Gemini
                print(f"  aviso: codex no pudo escribir la animación ({e}); uso Gemini")
            if not text:
                text = router.generate_text(pedido)
            m = _re.search(r"```(?:python)?\s*(.*?)```", text, _re.S)
            code = _sin_glifos_rotos((m.group(1) if m else text).strip())
            _chicas = sorted({int(v) for v in _re.findall(r"font\(\s*(\d+)\s*[,)]", code)
                              if int(v) < 44})
            if _chicas:
                raise ValueError(
                    f"tipografía ilegible: usas font({_chicas}) en un lienzo de 1080×1920. "
                    f"Mínimo font(58) para etiquetas y font(86) para el título; "
                    f"si no cabe, MUESTRA MENOS ELEMENTOS, no letra más chica.")
            fn = _compile_custom(code, dur)
            _probe_custom(fn, w, h, dur)
            return {"type": "custom", "_fn": fn, "_code": code}
        except Exception as e:  # noqa: BLE001 — reintento con el error
            last_err = f"{type(e).__name__}: {e}"
            print(f"  aviso: animación custom falló (intento {attempt + 1}): {last_err}")
    # fallback: frases de impacto desde la narración
    frases = [s.strip() for s in narration.replace("!", ".").split(".") if s.strip()][:2]
    return {"type": "big_text", "items": frases or [description[:40]]}


def custom_spec_from_code(code: str, dur: float, gcfg: dict) -> dict:
    """Compila y valida una animación custom escrita a mano (por Claude), SIN Gemini.
    Mismo sandbox y helpers que las de Gemini. Lanza si el código no define/ejecuta draw()."""
    fn = _compile_custom(code, dur)
    _probe_custom(fn, gcfg["width"], gcfg["height"], dur)
    return {"type": "custom", "_fn": fn, "_code": code}


def _render_frame(spec: dict, t: float, w: int, h: int, dur: float, ctx: dict) -> Image.Image:
    img = _frame_bg(ctx, t, w, h)
    draw = ImageDraw.Draw(img)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer = ImageDraw.Draw(overlay)
    dtype = spec.get("type", "list")

    if dtype == "custom":
        try:
            spec["_fn"](_SafeDraw(layer),
                        _SafeDraw(ImageDraw.Draw(Image.new("RGBA", (1, 1)))), t, w, h)
        except Exception:  # noqa: BLE001 — un frame malo jamás debe tumbar el video
            pass
    elif dtype == "outro":
        _outro(layer, draw, spec, t, w, h)
    elif dtype == "big_text":
        _big_text(layer, draw, spec, t, w, h, dur)
    else:
        top = _title(layer, draw, spec.get("title", ""), t, w, h)
        if dtype == "compare":
            _compare(layer, draw, spec, t, w, h, top)
        # dtype "prompt" ELIMINADO (11-ago-2026): dibujaba una ventana de chat falsa que se
        # usaba como respaldo de screen_demo y violaba la regla de realidad. Una herramienta
        # real se graba de verdad o el video se detiene; no se ilustra.
        elif dtype == "neural_net":
            _neural_net(layer, draw, spec, t, w, h, top)
        elif dtype == "bars":
            _bars(layer, draw, spec, t, w, h, top)
        else:  # list / flow
            _rows(layer, draw, spec, t, w, h, top, dtype)

    # Halo SUAVE, no bloom. Antes eran dos capas borrosas compuestas a alfa COMPLETO: los
    # elementos emitían luz y el resultado era el look fosforescente que José rechazó
    # (11-ago-2026). Ahora el desenfoque solo asienta las formas sobre el fondo — se ve como
    # una sombra difusa, no como un letrero de neón.
    def _atenua(capa, factor: float):
        r, g, b, a = capa.split()
        return Image.merge("RGBA", (r, g, b, a.point(lambda v: int(v * factor))))

    img = Image.alpha_composite(img, _atenua(overlay.filter(ImageFilter.GaussianBlur(26)), 0.22))
    img = Image.alpha_composite(img, _atenua(overlay.filter(ImageFilter.GaussianBlur(9)), 0.14))
    return Image.alpha_composite(img, overlay)


def render_diagram_scene(spec: dict, voz: Path, dur: float, out: Path, gcfg: dict) -> None:
    """Renderiza la animación como segmento mp4 con la narración como audio."""
    w, h, fps = gcfg["width"], gcfg["height"], gcfg["fps"]
    frames_dir = out.parent / f"{out.stem}_frames"
    frames_dir.mkdir(exist_ok=True)
    _apply_theme(spec.get("theme", "indigo"))   # paleta de marca del video
    ctx = _bg_context(w, h)
    n_frames = max(1, int(dur * fps))
    try:
        if spec.get("_pil"):
            # MARCADOR de una escena que después sustituye una captura o una foto: un solo
            # cuadro en bucle. Renderizar los 450 cuadros con desenfoque tardaba 8 min por
            # escena (clase 17) para un video que se tira.
            _render_frame(spec, dur / 2, w, h, dur, ctx).convert("RGB").save(
                frames_dir / "f_00000.png", compress_level=1)
            entrada = ["-loop", "1", "-framerate", str(fps), "-i", str(frames_dir / "f_00000.png")]
        else:
            for fidx in range(n_frames):
                frame = _render_frame(spec, fidx / fps, w, h, dur, ctx)
                frame.convert("RGB").save(frames_dir / f"f_{fidx:05d}.png", compress_level=1)
            entrada = ["-framerate", str(fps), "-i", str(frames_dir / "f_%05d.png")]
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", *entrada,
             "-i", str(voz),
             "-vf", "format=yuv420p", "-af", "apad=pad_dur=1.6",
             "-map", "0:v", "-map", "1:a",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
             "-t", f"{dur:.3f}", str(out)],
            check=True, timeout=600,
        )
    finally:
        shutil.rmtree(frames_dir, ignore_errors=True)
