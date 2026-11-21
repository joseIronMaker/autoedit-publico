#!/usr/bin/env python3
"""Caza los errores de Whisper que caen sobre el término que el video ENSEÑA.

El error se lee justo donde más duele ("le pido a la gente" por "al agente") y queda
QUEMADO en los subtítulos, así que hay que verlo antes de entregar, no después.
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

# (lo que escribe Whisper, lo que debería decir)
ERRORES = [
    (r"\ba la gente\b", "al agente"),
    (r"\bla gente que escriba\b", "al agente que escriba"),
    (r"\bbad propagation\b", "backpropagation"),
    (r"\btoque[ns]?\b(?! de)", "token/tokens"),
    (r"\bAletza\b", "Alexa"),
    (r"\bpitón\b", "Python"),
    (r"\bpay ?tho?n\b", "Python"),
    (r"\bin put\b", "input"),
    (r"\bprin\b", "print"),
    (r"\bsqui ?lait\b", "SQLite"),
    (r"\bqui cad\b", "KiCad"),
    (r"\bfri cad\b", "FreeCAD"),
]


def main() -> None:
    patron = sys.argv[1] if len(sys.argv) > 1 else "gen_curso_py*"
    malas = 0
    for t in sorted((RAIZ / "videos").glob(f"{patron}.autoedit/transcript.json")):
        texto = json.loads(t.read_text(encoding="utf-8")).get("text", "")
        hallado = [(m.group(0), bueno) for mal, bueno in ERRORES
                   for m in re.finditer(mal, texto, re.I)]
        if hallado:
            malas += 1
            clase = t.parent.name.replace(".autoedit", "")
            print(f"{clase}:")
            for dice, deberia in hallado:
                print(f"    dice «{dice}» → debería decir «{deberia}»")
    print(f"\n{malas} clases con vocabulario mal transcrito"
          if malas else "\nvocabulario limpio en todas")


if __name__ == "__main__":
    main()
