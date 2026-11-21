"""Escenas Remotion (motor de animación 2.0 del canal).

Renderiza segmentos de escena con el proyecto Remotion de ``autoedit/remotion/``
(React + Chromium headless) y los deja en el MISMO contrato que
``diagrams.render_diagram_scene``: mp4 con la narración muxeada y los mismos
parámetros de encode (libx264 crf 18 preset medium, aac 192k 48kHz) para que el
ensamblado con ``-c copy`` no se rompa.

Composiciones:
- "Diagram"  → los 6 diagramas estructurados (flow/list/compare/bars/neural_net/big_text)
- "Beat"     → escenas del formato presentador-evidencia (receipt/kinetic/terminal/
               cutout/mascota/cta)
- "TopBand"  → banda superior 1080x660 del composite presentador (kind "headline")

Los assets locales (screenshots, cutouts, poses de mascota) se sirven a Chromium
copiándolos a ``remotion/public/dyn/`` (staticFile); se limpian tras el render.
Si Remotion no está disponible o el render falla, el llamador debe degradar a PIL.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import uuid
from pathlib import Path

REMOTION_DIR = Path(__file__).parent / "remotion"
CHROME = "/usr/bin/google-chrome"          # el Chrome del sistema (el de screen_demo);
DYN = REMOTION_DIR / "public" / "dyn"      # el unzip interno de Remotion está roto en WSL2

# tipos de diagrama que ya existen como composición Remotion (el resto queda en PIL)
REMOTION_DIAGRAMS = {"flow", "list", "compare", "bars", "neural_net", "big_text"}
# tipos de beat del formato presentador-evidencia (composición "Beat")
BEAT_TYPES = {"receipt", "kinetic", "kinetic_video", "terminal", "cutout", "mascota",
              "cta", "showcase", "perceptron", "activation_bend", "gradient_descent",
              "backprop", "lottie"}


def remotion_themes() -> set[str]:
    """Nombres de paleta que conoce el proyecto Remotion (leídos de src/theme.ts).

    Las paletas viven DUPLICADAS en diagrams.py (PIL) y en theme.ts (React). Si una
    solo está en Python, los beats caen al tema por defecto y el video sale con dos
    paletas distintas — sin ningún error. Esto lo detecta y avisa.
    """
    import re

    try:
        src = (REMOTION_DIR / "src" / "theme.ts").read_text(encoding="utf-8")
    except OSError:
        return set()
    block = src.split("Record<string, Theme> = {", 1)
    if len(block) < 2:
        return set()
    # claves sin comillas (neon: {) y con comillas ('curso python con ia': {): las dos
    # existen en theme.ts, y sin esta segunda forma el curso salía con la paleta por defecto
    return set(re.findall(r"^\s*([A-Za-z_][\w]*)\s*:\s*\{", block[1], re.M)
               + re.findall(r"^\s*['\"]([^'\"]+)['\"]\s*:\s*\{", block[1], re.M))


def remotion_available() -> bool:
    """True si el proyecto Remotion está instalado y hay Chrome del sistema."""
    return (REMOTION_DIR / "node_modules" / ".bin" / "remotion").exists() \
        and Path(CHROME).exists()


_IMG_EXT = {".png", ".jpg", ".jpeg", ".webp"}   # (los .json de Lottie se copian tal cual)
MAX_ASSET_SIDE = 1280   # la composición es 1080x1920: más resolución no aporta nada


def stage_asset(src: Path) -> str:
    """Copia un archivo a public/dyn/ y devuelve la ruta staticFile ('dyn/<uuid>.<ext>').

    Las imágenes se REDUCEN a ``MAX_ASSET_SIDE`` antes de copiarlas: el raster por
    software de WSL2 se ahoga con los PNG grandes que devuelven codex/Gemini
    (~950x1670, 2 MB) y el render se cuelga hasta el timeout. El original NO se toca
    (está cacheado por escena); solo se reduce la copia que ve Chromium.
    """
    DYN.mkdir(parents=True, exist_ok=True)
    src = Path(src)
    name = f"{uuid.uuid4().hex[:12]}{src.suffix or '.png'}"
    dst = DYN / name
    if src.suffix.lower() in _IMG_EXT:
        try:
            from PIL import Image

            with Image.open(src) as im:
                if max(im.size) > MAX_ASSET_SIDE:
                    im = im.copy()
                    im.thumbnail((MAX_ASSET_SIDE, MAX_ASSET_SIDE), Image.LANCZOS)
                    im.save(dst, optimize=True)
                    return f"dyn/{name}"
        except Exception:  # noqa: BLE001 — si PIL falla, se copia tal cual
            pass
    shutil.copy2(src, dst)
    return f"dyn/{name}"


def _cleanup_props_assets(props: dict) -> None:
    """Borra los assets dyn/ referenciados en props (tras el render)."""
    def walk(v):
        if isinstance(v, str) and v.startswith("dyn/"):
            (REMOTION_DIR / "public" / v).unlink(missing_ok=True)
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)
    walk(props)


def _mata_huerfanos(edad_min: int = 25) -> None:
    """Mata renders de Remotion abandonados antes de lanzar uno nuevo.

    CASCADA MEDIDA (19-ago-2026, ag05): un render se colgó, quedó comiendo núcleos, el
    siguiente se pasó del tope de 20 min por contención y murió dejando OTRO huérfano.
    Resultado: dos escenas del video degradaron a PIL y salieron como tarjetas de texto
    sobre negro — justo lo que José vetó. Un render sano tarda ~3 min: cualquiera de más
    de 25 minutos está muerto, no lento.
    """
    try:
        salida = subprocess.run(
            ["ps", "-eo", "pid,ppid,etimes,args", "--no-headers"],
            capture_output=True, text=True, timeout=20).stdout
    except Exception:  # noqa: BLE001
        return
    filas = [l.split(None, 3) for l in salida.splitlines()]
    cmd_de = {f[0]: f[3] for f in filas if len(f) == 4}
    for partes in filas:
        if len(partes) < 4:
            continue
        pid, ppid, segs, args = partes
        if "remotion" not in args or "render" not in args:
            continue
        # huérfano de verdad: su padre murió (ya no está en ps) o quedó adoptado por init.
        # La edad sola NO basta: con dos producciones a la vez esto mataba renders VIVOS
        # del otro proceso, y el generate.py que los esperaba se quedaba colgado.
        padre = cmd_de.get(ppid, "")
        huerfano = ppid == "1" or padre == "" or padre.startswith("/init")
        try:
            if not huerfano or int(segs) < edad_min * 60:
                continue
            os.kill(int(pid), 9)
            print(f"  aviso: maté un render de Remotion huérfano ({int(segs) // 60} min)")
        except Exception:  # noqa: BLE001
            pass


def _render(comp: str, props: dict, out: Path, timeout: int = 1800,
            concurrency: int | None = None) -> None:
    """Corre `npx remotion render` con el Chrome del sistema. Lanza si falla.

    ``concurrency=1`` es OBLIGATORIO para las escenas con video de fondo: en WSL2
    (raster por software) varias pestañas de Chrome decodificando el mismo clip a la
    vez se atascan y el render no termina ni en 30 min. Con una sola pestaña, el
    MISMO render tarda ~36 s.

    Sin video se deja la concurrencia por defecto de Remotion: forzar 4 pestañas se
    probó el 30-jul y colgó un beat hasta el timeout (WSL2 rasteriza por software, así
    que más pestañas es más contención, no más velocidad).
    """
    _mata_huerfanos()
    props_file = out.parent / f"_props_{out.stem}.json"
    props_file.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    cmd = ["npx", "remotion", "render", comp, str(out.resolve()),
           f"--props={props_file.resolve()}",
           f"--browser-executable={CHROME}", "--log=error"]
    if concurrency:
        cmd.append(f"--concurrency={concurrency}")
    try:
        subprocess.run(
            cmd, cwd=REMOTION_DIR, check=True, timeout=timeout,
            capture_output=True, text=True,
        )
    except subprocess.CalledProcessError as e:  # incluir stderr real en el error
        raise RuntimeError(f"remotion render falló: {(e.stderr or '')[-400:]}") from e
    finally:
        props_file.unlink(missing_ok=True)
    if not out.exists():
        raise RuntimeError("remotion render no produjo salida")


def _glitch_fraction(video: Path, samples: int = 8) -> float:
    """Detecta tiles caídos del raster de Chrome (rectángulos PLANOS anómalos).

    Muestrea frames (15%–95%), los parte en una rejilla 12×20 y marca celdas
    totalmente planas (std < 1.2). Una celda plana en UN frame pero con contenido
    en otro = anomalía (algo tapó la escena). Las zonas planas por DISEÑO (fondos
    sólidos) son planas en TODOS los frames y no cuentan. Devuelve la fracción
    anómala máxima; > ~0.12 = render dañado.
    """
    import io

    import numpy as np
    from PIL import Image

    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(video)], capture_output=True, text=True,
    ).stdout.strip() or 0)
    if dur <= 0:
        return 0.0
    flats = []
    for i in range(samples):
        t = dur * (0.15 + 0.8 * i / max(1, samples - 1))
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video),
             "-frames:v", "1", "-vf", "scale=180:320", "-f", "image2pipe",
             "-vcodec", "png", "-"], capture_output=True, timeout=60)
        if not r.stdout:
            continue
        a = np.asarray(Image.open(io.BytesIO(r.stdout)).convert("RGB"), dtype=np.float32)
        if a.shape != (320, 180, 3):
            continue
        cells = a.reshape(20, 16, 12, 15, 3)
        flats.append(cells.std(axis=(1, 3)).max(axis=-1) < 1.2)
    if len(flats) < 3:
        return 0.0
    design_flat = np.logical_and.reduce(flats)   # plano SIEMPRE = fondo de diseño
    return max(float((fm & ~design_flat).mean()) for fm in flats)


# TODAS las llaves de un kinetic_video se arman AQUÍ y en ningún otro sitio. El spec se
# construía por duplicado en generate.py y en scratchpad/rehacer_escena.py, así que una
# llave nueva puesta en uno solo se perdía sin un solo error: el 7-sep-2026 "stanzas" se
# añadió a generate.py, la escena se rehizo con rehacer_escena y salió con el rótulo
# quieto igual que antes. El fallo se ve horas después, mirando cuadros.
_KV_OPCIONALES = ("stanzas", "veil")


def spec_kinetic_video(kv: dict, clip: "Path", theme: str = "violeta") -> dict:
    """Spec del beat KineticOverVideo a partir del bloque `kinetic_video` del guion."""
    spec = {
        "type": "kinetic_video",
        "words": kv.get("words") or [],
        "variant": kv.get("variant", "dark"),
        "video": stage_asset(clip),
        "theme": theme,
    }
    for k in _KV_OPCIONALES:
        if kv.get(k) is not None:
            spec[k] = kv[k]
    return spec


def render_remotion_scene(spec: dict, voz: Path, dur: float, out: Path, gcfg: dict) -> None:
    """Segmento de escena vía Remotion — mismo contrato que render_diagram_scene.

    spec["type"] decide la composición: diagrama estructurado → "Diagram";
    beat del formato evidencia → "Beat". Cada render pasa por el detector de
    tiles caídos (_glitch_fraction) con UN reintento; si persiste, lanza y el
    llamador degrada (petición de José: detectar los "cuadros negros" solos).
    """
    fps = gcfg["fps"]
    frames = max(2, int(dur * fps))
    comp = "Diagram" if spec.get("type") in REMOTION_DIAGRAMS else "Beat"
    theme = spec.get("theme", "violeta")
    known = remotion_themes()
    if known and theme not in known:
        print(f"  aviso: la paleta '{theme}' no existe en remotion/src/theme.ts; "
              f"el beat saldrá con la paleta por defecto (añádela allí también)")
    props = {"spec": spec, "theme": theme, "durationInFrames": frames}
    raw = out.parent / f"_rem_{out.stem}.mp4"
    # con video de fondo, UNA sola pestaña (ver _render): en paralelo no termina nunca
    # concurrency=4 se probó el 30-jul y NO ayudó: colgó el terminal de ln15 hasta el
    # timeout (20 min) mientras que con la de por defecto salía en minutos. WSL2 rasteriza
    # por software: más pestañas = más contención, no más velocidad.
    conc = 1 if spec.get("video") else None
    # Techo de paciencia por composición. Medido 29-jul: 4 renders de la serie 2 se
    # comieron los 1800 s completos y acabaron en el fallback igual — media hora de
    # nada por escena. Un Diagram que no sale en 8 min no va a salir: PIL lo dibuja
    # bien y en segundos. Al Beat se le da más cuerda porque su fallback (big_text)
    # es justo la "tarjeta de texto" que no queremos.
    tope = 480 if comp == "Diagram" else 1200
    try:
        _render(comp, props, raw, timeout=tope, concurrency=conc)
        # umbral por tipo: los beats con ANIMACIONES bespoke sobre casi-negro (showcase,
        # perceptron, activation_bend y demás animaciones a medida) tienen mucho negro
        # plano POR DISEÑO, que el detector confunde con tiles caídos — se relaja el
        # umbral en vez de degradar un render sano a PIL (que ni siquiera sabe dibujar
        # estos componentes custom).
        # Con VIDEO de fondo el detector NO aplica: su premisa es "celda plana en unos
        # frames y con contenido en otros = algo tapó la escena", y un clip real cumple
        # eso por diseño (un plano oscuro, un destello). Daba 53% en un render perfecto.
        # "receipt" cae en la misma trampa por otro motivo: un recibo ES un panel blanco
        # grande y plano (un screenshot), así que el detector lo lee como celdas caídas.
        # Medido en ln03 (28-jul): dio 12%, se degradó a PIL — que no dibuja recibos — y el
        # video perdió el screenshot del tokenizador, justo el material REAL de la escena.
        # "terminal" entra aquí por la misma razón que "receipt": la escena ES un panel
        # grande y plano (la ventana de consola), justo el patrón que el detector lee
        # como tile caído. Sin esto rechaza renders sanos y el beat cae a big_text.
        _DARK_ANIM = {"showcase", "perceptron", "activation_bend", "gradient_descent",
                      "backprop", "receipt", "terminal"}
        if spec.get("video"):
            gf, _thr = 0.0, 1.0
        else:
            _thr = 0.45 if spec.get("type") in _DARK_ANIM else 0.12
            gf = _glitch_fraction(raw)
        if gf > _thr:
            print(f"  aviso: render con tiles caídos ({gf:.0%}); reintentando…")
            _render(comp, props, raw, timeout=tope, concurrency=conc)
            gf = _glitch_fraction(raw)
            if gf > _thr:
                raise RuntimeError(f"render dañado tras reintento ({gf:.0%} anómalo)")
        # narración + normalización al contrato del pipeline (igual que diagrams.py)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error",
             "-i", str(raw), "-i", str(voz),
             "-vf", "format=yuv420p", "-af", "apad=pad_dur=1.6",
             "-map", "0:v", "-map", "1:a",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
             "-t", f"{dur:.3f}", str(out)],
            check=True, timeout=600,
        )
    finally:
        raw.unlink(missing_ok=True)
        _cleanup_props_assets(props)


def render_top_band(spec: dict, n_frames: int, out_mp4: Path) -> Path:
    """Banda superior del composite presentador (1080x660, sin audio, frames exactos).

    Mismo contrato que host_layout.render_top (libx264 crf18 yuv420p 30fps).
    """
    props = {"spec": spec, "theme": spec.get("theme", "violeta"),
             "durationInFrames": int(n_frames)}
    raw = out_mp4.parent / f"_remtop_{out_mp4.stem}.mp4"
    try:
        _render("TopBand", props, raw)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
             "-frames:v", str(int(n_frames)), "-an",
             "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
             str(out_mp4)],
            check=True, timeout=300,
        )
    finally:
        raw.unlink(missing_ok=True)
        _cleanup_props_assets(props)
    return out_mp4


def render_panel(spec: dict, n_frames: int, out_mp4: Path, theme: str = "violeta") -> Path:
    """Panel INFERIOR (1080x1026) del formato «José grabado».

    José graba su cara arriba (720x596 nativos) y deja el resto del cuadro en negro a
    propósito: ese hueco es el lienzo. Es el inverso del composite de host_layout
    (cara abajo, banda arriba). Mismo contrato de encode que render_top_band, para
    poder apilarlo con vstack sin recodificar dos veces.
    """
    props = {"spec": spec, "theme": spec.get("theme", theme),
             "durationInFrames": int(n_frames)}
    raw = out_mp4.parent / f"_rempanel_{out_mp4.stem}.mp4"
    try:
        _render("Panel", props, raw, concurrency=1 if spec.get("kind") == "photo" else None)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
             "-frames:v", str(int(n_frames)), "-an",
             "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
             str(out_mp4)],
            check=True, timeout=300,
        )
    finally:
        raw.unlink(missing_ok=True)
        _cleanup_props_assets(props)
    return out_mp4
