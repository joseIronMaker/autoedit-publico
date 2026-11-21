"""V2: Gemini marcó el cold-open ('3 activaciones y sigue recta') como falso comienzo y
lo cortó. Se deshabilita ese corte (semántica 'disabled' del edl.json) y se re-renderiza.
El guard permanente ya quedó en autoedit/edl.py."""
import json
from pathlib import Path

from autoedit.util import write_json_atomic

p = Path("videos/gen_dl_activacion_no_basta.autoedit/edl.json")
edl = json.loads(p.read_text())
n = 0
for c in edl["cuts"]:
    if c["start"] < 3.5 and "falso comienzo" in c.get("reason", ""):
        c["disabled"] = True
        n += 1
        print(f"deshabilitado: {c['start']:.2f}→{c['end']:.2f} {c['reason'][:70]}")
assert n == 1, f"esperaba 1 corte de cold-open, encontré {n}"
write_json_atomic(p, edl)
print("edl.json actualizado")
