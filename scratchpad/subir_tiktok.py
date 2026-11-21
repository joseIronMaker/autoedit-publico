"""Sube y PROGRAMA videos en TikTok Studio por el puente al Chrome de Windows.

El navegador MCP ya no sirve para esto: desde WSL no se alcanza el puerto 9222 del
Chrome de Windows (NAT+firewall). El unico transporte que funciona es
`autoedit.win_browser` (CDP sobre un websocket que sostiene PowerShell).

Trampas ya pagadas (25-jul-2026) y respetadas aqui:
- La DESCRIPCION se pone con PORTAPAPELES. Escribirla con `fill`/`value` no la registra
  React y TikTok publica el NOMBRE DEL ARCHIVO como copy, sin dar error. Paso ese dia con
  8 videos y 2 llegaron a publicarse asi.
- El selector de HORA es un picker por scroll: hay que hacer click en la opcion Y empujar
  el scrollTop del contenedor.
- TikTok corta a las ~4-5 subidas seguidas; hay que espaciarlas.

    .venv/bin/python scratchpad/subir_tiktok.py inspeccionar
    .venv/bin/python scratchpad/subir_tiktok.py subir <mp4_windows> <copy.txt> <YYYY-MM-DD> <HH:MM>
"""
import base64
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import unquote

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(RAIZ / ".env")

from autoedit import win_browser as wb  # noqa: E402

UPLOAD = "https://www.tiktok.com/tiktokstudio/upload"
CONTENT = "https://www.tiktok.com/tiktokstudio/content"


def _b64(s: str) -> str:
    return base64.b64encode(s.encode("utf-8")).decode("ascii")


def js(tid: str, expresion: str, gesto: bool = False, timeout: int = 240):
    """Evalua JS en la pestana y devuelve el valor (por JSON)."""
    script = f"""
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {wb._ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
[void](Send-Cdp $ws 1 'Runtime.enable' $null)
$p = (@{{ expression = (B64 {wb._ps_lit(_b64(expresion))}); returnByValue = $true;
        awaitPromise = $true; userGesture = ${'true' if gesto else 'false'} }} | ConvertTo-Json -Compress)
$r = Send-Cdp $ws 2 'Runtime.evaluate' $p
$ws.Dispose()
(@{{ v = $r.result.result.value; err = $r.result.exceptionDetails.text }} | ConvertTo-Json -Compress -Depth 8)
"""
    salida = wb.ps(script, timeout=timeout).strip()
    linea = [l for l in salida.splitlines() if l.strip().startswith("{")]
    if not linea:
        raise wb.PuenteError(f"js sin respuesta: {salida[:400]}")
    d = json.loads(linea[-1])
    if d.get("err"):
        raise wb.PuenteError(f"js lanzo: {d['err']}")
    return d.get("v")


def pon_archivo(tid: str, ruta_win: str, timeout: int = 240) -> str:
    """Mete el mp4 en el <input type=file> por CDP (no hay dialogo de archivos)."""
    script = f"""
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {wb._ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
[void](Send-Cdp $ws 1 'DOM.enable' $null)
$doc = Send-Cdp $ws 2 'DOM.getDocument' '{{"depth":-1}}'
$root = $doc.result.root.nodeId
$q = Send-Cdp $ws 3 'DOM.querySelector' ('{{"nodeId":' + $root + ',"selector":"input[type=file]"}}')
if (-not $q.result.nodeId -or $q.result.nodeId -eq 0) {{ $ws.Dispose(); throw 'NO-INPUT' }}
$files = (@{{ nodeId = $q.result.nodeId; files = @({wb._ps_lit(ruta_win)}) }} | ConvertTo-Json -Compress)
[void](Send-Cdp $ws 4 'DOM.setFileInputFiles' $files)
$ws.Dispose()
Write-Output ('OK ' + $q.result.nodeId)
"""
    return wb.ps(script, timeout=timeout).strip().splitlines()[-1].strip()


