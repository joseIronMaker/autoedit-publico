"""Lista lo que YA hay en TikTok Studio (publicado + programado) antes de subir.

Regla de [[publicar-tiktok-studio]]: SIEMPRE revisar /tiktokstudio/content antes de
subir; Jose a veces ya publico algo a mano y se generan duplicados.
"""
import json
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv  # noqa: E402
load_dotenv(RAIZ / ".env")

from autoedit import win_browser as wb  # noqa: E402
import subir_tiktok as st  # noqa: E402

wb.asegura_chrome()
tid = wb.abre_pagina(st.CONTENT, espera_s=16, ancho=1500, alto=1100)
time.sleep(6)
st.cierra_avisos(tid)
time.sleep(2)
texto = st.js(tid, "document.body.innerText.slice(0, 6000)")
print(texto)
st.foto(tid, RAIZ / "scratchpad" / "_tt_content.png")
print("\n[foto] scratchpad/_tt_content.png")
