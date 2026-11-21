"""Segunda lectura: fila ENTERA (cabeza + cola, donde están las cifras) e ids de video."""
import json, re, sys, time
from pathlib import Path
from urllib.parse import unquote
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ)); sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv; load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb
import subir_tiktok as st
import lee_studio as ls
BASE = Path(__file__).parent
FILAS = r"""encodeURIComponent(JSON.stringify((() => {
  const out = []; const seen = new Set();
  for (const n of document.querySelectorAll('div')) {
    const t = (n.innerText||'').replace(/\s+/g,' ').trim();
    if (!/^\d{1,2}:\d{2} /.test(t) || t.length > 6000 || t.length < 30) continue;
    const hijos = [...n.children].some(c => /^\d{1,2}:\d{2} /.test((c.innerText||'').trim()));
    if (hijos) continue;
    const k = t.slice(0, 90); if (seen.has(k)) continue; seen.add(k);
    let id = ''; const h = n.outerHTML.match(/(?:video|post|content|analytics)\/(\d{15,22})/); if (h) id = h[1];
    out.push({ini: t.slice(0, 130), fin: t.slice(-170), id, prog: !!n.querySelector('div.icon-label')});
  }
  return out;
})()))"""
wb.asegura_chrome()
tid = wb.abre_pagina(st.CONTENT, espera_s=16, ancho=1500, alto=1100)
time.sleep(7); st.cierra_avisos(tid); time.sleep(2)
filas, quietas = {}, 0
for _ in range(160):
    try: lote = json.loads(unquote(str(st.js(tid, FILAS))))
    except json.JSONDecodeError: lote = []
    nuevas = 0
    for f in lote:
        if f["ini"][:90] not in filas: filas[f["ini"][:90]] = f; nuevas += 1
    quietas = 0 if nuevas else quietas + 1
    if quietas >= 6: break
    st.js(tid, ls.BAJA, gesto=True); time.sleep(1.5)
(BASE / "studio_filas2.json").write_text(json.dumps(list(filas.values()), ensure_ascii=False, indent=1), encoding="utf-8")
print("filas:", len(filas), "con id:", sum(1 for f in filas.values() if f["id"]))
