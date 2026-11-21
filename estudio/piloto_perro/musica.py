"""Dos atmósferas con Lyria: luz (mundo blanco) y sombra (el negro)."""
import pathlib, sys
from google.genai import types
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import CFG, cliente
c = cliente()
out = pathlib.Path(__file__).parent / "audio"
P = {
 "pulso2": "Pure instrumental ambient electronic texture, 2 minutes. A slowly evolving warm analog synth pad, a very soft ticking pulse like a precise clock at 100 BPM, gentle sub bass swells and tiny glassy digital particles. Elegant, curious, scientific, in constant quiet motion. Strictly instrumental: no voice, no vocal samples, no producer tag, no speech, no singing, no drum kit, no piano.",
 "sombra": "Instrumental dark ambient, 1 minute. A single cold low drone with a very slow sub pulse and distant metallic air. Uneasy, clinical, restrained. No melody, no drums, no vocals, no risers. Very sparse, the sound of an empty room after bad news.",
}
for k, pr in P.items():
    f = out / f"{k}.mp3"
    if f.exists():
        continue
    r = c.models.generate_content(model=CFG["musica"], contents=pr, config=types.GenerateContentConfig(response_modalities=["AUDIO"]))
    for part in r.candidates[0].content.parts or []:
        d = getattr(part, "inline_data", None)
        if d and d.data and str(d.mime_type or "").startswith("audio/"):
            f.write_bytes(d.data); print(k, d.mime_type, len(d.data)); break
    else:
        print(k, "SIN AUDIO", [getattr(x, "text", "") for x in r.candidates[0].content.parts or []])
