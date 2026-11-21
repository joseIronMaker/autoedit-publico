"""Casting: misma toma con varias voces, medidas y escuchadas por Gemini 4 Argon."""
import base64, json, os, pathlib, re, subprocess, sys, time
from dotenv import load_dotenv
from google import genai
raiz = pathlib.Path(__file__).resolve().parents[2]
load_dotenv(raiz / ".env")
c = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
out = pathlib.Path(__file__).with_name("casting"); out.mkdir(exist_ok=True)
texto = (raiz / "estudio/piloto_perro/narracion.txt").read_text(encoding="utf-8").strip()
ESTILO = "Íntima y serena, muy cerca del micrófono, como quien revela un secreto fascinante. Pausada, sin tono de locutor comercial."
MODELO = "gemini-3.8-flash-tts"
cand = sys.argv[1:] or []

def voz_disenada():
    p = out / "voz_disenada.txt"
    if p.exists():
        return p.read_text().strip()
    v = c.voices.create(store=True, voice={
        "model": MODELO, "type": "prompted", "display_name": "Narradora ia.conjose",
        "gender": "female", "language_code": "es-419",
        "prompted": {"input": "Mujer mexicana de unos 35 años, timbre medio-grave, aterciopelado y con algo de aire. Habla despacio y muy cerca del micrófono, serena y curiosa, con la calidez de quien cuenta un secreto."},
    })
    p.write_text(v.id)
    return v.id

def sintetiza(voz, nombre):
    w = out / f"{nombre}.wav"
    if w.exists():
        return w
    r = c.interactions.create(model=MODELO, input=[{"type": "user_input", "content": [{"type": "text", "text": texto,
        "annotations": [{"type": "speech_metadata", "style": ESTILO}]}]}],
        response_format={"type": "audio"}, generation_config={"speech_config": [{"voice": voz}]})
    w.write_bytes(base64.b64decode(r.output_audio.data))
    return w

def mide(w):
    ff = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(w), "-af", "silencedetect=n=-38dB:d=0.18,ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(w)]))
    sil = [float(x) for x in re.findall(r"silence_duration: ([\d.]+)", ff)]
    pal = len(re.sub(r"<[^>]+>", " ", texto).split())
    return {"dur": round(dur, 1), "ppm": round(pal / dur * 60), "ppm_sin_pausas": round(pal / max(dur - sum(sil), .1) * 60), "pausas": len(sil), "silencio_%": round(sum(sil) / dur * 100)}

voces = {"mx_commercial6": "es-419-commercial-6", "mx_training7": "es-419-training-7", "mx_assistant6": "es-419-assistant-6"}
for extra in cand:
    k, v = extra.split("=")
    voces[k] = v
voces["disenada"] = voz_disenada()
res = {}
for n, v in voces.items():
    try:
        w = sintetiza(v, n); res[n] = mide(w); print(n, res[n], flush=True)
    except Exception as e:
        print(n, "ERROR", str(e)[:200], flush=True)
ref = out / "_ref_r6.wav"
if not ref.exists():
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0", "-t", "25", "-i", str(raiz / "scratchpad/_referentes/fuente/r6.mp4"), "-vn", "-ac", "1", "-ar", "24000", str(ref)])
partes = ["Eres director de casting de locución para documentales. El AUDIO DE REFERENCIA marca el NIVEL de interpretación que buscamos (no queremos imitar a esa persona)."]
sube = lambda p: c.files.upload(file=str(p))
partes += ["AUDIO DE REFERENCIA:", sube(ref)]
for n in res:
    partes += [f"CANDIDATA {n}:", sube(out / f"{n}.wav")]
partes.append("""Escucha cada candidata completa. Responde solo JSON: {"candidatas": {<nombre>: {"naturalidad_0a10":n, "calidez_0a10":n, "intimidad_0a10":n,
"nivel_vs_referencia_0a10":n, "acento":"...", "artefactos":"lo que suena sintético, con marca de tiempo", "pronuncia_mal":"...", "ritmo":"..."}},
"ganadora":"nombre", "por_que":"...", "que_ajustar":"instrucción concreta de estilo o de texto para acercarla a la referencia"}""")
from google.genai import types
r = c.models.generate_content(model="gemini-4-argon", contents=partes, config=types.GenerateContentConfig(response_mime_type="application/json"))
(out / "veredicto.json").write_text(r.text, encoding="utf-8")
print(r.text[:3500])
