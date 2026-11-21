"""Lista las filas del Studio: «estado | fecha | inicio del copy». Basado en _j21/lista_studio.py,
pero sin atarse a la serie «IA desde cero»: `--max N` limita las bajadas (las programadas
salen arriba)."""
import sys, time
from urllib.parse import unquote
from pathlib import Path
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ)); sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv; load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb
import subir_tiktok as st
sys.path.insert(0, str(RAIZ / "scratchpad/_j21"))
from lista_studio import BAJA
EXTRAE = r"""encodeURIComponent((() => {
  const out = []; const seen = new Set();
  for (const n of document.querySelectorAll('div')) {
    const t = (n.innerText||'').replace(/\s+/g,' ').trim();
    if (!/^\d{1,2}:\d{2} /.test(t) || t.length > 2500 || t.length < 30) continue;
    const f = (t.match(/\d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic), \d{2}:\d{2}/)||['?'])[0];
    const desc = t.replace(/^\d{1,2}:\d{2} /,'').slice(0,70);
    const k = desc.slice(0,50); if (seen.has(k)) continue; seen.add(k);
    out.push((n.querySelector('div.icon-label') ? 'PROGRAMADA' : 'PUBLICADA') + ' | ' + f + ' | ' + t.slice(0,5) + ' | ' + desc);
  }
  return out.join('\n');
})())"""
def main():
    maxb = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 80
    wb.asegura_chrome()
    tid = wb.abre_pagina(st.CONTENT, espera_s=16, ancho=1500, alto=1100)
    time.sleep(7); st.cierra_avisos(tid); time.sleep(2)
    filas = {}; quietas = 0
    for _ in range(maxb):
        nuevas = 0
        for l in unquote(str(st.js(tid, EXTRAE))).splitlines():
            if l not in filas: filas[l] = len(filas); nuevas += 1
        quietas = 0 if nuevas else quietas + 1
        if quietas >= 4: break
        st.js(tid, BAJA, gesto=True); time.sleep(1.5)
    for l in sorted(filas, key=filas.get): print(l)
if __name__ == "__main__": main()
