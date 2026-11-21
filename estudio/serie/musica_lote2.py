"""Segunda pasada: Lyria mete voces aunque se le prohíba. La fórmula limpia es hablar de textura,
no de BPM ni de beat. Cada pista se escucha y se reintenta hasta que salga sin voces."""
import json, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import CFG, cliente
from google.genai import types
c = cliente()
out = pathlib.Path(__file__).parent / "musica"
PRE = "Pure instrumental ambient electronic texture, 2 minutes. A slowly evolving warm analog synth pad, a very soft ticking pulse like a precise clock, "
POST = " Elegant, scientific, in constant quiet motion. Strictly instrumental: no voice, no vocal samples, no producer tag, no speech, no singing, no drum kit, no piano."
M = {
 "c01_error": "tiny nervous glassy particles that slowly settle into order.",
 "c02_gradiente": "foggy nocturnal air, a distant low swell like slow footsteps in the dark.",
 "c03_neurona": "small plucked metallic sparkles and a gentle bouncing low tone, light and clever.",
 "c05_culpa": "a low tense swell and a thin descending shimmer that travels backwards.",
 "c06_memoria": "a slightly detuned cold bell tone, uneasy, as if something is not quite right.",
 "c07_comida": "a thin texture that slowly gains weight, warmth and width until it feels expansive.",
 "c09_atencion": "delicate shimmering threads that answer each other from left to right, intimate.",
 "c11_siguiente": "a steady hypnotic tick, one soft tone placed after another, like a wheel turning.",
 "c12_adivina": "reflective and bittersweet, slowly thinning out toward silence.",
}
pendientes = sys.argv[1:] or list(M)
for k in pendientes:
    for intento in range(1, 6):
        f = out / f"{k}.mp3"
        try:
            r = c.models.generate_content(model=CFG["musica"], contents=PRE + M[k] + POST, config=types.GenerateContentConfig(response_modalities=["AUDIO"]))
            partes = (r.candidates[0].content.parts if r.candidates and r.candidates[0].content else None) or []
            datos = next((p.inline_data.data for p in partes if getattr(p, "inline_data", None) and p.inline_data.data), None)
            if not datos:
                print(k, intento, "sin audio", flush=True); time.sleep(5); continue
            f.write_bytes(datos)
            a = c.files.upload(file=str(f))
            q = c.models.generate_content(model=CFG["critica"], contents=[a, 'Escucha entera, con atención a voces escondidas. Solo JSON: {"voces":[{"desde":"mm:ss","hasta":"mm:ss","que":""}],"estilo":"","piano":true/false,"bateria":true/false}. En voces pon SOLO habla, sílabas, firmas de productor o canto.'], config=types.GenerateContentConfig(response_mime_type="application/json"))
            d = json.loads(q.text)
            (out / f"{k}.json").write_text(q.text, encoding="utf-8")
            limpio = not d.get("voces") and not any(x in str(d.get("estilo", "")).lower() for x in ("trap", "hip hop", "hip-hop", "r&b"))
            print(k, intento, "LIMPIA" if limpio else "RECHAZADA", str(d.get("estilo", ""))[:60], str(d.get("voces", ""))[:90], flush=True)
            if limpio:
                break
        except Exception as e:
            print(k, intento, "error", str(e)[:120], flush=True); time.sleep(8)
    else:
        print(k, "SIN PISTA LIMPIA", flush=True)
print("MUSICA2 FIN")