def teclas(tid: str, combos: list[tuple[str, int, int]], timeout: int = 240) -> None:
    """Manda teclas reales por CDP: [(texto, keyCode, modificadores), ...]."""
    partes = []
    for i, (llave, code, mods) in enumerate(combos):
        base = (f'{{"type":"%s","windowsVirtualKeyCode":{code},"nativeVirtualKeyCode":{code},'
                f'"modifiers":{mods},"key":"{llave}"}}')
        partes.append(f"[void](Send-Cdp $ws {10 + i * 2} 'Input.dispatchKeyEvent' '{base % 'keyDown'}')")
        partes.append(f"[void](Send-Cdp $ws {11 + i * 2} 'Input.dispatchKeyEvent' '{base % 'keyUp'}')")
    script = f"""
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {wb._ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
{chr(10).join(partes)}
$ws.Dispose()
Write-Output OK
"""
    wb.ps(script, timeout=timeout)


def permite_portapapeles(timeout: int = 120) -> None:
    """Da permiso de portapapeles al origen de TikTok (para el paso de la descripcion)."""
    script = """
$ver = Get-CdpJson '/json/version'
$bws = Connect-Cdp $ver.webSocketDebuggerUrl
$p = '{"origin":"https://www.tiktok.com","permissions":["clipboardReadWrite","clipboardSanitizedWrite"]}'
[void](Send-Cdp $bws 1 'Browser.grantPermissions' $p)
$bws.Dispose()
Write-Output OK
"""
    wb.ps(script, timeout=timeout)


def foto(tid: str, destino: Path, timeout: int = 240) -> Path:
    """Screenshot de la pestana (para revisar el estado sin adivinar)."""
    wb.PUENTE.mkdir(parents=True, exist_ok=True)
    nombre = f"tt_{int(time.time() * 1000)}.png"
    script = f"""
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {wb._ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
[void](Send-Cdp $ws 1 'Page.enable' $null)
$r = Send-Cdp $ws 2 'Page.captureScreenshot' '{{"format":"png"}}'
Save-B64 $r.result.data ('{wb.PUENTE_WIN}\\{nombre}')
$ws.Dispose()
Write-Output OK
"""
    wb.ps(script, timeout=timeout)
    origen = wb.PUENTE / nombre
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(origen.read_bytes())
    origen.unlink(missing_ok=True)
    return destino


EDITOR = ".public-DraftEditor-content"


def pega_descripcion(tid: str, texto: str, timeout: int = 300) -> str:
    """Pone la descripcion con un PEGADO REAL (portapapeles + comando 'paste' de CDP).

    Nunca por `value`/`fill`: Draft.js no registra el cambio y TikTok publica el nombre
    del archivo como copy sin avisar (paso el 25-jul-2026 con 8 videos).
    """
    permite_portapapeles()
    js(tid, f"navigator.clipboard.writeText({json.dumps(texto)}).then(()=>1)", gesto=True,
       timeout=timeout)
    js(tid, f"""(() => {{
        const el = document.querySelector({json.dumps(EDITOR)});
        if (!el) return 'NO-EDITOR';
        el.focus();
        const r = document.createRange(); r.selectNodeContents(el);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        return 'OK';
    }})()""", gesto=True, timeout=timeout)
    # 'paste' como COMANDO de edicion: un Ctrl+V a secas por dispatchKeyEvent no lo ejecuta
    script = f"""
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {wb._ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
$p = '{{"type":"keyDown","windowsVirtualKeyCode":86,"nativeVirtualKeyCode":86,"modifiers":2,"key":"v","commands":["paste"]}}'
[void](Send-Cdp $ws 1 'Input.dispatchKeyEvent' $p)
[void](Send-Cdp $ws 2 'Input.dispatchKeyEvent' '{{"type":"keyUp","windowsVirtualKeyCode":86,"nativeVirtualKeyCode":86,"modifiers":2,"key":"v"}}')
$ws.Dispose()
Write-Output OK
"""
    wb.ps(script, timeout=timeout)
    time.sleep(2)
    return js(tid, f"""(() => {{
        const el = document.querySelector({json.dumps(EDITOR)});
        const t = el ? el.innerText : "";
        // el editor de TikTok normaliza los saltos de linea (mete uno de mas), asi que
        // comparar los primeros 60 caracteres EXACTOS fallaba con un copy correcto
        // (19-ago-2026, ag05). Se comparan sin espacios de por medio.
        const limpia = (x) => x.replace(/\\s+/g, " ").trim();
        return (t.length > 200 && limpia(t).slice(0, 50) === limpia({json.dumps(texto[:80])}).slice(0, 50))
               ? "PEGADO:" + t.length : "MAL:" + t.slice(0, 60);
    }})()""", timeout=timeout)


