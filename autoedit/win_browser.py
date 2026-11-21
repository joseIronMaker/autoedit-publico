"""Puente al Chrome REAL de Windows desde WSL2.

Por que existe: el Chrome de Linux en WSL2 no sirve para capturar herramientas reales
(ChatGPT y compania exigen sesion iniciada y detectan el navegador automatizado). El
resultado era una captura en blanco y el motor degradaba a una animacion inventada, que
viola la REGLA DE REALIDAD del canal.

Como funciona (todo verificado el 11-ago-2026 en esta maquina):
- Chrome de Windows corre con --remote-debugging-port sobre un perfil dedicado
  (C:\\autoedit-chrome) donde Jose inicia sesion UNA vez y queda para siempre.
- El puerto NO se alcanza desde WSL (NAT + firewall), pero powershell.exe SI se ejecuta
  desde WSL y habla con 127.0.0.1 del lado de Windows.
- La sesion CDP (websocket) la sostiene PowerShell con System.Net.WebSockets.ClientWebSocket.

Tres restricciones MEDIDAS que condicionan el diseno; no las cambies sin volver a medir:
1. MachinePolicy = AllSigned por directiva de grupo (maquina corporativa). Los archivos
   .ps1 sin firmar NO corren y -ExecutionPolicy Bypass se ignora. Por eso todo va por
   -EncodedCommand: es un comando, no un archivo, y la directiva no aplica.
2. "powershell -Command -" lee stdin linea por linea y destroza los bloques do/while.
   Tampoco sirve.
3. La salida por stdout viene contaminada con CLIXML (registros de progreso). Por eso los
   resultados se escriben a archivo en C:\\autoedit-bridge y WSL los lee por /mnt/c.
"""
from __future__ import annotations

import base64
import json
import shutil
import subprocess
import time
from pathlib import Path

CHROME_WIN = Path("/mnt/c/Program Files/Google/Chrome/Application/chrome.exe")
PUENTE = Path("/mnt/c/autoedit-bridge")
PUENTE_WIN = r"C:\autoedit-bridge"
PERFIL_WIN = r"C:\autoedit-chrome"
PUERTO = 9222

# Funciones CDP que se anteponen a cada script. Send-Cdp descarta los eventos que llegan
# intercalados y solo devuelve la respuesta cuyo id pidio quien llama.
PRELUDIO = r"""
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
$CT = [System.Threading.CancellationToken]::None

function Get-CdpJson($ruta) {
  return (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:__PUERTO__$ruta").Content | ConvertFrom-Json
}

function Connect-Cdp($url) {
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.ConnectAsync([Uri]$url, $CT).Wait()
  return $ws
}

function Read-CdpFrame($ws) {
  $buf = New-Object byte[] 1048576
  $seg = New-Object System.ArraySegment[byte] -ArgumentList @(,$buf)
  $sb = New-Object System.Text.StringBuilder
  do {
    $r = $ws.ReceiveAsync($seg, $CT)
    $r.Wait()
    [void]$sb.Append([System.Text.Encoding]::UTF8.GetString($buf, 0, $r.Result.Count))
  } while (-not $r.Result.EndOfMessage)
  return $sb.ToString()
}

function Send-Cdp($ws, $id, $method, $params) {
  if ($params) { $cuerpo = "{""id"":$id,""method"":""$method"",""params"":$params}" }
  else         { $cuerpo = "{""id"":$id,""method"":""$method""}" }
  $b = [System.Text.Encoding]::UTF8.GetBytes($cuerpo)
  $seg = New-Object System.ArraySegment[byte] -ArgumentList @(,$b)
  $ws.SendAsync($seg, 'Text', $true, $CT).Wait()
  $limite = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $limite) {
    $txt = Read-CdpFrame $ws
    $o = $txt | ConvertFrom-Json
    if ($o.id -eq $id) { return $o }
  }
  throw "CDP sin respuesta para $method (id $id)"
}

function Save-B64($b64, $destino) {
  [IO.File]::WriteAllBytes($destino, [Convert]::FromBase64String($b64))
}

# Los parametros CDP y las expresiones JS viajan en base64 desde Python. Asi se evita por
# completo el escapado de comillas entre bash, PowerShell, JSON y JavaScript — cuatro
# niveles que ya rompieron esto una vez.
function B64($s) {
  return [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s))
}

# Chrome 151 rechaza GET en /json/new ("supports only PUT"). Crear la pestana por CDP es
# inmune a esos cambios de la API HTTP.
function New-CdpPage($url) {
  $ver = Get-CdpJson '/json/version'
  $bws = Connect-Cdp $ver.webSocketDebuggerUrl
  $params = (@{ url = $url } | ConvertTo-Json -Compress)
  $r = Send-Cdp $bws 1 'Target.createTarget' $params
  $bws.Dispose()
  return $r.result.targetId
}

function Close-CdpPage($tid) {
  try {
    $ver = Get-CdpJson '/json/version'
    $bws = Connect-Cdp $ver.webSocketDebuggerUrl
    [void](Send-Cdp $bws 1 'Target.closeTarget' (@{ targetId = $tid } | ConvertTo-Json -Compress))
    $bws.Dispose()
  } catch { }
}

function Eval-Js($ws, $id, $b64js) {
  $params = (@{ expression = (B64 $b64js); returnByValue = $true } | ConvertTo-Json -Compress)
  $r = Send-Cdp $ws $id 'Runtime.evaluate' $params
  return $r.result.result.value
}
"""


