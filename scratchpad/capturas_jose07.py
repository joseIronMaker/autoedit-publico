"""Capturas REALES de los sitios de los LLM que José nombra en el jose07.

REGLA DE REALIDAD: empresas y productos reales se muestran con material real, nunca con
una imagen generada. Van por el Chrome de Windows (autoedit.win_browser), que es el que
tiene sesión; el perfil de automatización no necesita cuenta para estas portadas.
"""
import sys, time
from pathlib import Path
RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from dotenv import load_dotenv
load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb

SITIOS = [
    ("openai",   "https://openai.com/chatgpt/overview/"),
    ("anthropic","https://www.anthropic.com/claude"),
    ("gemini",   "https://gemini.google.com/"),
    ("deepseek", "https://www.deepseek.com/"),
]
DEST = RAIZ / "jose07.assets"
DEST.mkdir(exist_ok=True)

for nombre, url in SITIOS:
    out = DEST / f"shot_{nombre}.png"
    if out.exists():
        print(f"  · {nombre}: ya existe, se reusa"); continue
    for intento in range(3):
        try:
            wb.asegura_chrome()
            time.sleep(2)
            wb.captura(url, out, ancho=1440, alto=900, espera_s=9)
            print(f"  · {nombre}: {out.name} ({out.stat().st_size//1024} KB)")
            break
        except Exception as e:
            print(f"  · {nombre}: intento {intento+1} falló ({str(e)[:90]})")
            time.sleep(4)
    else:
        print(f"  ! {nombre}: SIN CAPTURA")
print("fin")
