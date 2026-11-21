"""Pasa los guiones de la serie 3 por el crítico de Codex y guarda los veredictos.

    .venv/bin/python scratchpad/criticar_serie3.py            # todos
    .venv/bin/python scratchpad/criticar_serie3.py ver01s     # uno

Deja un JSON por guion en scratchpad/veredictos/ para poder aplicar los arreglos
sin volver a gastar una llamada.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from autoedit.critico import EJES, graves, medir_hook, revisar   # noqa: E402

D = Path("scratchpad/guiones_serie3")
OUT = Path("scratchpad/veredictos")
OUT.mkdir(exist_ok=True)

pref = sys.argv[1] if len(sys.argv) > 1 else "ver"
for f in sorted(D.glob(f"{pref}*.json")):
    g = json.loads(f.read_text(encoding="utf-8"))
    if "scenes" not in g:
        continue
    m = medir_hook(g)
    print(f"\n=== {f.name}   hook: {m['palabras']} palabras, {m['segundos_aprox']}s "
          f"{'✔' if m['cabe_en_12'] else '✗ LARGO'}", flush=True)
    try:
        v = revisar(g)
    except Exception as e:
        print(f"    falló: {str(e)[:150]}", flush=True)
        continue
    v["_hook_medido"] = m
    (OUT / f.name).write_text(json.dumps(v, ensure_ascii=False, indent=2), encoding="utf-8")
    print("    " + " · ".join(f"{e} {v['nota'].get(e, 0)}" for e in EJES)
          + f"   ({len(graves(v))} graves de {len(v['problemas'])})", flush=True)
    for p in graves(v):
        print(f"      esc {p.get('escena')} [{p.get('eje')}] {p.get('que')}", flush=True)
        print(f"          → {p.get('arreglo')}", flush=True)