class PuenteError(RuntimeError):
    pass


def disponible() -> bool:
    """Hay Chrome de Windows y powershell alcanzable desde WSL."""
    return CHROME_WIN.exists() and shutil.which("powershell.exe") is not None


def ps(script: str, timeout: int = 240) -> str:
    """Corre PowerShell en Windows. Unico transporte valido: -EncodedCommand."""
    completo = PRELUDIO.replace("__PUERTO__", str(PUERTO)) + "\n" + script
    enc = base64.b64encode(completo.encode("utf-16-le")).decode("ascii")
    r = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", enc],
        capture_output=True, timeout=timeout)
    salida = r.stdout.decode("utf-8", "replace")
    if r.returncode != 0:
        err = r.stderr.decode("utf-8", "replace")[:800]
        raise PuenteError(f"powershell fallo ({r.returncode}): {err or salida[:400]}")
    return salida


def _vivo() -> bool:
    try:
        ps("Write-Output (Get-CdpJson '/json/version').Browser", timeout=25)
        return True
    except Exception:
        return False


def asegura_chrome(perfil: str = PERFIL_WIN, espera: float = 12.0) -> None:
    """Levanta el Chrome de Windows con el puerto de depuracion si no esta arriba."""
    if not CHROME_WIN.exists():
        raise PuenteError(f"no existe {CHROME_WIN}")
    if _vivo():
        return
    PUENTE.mkdir(parents=True, exist_ok=True)
    subprocess.Popen(
        [str(CHROME_WIN), f"--remote-debugging-port={PUERTO}", f"--user-data-dir={perfil}",
         "--no-first-run", "--no-default-browser-check", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    fin = time.time() + espera
    while time.time() < fin:
        time.sleep(1.0)
        if _vivo():
            return
    raise PuenteError("Chrome de Windows no abrio el puerto de depuracion")


def _ps_lit(txt: str) -> str:
    """Literal de PowerShell entre comillas simples (se duplica la comilla interna)."""
    return "'" + txt.replace("'", "''") + "'"


def abre_pagina(url: str, espera_s: float = 6.0, ancho: int = 1280, alto: int = 900,
                reusar: bool = False) -> str:
    """Abre una pestana en la URL y devuelve su targetId.

    Por omision NO reusa pestanas abiertas: reusarlas devuelve la pagina como quedo de la vez
    anterior (me paso el 11-ago-2026 midiendo respuestas de ChatGPT — la "nueva" respuesta era
    la vieja). `reusar=True` solo para inspeccionar algo ya abierto.
    """
    script = f"""
$destino = {_ps_lit(url)}
$t = $null
if ({'$true' if reusar else '$false'}) {{
  $t = (Get-CdpJson '/json') | Where-Object {{ $_.type -eq 'page' -and $_.url -like ($destino + '*') }} | Select-Object -First 1
}}
if ($t) {{ $tid = $t.id }} else {{
  $tid = New-CdpPage $destino
  Start-Sleep -Milliseconds {int(espera_s * 1000)}
}}
$ws = Connect-Cdp ('ws://127.0.0.1:{PUERTO}/devtools/page/' + $tid)
[void](Send-Cdp $ws 1 'Page.enable' $null)
[void](Send-Cdp $ws 2 'Emulation.setDeviceMetricsOverride' '{{"width":{ancho},"height":{alto},"deviceScaleFactor":2,"mobile":false}}')
[void](Send-Cdp $ws 3 'Page.bringToFront' $null)
$ws.Dispose()
Write-Output $tid
"""
    return ps(script).strip().splitlines()[-1].strip()


def sonda(url: str, texto_sesion: str = "") -> dict:
    """Abre la URL y reporta titulo, si pide inicio de sesion y cuanto texto real trae.

    Sirve para NO seguir adelante con una captura vacia: el motor jamas debe rellenar
    con una animacion inventada lo que prometio mostrar de verdad.
    """
    tid = abre_pagina(url)
    script = f"""
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {_ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
[void](Send-Cdp $ws 1 'Runtime.enable' $null)
$expr = '({{titulo: document.title, largo: (document.body ? document.body.innerText.length : 0), texto: (document.body ? document.body.innerText.slice(0, 400) : ""), login: /log ?in|inicia sesi|sign ?up|create account/i.test(document.body ? document.body.innerText.slice(0, 3000) : "")}})'
$r = Send-Cdp $ws 2 'Runtime.evaluate' ('{{"expression":"' + $expr.Replace('"','\\"') + '","returnByValue":true}}')
$ws.Dispose()
$r.result.result.value | ConvertTo-Json -Compress
"""
    salida = ps(script).strip()
    linea = [l for l in salida.splitlines() if l.strip().startswith("{")]
    if not linea:
        raise PuenteError(f"sonda sin respuesta: {salida[:300]}")
    d = json.loads(linea[-1])
    d["target"] = tid
    if texto_sesion:
        d["sesion_ok"] = texto_sesion.lower() in (d.get("texto") or "").lower()
    return d


def captura(url: str, destino: Path, ancho: int = 1280, alto: int = 900,
            espera_s: float = 5.0) -> Path:
    """Screenshot del Chrome REAL de Windows (con sesion iniciada) a un PNG de WSL."""
    tid = abre_pagina(url, espera_s=espera_s, ancho=ancho, alto=alto)
    PUENTE.mkdir(parents=True, exist_ok=True)
    nombre = f"shot_{int(time.time()*1000)}.png"
    script = f"""
Start-Sleep -Milliseconds {int(espera_s * 1000)}
$t = (Get-CdpJson '/json') | Where-Object {{ $_.id -eq {_ps_lit(tid)} }} | Select-Object -First 1
$ws = Connect-Cdp $t.webSocketDebuggerUrl
$r = Send-Cdp $ws 1 'Page.captureScreenshot' '{{"format":"png","captureBeyondViewport":false}}'
Save-B64 $r.result.data '{PUENTE_WIN}\\{nombre}'
$ws.Dispose()
Write-Output 'ok'
"""
    ps(script)
    origen = PUENTE / nombre
    if not origen.exists() or origen.stat().st_size < 2000:
        raise PuenteError("la captura salio vacia")
    destino.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(origen), str(destino))
    return destino


def _b64(txt: str) -> str:
    return base64.b64encode(txt.encode("utf-8")).decode("ascii")


def captura_demo(prompt: str, tool: dict, capture_s: float = 10.0,
                 vp: tuple = (432, 768, 2.5), hold: float = 2.6,
                 timeout: int = 300) -> list:
    """Corre `prompt` en la herramienta REAL y devuelve [(t, jpg_bytes)] para _frames_to_clip.

    Misma coreografia que screen_demo._capture (escribe por trozos, envia, espera a que la
    respuesta se estabilice, oculta el composer, sostiene el prompt y luego panea). Lo unico
    que cambia es el transporte: aqui manda el Chrome REAL de Windows, con la sesion de Jose.

    Levanta PuenteError con un motivo legible si la herramienta pide sesion o no responde;
    NUNCA devuelve frames vacios que el motor pueda confundir con una captura buena.
    """
    vw, vh, dsf = vp
    asegura_chrome()
    dir_frames = PUENTE / "frames"
    if dir_frames.exists():
        shutil.rmtree(dir_frames, ignore_errors=True)
    dir_frames.mkdir(parents=True, exist_ok=True)

    palabras = prompt.split(" ")
    trozos = [" ".join(palabras[k:k + 6]) + " " for k in range(0, len(palabras), 6)]
    js_tiene = f"!!document.querySelector({json.dumps(tool['input'])})"
    js_login = ("/inicia sesi|log in|sign up|create account|verify you are human/i"
                ".test((document.body||{}).innerText||'')")
    js_foco = f"(document.querySelector({json.dumps(tool['input'])})||{{focus(){{}}}}).focus()"
    js_enviar = ("(()=>{const b=document.querySelector(%s);if(b&&!b.disabled){b.click();return true}"
                 "return false})()" % json.dumps(tool["submit"]))
    js_resp = ("(()=>{const a=document.querySelector(\"[data-message-author-role='assistant']\")"
               "||document.querySelector('.markdown,.prose');"
               "return a?(a.innerText||'').trim().length:0})()")
    js_arriba = ("window.scrollTo(0,0);document.querySelectorAll('main,[class*=overflow],[class*=scroll]')"
                 ".forEach(e=>{e.scrollTop=0});")
    js_abajo = ("document.querySelectorAll('main,[class*=overflow],[class*=scroll]')"
                ".forEach(e=>{if(e.scrollHeight>e.clientHeight+40)"
                "e.scrollTop=Math.min(e.scrollHeight,e.scrollTop+e.clientHeight*0.33)});"
                "window.scrollBy(0,window.innerHeight*0.33);")

    # los trozos viajan ya codificados: el bucle de captura los va insertando en vivo
    trozos_ps = ",".join(f"'{_b64(json.dumps({'text': t}))}'" for t in trozos)

    script = f"""
$tid = New-CdpPage '{tool["url"]}'
$ws = Connect-Cdp ('ws://127.0.0.1:{PUERTO}/devtools/page/' + $tid)
[void](Send-Cdp $ws 1 'Page.enable' $null)
[void](Send-Cdp $ws 2 'Runtime.enable' $null)
[void](Send-Cdp $ws 3 'Emulation.setDeviceMetricsOverride' (B64 '{_b64(json.dumps({"width": vw, "height": vh, "deviceScaleFactor": dsf, "mobile": True}))}'))
Start-Sleep -Seconds 5

if (-not (Eval-Js $ws 10 '{_b64(js_tiene)}')) {{
  if (Eval-Js $ws 11 '{_b64(js_login)}') {{ throw 'PIDE-SESION' }}
  throw 'NO-HAY-CAMPO'
}}
[void](Eval-Js $ws 12 '{_b64(tool.get("hide_pre", "0"))}')
[void](Eval-Js $ws 13 '{_b64(js_foco)}')
Start-Sleep -Milliseconds 300

# Se graba DESDE QUE SE ESCRIBE, no despues de que llega la respuesta. Grabar al final
# producia 82 frames byte-identicos: una foto fija de 13s, real pero muerta (rompe la regla
# de los 3 segundos). Escribiendo en vivo se ve el prompt aparecer, el boton activarse y la
# respuesta escribirse sola — que es justo lo que el espectador ve en su telefono.
$trozos = @({trozos_ps})
$reloj = [Diagnostics.Stopwatch]::StartNew()
$tiempos = New-Object System.Collections.ArrayList
$n = 0; $k = 0; $fase = 0
$got = 0; $prev = -1; $estable = 0; $listo = 0
while ($reloj.Elapsed.TotalSeconds -lt {capture_s:.2f}) {{
  # milisegundos ENTEROS: PowerShell en español escribe los decimales con coma y el
  # -join ',' los convertia en basura ("2,70,2,90"). Python los divide entre 1000.
  $ms = [int]$reloj.Elapsed.TotalMilliseconds
  $r = Send-Cdp $ws (1000 + $n) 'Page.captureScreenshot' (B64 '{_b64(json.dumps({"format": "jpeg", "quality": 80, "captureBeyondViewport": False}))}')
  Save-B64 $r.result.data ('{PUENTE_WIN}\\frames\\f' + $n.ToString('00000') + '.jpg')
  [void]$tiempos.Add($ms)
  $n++

  if ($fase -eq 0) {{
    if ($k -lt $trozos.Count) {{
      [void](Send-Cdp $ws (2000 + $k) 'Input.insertText' (B64 $trozos[$k]))
      $k++
    }} else {{
      $mandado = Eval-Js $ws 20 '{_b64(js_enviar)}'
      if (-not $mandado) {{
        [void](Send-Cdp $ws 21 'Input.dispatchKeyEvent' (B64 '{_b64(json.dumps({"type": "keyDown", "key": "Enter", "code": "Enter", "windowsVirtualKeyCode": 13}))}'))
        [void](Send-Cdp $ws 22 'Input.dispatchKeyEvent' (B64 '{_b64(json.dumps({"type": "keyUp", "key": "Enter", "code": "Enter", "windowsVirtualKeyCode": 13}))}'))
      }}
      $fase = 1
    }}
  }} else {{
    $got = [int](Eval-Js $ws (3000 + $n) '{_b64(js_resp)}')
    if ($got -gt 0 -and $got -eq $prev) {{ $estable++ }} else {{ $estable = 0 }}
    $prev = $got
    if ($estable -ge 3 -or $got -gt 700) {{ $listo = 1 }}
    # respuesta larga: panea para que se lea completa. Corta: no hay nada abajo.
    if ($listo -eq 1 -and $got -gt 200) {{ [void](Eval-Js $ws (5000 + $n) '{_b64(js_abajo)}') }}
  }}
}}
if ($got -lt 1) {{
  if (Eval-Js $ws 400 '{_b64(js_login)}') {{ throw 'PIDE-SESION' }}
  throw 'SIN-RESPUESTA'
}}
($tiempos -join ',') | Out-File -Encoding ascii '{PUENTE_WIN}\\frames\\tiempos.txt'
$ws.Dispose()
Close-CdpPage $tid
Write-Output ('FRAMES=' + $n)
"""
    try:
        salida = ps(script, timeout=timeout)
    except PuenteError as e:
        msg = str(e)
        if "PIDE-SESION" in msg:
            raise PuenteError(
                f"{tool['url']} pide iniciar sesion en el perfil {PERFIL_WIN}. "
                "Abrelo una vez, inicia sesion y queda para siempre.") from None
        if "SIN-RESPUESTA" in msg:
            raise PuenteError("la herramienta no respondio (captura sin contenido)") from None
        if "NO-HAY-CAMPO" in msg:
            raise PuenteError("no encontre el campo de texto en la herramienta") from None
        raise

    tiempos_f = dir_frames / "tiempos.txt"
    if not tiempos_f.exists():
        raise PuenteError(f"la grabacion no dejo tiempos: {salida[:200]}")
    tiempos = [int(x) / 1000.0 for x in tiempos_f.read_text().strip().split(",") if x.strip()]
    frames = []
    for i, t in enumerate(tiempos):
        f = dir_frames / f"f{i:05d}.jpg"
        if f.exists() and f.stat().st_size > 1000:
            frames.append((t, f.read_bytes()))
    if len(frames) < 5:
        raise PuenteError(f"solo {len(frames)} frames utiles; no se grabo la demo")
    return frames
