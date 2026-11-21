#!/usr/bin/env python3
"""Aplica las narraciones nuevas (scratchpad/_curso/narr/*.json) a los guiones del curso.

Cada archivo del banco es {"<nombre del guion sin .json>": ["escena 0", "escena 1", ...]}.
Se valida que el número de escenas cuadre ANTES de tocar nada: un desfase de una escena
mete el remate de la anterior y el video se entrega con la voz hablando de otra cosa.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
GUIONES = RAIZ / "scratchpad" / "guiones_curso"


def main() -> None:
    bancos = sys.argv[1:] or sorted((RAIZ / "scratchpad/_curso/narr").glob("*.json"))
    for b in bancos:
        banco = json.loads(Path(b).read_text(encoding="utf-8"))
        for nombre, textos in banco.items():
            g = GUIONES / f"{nombre}.json"
            d = json.loads(g.read_text(encoding="utf-8"))
            escenas = d["scenes"]
            if len(escenas) != len(textos):
                sys.exit(f"{nombre}: el guion tiene {len(escenas)} escenas y el banco {len(textos)}")
            for e, t in zip(escenas, textos):
                for k in ("narracion", "narration"):
                    if k in e:
                        e[k] = t
                        break
                else:
                    e["narracion"] = t
            g.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"✔ {nombre}: {len(textos)} narraciones nuevas")


if __name__ == "__main__":
    main()
