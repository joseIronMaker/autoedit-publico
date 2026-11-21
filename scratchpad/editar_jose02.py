#!/usr/bin/env python3
"""Edita el SEGUNDO video grabado por José: IA predictiva (22-ago-2026).

Mismo formato que jose01 (cara arriba 720x596, lienzo abajo), pero aquí el panel usa
TODO el motor, no solo tarjetas de texto:

  clip     → clips Omni/Veo YA PAGADOS de videos/_clips_pagados (no se genera ninguno)
  shot     → capturas REALES de TikTok tomadas con el Chrome de Windows (regla de realidad)
  plot     → gráficas que salieron de EJECUTAR sklearn (KMeans y regresión logística)
  code     → el código del modelo tecleándose
  mascota  → el robot del canal para el cierre de serie
  define / flow / compare / headline

Los clips pagados duran 4.01 s y los paneles más: se estiran con boomerang + setpts,
nunca se re-genera un clip que ya se pagó.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, "/home/jose/tiktok")
from dotenv import load_dotenv

load_dotenv("/home/jose/tiktok/.env")

RAIZ = Path("/home/jose/tiktok")
SRC = RAIZ / "jose02.mp4"
WD = RAIZ / "jose02.autoedit"
ASSETS = RAIZ / "jose02.assets"
SALIDA = RAIZ / "jose02_final.mp4"
CLIPS = RAIZ / "videos" / "_clips_pagados"
TEMA = "hielo"
CARA_H, PANEL_H, FPS = 894, 1026, 30

PANELES = [
    {"t": 0.00, "spec": {"kind": "clip", "video": "@mosaico",
                         "lines": ["YA SABE", "QUÉ TE GUSTA"]}},
    {"t": 9.00, "spec": {"kind": "headline", "kicker": "sin que se lo pidas",
                         "lines": ["PREDICE TU GUSTO", "Y TE LO SIRVE"]}},
    {"t": 16.32, "spec": {"kind": "headline", "kicker": "el ejemplo",
                          "lines": ["INSTALAS", "Y EMPIEZAS", "A DESLIZAR"]}},
    {"t": 23.20, "spec": {"kind": "shot", "image": "@gatitos", "title": "captura real",
                          "url_label": "tiktok.com/search?q=gatitos"}},
    {"t": 28.90, "spec": {"kind": "shot", "image": "@prog", "title": "captura real",
                          "url_label": "tiktok.com/search?q=programacion"}},
    {"t": 33.38, "spec": {"kind": "shot", "image": "@risa", "title": "captura real",
                          "url_label": "tiktok.com/search?q=videos de risa"}},
    {"t": 38.70, "spec": {"kind": "plot", "image": "@segmenta", "title": "esto es real: KMeans",
                          "caption": "Solo ve dos números por video. Los grupos los descubre."}},
    {"t": 44.60, "spec": {"kind": "flow", "title": "la siguiente vuelta",
                          "steps": ["Mide dónde te quedas",
                                    "Te agrupa con quien se queda igual",
                                    "Te sirve más de eso"]}},
    {"t": 50.92, "spec": {"kind": "headline", "kicker": "y desde ahí",
                          "lines": ["YA PREDICE", "QUÉ TE GUSTA"]}},
    {"t": 56.90, "spec": {"kind": "headline", "kicker": "no es solo tiktok",
                          "lines": ["FACEBOOK", "INSTAGRAM", "EL MISMO MOTOR"]}},
    {"t": 61.34, "spec": {"kind": "compare", "title": "el trato que nadie te explicó",
                          "left": {"head": "Tú das", "body": "Tiempo, pausas, reacciones"},
                          "right": {"head": "Te devuelve", "body": "Lo siguiente que vas a ver"},
                          "verdict": "Y el trato se renueva cada scroll"}},
    {"t": 67.74, "spec": {"kind": "clip", "video": "@brotes",
                          "lines": ["TÚ LO ALIMENTAS"]}},
    {"t": 73.30, "spec": {"kind": "code", "caption": "esto es literalmente entrenar un modelo",
                          "lines": ["# lo que tú generas al deslizar",
                                    "X = [segundos_visto, repeticiones]",
                                    "y = [le_gusto]",
                                    "",
                                    "modelo = LogisticRegression()",
                                    "modelo.fit(X, y)   # entrenar"]}},
    {"t": 80.18, "spec": {"kind": "plot", "image": "@predice", "title": "esto es real: regresión logística",
                          "caption": "Le das permanencia, te devuelve probabilidad."}},
    {"t": 87.12, "spec": {"kind": "define", "label": "esa es la palabra",
                          "term": "IA predictiva",
                          "body": "No crea nada: estima lo que viene a partir de lo que ya hiciste."}},
    {"t": 93.02, "spec": {"kind": "headline", "kicker": "de qué familia es",
                          "lines": ["MACHINE LEARNING", "CLÁSICO"]}},
    {"t": 99.72, "spec": {"kind": "mascota", "image": "@mascota",
                          "sign_text": "SIGUE: LA GENERATIVA",
                          "caption": "La que sí crea cosas nuevas — y funciona distinto."}},
]

RECURSOS = {
    "mosaico": CLIPS / "gen_ver_galeria_sin_cara__veo_0.mp4",
    "brotes": CLIPS / "gen_ln_lo_que_aprendio_solo__veo_0.mp4",
    "gatitos": ASSETS / "crop_shot_gatitos.png",
    "prog": ASSETS / "crop_shot_prog.png",
    "risa": ASSETS / "crop_shot_risa.png",
    "segmenta": ASSETS / "plot_segmenta.png",
    "predice": ASSETS / "plot_predice.png",
    "mascota": RAIZ / "branding" / "mascota" / "profesor.png",
}


def sh(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def dur_video(p: Path) -> float:
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True).stdout.strip())


def prepara_clip(src: Path, objetivo: float, out: Path) -> Path:
    """Estira un clip PAGADO a la duración del panel sin re-generarlo.

    Boomerang (ida + reversa) si hace falta más del doble de material, y luego setpts
    para clavar la duración. Un clip Omni cuesta dinero: jamás se genera otro porque
    el panel dure 9 s y el clip 4.
    """
    d = dur_video(src)
    if objetivo <= d:
        sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-t", f"{objetivo:.3f}",
            "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", str(out)])
        return out
    base = out.parent / f"_boom_{out.stem}.mp4"
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-filter_complex",
        "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]", "-map", "[v]",
        "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", str(base)])
    factor = objetivo / dur_video(base)
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(base), "-filter_complex",
        f"[0:v]setpts={factor:.5f}*PTS,fps=30[v]", "-map", "[v]", "-t", f"{objetivo:.3f}",
        "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", str(out)])
    base.unlink(missing_ok=True)
    return out


def fase_paneles() -> list[Path]:
    from autoedit.remotion_scenes import render_panel, stage_asset

    total = dur_video(SRC)
    ASSETS.mkdir(exist_ok=True)
    bordes = [p["t"] for p in PANELES] + [total]
    salidas = []
    for i, panel in enumerate(PANELES):
        n = round(bordes[i + 1] * FPS) - round(bordes[i] * FPS)
        out = ASSETS / f"panel_{i:02d}.mp4"
        if out.exists() and abs(dur_video(out) * FPS - n) < 2:
            print(f"  · panel {i:02d} ya existe ({n} frames)")
            salidas.append(out)
            continue
        spec = json.loads(json.dumps(panel["spec"]))
        for clave in ("image", "video"):
            v = spec.get(clave)
            if isinstance(v, str) and v.startswith("@"):
                recurso = RECURSOS[v[1:]]
                if clave == "video":
                    recurso = prepara_clip(recurso, n / FPS, ASSETS / f"_clip_{i:02d}.mp4")
                spec[clave] = stage_asset(recurso)
        print(f"  → panel {i:02d} ({spec['kind']}, {n} frames = {n/FPS:.1f}s)…")
        render_panel(spec, n, out, theme=TEMA)
        salidas.append(out)
    return salidas


def fase_ensamblado(paneles: list[Path]) -> Path:
    from autoedit.config import load_config
    from autoedit.subtitles import build_ass

    cfg = load_config(None)
    lista = ASSETS / "paneles.txt"
    lista.write_text("".join(f"file '{p.resolve()}'\n" for p in paneles), encoding="utf-8")
    tira = ASSETS / "paneles.mp4"
    sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c", "copy", str(tira)])
    print(f"  · paneles concatenados: {dur_video(tira):.2f}s")

    words = json.loads((WD / "transcript.json").read_text(encoding="utf-8"))["words"]
    scfg = dict(cfg["subtitles"])
    scfg["margin_v_ratio"] = (CARA_H + 16) / 1920.0
    ass = build_ass(words, 1080, 1920, {**cfg, "subtitles": scfg}, ASSETS / "subs.ass")
    import re
    txt = re.sub(r"(^Style: Cap,.*?),2,(60,60,)", r"\1,8,\2",
                 ass.read_text(encoding="utf-8"), flags=re.M)
    ass.write_text(txt, encoding="utf-8")
    print("  · subtítulos anclados bajo la cara")

    cama = RAIZ / "autoedit" / "assets" / "bed_electronico.m4a"
    gain = float((cfg.get("render") or {}).get("music_gain", 0.08))
    filtro = (
        f"[0:v]crop=720:596:0:0,scale=1080:{CARA_H}:flags=lanczos,setsar=1[cara];"
        f"[1:v]setsar=1[pan];[cara][pan]vstack=inputs=2[stack];"
        f"[stack]ass={ass.resolve()}[v];"
        f"[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo[voz];"
        f"[2:a]volume={gain},aformat=sample_rates=48000:channel_layouts=stereo[mus];"
        f"[voz][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]"
    )
    sh(["ffmpeg", "-y", "-loglevel", "error",
        "-i", str(SRC), "-i", str(tira), "-stream_loop", "-1", "-i", str(cama),
        "-filter_complex", filtro, "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
        "-r", "30", "-c:a", "aac", "-b:a", "192k", "-shortest", str(SALIDA)])
    return SALIDA


if __name__ == "__main__":
    faltan = [k for k, v in RECURSOS.items() if not v.exists()]
    if faltan:
        sys.exit(f"faltan recursos: {faltan}")
    print("=== paneles ===")
    paneles = fase_paneles()
    if len(sys.argv) > 1 and sys.argv[1] == "paneles":
        sys.exit(0)
    print("=== ensamblado ===")
    out = fase_ensamblado(paneles)
    print(f"\n✔ {out}  ({dur_video(out):.1f}s)")
