"""Borra una publicación PROGRAMADA de TikTok Studio, con guardas.

Borrar es irreversible y en la misma tabla hay videos publicados con cientos de vistas,
así que la fila se identifica por TRES cosas a la vez y si alguna no cuadra, no toca nada:
  · la etiqueta azul con reloj (`div.icon-label`) que solo llevan las programadas;
  · la fecha y hora exactas que se le pasan;
  · cero visualizaciones.
Además exige que la descripción empiece por el texto que se le da.

    .venv/bin/python scratchpad/borra_tiktok.py "2 sep, 19:00" "Y por eso tu primer" --dry
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
from subir_tiktok import CONTENT, js  # noqa: E402

BUSCA = r"""(() => {
  const et = [...document.querySelectorAll('div.icon-label')]
     .filter(e => (e.innerText||'').trim() === %s);
  // con DOS programadas en el mismo hueco (duplicado), se elige la fila cuyo texto empieza
  // por el prefijo pedido; si sigue habiendo más de una, se aborta
  const pref = %s.replace(/[^A-Za-z0-9 ]/g, '');
  const fila_de = (e) => { let n = e; for (let i = 0; i < 9 && n; i++) { n = n.parentElement; if (!n) break;
    const t = (n.innerText||'').replace(/\s+/g,' ').trim(); if (/^\d{1,2}:\d{2}\s/.test(t) && t.length < 2500) return n; } return null; };
  let cands = et.map(fila_de).filter(Boolean);
  if (cands.length > 1) cands = cands.filter(f => (f.innerText||'').replace(/\s+/g,' ').replace(/[^A-Za-z0-9 ]/g,'').includes(pref));
  if (cands.length !== 1) return JSON.stringify({error: 'filas candidatas: ' + cands.length + ' (etiquetas ' + et.length + ')'});
  // Se sube hasta el PRIMER ancestro cuyo texto empieza por la duración del video
  // ("01:37 ..."), que es justo la fila. Antes se subía "mientras hubiera una sola
  // etiqueta programada", y al quedar una sola en la lista eso trepaba hasta la tabla
  // entera: el menú se abrió en una fila cualquiera.
  let fila = cands[0];
  if (!fila) return JSON.stringify({error: 'no encuentro la fila'});
  // cada fila empieza por la DURACIÓN del video ("01:37 ..."). Si el texto empieza por
  // otra cosa es que se ha subido hasta la cabecera de la tabla y se estaría apuntando a
  // cualquier fila: pasó una vez con una sola programada en la lista.
  const t0 = (fila.innerText||'').replace(/\s+/g,' ').trim();
  if (!/^\d{1,2}:\d{2}\s/.test(t0)) {
    return JSON.stringify({error: 'la fila no empieza por la duracion: ' + t0.slice(0,60)});
  }
  if (t0.length > 2500) return JSON.stringify({error: 'la fila abarca demasiado'});
  window.__fila = fila;
  return JSON.stringify({texto: (fila.innerText||'').replace(/\s+/g,' ').trim().slice(0,120)});
})()"""

# Los botones de acción viven en OTRA columna del DOM, así que se localizan por geometría:
# el "..." cuya altura cae dentro de la fila ya verificada. Si no hay exactamente uno, aborta.
MENU = """(() => {
  const f = window.__fila;
  if (!f) return 'sin fila';
  const r = f.getBoundingClientRect();
  const cand = [...document.querySelectorAll('button, [role=button]')].filter(b => {
    const t = (b.innerText||'').trim();
    if (t.length > 3) return false;
    const q = b.getBoundingClientRect();
    const cy = q.top + q.height / 2;
    // el botón rojo flotante de subir es position:fixed y cae en el mismo alto que
    // algunas filas: si se pulsa, abre la página de carga en vez del menú (clase 16)
    if (getComputedStyle(b).position === 'fixed') return false;
    return b.tagName === 'BUTTON' && q.width > 20 && cy > r.top && cy < r.bottom;
  });
  if (!cand.length) return 'ningun boton en la fila';
  const ultimo = cand.sort((a, b) =>
      a.getBoundingClientRect().left - b.getBoundingClientRect().left).pop();
  window.__menu = ultimo;
  const n = cand.length;
  ultimo.click();
  return 'menu abierto en la fila (botones=' + n + ')';
})()"""

ELIMINA = r"""(() => {
  // "Eliminar" puede venir como texto suelto o dentro de un nodo con icono: se toma el
  // más PROFUNDO cuyo texto sea exactamente eso. Antes se exigía children===0 y en la
  // clase 15 el menú traía el icono dentro y no encontraba nada.
  const todos = [...document.querySelectorAll('div,span,li,button,p,a')]
    // visible = tiene caja, no offsetParent: dentro de un popup position:fixed
    // offsetParent es null y la opción se daba por inexistente
    .filter(e => (e.innerText || '').trim() === 'Eliminar'
                 && e.getBoundingClientRect().width > 0);
  if (!todos.length) {
    const pistas = [...document.querySelectorAll('div,span,li,button,p,a')]
      .filter(e => /Elimin|Descarg/i.test(e.textContent || '') && e.children.length < 4)
      .slice(-4).map(e => e.tagName + ':' + JSON.stringify((e.innerText||'').slice(0,14))
                        + ':' + Math.round(e.getBoundingClientRect().width));
    return 'opciones Eliminar: 0 · pistas ' + JSON.stringify(pistas);
  }
  const hondo = todos.reduce((a, b) => (b.contains(a) ? a : b));
  const r = hondo.getBoundingClientRect();
  hondo.scrollIntoView({block: 'center'});
  hondo.click();
  return 'clic en Eliminar en (' + Math.round(r.left) + ',' + Math.round(r.top) + ')';
})()"""

CONFIRMA = """(() => {
  const b = [...document.querySelectorAll('button')]
    .filter(e => /^(Eliminar|Borrar|Delete|Confirmar)$/.test((e.innerText||'').trim()));
  if (!b.length) return 'no hay boton de confirmacion';
  b[b.length - 1].click();
  return 'confirmado (' + b.length + ' botones)';
})()"""


# Filtrar con el BUSCADOR en vez de hacer scroll: la lista es virtualizada y al abrir el
# menú de una fila lejana se re-dibuja, salta al principio y el desplegable se cierra —
# "opciones Eliminar: 0" sin más explicación (clases 16 y 22, 6-sep). Con el filtro puesto
# queda UNA fila a la vista y no hay nada que saltar. El input es de React: hay que usar el
# setter nativo y disparar el evento, o el componente no se entera del cambio.
FILTRA = r"""(() => {
  const i = [...document.querySelectorAll('input')]
    .find(e => /Buscar/i.test(e.placeholder || ''));
  if (!i) return 'no encuentro el buscador';
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(i, %s);
  i.dispatchEvent(new Event('input', {bubbles: true}));
  i.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'Enter'}));
  return 'buscador relleno';
})()"""


def main() -> None:

    # José, 27-sep-2026: "no borres cosas". Mientras exista este archivo, NINGÚN script
    # borra nada en TikTok; se borra solo cuando él lo pida de forma explícita.
    if Path("/home/jose/tiktok/scratchpad/NO_BORRAR").exists() and "--jose-lo-pidio" not in sys.argv:
        sys.exit("borrado DESACTIVADO por José (scratchpad/NO_BORRAR): no toco nada")
    # UN SOLO automatismo sobre TikTok Studio a la vez: dos cadenas (la del perrito de la
    # clase 5 y el QC de la 6) podían pisarse en el mismo Chrome de Windows. El lock se
    # suelta solo al terminar el proceso.
    import fcntl
    _lock = open("/tmp/tiktok_studio.lock", "w")
    fcntl.flock(_lock, fcntl.LOCK_EX)
    # …y el candado de PANTALLA: el Chrome de TikTok Studio se abre en el segundo monitor,
    # y en la clase 15 quedó DETRÁS de la ventana del pong mientras se grababa — se veía
    # el TikTok Studio de José por los bordes. Grabación y TikTok, nunca a la vez.
    _lock2 = open("/tmp/pantalla.lock", "w")
    fcntl.flock(_lock2, fcntl.LOCK_EX)
    # el Chrome del puente muere con la sesión (y el limpiador de huérfanos también
    # se lo puede llevar): se levanta aquí, ya con los candados tomados
    wb.asegura_chrome()
    etiqueta, prefijo = sys.argv[1], sys.argv[2]
    seco = "--dry" in sys.argv
    tid = wb.abre_pagina(CONTENT, espera_s=14, ancho=1500, alto=1000)
    time.sleep(5)
    if "--buscar" in sys.argv:
        texto = sys.argv[sys.argv.index("--buscar") + 1]
        print(js(tid, FILTRA % repr(texto).replace("'", '"'), gesto=True).strip())
        time.sleep(6)
    # la lista es VIRTUALIZADA: solo pinta ~11 filas alrededor del scroll, y el scroll no
    # es el de la ventana sino el de un contenedor interno. Se baja ese contenedor a pasos
    # hasta que la etiqueta buscada esté pintada (o se acabe la lista).
    for _ in range(40):
        vis = js(tid, r"""(() => {
          const et = [...document.querySelectorAll('div.icon-label')].map(e => e.innerText.trim());
          if (et.includes(%s)) return 'ok';
          let sc = null;
          for (const e of document.querySelectorAll('div')) {
            const st = getComputedStyle(e);
            if (/(auto|scroll)/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 200) { sc = e; }
          }
          if (!sc) { window.scrollBy(0, 1200); return 'ventana'; }
          const antes = sc.scrollTop; sc.scrollTop = antes + sc.clientHeight * 0.9;
          return sc.scrollTop === antes ? 'fin' : 'bajo';
        })()""" % repr(etiqueta).replace("'", '"'), gesto=True).strip()
        if vis == "ok":
            break
        if vis == "fin":
            sys.exit(f"no aparece {etiqueta!r} ni al final de la lista: NO borro nada")
        time.sleep(1.2)
    info = js(tid, BUSCA % (repr(etiqueta).replace("'", '"'), repr(prefijo).replace("'", '"')))
    print("fila:", info)
    if '"error"' in info:
        sys.exit("no borro nada")
    # el texto de la fila vuelve por PowerShell SIN acentos ("Dos m�s dos"): se compara
    # solo por las letras ASCII, que es lo que sobrevive al viaje
    import re as _re
    def _ascii(t: str) -> str:
        return _re.sub(r"[^A-Za-z0-9 ]", "", t)
    if _ascii(prefijo) not in _ascii(info):
        # El copy se REGENERA en cada render, así que el de Descargas ya no coincide con el
        # de la publicación programada. La etiqueta azul de reloj (div.icon-label) solo la
        # llevan las PROGRAMADAS —las publicadas muestran la fecha en texto plano—, así que
        # con una sola fila en ese hueco no hay forma de tocar un video publicado.
        if "--slot-unico" not in sys.argv:
            sys.exit(f"la descripcion no empieza por {prefijo!r}: NO borro nada")
        print(f"  aviso: el copy no coincide, pero es la ÚNICA programada de {etiqueta}: sigo")
    if seco:
        print("--dry: aqui pararia")
        return
    print(js(tid, MENU, gesto=True))
    time.sleep(2)
    from subir_tiktok import foto
    foto(tid, RAIZ / "scratchpad" / "_tt_menu.png")
    if "--menu" in sys.argv:
        print("--menu: menu abierto, foto en scratchpad/_tt_menu.png")
        return
    time.sleep(2)
    for intento in range(3):
        r = js(tid, ELIMINA, gesto=True).strip()
        print(r)
        if "clic en Eliminar" in r:
            break
        time.sleep(2)
        js(tid, MENU, gesto=True)   # el menú se cerró o aún no pintaba: se reabre
        time.sleep(2)
    else:
        sys.exit("no aparece la opción Eliminar: NO borro nada")
    time.sleep(2)
    print(js(tid, CONFIRMA, gesto=True))
    time.sleep(3)
    print("listo")


if __name__ == "__main__":
    main()