# Selector rediseñado por TikTok (visto el 2-nov-2026): la fecha y la hora ya no son <input>, sino
# dos combobox `[aria-label="Select date"]` y `[aria-label="Select time"]` cuyo valor vive en
# `.Picker__value` («2 nov 2026», «19:00»). Los botones traen aria-label legible: `Hours 19`,
# `Minutes 00` y «lunes, 2 de noviembre de 2026». `.click()` no abre el combobox: hace falta la
# secuencia completa de eventos de puntero. El formulario viejo daba `[]` y `sube()` se negó a
# publicar: justo para eso está esa comprobación.
_PULSA = """const pulsa = e => { e.scrollIntoView({block: 'center'});
    for (const n of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])
        e.dispatchEvent(new (n.startsWith('pointer') ? PointerEvent : MouseEvent)(n,
            {bubbles: true, cancelable: true, view: window, button: 0})); };"""
_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
          "septiembre", "octubre", "noviembre", "diciembre"]


def _lee_picker(tid: str, etiqueta: str, timeout: int) -> str:
    return str(js(tid, f"""(() => {{ const e = document.querySelector('[aria-label="{etiqueta}"] .Picker__value');
        return e ? e.innerText.trim() : 'SIN-PICKER'; }})()""", timeout=timeout)).strip().strip('"')


def _abre_picker(tid: str, etiqueta: str, timeout: int) -> None:
    js(tid, f"""(() => {{ {_PULSA}
        const e = document.querySelector('[aria-label="{etiqueta}"]');
        if (!e) return 'NO'; if (e.getAttribute('aria-expanded') !== 'true') pulsa(e); return 'OK'; }})()""",
       gesto=True, timeout=timeout)
    time.sleep(1.4)


def programa(tid: str, fecha: str, hora: str, timeout: int = 300) -> str:
    """Marca 'Programación' y fija fecha (YYYY-MM-DD) y hora (HH:MM). Devuelve lo que QUEDÓ en el formulario."""
    js(tid, """(() => {
        const rs = [...document.querySelectorAll('input[type=radio]')];
        const r = rs.find(x => x.value === 'schedule');
        if (!r) return 'NO-RADIO';
        if (!r.checked) (r.closest('label') || r.parentElement).click();
        return 'OK';
    })()""", gesto=True, timeout=timeout)
    time.sleep(3)

    anio, mes, dia = (int(x) for x in fecha.split("-"))
    h, m = hora.split(":")
    if int(m) % 5:
        raise RuntimeError(f"los minutos van de 5 en 5: {hora}")

    # FECHA primero: las horas válidas dependen del día
    for intento in range(3):
        _abre_picker(tid, "Select date", timeout)
        for _ in range(4):
            cab = str(js(tid, """(() => { const a = document.querySelector('.DatePicker__titleMonth'),
                b = document.querySelector('.DatePicker__titleYear');
                return a && b ? (a.innerText + ' ' + b.innerText).toLowerCase() : 'SIN-CABECERA'; })()""",
                         timeout=timeout))
            if f"{_MESES[mes - 1]} {anio}" in cab:
                break
            js(tid, f"""(() => {{ {_PULSA} const f = document.querySelector('button[aria-label="Next month"]');
                if (!f) return 'NO'; pulsa(f); return 'OK'; }})()""", gesto=True, timeout=timeout)
            time.sleep(1.2)
        js(tid, f"""(() => {{ {_PULSA}
            const f = [...document.querySelectorAll('button.DatePicker__day')].find(b =>
                (b.getAttribute('aria-label') || '').endsWith(', {dia} de {_MESES[mes - 1]} de {anio}'));
            if (!f) return 'NO-DIA'; if (f.disabled) return 'DIA-BLOQUEADO'; pulsa(f); return 'OK'; }})()""",
           gesto=True, timeout=timeout)
        time.sleep(1.4)
        leida = _lee_picker(tid, "Select date", timeout)
        partes = leida.split()
        if len(partes) == 3 and partes[0] == str(dia) and partes[2] == str(anio) and _MESES[mes - 1].startswith(partes[1].lower()[:3]):
            break
        print(f"  fecha quedó en {leida}, pedía {fecha} — reintento {intento + 1}", flush=True)
    else:
        return json.dumps(["FECHA-MAL", leida])

    # HORA: el panel es una rueda, pero cada opción es un botón con aria-label
    for intento in range(4):
        _abre_picker(tid, "Select time", timeout)
        js(tid, f"""(() => {{ {_PULSA}
            const a = document.querySelector('[aria-label="Hours {h}"]'), b = document.querySelector('[aria-label="Minutes {m}"]');
            if (!a || !b) return 'NO-OPCION'; if (a.dataset.disabled === 'true' || b.dataset.disabled === 'true') return 'BLOQUEADA';
            pulsa(a); return 'OK'; }})()""", gesto=True, timeout=timeout)
        time.sleep(1)
        js(tid, f"""(() => {{ {_PULSA}
            const b = document.querySelector('[aria-label="Minutes {m}"]'); if (!b) return 'NO'; pulsa(b); return 'OK'; }})()""",
           gesto=True, timeout=timeout)
        time.sleep(1.2)
        actual = _lee_picker(tid, "Select time", timeout)
        if actual == hora:
            break
        print(f"  hora quedó en {actual}, pedía {hora} — reintento {intento + 1}", flush=True)
    else:
        return json.dumps(["HORA-MAL", actual])
    # Cierra los paneles sin tocar nada del formulario
    js(tid, """(() => { const t = document.querySelector('.scheduled-title-container'); if (t) t.click(); return 'OK'; })()""",
       gesto=True, timeout=timeout)
    time.sleep(1)
    return json.dumps([fecha, _lee_picker(tid, "Select time", timeout)])


