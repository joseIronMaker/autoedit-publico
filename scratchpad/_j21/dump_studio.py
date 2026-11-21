import sys, time, re
from urllib.parse import unquote
from pathlib import Path
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ)); sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv; load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb
import subir_tiktok as st
wb.asegura_chrome()
tid = wb.abre_pagina(st.CONTENT, espera_s=16, ancho=1500, alto=1100)
time.sleep(6); st.cierra_avisos(tid); time.sleep(2)
prev = -1
for _ in range(30):
    st.js(tid, "window.scrollTo(0, document.body.scrollHeight)"); time.sleep(2.5)
    n = int(st.js(tid, "document.body.innerText.length"))
    if n == prev: break
    prev = n
n = int(st.js(tid, "document.body.innerText.length"))
partes = []
for a in range(0, n, 5000):
    partes.append(unquote(str(st.js(tid, f"encodeURIComponent(document.body.innerText.slice({a},{a+5000}))"))))
texto = "".join(partes)
Path("/tmp/studio_full.txt").write_text(texto, encoding="utf-8")
L = [l.strip() for l in texto.splitlines() if l.strip()]
for i, l in enumerate(L):
    m = re.search(r"IA desde cero, parte (\d+)", l)
    if not m: continue
    ctx = L[i+1:i+7]
    fecha = next((x for x in ctx if re.match(r"^\d{1,2} (sep|oct), \d{2}:\d{2}$", x)), "?")
    vistas = next((x for x in ctx if re.match(r"^\d+$", x)), "?")
    print(f"parte {int(m.group(1)):2d} | {fecha} | vistas {vistas}")
