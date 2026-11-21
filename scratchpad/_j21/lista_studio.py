"""Lista TODO el Studio (programado y publicado): «parte N | estado | fecha | vistas».
La tabla carga 10 filas y va cargando más al bajar su contenedor interno (no la ventana);
se extrae tras cada bajada y se acumula, hasta que tres bajadas seguidas no traen nada."""
import sys, time
from urllib.parse import unquote
from pathlib import Path
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ)); sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv; load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb
import subir_tiktok as st
EXTRAE = r"""encodeURIComponent((() => {
  const out = []; const seen = new Set();
  for (const n of document.querySelectorAll('div')) {
    const t = (n.innerText||'').replace(/\s+/g,' ').trim();
    if (!/^\d{1,2}:\d{2} /.test(t) || t.length > 2500 || t.length < 30) continue;
    const m = t.match(/IA desde cero, parte (\d+)/); if (!m) continue;
    if (seen.has(m[1])) continue; seen.add(m[1]);
    const f = (t.match(/\d{1,2} (sep|oct), \d{2}:\d{2}/)||['?'])[0];
    const v = (t.match(/Todo el mun\S* (\d+)/)||['','?'])[1];
    out.push('parte ' + m[1] + ' | ' + (n.querySelector('div.icon-label') ? 'PROGRAMADA' : 'PUBLICADA') + ' | ' + f + ' | vistas ' + v);
  }
  return out.join('\n');
})())"""
BAJA = r"""(() => { let sc=null;
  for (const e of document.querySelectorAll('div')) { const s=getComputedStyle(e);
    if(/(auto|scroll)/.test(s.overflowY) && e.scrollHeight>e.clientHeight+200) sc=e; }
  if(!sc){ window.scrollBy(0,1200); return 'ventana'; }
  const a=sc.scrollTop; sc.scrollTop=a+sc.clientHeight*0.85; return sc.scrollTop===a ? 'fin' : 'bajo'; })()"""
def main():
    wb.asegura_chrome()
    tid = wb.abre_pagina(st.CONTENT, espera_s=16, ancho=1500, alto=1100)
    time.sleep(7); st.cierra_avisos(tid); time.sleep(2)
    filas = {}; quietas = 0
    for _ in range(80):
        nuevas = 0
        for l in unquote(str(st.js(tid, EXTRAE))).splitlines():
            k = int(l.split()[1])
            if k not in filas: filas[k] = l; nuevas += 1
        quietas = 0 if nuevas else quietas + 1
        if quietas >= 4: break
        st.js(tid, BAJA, gesto=True); time.sleep(1.5)
    for k in sorted(filas): print(filas[k])
if __name__ == "__main__": main()
