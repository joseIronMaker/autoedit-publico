"""Captura REAL de duck.ai (sin cuenta) para el recibo del video de la anatomía del prompt.

Corre el prompt en el Chrome de Windows, espera a que la respuesta se estabilice y deja un
PNG. Sirve para dos cosas: (1) el `receipt` del cold-open, con los corchetes a la vista;
(2) verificar que el detector de respuesta de duck.ai funciona — duck.ai NO tiene
`.markdown`/`.prose` ni `[data-message-author-role]`, que es lo único que sabe buscar
screen_demo hoy; aquí se mide el selector que sí existe.

    .venv/bin/python scratchpad/recibo_duck.py "<prompt>" salida.png
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from autoedit import win_browser as wb  # noqa: E402

URL = "https://duckduckgo.com/?q=x&ia=chat&duckai=1"
INPUT = 'textarea[name="user-prompt"]'
SUBMIT = 'button[aria-label="Solicitar"]'
# En cuanto hay historial, duck.ai abre en la lista de chats y el boton de enviar no existe
# hasta que se abre un chat nuevo. Ademas CADA pasada del video tiene que ir en un chat
# LIMPIO: si el modelo se acuerda del turno anterior, la comparacion queda sucia.
NUEVO = ('(()=>{const b=[...document.querySelectorAll("button")]'
         '.find(e=>/^nuevo chat$/i.test((e.innerText||"").split("\\n")[0].trim()));'
         'if(b){b.click();return true}return false})()')
# El contenedor de la respuesta en duck.ai (medido 16-ago-2026): utilidad Tailwind estable
# + clases con hash. Se toma el ULTIMO, que es la respuesta más reciente.
RESP = ('(()=>{const n=[...document.querySelectorAll(\'[class*="space-y-4"]\')].pop();'
        'return n?(n.innerText||"").trim().length:0})()')

prompt = sys.argv[1]
destino = Path(sys.argv[2] if len(sys.argv) > 2 else "scratchpad/recibo_duck.png")

wb.asegura_chrome()
nombre = "recibo_duck.png"
script = f"""
$tid = New-CdpPage '{URL}'
Start-Sleep -Milliseconds 7000
$ws = Connect-Cdp ('ws://127.0.0.1:{wb.PUERTO}/devtools/page/' + $tid)
[void](Send-Cdp $ws 1 'Runtime.enable' $null)
[void](Send-Cdp $ws 2 'Emulation.setDeviceMetricsOverride' '{{"width":432,"height":768,"deviceScaleFactor":2.5,"mobile":true}}')
[void](Eval-Js $ws 3 '{wb._b64(NUEVO)}')
Start-Sleep -Milliseconds 2500
$hay = Eval-Js $ws 4 '{wb._b64("!!document.querySelector(" + json.dumps(INPUT) + ")")}'
if (-not $hay) {{ throw 'NO-HAY-CAMPO' }}
[void](Eval-Js $ws 5 '{wb._b64("document.querySelector(" + json.dumps(INPUT) + ").focus()")}')
Start-Sleep -Milliseconds 400
[void](Send-Cdp $ws 6 'Input.insertText' (B64 '{wb._b64(json.dumps({"text": prompt}))}'))
$env = $false
$k = 0
while ($k -lt 12 -and -not $env) {{
  Start-Sleep -Milliseconds 500
  $env = Eval-Js $ws (40 + $k) '{wb._b64("(()=>{const b=document.querySelector(" + json.dumps(SUBMIT) + ");if(b&&!b.disabled){b.click();return true}return false})()")}'
  $k = $k + 1
}}
if (-not $env) {{
  [void](Send-Cdp $ws 70 'Input.dispatchKeyEvent' '{{"type":"keyDown","key":"Enter","code":"Enter","windowsVirtualKeyCode":13,"nativeVirtualKeyCode":13}}')
  [void](Send-Cdp $ws 71 'Input.dispatchKeyEvent' '{{"type":"keyUp","key":"Enter","code":"Enter","windowsVirtualKeyCode":13,"nativeVirtualKeyCode":13}}')
}}
$prev = -1
$est = 0
$got = 0
$i = 0
while ($i -lt 60) {{
  Start-Sleep -Milliseconds 400
  $got = Eval-Js $ws (100 + $i) '{wb._b64(RESP)}'
  if ($got -gt 0 -and $got -eq $prev) {{ $est = $est + 1 }} else {{ $est = 0 }}
  $prev = $got
  if ($est -ge 3) {{ break }}
  $i = $i + 1
}}
if ($got -lt 1) {{ throw 'SIN-RESPUESTA' }}
[void](Eval-Js $ws 300 '{wb._b64("window.scrollTo(0,0);document.querySelectorAll('main,[class*=overflow],[class*=scroll]').forEach(e=>{e.scrollTop=0})")}')
Start-Sleep -Milliseconds 600
$r = Send-Cdp $ws 301 'Page.captureScreenshot' '{{"format":"png","captureBeyondViewport":false}}'
Save-B64 $r.result.data '{wb.PUENTE_WIN}\\{nombre}'
$ws.Dispose()
Close-CdpPage $tid
Write-Output ('LARGO=' + $got)
"""
print(wb.ps(script, timeout=300).strip().splitlines()[-1])
origen = wb.PUENTE / nombre
destino.parent.mkdir(parents=True, exist_ok=True)
destino.write_bytes(origen.read_bytes())
print("→", destino)
