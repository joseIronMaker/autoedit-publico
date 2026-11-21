#!/usr/bin/env python3
"""Puerta de entrega de las piezas del grabado del 11-oct (EasyEDA + dimmer).

Las mismas medidas que `_j21/verifica.py`, con la geometría de ESTA grabación: pantalla
y 213→825, cara y 1022→1920. Y además: el mp4 lee entero hasta el final (un final sin
`moov` revienta aquí y no en TikTok), dura lo mismo que su corte sin subtítulos, los
subtítulos cubren la pieza de punta a punta y la cama musical suena bajo la voz.

    .venv/bin/python scratchpad/_j1010/verifica.py [id-pieza ...]
"""
from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "j21verifica", "/home/jose/tiktok/scratchpad/_j21/verifica.py")
v = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(v)

AQUI = Path(__file__).resolve().parent
PIEZAS = AQUI / "piezas"
CABEZA = {p["id"]: p.get("cabeza", False) for p in json.loads((AQUI / "piezas.json").read_text(encoding="utf-8"))}
COPYS = AQUI / "copys"


def integro(mp4: Path) -> str | None:
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, v.dur(mp4) - 3):.2f}",
                        "-i", str(mp4), "-f", "null", "-"], capture_output=True, text=True)
    return r.stderr.strip()[:200] or None


def lufs(mp4: Path) -> float:
    r = subprocess.run(["ffmpeg", "-nostats", "-i", str(mp4), "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(m[-1]) if m else 0.0


def revisa(pid: str) -> list[str]:
    fallos, avisos = [], []
    mp4 = PIEZAS / f"{pid}.mp4"
    if not mp4.exists():
        return [f"FALLO {pid}: no existe el mp4"]
    try:
        d = v.dur(mp4)
    except Exception:
        return [f"FALLO {pid}: el mp4 no abre (¿sin moov?)"]
    err = integro(mp4)
    if err:
        fallos.append(f"FALLO {pid}: errores al decodificar el final: {err}")
    crudo = PIEZAS / f"{pid}_crudo.mp4"
    if crudo.exists() and abs(v.dur(crudo) - d) > 0.5:
        fallos.append(f"FALLO {pid}: dura {d:.1f}s y su corte {v.dur(crudo):.1f}s")
    if d < 25 or d > 600:
        fallos.append(f"FALLO {pid}: dura {d:.1f}s (fuera de 25-600)")

    cara = v.movimiento(mp4, 1022, 898)
    pant = v.movimiento(mp4, 213, 612)
    if cara < v.PARADO:
        fallos.append(f"FALLO {pid}: la cara está parada ({cara:.2f} < {v.PARADO})")
    if pant < 0.08:
        avisos.append(f"aviso {pid}: la pantalla casi no cambia ({pant:.2f})")

    ass = PIEZAS / f"{pid}.ass"
    if ass.exists():
        parte, peor = v.franja_limpia(ass)
        if parte > 0.12:
            fallos.append(f"FALLO {pid}: {parte:.0%} de los subtítulos en dos renglones («{peor}»)")
        elif parte > 0.02:
            avisos.append(f"aviso {pid}: {parte:.0%} en dos renglones («{peor}»)")
    else:
        fallos.append(f"FALLO {pid}: falta el .ass")

    copy = COPYS / f"{pid.split('_')[0]}_copy_tiktok.txt"
    if copy.exists():
        m = v.CTA.search(copy.read_text(encoding="utf-8"))
        if m:
            fallos.append(f"FALLO {pid}: CTA directo en el copy → «{m.group(0)}»")
    else:
        fallos.append(f"FALLO {pid}: no hay copy ({copy.name})")

    pal = PIEZAS / f"{pid}_palabras.json"
    if pal.exists():
        ws = json.loads(pal.read_text(encoding="utf-8"))
        texto = " ".join(w["word"] for w in ws)
        if v.RUTA.search(texto):
            fallos.append(f"FALLO {pid}: la ruta del usuario salió en los subtítulos")
        if len(ws) < 40:
            fallos.append(f"FALLO {pid}: solo {len(ws)} palabras de subtítulo")
        # una pieza con "cabeza" abre con el montaje mudo («1 HORA EN 6 S»): ahí la voz
        # empieza a propósito pasado el montaje, que dura como mucho MONTAJE_N·0.3 = 6 s
        elif ws[0]["start"] > (6.5 if CABEZA.get(pid) else 2.5) or d - ws[-1]["end"] > 6:
            fallos.append(f"FALLO {pid}: subtítulos de {ws[0]['start']:.1f}s a "
                          f"{ws[-1]['end']:.1f}s en una pieza de {d:.1f}s")
        if v.CTA.search(texto):
            avisos.append(f"aviso {pid}: imperativo de CTA en lo que dice («{v.CTA.search(texto).group(0)}»)")
    else:
        fallos.append(f"FALLO {pid}: faltan las palabras")

    i = lufs(mp4)
    if not -17 <= i <= -11:
        fallos.append(f"FALLO {pid}: sonoridad {i:.1f} LUFS (fuera de -17..-11)")

    print(f"  {pid}: {d:.1f}s · cara {cara:.2f} · pantalla {pant:.2f} · {i:.1f} LUFS")
    for a in avisos:
        print(f"    {a}")
    return fallos


def main() -> None:
    ids = sys.argv[1:] or [p["id"] for p in
                           json.loads((AQUI / "piezas.json").read_text(encoding="utf-8"))]
    fallos = [f for pid in ids for f in revisa(pid)]
    print()
    for f in fallos:
        print(f)
    if fallos:
        sys.exit(1)
    print(f"✔ {len(ids)} pieza(s) OK")


if __name__ == "__main__":
    main()
