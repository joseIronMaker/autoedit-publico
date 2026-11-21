"""Le pide a Gemini 4 Argon que VEA y OIGA cada referente y lo desglose.

Lo que Whisper y ffmpeg no miden: timbre, actuación de la voz, arco narrativo, dirección
de animación. Modelo fijado aquí a propósito: es un análisis puntual, no parte del motor.
"""
import json
import os
import pathlib
import sys
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

base = pathlib.Path(__file__).parent
load_dotenv(base.parents[1] / ".env")
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
MODELO = "gemini-4-argon"

PROMPT = """Eres director de animación y de locución. Mira y ESCUCHA este video completo.
Responde solo en JSON con estas llaves, en español, con detalle concreto y observado (nada genérico):
- voz: {genero_aparente, edad_aparente, acento, timbre, tono_emocional, ritmo, uso_de_pausas,
  actuacion (qué hace la voz en los momentos clave), ¿humana o sintética? con evidencia,
  procesado (reverb, cercanía al micro, EQ), direccion_de_locucion: un párrafo con instrucciones
  que le darías a un locutor para lograr esta misma interpretación SIN imitar a esta persona}
- narrativa: {premisa, gancho_primeros_3s (texto literal y por qué engancha), estructura por
  actos con marcas de tiempo, recurso_central, giro, cierre, por_que_se_ve_hasta_el_final}
- animacion: {estilo, paleta, tipografia, camara, como_se_sincroniza_con_la_voz, transiciones,
  ejemplos de tres momentos brillantes con su tiempo, como_se_produciria_hoy (herramienta probable
  y por qué; marca lo que sea inferencia)}
- sonido: {musica, efectos, relacion_con_la_voz}
- plantilla_creativa: la receta abstracta y reutilizable para hacer un video DISTINTO con el mismo nivel,
  escrita como principios y no como reglas numéricas.
"""

ids = sys.argv[1:] or ["r6", "r2", "r1", "r3", "r4", "r5"]
for rid in ids:
    salida = base / f"{rid}_analisis.json"
    if salida.exists():
        print(rid, "ya estaba")
        continue
    print(rid, "subiendo…", flush=True)
    archivo = client.files.upload(file=str(base / "fuente" / f"{rid}.mp4"))
    while archivo.state and archivo.state.name == "PROCESSING":
        time.sleep(3)
        archivo = client.files.get(name=archivo.name)
    print(rid, "analizando…", flush=True)
    resp = client.models.generate_content(
        model=MODELO,
        contents=[archivo, PROMPT],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    salida.write_text(resp.text, encoding="utf-8")
    u = resp.usage_metadata
    print(rid, "OK", u.prompt_token_count, u.candidates_token_count, flush=True)
    client.files.delete(name=archivo.name)
print("FIN")
