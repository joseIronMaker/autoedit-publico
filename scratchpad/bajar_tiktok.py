"""Baja (elimina) publicaciones PROGRAMADAS de TikTok Studio por el puente al Chrome real.

Se usa cuando un video ya programado deja de cumplir el estándar del canal y no queremos
que salga. Solo toca publicaciones cuyo texto coincida con lo que se le pide: nunca borra
"lo que haya" y nunca toca las que ya están publicadas salvo que se le diga explícitamente.

    .venv/bin/python scratchpad/bajar_tiktok.py listar
    .venv/bin/python scratchpad/bajar_tiktok.py bajar "<trozo del copy>" [...]

Trampas del puente (ya pagadas, ver win_browser): todo va por -EncodedCommand, sin bloques
multilínea en PowerShell, y las pestañas se crean con Target.createTarget.
"""
import json
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from subir_tiktok import CONTENT, cierra_avisos, foto, js  # noqa: E402

from autoedit import win_browser as wb  # noqa: E402

# TikTok Studio no marca las filas con data-e2e ni con clases estables: son div anidados con
# clases ofuscadas (css-r8odw9…). Lo único fiable es partir del TEXTO de la publicación y
# subir cinco niveles: ahí está el contenedor de la fila, con sus botones de acción. MEDIDO
# el 16-ago-2026 sobre la página real.
FILA = """
  const todos = [...document.querySelectorAll('div')].filter(e =>
      (e.innerText || '').includes(OBJETIVO));
  if (!todos.length) return 'NO_ESTA';
  todos.sort((a, b) => a.innerText.length - b.innerText.length);
  let fila = todos[0];
  for (let i = 0; i < 5 && fila.parentElement; i++) fila = fila.parentElement;
"""

LISTAR = """(() => {
  const cel = [...document.querySelectorAll('div')].filter(e =>
      /^\\s*(⏰|\\d{1,2} \\w{3},? \\d{2}:\\d{2})/.test(e.innerText || '') &&
      e.innerText.length < 40);
  const filas = [...document.querySelectorAll('div')].filter(e => {
    const t = e.innerText || '';
    return t.length > 200 && t.length < 2000 &&
           [...e.querySelectorAll('button')].length === 2;
  });
  const vistos = new Set(), out = [];
  for (const f of filas) {
    const t = f.innerText.replace(/\\s+/g, ' ').trim();
    const clave = t.slice(0, 60);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    out.push(t.slice(0, 130));
  }
  return out.slice(0, 30);
})()"""


def raton(tid: str, x: float, y: float, timeout: int = 240) -> None:
    """Un click REAL por CDP en coordenadas CSS. Los MouseEvent sintéticos no bastan:
    la opción "Eliminar" del menú es un <div> y su manejador no se dispara con ellos
    (medido el 16-ago-2026: el menú se cerraba y la publicación seguía programada)."""
    # PowerShell en español usa coma decimal, así que las coordenadas viajan enteras.
    xi, yi = int(round(x)), int(round(y))
    base = ('{"type":"%s","x":' + str(xi) + ',"y":' + str(yi)
            + ',"button":"left","clickCount":1,"buttons":%d}')
    partes = [
        f"[void](Send-Cdp $ws 20 'Input.dispatchMouseEvent' '{base % ('mouseMoved', 0)}')",
        f"[void](Send-Cdp $ws 21 'Input.dispatchMouseEvent' '{base % ('mousePressed', 1)}')",
        f"[void](Send-Cdp $ws 22 'Input.dispatchMouseEvent' '{base % ('mouseReleased', 0)}')",
    ]
    script = f"""
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {wb._ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
{chr(10).join(partes)}
$ws.Dispose()
Write-Output OK
"""
    wb.ps(script, timeout=timeout)


def abre() -> str:
    tid = wb.abre_pagina(CONTENT, espera_s=14, ancho=1500, alto=1050)
    time.sleep(5)
    cierra_avisos(tid)
    return tid


def listar(tid: str) -> list[str]:
    filas = js(tid, LISTAR) or []
    for i, f in enumerate(filas):
        print(f"  [{i}] {f}", flush=True)
    return filas


def es_programada(tid: str, trozo: str) -> bool:
    """True si esa fila trae hora programada (⏰ dd mmm, HH:MM) y cero visualizaciones."""
    marca = json.dumps(trozo)
    return bool(js(tid, f"""(() => {{
      const OBJETIVO = {marca};{FILA}
      return /\\d{{1,2}} \\w{{3}},? \\d{{1,2}}:\\d{{2}}/.test(fila.innerText) &&
             !/\\bTodo el m\\b/.test(fila.innerText.slice(-400));
    }})()"""))


def baja_una(tid: str, trozo: str, solo_programadas: bool = True) -> str:
    """Encuentra la fila cuyo texto contiene `trozo` y la elimina."""
    marca = json.dumps(trozo)
    if solo_programadas and not es_programada(tid, trozo):
        return "SALTADA: no parece programada (¿ya está publicada?)"

    # 1) el menú "..." es el ÚLTIMO <button> de la fila (los demás iconos son span+svg)
    abierto = js(tid, f"""(() => {{
      const OBJETIVO = {marca};{FILA}
      const bs = [...fila.querySelectorAll('button')];
      if (!bs.length) return 'SIN_MENU';
      bs[bs.length - 1].click();
      return 'MENU_ABIERTO';
    }})()""", gesto=True)
    if abierto != "MENU_ABIERTO":
        return f"FALLO({abierto})"
    time.sleep(2)

    # 2) el menú trae "Descargar" y "Eliminar". `elemento.click()` NO basta: la opción es un
    #    <div> y React escucha pointer/mouse, así que hay que despachar la secuencia completa
    #    con coordenadas reales (medido el 16-ago-2026: con .click() el menú se cerraba y no
    #    pasaba nada, y el script reportaba "sigue apareciendo").
    caja = js(tid, """(() => {
      const its = [...document.querySelectorAll('div,span,li,button,[role="menuitem"]')]
          .filter(x => /^(eliminar|delete|borrar)$/i.test((x.innerText || '').trim()));
      if (!its.length) return null;
      its.sort((a, b) => a.innerText.length - b.innerText.length);
      const r = its[0].getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })()""")
    if not caja:
        return "FALLO(SIN_ELIMINAR)"
    raton(tid, caja[0], caja[1])
    time.sleep(3)

    # 3) confirmar en el diálogo (también con click real)
    conf = js(tid, """(() => {
      const bs = [...document.querySelectorAll('button, [role="button"]')].filter(x =>
          /^(eliminar|delete|borrar|confirmar)$/i.test((x.innerText || '').trim()) &&
          x.getBoundingClientRect().width > 0);
      if (!bs.length) return null;
      const r = bs[bs.length - 1].getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })()""")
    if caja and conf:
        raton(tid, conf[0], conf[1])
    time.sleep(5)

    sigue = js(tid, f"document.body.innerText.includes({marca})")
    return "BAJADO" if not sigue else "AVISO: sigue apareciendo"


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    tid = abre()
    if sys.argv[1] == "listar":
        listar(tid)
        foto(tid, RAIZ / "scratchpad" / "_tt_contenido.png")
        print("foto → scratchpad/_tt_contenido.png")
        return
    if sys.argv[1] == "bajar":
        for trozo in sys.argv[2:]:
            r = baja_una(tid, trozo)
            print(f"  {trozo[:40]!r} → {r}", flush=True)
            time.sleep(3)
        return
    sys.exit(__doc__)


if __name__ == "__main__":
    main()
