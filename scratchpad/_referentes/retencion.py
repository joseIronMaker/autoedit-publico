"""Abre la analítica individual (solo lectura) de varios videos y vuelca su texto."""
import json, sys, time
from pathlib import Path
from urllib.parse import unquote
RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ)); sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv; load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb
import subir_tiktok as st
BASE = Path(__file__).parent
R = sorted(json.load(open(BASE / "studio_tabla.json")), key=lambda r: -r["v"])
elegidos = R[:4] + R[len(R)//2-2:len(R)//2+2]
TEXTO = "encodeURIComponent((document.body.innerText||'').slice(0, 5000))"
wb.asegura_chrome()
out = []
for r in elegidos:
    tid = wb.abre_pagina(f"https://www.tiktok.com/tiktokstudio/analytics/{r['id']}/overview", espera_s=12, ancho=1500, alto=1400)
    time.sleep(6)
    out.append({"id": r["id"], "v": r["v"], "seg": r["seg"], "t": r["t"][:70], "txt": unquote(str(st.js(tid, TEXTO)))})
    print(r["id"], len(out[-1]["txt"]), flush=True)
(BASE / "studio_retencion.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
