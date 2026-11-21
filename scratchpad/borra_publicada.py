#!/usr/bin/env python3
"""Borra una publicación YA PUBLICADA de TikTok Studio. Peligroso: en la misma tabla hay
videos con cientos de vistas y esto es irreversible.

Solo existe para un caso: deshacer un duplicado que subí yo por error. Las guardas son
más estrictas que las del borrador de programadas, porque aquí no está la etiqueta de
reloj que allí protegía:
  · la descripción debe empezar EXACTAMENTE por el texto dado (mínimo 40 caracteres);
  · debe haber UNA sola fila que cumpla;
  · la fila NO debe llevar etiqueta de reloj (si la lleva es programada: usa el otro);
  · las visualizaciones deben estar por debajo del tope que se pase (--max-vistas).

    borra_publicada.py "Yo no hago deportes extremos: dominar los tipos" --max-vistas 400 --dry
"""
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ / "scratchpad"))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(RAIZ / ".env")
from autoedit import win_browser as wb  # noqa: E402
from borra_tiktok import CONFIRMA, ELIMINA, MENU  # noqa: E402
from subir_tiktok import CONTENT, js  # noqa: E402

BUSCA = r"""(() => {
  const pref = %s.replace(/[^A-Za-z0-9 ]/g, '').trim();
  const filas = [];
  for (const n of document.querySelectorAll('div')) {
    const t = (n.innerText||'').replace(/\s+/g,' ').trim();
    // sin tope de 700: los copys de «PCB con IA» pasan de 900 caracteres y la fila nunca
    // cuadraba (15-oct-2026). La guarda contra contenedores es quedarse con la más INTERNA.
    if (!/^\d{1,2}:\d{2}\s/.test(t) || t.length > 3000 || t.length < 30) continue;
    const limpio = t.replace(/[^A-Za-z0-9 ]/g,'');
    if (!limpio.includes(pref)) continue;
    filas.push({n, t, reloj: !!n.querySelector('div.icon-label')});
  }
  for (let i = filas.length - 1; i >= 0; i--)
    if (filas.some(o => o !== filas[i] && filas[i].n.contains(o.n))) filas.splice(i, 1);
  for (let i = filas.length - 1; i >= 0; i--)
    if (filas.findIndex(o => o.t.slice(0,45) === filas[i].t.slice(0,45)) !== i) filas.splice(i, 1);
  if (filas.length !== 1) return JSON.stringify({error: 'filas que cumplen: ' + filas.length});
  const f = filas[0];
  if (f.reloj) return JSON.stringify({error: 'esa fila es PROGRAMADA, no publicada'});
  // vistas: la celda de la descripción no las trae (y «127 V» pasaba por vistas): se sube
  // hasta la fila entera y se lee el número que sigue a la privacidad.
  let fila = f.n, vistas = null;
  for (let i = 0; i < 8 && fila; i++, fila = fila.parentElement) {
    const m = (fila.innerText||'').replace(/\s+/g,' ').match(/(Todo el m\S*|Amigos|Solo yo|Everyone|Friends|Only me)\S* (\d[\d,.]*)/);
    if (m) { vistas = m[2]; break; }
  }
  window.__fila = f.n;
  return JSON.stringify({texto: f.t.slice(0,120), numeros: vistas === null ? [] : [vistas], vistas});
})()"""


def main() -> None:

    # José, 27-sep-2026: "no borres cosas". Mientras exista este archivo, NINGÚN script
    # borra nada en TikTok; se borra solo cuando él lo pida de forma explícita.
    if Path("/home/jose/tiktok/scratchpad/NO_BORRAR").exists() and "--jose-lo-pidio" not in sys.argv:
        sys.exit("borrado DESACTIVADO por José (scratchpad/NO_BORRAR): no toco nada")
    import fcntl
    _l1 = open("/tmp/tiktok_studio.lock", "w"); fcntl.flock(_l1, fcntl.LOCK_EX)
    _l2 = open("/tmp/pantalla.lock", "w"); fcntl.flock(_l2, fcntl.LOCK_EX)
    wb.asegura_chrome()
    prefijo = sys.argv[1]
    if len(prefijo) < 40:
        sys.exit("el prefijo debe tener al menos 40 caracteres: es la única guarda de identidad")
    tope = int(sys.argv[sys.argv.index("--max-vistas") + 1]) if "--max-vistas" in sys.argv else 300
    seco = "--dry" in sys.argv
    tid = wb.abre_pagina(CONTENT, espera_s=16, ancho=1500, alto=1000)
    time.sleep(7)
    info = ""
    for _ in range(40):
        info = js(tid, BUSCA % repr(prefijo).replace("'", '"'))
        if '"error"' not in info:
            break
        fin = js(tid, r"""(() => { let sc=null;
          for (const e of document.querySelectorAll('div')) { const st=getComputedStyle(e);
            if(/(auto|scroll)/.test(st.overflowY) && e.scrollHeight>e.clientHeight+200) sc=e; }
          if(!sc){ window.scrollBy(0,1000); return 'ventana'; }
          const a=sc.scrollTop; sc.scrollTop=a+sc.clientHeight*0.85;
          return sc.scrollTop===a ? 'fin' : 'bajo'; })()""", gesto=True).strip()
        if fin == "fin":
            break
        time.sleep(1.0)
    print("fila:", info)
    if '"error"' in info:
        sys.exit("no borro nada")
    import json as _j
    datos = _j.loads(info)
    if datos.get("vistas") is None:
        sys.exit("no pude leer las visualizaciones de la fila: NO borro nada")
    vistas = int(str(datos["vistas"]).replace(",", "").replace(".", ""))
    print(f"  visualizaciones detectadas (máximo de la fila): {vistas} · tope {tope}")
    if vistas > tope:
        sys.exit(f"tiene más de {tope} vistas: NO borro (usa --max-vistas si de verdad quieres)")
    if seco:
        print("--dry: aqui pararia")
        return
    print(js(tid, MENU, gesto=True))
    time.sleep(2)
    for intento in range(3):
        r = js(tid, ELIMINA, gesto=True).strip()
        print(" ", r)
        if r.startswith("clic"):
            break
        time.sleep(1.5)
        js(tid, MENU, gesto=True)
        time.sleep(2)
    else:
        sys.exit("no aparece la opción Eliminar: NO borro nada")
    time.sleep(1.5)
    print(js(tid, CONFIRMA, gesto=True))
    time.sleep(3)
    print("listo")


if __name__ == "__main__":
    main()
