"""Lee TikTok Studio SOLO LECTURA: todas las publicaciones + analítica general.

Vuelca a `studio_filas.json` y `studio_analitica.txt`. No pulsa nada que cambie la cuenta:
solo abre páginas, baja el contenedor de la tabla y lee el texto.
"""
import json
import sys
import time
from pathlib import Path
from urllib.parse import unquote

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb  # noqa: E402

import subir_tiktok as st  # noqa: E402

BASE = Path(__file__).parent

FILAS = r"""encodeURIComponent(JSON.stringify((() => {
  const out = []; const seen = new Set();
  for (const n of document.querySelectorAll('div')) {
    const t = (n.innerText||'').replace(/\s+/g,' ').trim();
    if (!/^\d{1,2}:\d{2} /.test(t) || t.length > 2500 || t.length < 30) continue;
    const k = t.slice(0, 90); if (seen.has(k)) continue; seen.add(k);
    const a = n.querySelector('a[href*="/video/"], a[href*="/post/"]');
    out.push({t: t.slice(0, 700), href: a ? a.href : '', prog: !!n.querySelector('div.icon-label')});
  }
  return out;
})()))"""

BAJA = r"""(() => { let sc=null;
  for (const e of document.querySelectorAll('div')) { const s=getComputedStyle(e);
    if(/(auto|scroll)/.test(s.overflowY) && e.scrollHeight>e.clientHeight+200) sc=e; }
  if(!sc){ window.scrollBy(0,1200); return 'ventana'; }
  const a=sc.scrollTop; sc.scrollTop=a+sc.clientHeight*0.85; return sc.scrollTop===a ? 'fin' : 'bajo'; })()"""

TEXTO = "encodeURIComponent((document.body.innerText||'').slice(0, 9000))"


def main():
    wb.asegura_chrome()
    tid = wb.abre_pagina(st.CONTENT, espera_s=16, ancho=1500, alto=1100)
    time.sleep(7)
    st.cierra_avisos(tid)
    time.sleep(2)
    filas, quietas = {}, 0
    for _ in range(120):
        crudo = unquote(str(st.js(tid, FILAS)))
        try:
            lote = json.loads(crudo)
        except json.JSONDecodeError:
            lote = []
        nuevas = 0
        for f in lote:
            k = f["t"][:90]
            if k not in filas:
                filas[k] = f
                nuevas += 1
        quietas = 0 if nuevas else quietas + 1
        if quietas >= 5:
            break
        st.js(tid, BAJA, gesto=True)
        time.sleep(1.5)
    (BASE / "studio_filas.json").write_text(
        json.dumps(list(filas.values()), ensure_ascii=False, indent=1), encoding="utf-8")
    print("filas:", len(filas), flush=True)

    salida = []
    for url in ("https://www.tiktok.com/tiktokstudio/analytics",
                "https://www.tiktok.com/tiktokstudio/analytics/content",
                "https://www.tiktok.com/tiktokstudio/analytics/viewers",
                "https://www.tiktok.com/tiktokstudio/analytics/followers"):
        t2 = wb.abre_pagina(url, espera_s=14, ancho=1500, alto=1400)
        time.sleep(7)
        texto = unquote(str(st.js(t2, TEXTO)))
        salida.append(f"##### {url}\n{texto}\n")
    (BASE / "studio_analitica.txt").write_text("\n".join(salida), encoding="utf-8")
    print("analitica OK", flush=True)


if __name__ == "__main__":
    main()