def cierra_avisos(tid: str, timeout: int = 240) -> str:
    """Cierra los popups de novedades que tapan el boton (Entendido / Got it / OK)."""
    # 'descartar' incluido: una subida abandonada deja un aviso "Descartar / Continuar"
    # que bloquea el siguiente archivo. Estaba en las notas y no en el código (26-ago-2026,
    # tras cortar una tanda a medias porque José había renombrado los mp4).
    return js(tid, """(() => {
        const t = ['entendido', 'got it', 'de acuerdo', 'aceptar', 'ok', 'descartar', 'discard'];
        let n = 0;
        for (const b of document.querySelectorAll('button')) {
            const x = (b.innerText || '').trim().toLowerCase();
            if (t.includes(x) && b.offsetParent) { b.click(); n++; }
        }
        return 'cerrados ' + n;
    })()""", gesto=True, timeout=timeout)


def publica(tid: str, intentos: int = 10, pausa: float = 40.0, timeout: int = 400) -> str:
    """Click en Programar hasta que TikTok redirija, cancelando su modal de revisión.

    Al pulsar Programar, TikTok suele abrir "¿Seguir con la publicación? Seguimos
    revisando tu vídeo…" con el botón **Publicar ahora**. Ese botón se salta el horario
    y publica de inmediato: aquí JAMÁS se toca. Se cancela, se espera a que la revisión
    del servidor termine y se vuelve a pulsar Programar; entonces el modal ya no sale.
    """
    for k in range(intentos):
        r = js(tid, """(() => {
            const bs = [...document.querySelectorAll('button')].filter(b => b.offsetParent);
            // SOLO «Programar». Antes también aceptaba «Publicar»: si el radio volvía a «Ahora», esto
            // publicaba de inmediato y rompía el orden de la serie (revisado el 2-nov-2026).
            const sch = document.querySelector('input[type=radio][value=schedule]');
            if (!sch || !sch.closest('label').querySelector('.Radio__circle--checked-true')) return 'NO-ESTA-EN-PROGRAMACION';
            const b = bs.find(x => /^(programar|schedule)$/i.test((x.innerText || '').trim()));
            if (!b) return 'NO-BOTON:' + bs.map(x => (x.innerText||'').trim())
                                            .join('|').slice(0, 200);
            if (b.disabled) return 'DESHABILITADO';
            b.click();
            return 'CLICK:' + b.innerText.trim();
        })()""", gesto=True, timeout=timeout)
        if not str(r).startswith("CLICK"):
            return str(r)
        time.sleep(6)

        # el permiso de "guardar el video para publicacion programada" SI se acepta
        js(tid, """(() => {
            const bs = [...document.querySelectorAll('button')].filter(b => b.offsetParent);
            const b = bs.find(x => /^(permitir|allow|aceptar|confirmar)$/i
                                   .test((x.innerText || '').trim()));
            if (b) { b.click(); return 'PERMISO-OK'; }
            return 'SIN-PERMISO';
        })()""", gesto=True, timeout=timeout)
        time.sleep(6)

        estado = js(tid, """(() => {
            if (location.pathname.includes('/content')) return 'REDIRIGIO';
            const hay = [...document.querySelectorAll('button')].filter(b => b.offsetParent)
                .some(b => /publicar ahora/i.test((b.innerText || '').trim()));
            return hay ? 'MODAL' : 'NADA';
        })()""", timeout=timeout)
        if estado == "REDIRIGIO":
            return "OK"
        if estado == "MODAL":
            js(tid, """(() => {
                const b = [...document.querySelectorAll('button')].filter(x => x.offsetParent)
                    .find(x => /^cancelar$/i.test((x.innerText || '').trim()));
                if (b) { b.click(); return 'CANCELADO'; }
                return 'NO-CANCELAR';
            })()""", gesto=True, timeout=timeout)
            print(f"  … TikTok sigue revisando; reintento {k + 1}/{intentos}", flush=True)
            time.sleep(pausa)
            continue
        time.sleep(pausa)
    return "FALLO: TikTok nunca solto la revision"


