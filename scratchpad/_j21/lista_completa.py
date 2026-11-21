"""Lista COMPLETA de TikTok Studio (con scroll): qué partes de la clase están y con qué
fecha. `ver_contenido_tiktok.py` solo lee los primeros 6000 caracteres y por eso el
23-sep di por programadas 11 piezas que no estaban."""
import re, sys, time
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
for _ in range(25):                      # scroll hasta que no crezca
    st.js(tid, "window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(2.5)
    n = int(st.js(tid, "document.body.innerText.length"))
    if n == prev: break
    prev = n
# el innerText entero rompe el transporte JSON del puente (caracteres de control a los
# ~9,5k chars): se extrae en la página y vuelve solo lo útil, sin saltos ni controles
res = st.js(tid, """(() => {
  const L = document.body.innerText.split('\\n').map(x => x.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < L.length; i++) {
    const m = L[i].match(/IA desde cero, parte (\\d+)/);
    if (!m) continue;
    let f = '?';
    for (let j = i + 1; j < Math.min(i + 9, L.length); j++) if (/^\\d{1,2} (sep|oct), \\d{2}:\\d{2}$/.test(L[j])) { f = L[j]; break; }
    out.push('parte ' + m[1] + ' -> ' + f);
  }
  return out.join(' ; ').replace(/[^\\x20-\\x7E\\u00A0-\\u00FF;]/g, ' ');
})()""")
for x in sorted(str(res).split(' ; '), key=lambda t: int(t.split()[1]) if t.split()[1:2] and t.split()[1].isdigit() else 0):
    print(x)
