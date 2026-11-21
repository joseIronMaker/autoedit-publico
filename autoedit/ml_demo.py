"""Escena 'ml_demo': un DEMO REAL de machine learning tradicional (numpy + sklearn +
matplotlib/seaborn) dentro de un video. El código del guion se EJECUTA de verdad y su
gráfica real entra al video — es "input original" (lo que crece en 2026), no un dibujo.

La escena se ve como un editor: el código se escribe (typing) → "ejecuta" → revela la
gráfica real generada por el modelo. Ideal para explicar IA predictiva/ML clásico
(regresión, clasificación, clustering) mostrando que de verdad predice.

Esquema en el guion:
    {"narration": "...", "visual_type": "ml_demo",
     "ml_demo": {
        "code": "reg = LinearRegression().fit(X, y)\\nplot(...)",   # SE EJECUTA (ver preámbulo)
        "display_code": ["reg = LinearRegression().fit(X, y)", "reg.predict(...)"],  # opcional
        "caption": "sklearn — resultado real"}}                     # opcional

El preámbulo inyecta backend Agg + la paleta sobria de marca + numpy/plt/sns/sklearn y la ruta
OUT; el ``code`` solo construye el/los modelo(s) y su figura. Si no llama a savefig, se
guarda la figura actual en OUT automáticamente.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import Callable

WIDTH, HEIGHT, FPS = 1080, 1920, 30
MONO = None  # se resuelve en _mono_font()

# preámbulo: paleta sobria de marca + helpers; el código del guion corre debajo de esto
_PREAMBLE = r'''
import matplotlib
matplotlib.use("Agg")
import numpy as np
import matplotlib.pyplot as plt
try:
    import seaborn as sns
    sns.set_theme(style="dark")
except Exception:
    sns = None
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline

# PALETA SOBRIA — mismos NOMBRES de siempre (el código generado los usa) con valores
# apagados, para que la gráfica case con el resto del video y no grite neón.
BG="#121318"; CYAN="#8CA5B2"; ORANGE="#D08A60"; MAG="#AC9EC4"
GREEN="#8CB084"; RED="#C66864"; TXT="#EEECE8"
plt.rcParams.update({
    "figure.facecolor":BG,"axes.facecolor":BG,"savefig.facecolor":BG,
    "text.color":TXT,"axes.labelcolor":TXT,"xtick.color":TXT,"ytick.color":TXT,
    "axes.edgecolor":"#3a3c44","grid.color":"#23242b","font.size":20,
    "axes.titlesize":30,"axes.titleweight":"bold","font.weight":"bold"})
_CYCLE = [CYAN, ORANGE, MAG, GREEN, RED]
try:
    plt.rcParams["axes.prop_cycle"] = plt.cycler(color=_CYCLE)
except Exception:
    pass
rng = np.random.default_rng(7)
'''

# La figura del guion se escribe pensando en pantalla ancha; el video es 9:16. Antes de
# guardar se ajusta: (1) se estira a vertical para no dejar media pantalla negra y
# (2) los títulos largos encogen o se parten para NO encimarse entre subplots vecinos
# (matplotlib centra el título sobre su eje y lo deja invadir al de al lado).
_EPILOGUE = r'''
import matplotlib.pyplot as _plt
if _plt.get_fignums():
    _fig = _plt.gcf()
    try:
        _w, _h = _fig.get_size_inches()
        if _w / max(_h, 1e-6) > 1.02:          # figura ancha → cuadrada (9:16)
            _fig.set_size_inches(_w, _w, forward=True)
        _fig.canvas.draw()
        _r = _fig.canvas.get_renderer()
        for _ax in _fig.axes:
            _t = _ax.get_title()
            if not _t:
                continue
            _lim = _ax.get_window_extent().width * 1.02
            for _fs in (30, 27, 24, 21, 19, 17):
                _ax.title.set_fontsize(_fs)
                if _ax.title.get_window_extent(_r).width <= _lim:
                    break
            else:                               # ni al mínimo cabe → dos líneas
                _p = _t.split()
                _i = max(1, len(_p) // 2)
                _ax.set_title("\n".join([" ".join(_p[:_i]), " ".join(_p[_i:])]),
                              fontsize=21)
        _fig.tight_layout(pad=1.1)
    except Exception:
        pass
    _fig.savefig(OUT, dpi=170, bbox_inches="tight", pad_inches=0.25)
'''


def _mono_font(size: int):
    from PIL import ImageFont
    global MONO
    if MONO is None:
        try:
            import matplotlib.font_manager as fm
            MONO = fm.findfont(fm.FontProperties(family="DejaVu Sans Mono"))
        except Exception:  # noqa: BLE001
            MONO = "DejaVuSansMono.ttf"
    return ImageFont.truetype(MONO, size)


def run_model_code(code: str, out_png: Path, timeout: int = 90) -> Path:
    """Ejecuta el código del guion (con el preámbulo de marca) en un subproceso y guarda la
    gráfica en ``out_png``. Lanza si el código falla o no produce figura."""
    out_png.parent.mkdir(parents=True, exist_ok=True)
    script = out_png.parent / f"_mlrun_{out_png.stem}.py"
    body = f'OUT = {str(out_png)!r}\n{_PREAMBLE}\n{code}\n{_EPILOGUE}\n'
    script.write_text(body, encoding="utf-8")
    r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True,
                       timeout=timeout)
    script.unlink(missing_ok=True)
    if not out_png.exists():
        raise RuntimeError(f"ml_demo: el código no generó figura.\n{r.stderr[-500:]}")
    return out_png


# ─────────────────────────── editor de código (syntax) ───────────────────────────
_KW = {"import", "from", "as", "def", "return", "for", "in", "if", "else", "None",
       "True", "False", "with", "lambda", "and", "or", "not", "class"}
_API = {"np", "plt", "sns", "fit", "predict", "score", "LinearRegression", "rng",
        "LogisticRegression", "Ridge", "KMeans", "RandomForestClassifier",
        "RandomForestRegressor", "PolynomialFeatures", "make_pipeline", "scatter",
        "plot", "contourf", "contour", "array", "reshape", "linspace", "arange"}
_TOK = re.compile(r"(#.*$)|('[^']*'|\"[^\"]*\")|(\b\d+\.?\d*\b)|(\w+)|(\s+)|(.)")


def _color_tokens(line: str):
    # paleta sobria del editor (misma familia que diagrams.THEMES)
    CYAN = (140, 165, 178); ORANGE = (208, 138, 96); MAG = (172, 158, 196)
    GREEN = (140, 176, 132); GRAY = (120, 120, 126); WHITE = (232, 230, 226)
    out = []
    for m in _TOK.finditer(line):
        comment, string, num, word, ws, other = m.groups()
        if comment is not None:
            out.append((comment, GRAY))
        elif string is not None:
            out.append((string, GREEN))
        elif num is not None:
            out.append((num, MAG))
        elif word is not None:
            col = ORANGE if word in _KW else CYAN if word in _API else WHITE
            out.append((word, col))
        elif ws is not None:
            out.append((ws, WHITE))
        else:
            out.append((other, WHITE))
    return out


def _editor_size(draw, display) -> int:
    """Cuerpo de letra que hace CABER la línea más larga (antes se cortaba a la derecha:
    'olvido = sigmoid(...)  # 0 = borra, 1 =' en ln07, 28-jul)."""
    largo = max((len(l) for l in display), default=1)
    for size in range(35, 21, -1):
        ch = draw.textlength("M", font=_mono_font(size))
        if 62 + ch * 4 + ch * largo <= WIDTH - 42:
            return size
    return 22


def _draw_editor(draw, display, k, caption, cursor_on, top, size: int = 35):
    """Dibuja el editor con las primeras ``k`` de ``display`` líneas. ``top`` = y del bloque."""
    from PIL import ImageFont
    f = _mono_font(size)
    fb = _mono_font(38)
    ch_w = draw.textlength("M", font=f)
    lh = int(round(size * 52 / 35))
    bar_h = 74
    panel_h = len(display) * lh + 44
    x0 = 62
    y0 = top + bar_h + 26
    # barra de título
    draw.rounded_rectangle([30, top, WIDTH - 30, top + bar_h], radius=16, fill=(34, 36, 42))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse([56 + i * 42, top + 26, 82 + i * 42, top + 52], fill=c)
    draw.text((196, top + 18), f"▶ python · {caption}", font=fb, fill=(160, 178, 190))
    # panel de código
    draw.rounded_rectangle([30, top + bar_h + 6, WIDTH - 30, top + bar_h + 6 + panel_h],
                           radius=16, fill=(22, 23, 28))
    for r in range(k):
        line = display[r]
        y = y0 + r * lh
        draw.text((x0, y), f"{r + 1:>2}", font=f, fill=(96, 96, 104))
        x = x0 + int(ch_w * 4)
        for text, col in _color_tokens(line):
            draw.text((x, y), text, font=f, fill=col)
            x += int(draw.textlength(text, font=f))
    if cursor_on and k:
        y = y0 + (k - 1) * lh
        cx = x0 + int(ch_w * 4) + int(draw.textlength(display[k - 1], font=f))
        draw.rectangle([cx + 4, y + 4, cx + 20, y + 40], fill=(200, 176, 128))


def render_ml_demo_scene(spec: dict, voz_path, dur: float, seg, gcfg: dict,
                         on_step: Callable[[str, str], None] = lambda s, d: None):
    """Renderiza la escena ml_demo (código→gráfica) con audio ``voz_path`` → ``seg``."""
    from PIL import Image, ImageDraw

    seg = Path(seg)
    work = seg.parent
    caption = spec.get("caption", "sklearn")
    on_step("ml_demo", "ejecutando modelo real (sklearn)")
    plot_png = run_model_code(spec["code"], work / f"_mlplot_{seg.stem}.png")
    plot = Image.open(plot_png).convert("RGB")
    # CAJA SEGURA 9:16: debajo del encabezado y ARRIBA de los subtítulos. La gráfica se
    # escala para LLENARLA (limitada por ancho o por alto) y se centra ahí: pegada al
    # borde superior dejaba ~60 % de la pantalla en negro.
    box_top, box_bot = 190, 1470
    pw = WIDTH - 80
    ph = int(plot.height * pw / plot.width)
    if ph > box_bot - box_top:
        ph = box_bot - box_top
        pw = int(plot.width * ph / plot.height)
    plot_r = plot.resize((pw, ph), Image.LANCZOS)
    py = box_top + (box_bot - box_top - ph) // 2

    display = spec.get("display_code") or [l for l in spec["code"].splitlines()
                                           if l.strip()][:11]
    n = int(round(dur * FPS))
    # Fracción del tiempo en el editor antes de pasar a la gráfica. El 0.44 por defecto es
    # para temas donde el CÓDIGO es el contenido (ML, programación). En un tema que no es de
    # programar, 10s de Python en pantalla ahuyentan al espectador y contradicen el mandato
    # de José ("debería ser documental"): ahí se baja a ~0.2 y manda la gráfica, que es el
    # recibo de la medición. Se fija por escena con "editor_frac".
    switch = float(spec.get("editor_frac", 0.44))
    import math
    from PIL import Image as _Im, ImageDraw as _Dw
    ed_size = _editor_size(_Dw.Draw(_Im.new("RGB", (8, 8))), display)
    ed_lh = int(round(ed_size * 52 / 35))
    block_h = 80 + (len(display) * ed_lh + 44)
    top = max(120, int((1160 - block_h) / 2))    # bloque centrado en la zona alta (subs libres)
    fdir = work / f"_mld_{seg.stem}"
    fdir.mkdir(exist_ok=True)
    on_step("ml_demo", "animando código → gráfica")
    for i in range(n):
        p = i / max(1, n - 1)
        img = Image.new("RGB", (WIDTH, HEIGHT), (10, 11, 20))
        d = ImageDraw.Draw(img)
        if p < switch:
            # fase código: revela línea por línea (rápido) + cursor
            frac = min(1.0, p / (switch * 0.62))
            k = max(1, int(math.ceil(frac * len(display))))
            _draw_editor(d, display, k, caption, (i // 8) % 2 == 0, top, ed_size)
        else:
            # fase gráfica real (con leve zoom-in de vida)
            fb = _mono_font(38)
            # El sello "resultado REAL" solo vale si la gráfica sale de una MEDICIÓN.
            # Con curvas dibujadas a mano (parámetros elegidos para ilustrar) decir
            # "REAL" es mentirle al que mira — el canal se sostiene en lo verificable.
            sello = "esquema, no medición" if spec.get("esquema") else "resultado REAL"
            title = f"✓ {caption} — {sello}"
            d.text((46, 70), title, font=fb, fill=(140, 176, 132))
            # Ken Burns CONTINUO sobre toda la fase de gráfica. Antes el zoom era 5% repartido
            # en la mitad del tramo y luego quedaba congelado: con la gráfica ocupando 20s
            # (temas no-programación, editor_frac bajo) eso son 20 segundos sin cambio visual
            # y rompe la regla de los 3 segundos igual que una tarjeta fija.
            zt = (p - switch) / max(1e-3, 1.0 - switch)
            z = 0.98 + 0.10 * zt
            zw, zh = int(pw * z), int(ph * z)
            pr = plot_r.resize((zw, zh), Image.LANCZOS)
            img.paste(pr, ((WIDTH - zw) // 2, py + (ph - zh) // 2))
        img.save(fdir / f"f_{i:04d}.png")
    silent = work / f"_mld_{seg.stem}.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
         "-i", str(fdir / "f_%04d.png"), "-frames:v", str(n),
         "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), str(silent)],
        check=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(voz_path),
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-ar", "48000", "-shortest", str(seg)], check=True)
    for f in fdir.glob("*.png"):
        f.unlink()
    fdir.rmdir()
    silent.unlink(missing_ok=True)
    plot_png.unlink(missing_ok=True)
    return seg
