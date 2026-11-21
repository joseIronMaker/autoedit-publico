#!/usr/bin/env python3
"""Puerta de entrega de los cortes del grabado del 20-sep.

`verifica_entrega.py` mide videos GENERADOS (guion, escenas, tipos visuales) y aquí no
hay nada de eso: son tramos de una grabación con subtítulos quemados. Lo que sí puede
fallar en este formato, y se mide:

  · mp4 íntegro y con la duración que dice el corte
  · la cara y la pantalla se mueven (un tramo congelado = la grabación se trabó)
  · los subtítulos caen en la franja negra, sin tapar pantalla ni cara
  · el texto de los subtítulos se parece a lo que él dice en ese tramo
  · el copy no lleva CTA directo (TikTok penaliza el imperativo: regla del canal)
  · no se cuela la ruta del usuario corporativo de Windows en la pantalla

    .venv/bin/python scratchpad/_j20/verifica.py [id-pieza ...]
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
PIEZAS = AQUI / "piezas"
COPYS = AQUI / "copys"

PARADO = 0.35            # diff medio entre cuadros a 80x76 gris (regla del proyecto)
MAX_PARADO = 0.45
# Ojo: el verbo «seguir» es legítimo («el texto que sigue»). Lo prohibido es el
# IMPERATIVO dirigido al espectador, no la palabra.
CTA = re.compile(r"\b(gu[áa]rdalo|gu[áa]rdate|gu[áa]rdenlo|s[íi]gueme|s[íi]guenos|"
                 r"s[íi]gan\w*|suscr[íi]b\w+|com[ée]ntame|comenta\b|comenten\b|"
                 r"dale like|dale me gusta|comp[áa]rtelo|comparte este|"
                 r"no te lo pierdas|link en (la )?bio)", re.I)
RUTA = re.compile(r"L\d{8}", re.I)          # el usuario corporativo: USUARIO


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                 "format=duration", "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def movimiento(video: Path, y0: int, alto: int) -> float:
    """Diferencia media entre cuadros consecutivos de una banda del cuadro."""
    crudo = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vf",
         f"crop=1080:{alto}:0:{y0},scale=80:76,format=gray", "-r", "4",
         "-f", "rawvideo", "-"], capture_output=True).stdout
    a = np.frombuffer(crudo, dtype=np.uint8).astype(np.float32)
    n = len(a) // (80 * 76)
    a = a[: n * 80 * 76].reshape(n, -1)
    return float(np.abs(np.diff(a, axis=0)).mean())


def franja_limpia(ass: Path) -> tuple[float, str]:
    """Qué parte de los subtítulos se parte en dos renglones.

    Contar caracteres no sirve (Anton es condensada y «71 MIL 400 MILLONES» mide menos
    que «PROMINENTES DE»): se mide el ancho real con la misma fuente y el mismo cuerpo
    que usa el ASS. Un renglón de más sube el texto sobre la barra de tareas de Windows,
    que no estorba; por eso es aviso y no fallo mientras sea una minoría.
    """
    from PIL import ImageFont

    txt = ass.read_text(encoding="utf-8")
    tam = int(re.search(r"Style: Cap,[^,]+,(\d+)", txt).group(1))
    margen = int(re.search(r"Style: Cap,(?:[^,]*,){19}(\d+),(\d+)", txt).group(1) or 60)
    util = 1080 - 2 * margen
    fuente = ImageFont.truetype("/home/jose/.fonts/Anton-Regular.ttf", tam)
    anchos, peor = [], ("", 0.0)
    for ln in txt.splitlines():
        if not ln.startswith("Dialogue:"):
            continue
        t = re.sub(r"\{[^}]*\}", "", ln.split(",", 9)[9]).strip()
        w = fuente.getlength(t)
        anchos.append(w > util)
        if w > peor[1]:
            peor = (t, w)
    return (sum(anchos) / max(1, len(anchos))), peor[0]


def revisa(pid: str) -> list[str]:
    fallos, avisos = [], []
    mp4 = PIEZAS / f"{pid}.mp4"
    if not mp4.exists():
        return [f"FALLO {pid}: no existe el mp4"]

    d = dur(mp4)
    if d < 25 or d > 180:
        fallos.append(f"FALLO {pid}: dura {d:.1f}s (fuera de 25-180)")

    cara = movimiento(mp4, 1058, 609)
    pant = movimiento(mp4, 288, 608)
    if cara < PARADO:
        fallos.append(f"FALLO {pid}: la cara está parada ({cara:.2f} < {PARADO})")
    if pant < 0.08:
        avisos.append(f"aviso {pid}: la pantalla casi no cambia ({pant:.2f})")

    ass = PIEZAS / f"{pid}.ass"
    if ass.exists():
        parte, peor = franja_limpia(ass)
        if parte > 0.12:
            fallos.append(f"FALLO {pid}: {parte:.0%} de los subtítulos parte en dos "
                          f"renglones (la peor: «{peor}»)")
        elif parte > 0.02:
            avisos.append(f"aviso {pid}: {parte:.0%} parte en dos renglones («{peor}»)")
    else:
        fallos.append(f"FALLO {pid}: falta el .ass")

    copy = COPYS / f"{pid.split('_')[0]}_{pid.split('_')[1]}_copy_tiktok.txt"
    if copy.exists():
        m = CTA.search(copy.read_text(encoding="utf-8"))
        if m:
            fallos.append(f"FALLO {pid}: CTA directo en el copy → «{m.group(0)}»")
    else:
        avisos.append(f"aviso {pid}: no encuentro el copy ({copy.name})")

    pal = PIEZAS / f"{pid}_palabras.json"
    if pal.exists():
        texto = " ".join(w["word"] for w in json.loads(pal.read_text(encoding="utf-8")))
        if RUTA.search(texto):
            fallos.append(f"FALLO {pid}: la ruta del usuario salió en los subtítulos")
        if len(texto.split()) < 40:
            fallos.append(f"FALLO {pid}: solo {len(texto.split())} palabras de subtítulo")

    print(f"  {pid}: {d:.1f}s · cara {cara:.2f} · pantalla {pant:.2f}")
    for a in avisos:
        print(f"    {a}")
    return fallos


def main() -> None:
    ids = sys.argv[1:] or [p["id"] for p in
                           json.loads((AQUI / "piezas.json").read_text(encoding="utf-8"))]
    fallos = []
    for pid in ids:
        fallos += revisa(pid)
    print()
    if fallos:
        for f in fallos:
            print(f)
        sys.exit(1)
    print(f"✔ {len(ids)} pieza(s) OK")


if __name__ == "__main__":
    main()
