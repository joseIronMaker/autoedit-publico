"""Ronda 2: dirección limpia, sin etiquetas; comparando modelos y acentos."""
import base64, json, os, pathlib, re, subprocess
from dotenv import load_dotenv
from google import genai
from google.genai import types
raiz = pathlib.Path(__file__).resolve().parents[2]
load_dotenv(raiz / ".env")
c = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
out = pathlib.Path(__file__).with_name("casting")
TEXTO = """ChatGPT no sabe qué es un perro.
Nunca ha acariciado uno. Ni siquiera ha leído esa palabra.
Antes de entrar, cada palabra se convierte en un punto. Un lugar en un mapa.
Perro vive aquí. Gato, muy cerca. Plátano... hasta allá.
Nadie dibujó este mapa. Se formó solo, leyendo miles de millones de palabras."""
ESTILO = "Narradora de documental: voz limpia, cálida y segura. Ritmo tranquilo con intención. Sin susurrar."
T = {"a_mx6_flash": ("es-419-commercial-6", "gemini-3.8-flash-tts"),
     "b_mx6_lite": ("es-419-commercial-6", "gemini-3.8-flash-lite-tts"),
     "c_es_tutor12": ("es-es-tutor-12", "gemini-3.8-flash-tts"),
     "d_es_commercial3": ("es-es-commercial-3", "gemini-3.8-flash-tts")}
for n, (v, m) in T.items():
    w = out / f"{n}.wav"
    if not w.exists():
        r = c.interactions.create(model=m, input=[{"type": "user_input", "content": [{"type": "text", "text": TEXTO,
            "annotations": [{"type": "speech_metadata", "style": ESTILO}]}]}],
            response_format={"type": "audio"}, generation_config={"speech_config": [{"voice": v}]})
        w.write_bytes(base64.b64decode(r.output_audio.data))
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(w)]))
    print(n, f"{d:.1f}s", round(len(TEXTO.split()) / d * 60), "ppm", flush=True)
sube = lambda p: c.files.upload(file=str(p))
partes = ["Eres director de casting de locución. El AUDIO DE REFERENCIA marca el NIVEL de interpretación buscado (no imitar a esa persona).", "AUDIO DE REFERENCIA:", sube(out / "_ref_r6.wav")]
for n in T:
    partes += [f"CANDIDATA {n}:", sube(out / f"{n}.wav")]
partes.append('Responde solo JSON: {"candidatas":{<nombre>:{"naturalidad_0a10":n,"calidez_0a10":n,"nivel_vs_referencia_0a10":n,"acento":"...","artefactos":"con marca de tiempo"}},"ranking":["..."],"por_que":"...","que_ajustar":"..."}')
r = c.models.generate_content(model="gemini-4-argon", contents=partes, config=types.GenerateContentConfig(response_mime_type="application/json"))
(out / "veredicto2.json").write_text(r.text, encoding="utf-8")
print(r.text[:2600])
