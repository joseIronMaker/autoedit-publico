#!/usr/bin/env python3
"""Edita el PRIMER video grabado por José (22-ago-2026).

Formato nuevo del canal: él graba su cara en la mitad de arriba (720x596 nativos de un
720x1280) y deja el resto del cuadro en NEGRO a propósito, como lienzo para animación.
Es el inverso del composite de host_layout (cara abajo, banda arriba).

  cara   720x596  -> 1080x894   (arriba)
  panel            1080x1026    (abajo, composicion Remotion "Panel")
                   1080x1920

Los subtitulos se queman en la franja de arriba del panel, justo bajo la costura: ahi
se leen sobre fondo controlado y la UI de TikTok no los tapa.

Fases (cada una se saltea si ya esta hecha, para no re-gastar):
  1. imagenes del panel "revolucion industrial" con codex ($0)
  2. render de los 8 paneles con Remotion
  3. concat de paneles + vstack con la cara + subtitulos + cama musical
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
SRC = RAIZ / "jose01.mp4"
WD = RAIZ / "jose01.autoedit"
ASSETS = RAIZ / "jose01.assets"
SALIDA = RAIZ / "jose01_final.mp4"
TEMA = "hielo"

CARA_H = 894          # 596 * 1.5
PANEL_H = 1026        # 1920 - 894
FPS = 30

# ---------------------------------------------------------------- guion de paneles
# Los cortes caen en la palabra bisagra (medidos sobre transcript.json), no a mitad
# de frase. El ultimo panel se estira a la duracion real del video.
PANELES = [
    {"t": 0.00, "spec": {"kind": "headline", "kicker": "ia con josé",
                         "lines": ["¿SIN TRABAJO?", "NO COMO CREES"], "strike": 0}},
    {"t": 8.52, "spec": {"kind": "photo", "images": ["@fabrica", "@datacenter"],
                         "caption": "El mayor cambio desde la revolución industrial"}},
    {"t": 17.02, "spec": {"kind": "define", "label": "definición",
                          "term": "Inteligencia artificial",
                          "body": "Un sistema cibernético capaz de realizar tareas…"}},
    {"t": 23.36, "spec": {"kind": "headline", "kicker": "qué tareas",
                          "lines": ["TAREAS", "QUE ANTES SOLO", "HACÍA UN HUMANO"]}},
    {"t": 30.44, "spec": {"kind": "flow", "title": "qué hace por dentro",
                          "steps": ["Observa cómo resuelve un humano",
                                    "Aprende el patrón",
                                    "Imita la tarea"]}},
    {"t": 37.72, "spec": {"kind": "define", "label": "la que más me gusta",
                          "term": "Simulación",
                          "body": "No es exactamente nuestra inteligencia: la imita."}},
    {"t": 45.94, "spec": {"kind": "compare", "title": "qué simula y qué no",
                          "left": {"head": "Sí", "body": "Las capacidades y las tareas"},
                          "right": {"head": "No", "body": "Ser nuestra inteligencia"},
                          "verdict": "Imita lo que hace, no lo que es"}},
    {"t": 52.56, "spec": {"kind": "compare", "title": "el resultado, no el proceso",
                          "left": {"head": "Humano", "body": "Resuelve el problema"},
                          "right": {"head": "Simulación", "body": "Resuelve el problema"}}},
    {"t": 60.10, "spec": {"kind": "headline", "kicker": "en algunos casos",
                          "lines": ["YA NO HAY", "DIFERENCIA"]}},
    {"t": 67.10, "spec": {"kind": "bar", "label": "Programación y matemáticas",
                          "value": 90, "scale": "frente a humanos",
                          "caption": "Mi postura: en esos dos terrenos ya está por encima "
                                     "de la gran mayoría."}},
    {"t": 81.04, "spec": {"kind": "headline", "kicker": "ia con josé",
                          "lines": ["ENTENDERLA", "O QUEDARTE ATRÁS"]}},
]

IMAGENES = {
    "fabrica": "A 19th-century industrial revolution textile mill interior. Rows of cast-iron "
               "steam-powered looms receding into the distance, leather drive belts running to "
               "a ceiling line shaft, cotton dust hanging in a shaft of light from a tall grimy "
               "window. Two workers in worn clothes, small in the frame, backs to camera.",
    "datacenter": "The interior of a modern data centre. A long cold aisle between two walls of "
                  "black server racks receding into the distance, thin rows of small indicator "
                  "lights, thick bundles of cabling overhead, polished floor. Empty of people.",
}


def sh(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, **kw)


def dur_video(p: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


# ---------------------------------------------------------------- 1. imagenes
def fase_imagenes() -> dict[str, Path]:
    from autoedit.codex_client import codex_image
    from autoedit.config import load_config

    estilo = (load_config(None).get("generate") or {}).get("image_style", "")
    ASSETS.mkdir(exist_ok=True)
    salida = {}
    for nombre, escena in IMAGENES.items():
        png = ASSETS / f"panel_{nombre}.png"
        if png.exists():
            print(f"  · {png.name} ya existe (no se regenera)")
        else:
            print(f"  → generando {png.name} con codex…")
            prompt = (f"{escena}\n\n{estilo}\n\nWide horizontal composition, no text, "
                      f"no logos, no watermarks.")
            codex_image(prompt, png)
        salida[nombre] = png
    return salida


# ---------------------------------------------------------------- 2. paneles
def fase_paneles(imgs: dict[str, Path]) -> list[Path]:
    from autoedit.remotion_scenes import render_panel, stage_asset

    total = dur_video(SRC)
    ASSETS.mkdir(exist_ok=True)
    bordes = [p["t"] for p in PANELES] + [total]
    salidas = []
    for i, panel in enumerate(PANELES):
        ini_f = round(bordes[i] * FPS)
        fin_f = round(bordes[i + 1] * FPS)
        n = fin_f - ini_f
        out = ASSETS / f"panel_{i}.mp4"
        if out.exists() and abs(dur_video(out) * FPS - n) < 2:
            print(f"  · panel {i} ya existe ({n} frames)")
            salidas.append(out)
            continue
        spec = json.loads(json.dumps(panel["spec"]))
        if spec.get("kind") == "photo":
            spec["images"] = [stage_asset(imgs[x.lstrip("@")]) for x in spec["images"]]
        print(f"  → panel {i} ({spec['kind']}, {n} frames = {n/FPS:.1f}s)…")
        render_panel(spec, n, out, theme=TEMA)
        salidas.append(out)
    return salidas


# ---------------------------------------------------------------- 3. ensamblado
def fase_ensamblado(paneles: list[Path]) -> Path:
    from autoedit.config import load_config
    from autoedit.subtitles import build_ass

    cfg = load_config(None)

    # -- concat de paneles (mismo encode -> copy, sin recodificar)
    lista = ASSETS / "paneles.txt"
    lista.write_text("".join(f"file '{p.resolve()}'\n" for p in paneles), encoding="utf-8")
    tira = ASSETS / "paneles.mp4"
    sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c", "copy", str(tira)])
    print(f"  · paneles concatenados: {dur_video(tira):.2f}s")

    # -- subtitulos ANCLADOS ARRIBA del panel (Alignment 8), no al pie del cuadro
    words = json.loads((WD / "transcript.json").read_text(encoding="utf-8"))["words"]
    scfg = dict(cfg["subtitles"])
    scfg["margin_v_ratio"] = (CARA_H + 16) / 1920.0
    ass = build_ass(words, 1080, 1920, {**cfg, "subtitles": scfg}, ASSETS / "subs.ass")
    txt = ass.read_text(encoding="utf-8").replace(",1,7,3,2,60,60,", ",1,7,3,8,60,60,")
    if ",8,60,60," not in txt:      # el header pudo cambiar: fuerza Alignment 8
        import re
        txt = re.sub(r"(^Style: Cap,.*?),2,(60,60,)", r"\1,8,\2", txt, flags=re.M)
    ass.write_text(txt, encoding="utf-8")
    print("  · subtítulos anclados bajo la cara")

    # -- cama musical constante (la global; NUNCA sidechain/ducking)
    cama = RAIZ / "autoedit" / "assets" / "bed_electronico.m4a"
    gain = float((cfg.get("render") or {}).get("music_gain", 0.08))

    filtro = (
        f"[0:v]crop=720:596:0:0,scale=1080:{CARA_H}:flags=lanczos,setsar=1[cara];"
        f"[1:v]setsar=1[pan];"
        f"[cara][pan]vstack=inputs=2[stack];"
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
    solo = sys.argv[1] if len(sys.argv) > 1 else "todo"
    print("=== 1. imágenes ===")
    imgs = fase_imagenes()
    if solo == "imagenes":
        sys.exit(0)
    print("=== 2. paneles ===")
    paneles = fase_paneles(imgs)
    if solo == "paneles":
        sys.exit(0)
    print("=== 3. ensamblado ===")
    out = fase_ensamblado(paneles)
    print(f"\n✔ {out}  ({dur_video(out):.1f}s)")
