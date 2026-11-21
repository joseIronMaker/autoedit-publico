"""Rehace UNA escena de un video ya producido y vuelve a ensamblar. Cuesta cero.

Por que existe: el 11-ago-2026 relance el generador completo para arreglar una sola escena
y eso re-gasto voz de ElevenLabs y un clip de video pagado. El mandato de Jose es explicito:
no re-gastar en regeneraciones. Esta herramienta reusa TODO lo que ya esta en <stem>.assets
(las locuciones scene_N.wav, los clips veo_N.mp4, los demas seg_N.mp4) y solo rehace la
escena que le pidas.

    .venv/bin/python scratchpad/rehacer_escena.py gen_pro_una_corrida_no_prueba 2
    .venv/bin/python scratchpad/rehacer_escena.py gen_pro_una_corrida_no_prueba 2 --solo-ensamblar
"""
import argparse
import shutil
import subprocess
import tempfile
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from autoedit import generate as gen        # noqa: E402
from autoedit.config import load_config     # noqa: E402


def read_json(p: Path):
    import json
    return json.loads(p.read_text(encoding="utf-8"))


def _render_spec(spec: dict, voz: Path, dur: float, seg: Path, gcfg: dict) -> None:
    """Misma cascada que generate.py: Remotion si aplica, PIL si no."""
    from autoedit.remotion_scenes import (BEAT_TYPES, REMOTION_DIAGRAMS,
                                          remotion_available, render_remotion_scene)
    stype = spec.get("type")
    from autoedit.diagrams import render_diagram_scene
    if (gcfg.get("remotion") and stype in (REMOTION_DIAGRAMS | BEAT_TYPES)
            and remotion_available()):
        try:
            render_remotion_scene(spec, voz, dur, seg, gcfg)
            return
        except Exception as e:  # noqa: BLE001
            # misma cascada que generate.py: un Remotion "dañado" (tiles del raster de
            # WSL2, 14% de cuadros anómalos tras reintento) NO tumba la escena, cae a PIL.
            # Los beats (kinetic, terminal…) no tienen versión PIL: ahí sí se propaga.
            if stype not in REMOTION_DIAGRAMS:
                raise
            print(f"  aviso: Remotion falló ({str(e)[:80]}); degrado a PIL")
    render_diagram_scene(spec, voz, dur, seg, gcfg)


_BEATS_DE_GUION = {"terminal", "kinetic", "cutout", "mascota", "receipt"}