INSPECCION = r"""
(() => {
  const vis = e => { const r = e.getBoundingClientRect();
                     return r.width > 0 && r.height > 0; };
  const btns = [...document.querySelectorAll('button,[role=button],div[class*=btn]')]
      .filter(vis).map(e => (e.innerText || '').trim().slice(0, 40))
      .filter(t => t.length > 0).slice(0, 30);
  const edit = [...document.querySelectorAll('[contenteditable=true]')].map(
      e => e.className.slice(0, 60));
  const inputs = [...document.querySelectorAll('input')].map(
      e => e.type + '|' + (e.className || '').slice(0, 40));
  return JSON.stringify({url: location.pathname, titulo: document.title,
                         botones: btns, editables: edit, inputs: inputs,
                         texto: document.body.innerText.slice(0, 700)});
})()
"""


def espera(tid: str, cond_js: str, intentos: int = 20, cada: float = 12.0,
           que: str = "") -> bool:
    for i in range(intentos):
        if js(tid, cond_js):
            return True
        print(f"  … esperando {que} ({i + 1}/{intentos})", flush=True)
        time.sleep(cada)
    return False


def sube(ruta_win: str, copy: str, fecha: str, hora: str) -> str:
    """Sube UN video y lo deja PROGRAMADO. Devuelve el estado final."""
    print(f"→ {ruta_win.split(chr(92))[-1]}  →  {fecha} {hora}", flush=True)
    tid = wb.abre_pagina(UPLOAD, espera_s=14, ancho=1400, alto=1000)
    time.sleep(4)
    cierra_avisos(tid)
    print("  archivo:", pon_archivo(tid, ruta_win), flush=True)

    if not espera(tid, f"!!document.querySelector({json.dumps(EDITOR)})",
                  intentos=25, que="que suba el mp4"):
        return "FALLO: nunca aparecio el editor"
    time.sleep(6)

    puesto = pega_descripcion(tid, copy)
    if not str(puesto).startswith("PEGADO"):
        return f"FALLO: la descripcion no se pego ({str(puesto)[:80]})"
    print(f"  descripcion OK ({len(copy)} chars)", flush=True)

    # el dialogo "seguimos revisando tu video" ofrece PUBLICAR AHORA, que se comeria el
    # horario. Se espera a que termine la revision en vez de aceptarlo.
    # 15-oct-2026: esto esperaba a que no dijera «revisando», pero TikTok escribe «Revisión
    # en curso» / «Comprobación en curso»: no esperaba nada y NUNCA leía el resultado, así que
    # un video marcado (música con derechos, contenido no apto para Para ti) se publicaba a
    # ciegas. La revisión de contenido tarda ~6 min. Ahora se espera de verdad y cada
    # comprobación tiene que decir «No se han detectado problemas», o no se publica.
    if not espera(tid, """(() => {
            const t = document.body.innerText;
            const i = t.indexOf('Comprobaciones');
            if (i < 0) return false;
            const s = t.slice(i, i + 700);
            const f = s.indexOf('Feed');
            return !/en\\s+curso|revisando|comprobando|checking|in progress|solo pueden comenzar|Verificaremos|Comprobaremos/i.test(f > 0 ? s.slice(0, f) : s);
        })()""", intentos=60, que="la revision de TikTok"):
        return "FALLO: la revision no termino"
    chk = unquote(str(js(tid, """encodeURIComponent((() => {
            const t = document.body.innerText; const i = t.indexOf('Comprobaciones');
            const s = t.slice(i, i + 700); const f = s.indexOf('Feed');
            return f > 0 ? s.slice(0, f) : s; })())""")))
    limpias = len(re.findall(r"No se han detectado problemas|No issues found", chk))
    if limpias < 2:
        return "FALLO: TikTok marcó algo en las Comprobaciones, NO se publica: " + " | ".join(
            l.strip() for l in chk.splitlines() if l.strip())[:400]
    print("  revision terminada: música y contenido sin problemas", flush=True)

    _prog = programa(tid, fecha, hora)
    print("  programacion:", _prog, flush=True)
    # 27-sep-2026: solo se comprobaba la HORA. El selector de día no cambiaba de mes, la
    # fecha se quedaba en hoy y el video se programaba para el día equivocado: así se
    # publicaron 7 piezas de un curso fuera de orden el 24-sep. Ahora se exigen las dos.
    if fecha not in _prog:
        raise RuntimeError(
            f"la FECHA quedó mal: pedía {fecha} y el formulario dice {_prog}. NO se "
            f"publica en un día equivocado.")
    if hora not in _prog:
        raise RuntimeError(
            f"la hora quedó mal: pedía {hora} y el formulario dice {_prog}. NO se publica "
            f"a una hora equivocada; arregla el picker y reintenta.")
    cierra_avisos(tid)
    r = publica(tid)
    print("  publicar:", r[:120], flush=True)
    if r != "OK":                      # publica() devuelve "OK" solo si TikTok redirigio
        return f"FALLO: no quedo programado ({r[:150]})"
    # La comprobación de la fila miraba los primeros 1200 caracteres 6 s después de
    # redirigir — antes de que la lista renderice — y avisaba de un copy ausente que sí
    # estaba (8-sep-2026, en las dos subidas). El copy YA se verificó donde importa:
    # pega_descripcion solo devuelve PEGADO si el texto está de verdad en el editor.
    # Aquí se reintenta sobre el body ENTERO, y si no aparece es informativo, no alarma.
    for _ in range(5):
        time.sleep(6)
        if js(tid, f"document.body.innerText.includes({json.dumps(copy[:35])})"):
            return "OK"
    return ("OK (la fila aún no rendariza el copy; ya quedó verificado en el editor "
            "antes de programar)")
    return "OK programado"


def main() -> None:
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
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == "subir":
        ruta, copy_txt, fecha, hora = sys.argv[2:6]
        texto = Path(copy_txt).read_text(encoding="utf-8").strip()
        print(sube(ruta, texto, fecha, hora))
        return
    if sys.argv[1] == "inspeccionar":
        tid = wb.abre_pagina(UPLOAD, espera_s=12, ancho=1400, alto=1000)
        print("target:", tid)
        time.sleep(3)
        print(js(tid, INSPECCION))
        foto(tid, Path(sys.argv[2]) if len(sys.argv) > 2
             else RAIZ / "scratchpad" / "_tt_upload.png")
        print("foto lista")


if __name__ == "__main__":
    main()
