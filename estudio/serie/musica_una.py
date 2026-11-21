"""Regenera una pista con exigencia de estilo: electrónica, sin voces, sin piano, sin orquesta.
python estudio/serie/musica_una.py <id> "<descripción>" """
import json, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import CFG, cliente
from google.genai import types
c = cliente()
out = pathlib.Path(__file__).parent / "musica"
k, desc = sys.argv[1], sys.argv[2]
P = "Pure instrumental ambient electronic texture, 2 minutes. A slowly evolving warm analog synth pad, a very soft ticking pulse like a precise clock, " + desc + " Modern and electronic only. Strictly instrumental: no voice, no vocal samples, no producer tag, no speech, no singing, no drum kit, no piano, no orchestra, no strings."
for i in range(1, 7):
    try:
        r = c.models.generate_content(model=CFG["musica"], contents=P, config=types.GenerateContentConfig(response_modalities=["AUDIO"]))
        partes = (r.candidates[0].content.parts if r.candidates and r.candidates[0].content else None) or []
        datos = next((p.inline_data.data for p in partes if getattr(p, "inline_data", None) and p.inline_data.data), None)
        if not datos:
            print(i, "sin audio", flush=True); time.sleep(5); continue
        t = out / f"_{k}.mp3"; t.write_bytes(datos)
        a = c.files.upload(file=str(t))
        q = c.models.generate_content(model=CFG["critica"], contents=[a, 'Escucha entera. Solo JSON: {"voces":[{"desde":"mm:ss","hasta":"mm:ss","que":""}],"estilo":"","piano":true/false,"orquesta":true/false}. En voces pon SOLO habla, sílabas, firmas de productor o canto.'], config=types.GenerateContentConfig(response_mime_type="application/json"))
        d = json.loads(q.text)
        malo = d.get("voces") or d.get("piano") or d.get("orquesta") or any(x in str(d.get("estilo", "")).lower() for x in ("trap", "hip hop", "hip-hop", "orquest"))
        print(i, "RECHAZADA" if malo else "LIMPIA", str(d.get("estilo"))[:70], flush=True)
        if not malo:
            t.replace(out / f"{k}.mp3"); (out / f"{k}.json").write_text(q.text, encoding="utf-8"); sys.exit(0)
    except Exception as e:
        print(i, "error", str(e)[:120], flush=True); time.sleep(8)
sys.exit("SIN PISTA LIMPIA")
