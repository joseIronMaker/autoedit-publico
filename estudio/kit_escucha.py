"""Oye una mezcla terminada contra su guion buscando cortes, palabras comidas y saltos.

python estudio/kit_escucha.py <final.mp4|mezcla.wav> <guion.txt>
"""
import json, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from config import CFG, cliente
from google.genai import types
c = cliente()
f = c.files.upload(file=sys.argv[1])
while f.state and f.state.name == "PROCESSING":
    time.sleep(3); f = c.files.get(name=f.name)
g = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")
r = c.models.generate_content(model=CFG["critica"], contents=[f, "Guion:\n" + g + '\nEscucha el audio entero. Busca SOLO fallos técnicos: palabras cortadas o comidas, sílabas partidas por un silencio, frases interrumpidas, saltos, clics, música que tape la voz. Las pausas entre frases son deliberadas y no son fallos. Solo JSON: {"cortes":[{"t":"mm:ss","que":""}],"tapa_la_voz":[{"t":"mm:ss","que":""}],"limpio":true/false}'], config=types.GenerateContentConfig(response_mime_type="application/json"))
print(pathlib.Path(sys.argv[1]).parent.name, r.text[:900])
