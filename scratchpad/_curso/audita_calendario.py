"""Recorre TODOS los huecos programados y dice cuáles no tienen la versión nueva.

Cada paso (borrar, subir) informa por separado y puede mentir: el borrado dice "listo"
sin borrar, o la subida falla después de borrar y deja el hueco VACÍO. Lo único que no
miente es leer el calendario entero y comparar con los copys de curso_python_v2.
"""
import glob
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

sys.path.insert(0, "/home/jose/tiktok")
sys.path.insert(0, "/home/jose/tiktok/scratchpad")
from dotenv import load_dotenv

load_dotenv("/home/jose/tiktok/.env")
from autoedit import win_browser as wb  # noqa: E402
from subir_tiktok import CONTENT, js  # noqa: E402

V2 = Path("/mnt/c/Users/USUARIO/Downloads/curso_python_v2")


def ascii_(t: str) -> str:
    t = unicodedata.normalize("NFKD", t)
    return re.sub(r"[^a-z0-9 ]", "", t.encode("ascii", "ignore").decode().lower())


def lee_calendario():
    wb.asegura_chrome()
    tid = wb.abre_pagina(CONTENT, espera_s=14, ancho=1500, alto=1200)
    time.sleep(5)
    filas = {}
    for _ in range(45):
        d = json.loads(js(tid, r"""(() => {
          const out=[]; document.querySelectorAll('div.icon-label').forEach(e=>{let n=e;
            for(let i=0;i<9&&n;i++){n=n.parentElement;
              const t=(n.innerText||'').replace(/\s+/g,' ').trim();
              if(/^\d{1,2}:\d{2}\s/.test(t)&&t.length<700){out.push([e.innerText.trim(), t.slice(0,60)]);break;}}});
          let sc=null; for (const e of document.querySelectorAll('div')) {
            const st=getComputedStyle(e);
            if (/(auto|scroll)/.test(st.overflowY) && e.scrollHeight>e.clientHeight+200) sc=e; }
          let fin='sigo'; if(!sc) fin='fin';
          else { const a=sc.scrollTop; sc.scrollTop=a+sc.clientHeight*0.9; if (sc.scrollTop===a) fin='fin'; }
          return JSON.stringify({out, fin}); })()""", gesto=True))
        for et, txt in d["out"]:
            filas[et] = txt
        if d["fin"] == "fin":
            break
        time.sleep(1.0)
    return filas


def main() -> None:
    plan = {}
    for linea in Path("/home/jose/tiktok/scratchpad/_curso/plan_subida.txt").read_text().splitlines():
        if not linea.strip():
            continue
        mp4, _txt, fecha, hora = linea.split("\t")
        n = int(mp4[5:7])
        dia = int(fecha.split("-")[2])
        plan[f"{dia} sep, {hora}"] = n
    filas = lee_calendario()
    from datetime import datetime
    ahora = datetime.now()
    mal = []
    for et, n in sorted(plan.items(), key=lambda kv: (int(kv[0].split()[0]), kv[0].split()[-1])):
        dia = int(et.split()[0])
        # El COPY se regenera en cada render, así que no sirve de huella. La DURACIÓN sí:
        # la fila la muestra como MM:SS y las versiones v1 y v2 duran distinto.
        mp4 = sorted(V2.glob(f"clase{n:02d}_*.mp4"))
        dur_v2 = None
        if mp4:
            import subprocess
            dur_v2 = float(subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", str(mp4[0])], text=True))
        fila = filas.get(et, "")
        m = re.match(r"(\d{1,2}):(\d{2})", fila)
        dur_tt = int(m.group(1)) * 60 + int(m.group(2)) if m else None
        # UNA PUBLICADA YA NO LLEVA ETIQUETA DE RELOJ, así que "no está en el calendario"
        # significa DOS cosas opuestas: hueco vacío, o ya salió. Distinguirlas por la HORA
        # es lo único fiable — si el momento ya pasó, salió. Sin esto, la auditoría marcó
        # como vacíos los huecos de las clases 7 y 8, que ya se habían publicado, y se
        # volvieron a programar: la 7 salió DOS VECES (6-sep-2026).
        h, m2 = (int(x) for x in et.split()[-1].split(":"))
        pasado = (dia, h, m2) <= (ahora.day, ahora.hour, ahora.minute) and dia <= ahora.day
        if pasado:
            estado = "ya publicada" if et not in filas else "← programada y su hora YA PASÓ"
            if et in filas:
                mal.append((n, et, "hora pasada"))
        elif et not in filas:
            estado = "← HUECO VACÍO"; mal.append((n, et, "vacío"))
        elif dur_v2 is None:
            estado = "sin v2 todavía"
        elif dur_tt is not None and abs(dur_tt - dur_v2) <= 1.5:
            estado = f"v2 ✓ ({dur_tt}s)"
        else:
            estado = f"← VIEJA (TikTok {dur_tt}s · v2 {dur_v2:.0f}s)"; mal.append((n, et, "vieja"))
        print(f"  {et:14s} clase{n:02d}  {estado}")
    print()
    if mal:
        print("A CORREGIR:", " ".join(f"py{n:02d}({q})" for n, _, q in mal))
        sys.exit(1)
    print("todos los huecos con la versión nueva")


if __name__ == "__main__":
    main()
