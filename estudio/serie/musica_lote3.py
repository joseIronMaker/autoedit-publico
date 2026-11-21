"""Una pista distinta para cada capítulo de la serie 2. Reanudable: salta las ya aceptadas."""
import json, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import CFG, cliente
from google.genai import types
c = cliente()
out = pathlib.Path(__file__).parent / "musica"
BASE = "Pure instrumental electronic texture, 2 minutes. Warm analog synthesizers, a very soft precise ticking pulse, "
FIN = " Modern, curious and in constant motion. Strictly instrumental electronic: no voice, no vocal samples, no producer tag, no speech, no singing, no drum kit, no piano, no orchestra, no strings."
MOOD = ["with small bright arpeggios opening up like a door", "with a playful mechanical arpeggio, like tiny machines", "with a looping arpeggio that keeps returning", "with an expectant arpeggio that never quite resolves",
 "with a filling, layering texture that slowly gets crowded", "with gentle notebook-like clicks and a calm warm pad", "with an orderly step-by-step sequence", "with crisp clicks like buttons and switches",
 "with a low engine-like pulse and confident synth bass", "with a calm, friendly, thoughtful synth motif", "with a repeating test-like tick and rising tension", "with a sly, sneaky low synth line",
 "with a cold, whispering, suspicious texture", "with metallic clicks and a cautious pulse", "with marble-like plucked synth notes rolling around", "with many small voices of synth answering each other",
 "with a retro 2023 chiptune-tinged texture, nostalgic", "with an explosive, viral, electric energy", "with a fast competitive racing arpeggio", "with tangled noise slowly resolving into a clean tone",
 "with a clear, deliberate, four-step motif", "with fast focused synth arpeggios, like typing", "with tense, cold, low pulses and distant alarms", "with flowing liquid synth textures and quiet awe",
 "with an organic, living, slowly mutating texture", "with an office-like repetitive sequence that slowly dissolves", "with an ominous slow descending synth line", "with an industrial, nocturnal, machine-like rhythm",
 "with an hourglass-like accelerating tension", "reflective and vast, slowly thinning out toward silence"]
ids = sorted(p.name for p in out.parent.glob("a[0-9]*") if p.is_dir())
for k, m in zip(ids, MOOD):
    f, j = out / f"{k}.mp3", out / f"{k}.json"
    if f.exists() and j.exists():
        continue
    for i in range(1, 7):
        try:
            r = c.models.generate_content(model=CFG["musica"], contents=f"{BASE}{m}.{FIN}", config=types.GenerateContentConfig(response_modalities=["AUDIO"]))
            partes = (r.candidates[0].content.parts if r.candidates and r.candidates[0].content else None) or []
            datos = next((p.inline_data.data for p in partes if getattr(p, "inline_data", None) and p.inline_data.data), None)
            if not datos:
                time.sleep(5); continue
            t = out / f"_{k}.mp3"; t.write_bytes(datos)
            a = c.files.upload(file=str(t))
            q = c.models.generate_content(model=CFG["critica"], contents=[a, 'Escucha entera. Solo JSON: {"voces":[{"desde":"mm:ss","hasta":"mm:ss","que":""}],"estilo":"","piano":true/false,"orquesta":true/false}. En voces pon SOLO habla, sílabas, firmas de productor o canto.'], config=types.GenerateContentConfig(response_mime_type="application/json"))
            d = json.loads(q.text)
            malo = d.get("voces") or d.get("piano") or d.get("orquesta") or any(x in str(d.get("estilo", "")).lower() for x in ("trap", "hip hop", "hip-hop", "orquest", "piano"))
            print(k, i, "RECHAZADA" if malo else "LIMPIA", str(d.get("estilo"))[:60], flush=True)
            if not malo:
                t.replace(f); j.write_text(q.text, encoding="utf-8"); break
            t.unlink(missing_ok=True)
        except Exception as e:
            print(k, i, "error", str(e)[:100], flush=True); time.sleep(8)
    else:
        print(k, "SIN PISTA LIMPIA", flush=True)
print("MUSICA3 FIN")
