#!/usr/bin/env python3
"""Rellena los huecos que Whisper dejó al transcribir la pieza ya cortada.

En p08 se comió «deben ser máximo de 15 centímetros por 10. Por 10 cm» — el requisito
de tamaño, justo lo que el resto de la serie retoma — aunque el audio está en el corte.
La transcripción del FUENTE sí lo tiene. Aquí cada palabra del fuente que cae en un tramo
de voz se lleva a tiempo de salida con el `_plan.json`; donde la pieza tiene un hueco
de más de MIN_HUECO s sin palabras y el fuente tiene al menos MIN_PAL ahí, se insertan
las del fuente. Imprime lo que inserta para leerlo.

    .venv/bin/python scratchpad/_j1011/rellena.py <id-pieza> [...]
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PIEZAS = AQUI / "piezas"
MIN_HUECO = 1.8
MIN_PAL = 3


def a_salida(plan, s):
    for t in plan:
        if t["voz"] and t["a"] <= s <= t["b"]:
            return t["t0"] + (s - t["a"]) / t["f"]
    return None


def main():
    fuente = [w for s in json.loads((AQUI / "transcript.json").read_text(encoding="utf-8"))
              for w in s["words"]]
    for pid in sys.argv[1:]:
        plan = json.loads((PIEZAS / f"{pid}_plan.json").read_text(encoding="utf-8"))
        pal = json.loads((PIEZAS / f"{pid}_palabras.json").read_text(encoding="utf-8"))
        mapeadas = []
        for w in fuente:
            s, e = a_salida(plan, w["s"]), a_salida(plan, w["e"])
            if s is not None and e is not None:
                mapeadas.append({"word": w["w"].strip(), "start": s, "end": max(e, s + 0.05)})
        bordes = [0.0] + [x for w in pal for x in (w["start"], w["end"])] + [plan[-1]["t1"]]
        huecos = [(bordes[i], bordes[i + 1]) for i in range(0, len(bordes) - 1, 2)
                  if bordes[i + 1] - bordes[i] > MIN_HUECO]
        nuevas = []
        for h0, h1 in huecos:
            dentro = [w for w in mapeadas if h0 + 0.15 <= w["start"] and w["end"] <= h1 - 0.1]
            if len(dentro) >= MIN_PAL:
                nuevas += dentro
                print(f"  {pid} {h0:6.1f}-{h1:6.1f}s  + «{' '.join(w['word'] for w in dentro)}»")
        if nuevas:
            pal = sorted(pal + nuevas, key=lambda w: w["start"])
            (PIEZAS / f"{pid}_palabras.json").write_text(json.dumps(pal, ensure_ascii=False),
                                                       encoding="utf-8")
        print(f"{pid}: {len(nuevas)} palabras insertadas", flush=True)


if __name__ == "__main__":
    main()
