"""Mide si un guion AVANZA o se repite.

José, 2-ago-2026: "nunca entendí el hilo de tus videos y soy ingeniero de IA".
El diagnóstico: escenas que dicen lo mismo con otra decoración, y un hook que abre
una pregunta que el video nunca contesta.

Dos números por guion:
- NUEVO por escena: qué fracción de las palabras con contenido de esa escena no
  había aparecido antes. Una escena que repite trae casi nada nuevo.
- CIERRA: si alguna palabra distintiva del hook reaparece en la tesis o el giro,
  el bucle que abrió el hook se cierra dentro del video.

    .venv/bin/python scratchpad/hilo.py scratchpad/guiones_serie3
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

VACIAS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "en",
    "y", "o", "que", "qué", "se", "es", "son", "no", "sí", "si", "por", "para", "con",
    "su", "sus", "lo", "le", "les", "te", "tu", "tus", "me", "mi", "mis", "ya", "más",
    "pero", "como", "cómo", "esto", "eso", "esa", "ese", "esta", "este", "hay", "ser",
    "era", "fue", "va", "ve", "ver", "muy", "todo", "toda", "todos", "todas", "cada",
    "eran", "está", "están", "solo", "sólo", "cuando", "porque", "aunque", "hasta",
    "desde", "sin", "sobre", "entre", "así", "aquí", "ahí", "donde", "dónde", "nada",
    "algo", "otra", "otro", "otras", "otros", "mismo", "misma", "ahora", "mañana",
    "hoy", "puede", "pueden", "puedes", "tiene", "tienen", "hace", "hacen", "dice",
    "vas", "voy", "vamos", "te", "nos", "él", "ella", "ellos", "yo", "tú", "uno",
}


def limpia(t: str) -> list[str]:
    t = unicodedata.normalize("NFKD", t.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return [w for w in re.findall(r"[a-zñ]{3,}", t) if w not in VACIAS]


def analiza(g: dict) -> dict:
    esc = [s for s in g["scenes"] if s.get("narration")]
    vistas: set[str] = set()
    nuevo = []
    for s in esc:
        p = set(limpia(s["narration"]))
        n = len(p - vistas) / max(1, len(p))
        nuevo.append(n)
        vistas |= p
    # el cuerpo son las escenas entre el hook y el cta (sin la tesis, que resume adrede)
    cuerpo = [n for s, n in zip(esc, nuevo)
              if s.get("beat_type") not in ("hook", "tesis", "cta")]
    hook = set(limpia(esc[0]["narration"]))
    despues = set()
    for s in esc[1:]:
        if s.get("beat_type") in ("giro", "tesis"):
            despues |= set(limpia(s["narration"]))
    return {"nuevo": nuevo,
            "peor_cuerpo": min(cuerpo) if cuerpo else 1.0,
            "cierra": bool(hook & despues),
            "eco": sorted(hook & despues)[:4]}


def main() -> None:
    carpeta = Path(sys.argv[1] if len(sys.argv) > 1 else "scratchpad/guiones_serie3")
    print(f"{'guion':34s} {'nuevo por escena':28s} {'peor':>5s}  cierra")
    print("-" * 78)
    for f in sorted(carpeta.glob("*.json")):
        g = json.loads(f.read_text(encoding="utf-8"))
        if "scenes" not in g:
            continue
        r = analiza(g)
        barra = " ".join(f"{n:.2f}" for n in r["nuevo"])
        print(f"{f.name[:33]:34s} {barra:28s} {r['peor_cuerpo']:5.2f}  "
              f"{'sí ' + ','.join(r['eco']) if r['cierra'] else 'NO'}")


if __name__ == "__main__":
    main()
