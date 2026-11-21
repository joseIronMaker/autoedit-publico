"""Una pista distinta por capítulo, y comprobación de que no traiga voces."""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import CFG, cliente
from google.genai import types
c = cliente()
out = pathlib.Path(__file__).parent / "musica"; out.mkdir(exist_ok=True)
BASE = "Strictly instrumental, 2 minutes: no voice, no vocal samples, no choir, no producer tag, no speech, no piano. Leave the midrange open for a narrator. "
P = {
 "c01_error": "Minimal electronic pulse at 104 BPM, a nervous ticking arpeggio that begins chaotic and slowly locks into a clean steady rhythm. Curious and precise.",
 "c02_gradiente": "Nocturnal ambient electronic, foggy warm pad, a very slow distant pulse at 84 BPM like footsteps, faint glassy particles. Patient, mysterious.",
 "c03_neurona": "Playful minimal electronic at 112 BPM, tiny plucked synths, soft clicks and a warm bouncing bass. Light, clever, clockwork.",
 "c04_capas": "Elegant minimal electronic at 98 BPM, a soft synth motif that adds one layer at a time, papery percussion textures. Graceful and building gently.",
 "c05_culpa": "Tense minimal electronic at 108 BPM, low pulsing bass, a descending synth figure that travels backwards, restrained and focused.",
 "c06_memoria": "Slightly uneasy minimal electronic at 100 BPM, soft pulse with a detuned bell-like synth, cold and clean, a feeling that something is not quite right.",
 "c07_comida": "Rising minimal electronic at 118 BPM, starts tiny and starved, a pulse that slowly gains weight and energy, confident and expansive at the end.",
 "c09_atencion": "Delicate minimal electronic at 96 BPM, shimmering threads of arpeggio that answer each other from left to right, intimate and intelligent.",
 "c10_torre": "Monumental minimal electronic at 106 BPM, a repeating motif stacked in octaves with a deep steady pulse, architectural and hypnotic.",
 "c11_siguiente": "Hypnotic minimal electronic at 120 BPM, a steady ticking pulse like a roulette wheel, one soft synth note placed after another.",
 "c12_adivina": "Reflective minimal electronic at 92 BPM, a warm pad and a quiet pulse that slowly thins out toward silence, bittersweet and calm.",
}
for k, pr in P.items():
    f = out / f"{k}.mp3"
    if not f.exists():
        r = c.models.generate_content(model=CFG["musica"], contents=BASE + pr, config=types.GenerateContentConfig(response_modalities=["AUDIO"]))
        for part in r.candidates[0].content.parts or []:
            d = getattr(part, "inline_data", None)
            if d and d.data and str(d.mime_type or "").startswith("audio/"):
                f.write_bytes(d.data); break
    a = c.files.upload(file=str(f))
    q = c.models.generate_content(model=CFG["critica"], contents=[a, 'Escucha entera. Solo JSON: {"voces":[{"desde":"mm:ss","hasta":"mm:ss","que":""}],"estilo":"","piano":true/false,"energia":"baja/media/alta"}. En voces pon SOLO habla, sílabas, firmas de productor o canto.'], config=types.GenerateContentConfig(response_mime_type="application/json"))
    (out / f"{k}.json").write_text(q.text, encoding="utf-8")
    d = json.loads(q.text)
    print(k, "voces:", len(d.get("voces", [])), d.get("voces", [])[:2], "|", d.get("estilo", "")[:70], flush=True)
print("MUSICA FIN")
