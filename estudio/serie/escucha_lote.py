"""Escucha cada toma contra su guion. Un error de lectura se arregla ANTES de animar."""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import CFG, cliente
from google.genai import types
c = cliente()
base = pathlib.Path(__file__).parent
for d in sorted(base.glob((sys.argv[1] if len(sys.argv) > 1 else "c") + "[0-9]*")):
    if not (d / "voz.wav").exists():
        continue
    sal = d / "escucha.json"
    if sal.exists():
        continue
    f = c.files.upload(file=str(d / "voz.wav"))
    g = (d / "guion.txt").read_text(encoding="utf-8")
    r = c.models.generate_content(model=CFG["critica"], contents=[f, "Guion:\n" + g + '\nEscucha el audio entero y compáralo palabra por palabra. Solo JSON: {"errores_de_lectura":[{"t":"mm:ss","dijo":"","debia":""}],"mala_pronunciacion":[{"t":"mm:ss","que":""}],"artefactos":[{"t":"mm:ss","que":""}],"calificacion_0a10":n,"regenerar_toma":true/false}'], config=types.GenerateContentConfig(response_mime_type="application/json"))
    sal.write_text(r.text, encoding="utf-8")
    q = json.loads(r.text)
    print(d.name, q.get("calificacion_0a10"), "regenerar" if q.get("regenerar_toma") else "ok", json.dumps(q.get("errores_de_lectura"), ensure_ascii=False)[:200], json.dumps(q.get("mala_pronunciacion"), ensure_ascii=False)[:160], json.dumps(q.get("artefactos"), ensure_ascii=False)[:160], flush=True)
print("ESCUCHA FIN")
