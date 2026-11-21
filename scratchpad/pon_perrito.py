"""Mete el perrito del canal en las escenas donde el guion lo pide, sin regenerar nada.

El guion que vive en `<stem>.assets/guion.json` es el que manda al re-ensamblar, y ese se
escribió antes de que existiera el perrito. Aquí se le copia la clave `foto` buscando la
escena POR SU NARRACIÓN — no por índice, porque el motor de hooks a veces mete una escena
al principio y todos los índices se recorren.

    .venv/bin/python scratchpad/pon_perrito.py py10
"""
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PY = RAIZ / ".venv" / "bin" / "python"

clase = sys.argv[1]
sin_ensamblar = "--sin-ensamblar" in sys.argv
fuente = sorted((RAIZ / "scratchpad" / "guiones_curso").glob(f"{clase}_*.json"))[0]
g = json.loads(fuente.read_text(encoding="utf-8"))
stem = f"gen_{g['slug']}"
assets = RAIZ / "videos" / f"{stem}.assets"
ap = assets / "guion.json"
if not ap.exists():
    sys.exit(f"{clase}: no está producida todavía")
ga = json.loads(ap.read_text(encoding="utf-8"))

hechas = []
for esc in g["scenes"]:
    if not esc.get("foto"):
        continue
    clave = esc["narration"][:40]
    for i, ea in enumerate(ga["scenes"]):
        if ea["narration"].startswith(clave):
            ea["foto"] = esc["foto"]
            ea["visual_type"] = "image"
            hechas.append(i)
            break
if not hechas:
    sys.exit(f"{clase}: ninguna escena con perrito")
ap.write_text(json.dumps(ga, ensure_ascii=False, indent=1), encoding="utf-8")
for i in hechas:
    subprocess.run([str(PY), str(RAIZ / "scratchpad" / "rehacer_escena.py"), stem, str(i),
                    "--sin-ensamblar"], cwd=RAIZ, check=True)
if not sin_ensamblar:
    subprocess.run([str(PY), str(RAIZ / "scratchpad" / "rehacer_escena.py"), stem,
                    "--solo-ensamblar"], cwd=RAIZ, check=True)
print(f"✔ {clase}: perrito en las escenas {hechas}")
