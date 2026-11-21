import sys, time
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
for _ in range(25):
    st.js(tid, "window.scrollTo(0, document.body.scrollHeight)"); time.sleep(2.5)
    n = int(st.js(tid, "document.body.innerText.length"))
    if n == prev: break
    prev = n
# por cada fila con "parte N": si tiene la etiqueta azul de programada o no, y su fecha
res = st.js(tid, """(() => {
  const out = [];
  document.querySelectorAll('*').forEach(e => {
    if (e.children.length > 12) return;
    const t = (e.innerText || '');
    const m = t.match(/IA desde cero, parte (\\d+)/);
    if (!m) return;
    if (t.length > 900) return;
    const prog = !!e.querySelector('div.icon-label');
    const f = (t.match(/\\d{1,2} (sep|oct), \\d{2}:\\d{2}/) || [''])[0];
    out.push('parte ' + m[1] + ' | ' + (prog ? 'PROGRAMADA' : 'PUBLICADA') + ' | ' + f);
  });
  return [...new Set(out)].join(' ; ').replace(/[^\\x20-\\x7E\\u00A0-\\u00FF;|]/g, ' ');
})()""")
for x in sorted(set(str(res).split(' ; ')), key=lambda t: int(t.split()[1]) if len(t.split())>1 and t.split()[1].isdigit() else 0):
    print(x)