def dur_wav(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def _alto_util(cap: Path) -> int | None:
    """Hasta qué fila llega el TEXTO de la terminal, en píxeles.

    La ventana se graba con 34 filas porque algunas escenas escupen mucho, pero un
    `print("Hola, mundo")` deja 33 filas de negro y el cuadro se lee como un error.

    Dos cosas que costaron un ciclo entero de videos: (a) medir sobre el ÚLTIMO cuadro
    falla cuando la ventana ya se cerró y lo que hay es el escritorio de Windows —se
    toma el MÁXIMO de varios cuadros repartidos; (b) el borde inferior de la ventana es
    una línea de ancho COMPLETO y se contaba como texto, así que el recorte nunca
    recortaba nada: una fila de texto enciende una fracción de los píxeles, un borde los
    enciende todos.
    """
    import numpy as np
    from PIL import Image
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(cap)]).strip())
    mejor = 0
    with tempfile.TemporaryDirectory() as td:
        for k, frac in enumerate((0.35, 0.55, 0.75, 0.9, 0.98)):
            png = Path(td) / f"f{k}.png"
            subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{dur * frac:.2f}",
                            "-i", str(cap), "-frames:v", "1", str(png)],
                           check=False, timeout=120)
            if not png.exists():
                continue
            a = np.asarray(Image.open(png).convert("L"), dtype=np.int16)
            h, w = a.shape
            dentro = a[:h - 14, 16:w - 28]
            ancho = dentro.shape[1]
            fondo = int(np.median(dentro[dentro.shape[0] // 2:, :]))
            encendidas = (np.abs(dentro - fondo) > 45).sum(axis=1)
            texto = np.nonzero((encendidas > 8) & (encendidas < ancho * 0.5))[0]
            if texto.size:
                mejor = max(mejor, int(texto[-1]))
    if not mejor:
        return None
    # 620 = una ventana de terminal creíble; nunca más que el alto real, porque un
    # `crop=iw:620` sobre una ventana de tkinter de 393 px revienta el filtro
    return min(h, max(620, mejor + 30))


def _render_captura(cap: Path, voz: Path, dur: float, seg: Path) -> None:
    """Compone una GRABACIÓN REAL de terminal en el cuadro vertical del canal.

    La terminal es apaisada (~965x500) y el video es 1080x1920: en vez de barras negras se
    pone una copia ampliada y desenfocada del mismo cuadro como fondo — lo mismo que hace
    el timelapse de los grabados. El blur aquí SÍ se puede: es ffmpeg, no el raster por
    software de Chrome.

    Mismo contrato de encode que el resto de segmentos (libx264 crf 18, aac 192k) para que
    el ensamblado siga concatenando sin recodificar.
    """
    # La grabación se ESTIRA o ENCOGE para caber en la escena. Antes se cortaba por la
    # cola y así solo se veía el resultado final: el editor con el código, que es lo que
    # la voz está explicando, quedaba fuera. Ahora se ve la secuencia entera al ritmo de
    # la narración.
    cap_dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(cap)]).strip())
    ritmo = max(0.3, min(4.5, cap_dur / max(1.0, dur * 0.92)))
    alto = _alto_util(cap)
    recorte = f"crop=iw:{alto}:0:0," if alto else ""
    if alto:
        print(f"  recorte a {alto}px (hasta la última fila con texto)")

    filtro = (
        f"[0:v]setpts=PTS/{ritmo:.4f},"
        # el fondo se desenfoca EMPEQUEÑECIENDO y volviendo a ampliar, no con un
        # gblur sigma 42 sobre 1080x1920: el resultado se ve igual y tarda ~50 veces
        # menos (era el 60% del tiempo de cada escena de terminal)
        "scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,scale=136:240,gblur=sigma=5,scale=1080:1920:flags=bicubic,"
        "eq=brightness=-0.28:saturation=0.5[bg];"
        f"[0:v]setpts=PTS/{ritmo:.4f},{recorte}"
        # NADA de recorte lateral: cortaba la línea del prompt de Claude Code por la
        # derecha. La terminal se graba ya en formato casi cuadrado (72x34) y aquí se
        # amplía al ancho COMPLETO del cuadro, que es lo que hace legible el texto en un
        # teléfono. Si queda más alta que 1560 se recorta por abajo, donde solo hay negro.
        "scale=1064:-2:flags=lanczos,crop=iw:min(ih\\,1560):0:0,"
        "pad=iw+16:ih+16:8:8:color=0x1B1B24[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2:format=auto,setsar=1,"
        f"tpad=stop_mode=clone:stop_duration=6,trim=duration={dur:.3f},setpts=PTS-STARTPTS[v]"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(cap), "-i", str(voz),
         "-filter_complex", filtro, "-map", "[v]", "-map", "1:a",
         "-af", "apad=pad_dur=1.6", "-r", "30",
         "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{dur:.3f}", str(seg)],
        check=True, timeout=900)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stem", help="p. ej. gen_pro_una_corrida_no_prueba")
    ap.add_argument("idx", type=int, nargs="?", default=None, help="indice de escena (0-based)")
    ap.add_argument("--dir", type=Path, default=Path("videos"))
    ap.add_argument("--sin-ensamblar", action="store_true",
                    help="rehace la escena y NO vuelve a unir (para tandas: se ensambla "
                         "una sola vez al final en vez de una por escena)")
    ap.add_argument("--solo-ensamblar", action="store_true",
                    help="no rehace nada: solo vuelve a unir los seg_*.mp4 existentes")
    a = ap.parse_args()

    assets = a.dir / f"{a.stem}.assets"
    salida = a.dir / f"{a.stem}.mp4"
    guion = read_json(assets / "guion.json")
    scenes = guion["scenes"]
    cfg = load_config()
    gcfg = cfg.get("generate", cfg)

    if a.idx is not None:
        i = a.idx
        escena = scenes[i]
        voz = assets / f"scene_{i}.wav"
        seg = assets / f"seg_{i}.mp4"
        if not voz.exists():
            sys.exit(f"falta la locucion {voz}: esta herramienta NO regenera voz a proposito")
        cola = 1.0 if i == len(scenes) - 1 else 0.18
        dur = dur_wav(voz) + cola
        vt = escena.get("visual_type")
        print(f"escena {i} · {vt} · voz {dur_wav(voz):.2f}s + cola {cola} = {dur:.2f}s")

        # FOTO fija del guion (el perrito del canal, un recorte, cualquier PNG local):
        # se copia a los assets y se compone como una placa con movimiento
        if escena.get("foto"):
            origen = Path(escena["foto"]["archivo"])
            if not origen.exists():
                sys.exit(f"no existe la foto {origen}")
            destino = assets / f"scene_{i}.png"
            shutil.copy2(origen, destino)
            print(f"  foto {origen.name}")
            gen._render_scene_plates([destino], voz, dur, i, seg, gcfg)
            print(f"✔ {seg.name} ({seg.stat().st_size/1e6:.1f} MB)")
            if a.sin_ensamblar:
                return
        cap = assets / f"cap_{i}.mp4"
        if cap.exists():
            # la GRABACIÓN REAL manda sobre cualquier animación: si existe, se usa
            print(f"  captura real de terminal ({cap.name})")
            _render_captura(cap, voz, dur, seg)
        elif vt == "screen_demo":
            from autoedit.screen_demo import record_demo
            sd = escena["screen_demo"]
            # Sin degradacion silenciosa: si la herramienta real no se deja grabar, esto
            # REVIENTA. Es preferible un video sin terminar a un video que miente.
            record_demo(sd.get("prompt", ""), voz, dur, seg, cfg,
                        tool_name=sd.get("tool", "chatgpt"),
                        capture_seconds=sd.get("capture_seconds"))
        elif vt == "ml_demo":
            from autoedit import ml_demo
            ml_demo.render_ml_demo_scene(escena["ml_demo"], voz, dur, seg, gcfg,
                                         on_step=lambda s, d: print(f"  {d}"))
        elif vt == "kinetic_video" and escena.get("kinetic_video"):
            from autoedit.remotion_scenes import stage_asset
            kv = escena["kinetic_video"]
            clip = Path(kv["video"]) if kv.get("video") else assets / f"veo_{i}.mp4"
            if not clip.exists():
                sys.exit(f"falta el clip {clip}: esta herramienta NO re-gasta Omni/Veo")
            from autoedit.remotion_scenes import spec_kinetic_video

            spec = spec_kinetic_video(kv, clip, guion.get("theme", "neon"))
            _render_spec(spec, voz, dur, seg, gcfg)
        elif vt == "image":
            n_placas = len([p for p in (escena.get("image_prompts") or []) if p])
            if n_placas > 1:
                imgs = [assets / f"scene_{i}_{j}.png" for j in range(n_placas)]
            else:
                imgs = [assets / f"scene_{i}.png"]
            falta = [p for p in imgs if not p.exists()]
            if falta:
                sys.exit(f"faltan placas {[p.name for p in falta]}: genéralas antes con codex")
            print(f"  {len(imgs)} placa(s) con disolvencia")
            gen._render_scene_plates(imgs, voz, dur, i, seg, gcfg)
        elif vt in _BEATS_DE_GUION and escena.get(vt):
            # beats que salen enteros del guion (no hay que generar nada): terminal,
            # kinetic, cutout, mascota, receipt. Se arma el mismo spec que generate.py.
            spec = {"type": vt, **escena[vt]}
            if vt == "terminal":
                spec["watermark"] = (cfg.get("branding") or {}).get("handle", "")
            # Remotion carga las imágenes con staticFile(), que NO acepta rutas absolutas:
            # generate.py las copia antes a public/dyn con stage_asset y aquí faltaba,
            # así que rehacer una escena de recibo reventaba (6-sep-2026).
            if vt in ("receipt", "cutout") and spec.get("image"):
                from autoedit.remotion_scenes import stage_asset

                spec["image"] = stage_asset(Path(spec["image"]))
            spec.setdefault("theme", guion.get("theme", "neon"))
            _render_spec(spec, voz, dur, seg, gcfg)
        elif vt == "diagram" and escena.get("diagram"):
            # diagramas explicativos (flujo, lista, comparación, barras): salen enteros
            # del guion, mismo spec que generate.py
            from autoedit.generate import _normalizar_diagrama
            spec = _normalizar_diagrama(escena["diagram"])
            spec.setdefault("theme", guion.get("theme", "neon"))
            print(f"  diagrama {spec.get('type')} · {len(spec.get('items') or [])} elementos")
            _render_spec(spec, voz, dur, seg, gcfg)
        elif vt == "custom" and escena.get("custom_anim"):
            from autoedit.diagrams import build_custom_spec, custom_spec_from_code
            from autoedit.model_router import ModelRouter
            ca = escena["custom_anim"]
            if ca.get("code"):
                spec = custom_spec_from_code(ca["code"], dur, gcfg)
            else:
                spec = build_custom_spec(ca.get("description", ""),
                                         escena.get("narration", ""),
                                         ModelRouter(cfg), gcfg, dur)
            spec.setdefault("theme", guion.get("theme", "neon"))
            _render_spec(spec, voz, dur, seg, gcfg)
        else:
            sys.exit(f"visual_type '{vt}' todavia no lo rehace esta herramienta")

        (assets / f"seg_{i}.sha1").unlink(missing_ok=True)   # la firma ya no corresponde
        print(f"✔ {seg} ({seg.stat().st_size/1e6:.1f} MB)")

    segs = [assets / f"seg_{k}.mp4" for k in range(len(scenes))]
    falta = [s for s in segs if not s.exists()]
    if falta:
        sys.exit(f"faltan segmentos: {[s.name for s in falta]}")
    if (assets / "seg_outro.mp4").exists():
        segs.append(assets / "seg_outro.mp4")

    if a.sin_ensamblar:
        print("(no ensamblo: se hará al final de la tanda)")
        return
    print(f"ensamblando {len(segs)} escenas → {salida.name}")
    gen._assemble(segs, salida, gcfg)

    _av = {"host", "ml_demo", "kinetic", "terminal", "cutout", "mascota", "receipt"}
    if any(s.get("visual_type") in _av for s in scenes) or gcfg.get("sfx"):
        from autoedit import host_layout
        sfx = Path(gen.__file__).parent / "assets" / "sfx" / "whoosh.mp3"
        host_layout.continuous_base_audio(
            salida, segs, sfx_path=sfx if gcfg.get("sfx") else None,
            sfx_gain=float(gcfg.get("sfx_gain", 0.32)))
        print("audio continuo + whoosh aplicados")

    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(salida)], capture_output=True, text=True).stdout.strip()
    print(f"✔ {salida} · {float(d):.2f}s")


if __name__ == "__main__":
    main()
