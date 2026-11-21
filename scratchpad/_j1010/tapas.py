#!/usr/bin/env python3
"""Escribe piezas/<stem>_tapas.txt: cajas que tapan contenido ajeno de la pantalla (listas de
carpetas del escritorio, «Recientes» del Explorador con la ruta C:\\Users\\L0…) en el tiempo de
SALIDA de la pieza, convertido desde el tiempo del FUENTE con su `_plan.json`.

    .venv/bin/python scratchpad/_j1010/tapas.py <stem> x:y:w:h:src0:src1[:color] ...
"""
import json, sys
from pathlib import Path
PIEZAS = Path(__file__).resolve().parent / "piezas"

def a_salida(plan, s):
    for t in plan:
        if s <= t["a"]:
            return t["t0"]                      # cae en un hueco quitado: el siguiente tramo
        if s <= t["b"]:
            return t["t0"] + (s - t["a"]) / t["f"]
    return plan[-1]["t1"]

stem = sys.argv[1]
plan = json.loads((PIEZAS / f"{stem}_plan.json").read_text())
cajas = []
for spec in sys.argv[2:]:
    x, y, w, h, s0, s1, *col = spec.split(":")
    o0, o1 = a_salida(plan, float(s0)), a_salida(plan, float(s1))
    if o1 - o0 < 0.02:
        continue
    cajas.append(f"drawbox=x={x}:y={y}:w={w}:h={h}:color={col[0] if col else 'white'}@1:t=fill:"
                 f"enable='between(t,{max(0, o0 - 0.05):.3f},{o1 + 0.05:.3f})'")
    print(f"  fuente {s0}-{s1} → salida {o0:.2f}-{o1:.2f}")
(PIEZAS / f"{stem}_tapas.txt").write_text(",".join(cajas))
print(f"{len(cajas)} caja(s) → {stem}_tapas.txt")
