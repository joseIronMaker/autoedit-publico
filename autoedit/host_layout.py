"""Formato 'presentador retención' (validado en el 1er video de la serie).

El ROSTRO real de José (D-ID, ver ``host.py``) aparece en el HOOK y el CTA compuesto así:
    ┌──────────────────────────┐  banda superior: animación de MARCA (motion) — 2 nodos,
    │   animación de marca      │  bookmark, etc. Da retención mientras habla.
    ├──────────────────────────┤  línea de acuerdo (glow de marca)
    │        tu rostro          │  banda inferior: cara con aire (blurred-fill + nítida
    │      (con aire)           │  centrada). El mentón queda ARRIBA de la zona de
    └──────────────────────────┘  subtítulos (marginV) → la boca nunca se tapa.

El cuerpo del video sigue faceless (b-roll/diagramas). Los subtítulos karaoke los quema
la Rama B como pase global (por eso el rostro también los lleva).

Encapsula:
- ``build_host_segment`` — compone una escena presentador (D-ID + top + delogo + duración
  frame-exacta) lista para concatenar con las demás escenas del pipeline.
- ``render_top`` — banda superior animada según ``host_top`` del guion (kind 'duo'|'save').
- ``continuous_base_audio`` — reconstruye la pista del base como PCM continuo (elimina los
  micro-huecos de priming AAC en las uniones: audio sin cortes en las transiciones).

D-ID Lite deja marca de agua (esquina inf-izq) que el plan no quita; se elimina con
``delogo`` (interpola el fondo). Ver memoria host-talking-avatar-arquitectura.
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path
from typing import Callable

WIDTH, HEIGHT, FPS, TOP_H = 1080, 1920, 30, 660
# logo D-iD del plan Lite: región a interpolar (esquina inferior izquierda), en 1080x1920
_DELOGO = "delogo=x=4:y=1762:w=232:h=150"
ANTON = str(Path(__file__).parent / "assets" / "Anton-Regular.ttf")


# ───────────────────────── colores de marca (tema del video) ─────────────────────────
def _theme(gcfg: dict) -> dict:
    """Colores del tema (mismos que los diagramas del cuerpo, para cohesión)."""
    from .diagrams import THEMES

    name = gcfg.get("theme")
    if name not in THEMES:
        name = "sunset"
    th = THEMES[name]
    return {
        "bg_top": tuple(th["bg_top"]), "bg_bot": tuple(th["bg_bottom"]),
        "acc": tuple(th["accent"]), "acc2": tuple(th["accent2"]),
        "text": (245, 245, 247),
    }


# ───────────────────────────── animación banda superior ──────────────────────────────
def _smooth(t: float, d: float, dur: float = 0.45) -> float:
    x = max(0.0, min(1.0, (t - d) / dur))
    return x * x * (3 - 2 * x)


def _back(t: float, d: float, dur: float = 0.5) -> float:
    x = max(0.0, min(1.0, (t - d) / dur))
    c1 = 1.70158
    return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2


def render_top(host_top: dict, n_frames: int, gcfg: dict, out_mp4: Path) -> Path:
    """Renderiza la banda superior animada (1080xTOP_H, sin audio).

    host_top: {"kind": "duo", "labels": ["PREDICE","CREA"], "title": "2 IAs DISTINTAS"}
           o {"kind": "save", "title": "GUÁRDALO", "subtitle": "MAÑANA: LA PREDICTIVA →"}
           o {"kind": "headline", "lines": ["MEJOR QUE GPT", "PERO GRATIS"]} → Remotion
    """
    # titular de hook (estilo evidencia): banda Remotion; si falla cae al title PIL
    if host_top.get("kind") == "headline":
        try:
            from .remotion_scenes import remotion_available, render_top_band

            if remotion_available():
                return render_top_band(
                    {**host_top, "theme": gcfg.get("theme", "violeta")}, n_frames, out_mp4)
        except Exception as e:  # noqa: BLE001
            print(f"  aviso: TopBand Remotion falló ({e}); uso banda PIL")
        host_top = {**host_top, "title": " · ".join(host_top.get("lines") or [])[:26]}
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

    C = _theme(gcfg)
    kind = host_top.get("kind", "title")

    def grad():
        bg = Image.new("RGB", (WIDTH, TOP_H))
        px = bg.load()
        for y in range(TOP_H):
            f = y / TOP_H
            row = tuple(int(C["bg_top"][i] + (C["bg_bot"][i] - C["bg_top"][i]) * f) for i in range(3))
            for x in range(WIDTH):
                px[x, y] = row
        return bg

    def glow(base, cx, cy, r, col, a=120):
        g = Image.new("RGBA", (WIDTH, TOP_H), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse([cx - r, cy - r, cx + r, cy + r], fill=col + (a,))
        g = g.filter(ImageFilter.GaussianBlur(max(1, int(r * 0.5))))
        return Image.alpha_composite(base.convert("RGBA"), g).convert("RGB")

    def fuente_que_cabe(texto: str, tam: int, ancho_max: int, d):
        """El tamaño más grande que CABE. Sin esto, un título largo se sale del
        cuadro por los dos lados (José lo cachó en el cierre de la serie 3,
        2-ago-2026: 'CÓMO LA IA APRENDIÓ A VER' cortado en cada fotograma)."""
        while tam > 28:
            f = ImageFont.truetype(ANTON, tam)
            if d.textlength(texto, font=f) <= ancho_max:
                return f
            tam -= 2
        return ImageFont.truetype(ANTON, 28)

    def txt_c(d, cx, y, s, font, fill, ow=4):
        w = d.textlength(s, font=font)
        for dx in (-ow, 0, ow):
            for dy in (-ow, 0, ow):
                d.text((cx - w / 2 + dx, y + dy), s, font=font, fill=(0, 0, 0))
        d.text((cx - w / 2, y), s, font=font, fill=fill)

    def sparks(img, t):
        d = ImageDraw.Draw(img)
        for i in range(14):
            sx = int(WIDTH * ((i * 0.17 + t * 0.03) % 1))
            sy = int(110 + 420 * ((i * 0.29 + math.sin(t * 0.8 + i)) % 1))
            d.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=C["acc"] if i % 2 else C["acc2"])
        return img

    def draw_duo(t):
        img = sparks(grad(), t)
        d = ImageDraw.Draw(img)
        labels = (host_top.get("labels") or ["", ""])[:2]
        for cx, col, lab, delay in [(300, C["acc"], labels[0], 0.15),
                                    (780, C["acc2"], labels[1] if len(labels) > 1 else "", 0.3)]:
            ap = _back(t, delay)
            r = int(72 * ap * (1 + 0.10 * math.sin(t * 3 + cx)))
            if r > 4:
                img = glow(img, cx, 250, r, col)
                d = ImageDraw.Draw(img)
                d.ellipse([cx - r, 250 - r, cx + r, 250 + r], fill=col)
                if lab:
                    lf = ImageFont.truetype(ANTON, 40)
                    txt_c(d, cx, 224, lab, lf, (12, 12, 22), ow=0)
        an = _smooth(t, 0.5)
        if an > 0.02:
            txt_c(d, 540, 205, "≠", ImageFont.truetype(ANTON, int(90 * an)), C["text"], ow=3)
        at = _smooth(t, 0.55)
        if at > 0.02 and host_top.get("title"):
            txt_c(d, 540, 470, host_top["title"],
                  fuente_que_cabe(host_top["title"], 80, 980, d), C["text"], ow=4)
        return img

    def draw_save(t):
        img = sparks(grad(), t)
        d = ImageDraw.Draw(img)
        ap = _back(t, 0.12)
        if ap > 0.05:
            bw, bh = int(90 * ap), int(120 * ap * (1 + 0.08 * math.sin(t * 3)))
            bx, by = 540 - bw // 2, 84
            img = glow(img, 540, 84 + bh // 2, int(bh * 0.7), C["acc"], 90)
            d = ImageDraw.Draw(img)
            d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=12, fill=C["acc"])
            d.polygon([(bx, by + bh), (bx + bw // 2, by + bh - 34), (bx + bw, by + bh)],
                      fill=C["bg_top"])
        ag = _smooth(t, 0.25)
        if ag > 0.02 and host_top.get("title"):
            txt_c(d, 540, 276, host_top["title"],
                  fuente_que_cabe(host_top["title"], 104, 980, d), C["text"], ow=5)
        am = _smooth(t, 0.6)
        if am > 0.02 and host_top.get("subtitle"):
            off = int((1 - am) * 60)
            txt_c(d, 540 + off, 442, host_top["subtitle"],
                  fuente_que_cabe(host_top["subtitle"], 50, 960, d), C["acc"], ow=3)
        return img

    def draw_title(t):
        img = sparks(grad(), t)
        d = ImageDraw.Draw(img)
        a = _smooth(t, 0.2)
        if a > 0.02 and host_top.get("title"):
            txt_c(d, 540, 300, host_top["title"],
                  fuente_que_cabe(host_top["title"], 92, 980, d), C["text"], ow=5)
        return img

    drawer = {"duo": draw_duo, "save": draw_save}.get(kind, draw_title)
    fdir = out_mp4.parent / f"_top_{out_mp4.stem}_frames"
    fdir.mkdir(exist_ok=True)
    for i in range(n_frames):
        drawer(i / FPS).save(fdir / f"f_{i:04d}.png")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
         "-i", str(fdir / "f_%04d.png"), "-frames:v", str(n_frames),
         "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), str(out_mp4)],
        check=True)
    for f in fdir.glob("*.png"):
        f.unlink()
    fdir.rmdir()
    return out_mp4


# ─────────────────────────────── composite de escena ─────────────────────────────────
def _delogo_pad(raw: Path, out: Path, target_frames: int | None) -> Path:
    """delogo (quita marca D-iD) + escala/crop a 1080x1920; opcional relleno frame-exacto
    (congela último frame + silencio) para calzar la duración del pipeline."""
    vf = (f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
          f"crop={WIDTH}:{HEIGHT},{_DELOGO},fps={FPS},format=yuv420p")
    args = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw)]
    if target_frames:
        dur = target_frames / FPS + 0.0005
        vf += ",tpad=stop_mode=clone:stop_duration=1"
        args += ["-vf", vf, "-af", "apad", "-t", f"{dur:.4f}"]
    else:
        args += ["-vf", vf]
    args += ["-r", str(FPS), "-c:v", "libx264", "-crf", "18", "-preset", "medium",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(out)]
    subprocess.run(args, check=True, timeout=900)
    return out


def _face_band(src: Path, out: Path) -> Path:
    """Banda inferior (1080 x HEIGHT-TOP_H): fondo desenfocado oscuro + cara nítida con aire."""
    band_h = HEIGHT - TOP_H
    fc = (f"[0:v]scale={WIDTH}:{band_h}:force_original_aspect_ratio=increase,"
          f"crop={WIDTH}:{band_h},gblur=sigma=30,eq=brightness=-0.28[bg];"
          f"[0:v]scale=-2:1220[fg];[bg][fg]overlay=(W-w)/2:20[v]")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-filter_complex", fc,
         "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-crf", "18",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-r", str(FPS), str(out)], check=True)
    return out


def _composite(top: Path, face_band: Path, out: Path, seam_col: str) -> Path:
    """vstack top(TOP_H)+face(band) + línea de acuerdo con glow; audio del rostro."""
    fc = (f"[0:v][1:v]vstack=inputs=2[s];"
          f"[s]drawbox=y={TOP_H - 3}:w={WIDTH}:h=6:color={seam_col}@0.85:t=fill,"
          f"format=yuv420p[v]")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(top), "-i", str(face_band),
         "-filter_complex", fc, "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-crf", "18",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-r", str(FPS), str(out)], check=True)
    return out


def build_host_segment(voz_path: Path, out_seg: Path, gcfg: dict, host_top: dict,
                       image_path: str | None = None, target_frames: int | None = None,
                       on_step: Callable[[str, str], None] = lambda s, d: None) -> Path:
    """Compone una escena presentador lista para concatenar: rostro D-ID (lip-sync de
    ``voz_path``) abajo + animación de marca (``host_top``) arriba, sin marca de agua y
    con duración frame-exacta si se pasa ``target_frames``."""
    from .host import talking_host

    work = out_seg.parent
    stem = out_seg.stem
    # el lip-sync depende SOLO de (audio, rostro): si ya se pagó, se reusa. Cambiar el
    # texto de la banda superior no vuelve a gastar créditos D-ID (mandato de José).
    raw = work / f"_host_raw_{stem}.mp4"
    cara = image_path or gcfg.get("host_image", "branding/host_jose.png")
    import hashlib
    firma = hashlib.sha1(voz_path.read_bytes() + str(cara).encode()).hexdigest()
    firma_f = work / f"_host_raw_{stem}.sha1"
    if raw.exists() and firma_f.exists() and firma_f.read_text().strip() == firma:
        on_step("anfitrión", "reutilizo el talking-head ya pagado (D-ID)")
    else:
        on_step("anfitrión", "generando talking-head (D-ID)")
        talking_host(str(voz_path), str(raw), image_path=cara)
        firma_f.write_text(firma)
    face = _delogo_pad(raw, work / f"_host_face_{stem}.mp4", target_frames)
    n_frames = int(round(target_frames)) if target_frames else \
        int(subprocess.run(
            ["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
             "-show_entries", "stream=nb_read_frames", "-of", "default=nk=1:nw=1", str(face)],
            capture_output=True, text=True).stdout.strip() or 0)
    on_step("anfitrión", "animando banda de marca")
    top = render_top(host_top, n_frames, gcfg, work / f"_host_top_{stem}.mp4")
    band = _face_band(face, work / f"_host_band_{stem}.mp4")
    C = _theme(gcfg)
    seam = "0x{:02X}{:02X}{:02X}".format(*C["acc"])  # drawbox usa 0xRRGGBB
    _composite(top, band, out_seg, seam)
    for p in (face, top, band):        # `raw` se conserva: es el crédito D-ID ya pagado
        Path(p).unlink(missing_ok=True)
    return out_seg


# ─────────────────────────── audio continuo (sin cortes) ─────────────────────────────
def continuous_base_audio(base_video: Path, segments: list[Path],
                          sfx_path: Path | None = None, sfx_gain: float = 0.32) -> Path:
    """Reconstruye la pista de audio del base como un solo stream PCM continuo (decodifica
    cada segmento a PCM → concat sample-accurate → un encode final) y la remuxea sobre el
    video. Elimina los micro-huecos de priming AAC en las uniones (audio sin cortes).

    Con ``sfx_path`` mezcla un whoosh corto en cada UNIÓN de escenas (ganancia baja).
    Se hace aquí — en la pista continua — para que ningún re-encode posterior lo pierda."""
    work = base_video.parent
    wavs, fdurs = [], []
    for i, s in enumerate(segments):
        # audio calzado EXACTO a la duración de FORMATO del segmento = su slot en el base
        # (el concat demuxer avanza por el stream más largo). Así audio total = video total
        # (sync), sin cortar escenas cuyo video dura menos que su audio (screen_demo/ml_demo
        # congelan el último frame) y preservando/rellenando el silencio de cola (apad).
        fdur = float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nk=1:nw=1", str(s)],
            capture_output=True, text=True).stdout.strip() or 0)
        w = work / f"_ca_{i}.wav"
        # micro-fundido (20 ms) en los extremos: el concat es sample-accurate pero sigue
        # siendo un empalme DURO, y si la onda no cruza por cero se oye un chasquido en la
        # unión de escenas. No cambia la duración, así que el sync con el video se mantiene.
        fd = min(0.02, max(0.002, fdur / 4)) if fdur > 0 else 0.02
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(s), "-vn",
             "-af", (f"aresample=48000:resampler=soxr,apad,atrim=0:{fdur:.4f},"
                     f"afade=t=in:st=0:d={fd:.3f},"
                     f"afade=t=out:st={max(0.0, fdur - fd):.3f}:d={fd:.3f}"),
             "-ac", "2",
             "-t", f"{fdur:.4f}", "-c:a", "pcm_s16le", str(w)], check=True)
        wavs.append(w)
        fdurs.append(fdur)
    inputs = []
    for w in wavs:
        inputs += ["-i", str(w)]
    fc = "".join(f"[{i}:a]" for i in range(len(wavs))) + f"concat=n={len(wavs)}:v=0:a=1[a]"
    out_lbl = "[a]"
    if sfx_path and Path(sfx_path).exists() and len(wavs) > 1:
        # whoosh centrado en cada corte (~0.35s antes de la unión), ganancia baja
        k = len(wavs) - 1
        si = len(wavs)
        inputs += ["-i", str(sfx_path)]
        offs, acc = [], 0.0
        for d in fdurs[:-1]:
            acc += d
            offs.append(acc)
        fc += (f";[{si}:a]aresample=48000,aformat=channel_layouts=stereo,asplit={k}"
               + "".join(f"[s{j}]" for j in range(k)))
        for j, off in enumerate(offs):
            ms = max(0, int((off - 0.35) * 1000))
            fc += f";[s{j}]adelay={ms}:all=1,volume={sfx_gain}[d{j}]"
        fc += (";[a]" + "".join(f"[d{j}]" for j in range(k))
               + f"amix=inputs={k + 1}:duration=first:normalize=0[am]")
        out_lbl = "[am]"
    audio = work / "_ca_base.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc,
                    "-map", out_lbl, "-c:a", "pcm_s16le", str(audio)], check=True)
    fixed = work / (base_video.stem + "_ca.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(base_video), "-i", str(audio),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", "-shortest", str(fixed)], check=True)
    fixed.replace(base_video)
    for w in wavs:
        w.unlink(missing_ok=True)
    audio.unlink(missing_ok=True)
    return base_video


# ───────────────────────── auto-marcado 'presentador' del guion ──────────────────────
def apply_presentador(scenes: list[dict], keyword: str = "") -> list[dict]:
    """Marca la 1ª (hook) y última (CTA) escena como visual_type 'host' si no traen ya un
    ``host_top`` propio del guionista. Genera un top razonable por defecto."""
    if not scenes:
        return scenes
    kw = (keyword or "").upper()[:22]
    for idx in (0, len(scenes) - 1):
        sc = scenes[idx]
        sc["visual_type"] = "host"
        if "host_top" not in sc:
            if idx == 0:
                sc["host_top"] = {"kind": "duo", "labels": ["IA", "IA"],
                                  "title": kw or "MÍRALO"}
            else:
                sc["host_top"] = {"kind": "save", "title": "GUÁRDALO",
                                  "subtitle": "SÍGUEME PARA MÁS →"}
    return scenes
