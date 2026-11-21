"""Graba una demo REAL de una herramienta web (ChatGPT, Gemini, etc.) en 9:16.

En vez de una animación FALSA de prompt, maneja Chrome por CDP (Chrome DevTools Protocol),
escribe el prompt real en la herramienta y graba la pantalla con `Page.startScreencast`.
El clip resultante encaja como una escena más del video (mismos parámetros de encode que
`_render_scene`, para concatenar sin re-encodear).

Por qué importa: TikTok 2026 clasifica el contenido 100% generado por IA como "input mínimo"
(no elegible para "Para ti"). Una grabación real de la herramienta es "input original" y es
el formato que crece (estilo demo de pantalla). Ver la skill `grabar-demo`.

Requiere un Chrome con puerto de debug abierto (se auto-lanza si no está). En WSL usa el
Chrome de Linux (google-chrome) con el perfil ~/.autoedit-chrome.
"""
from __future__ import annotations

import asyncio
import base64
import json
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

# Selectores por herramienta: dónde escribir el prompt y cómo enviarlo. Extensible desde config.
TOOLS = {
    "chatgpt": {
        "url": "https://chatgpt.com/",
        "input": "#prompt-textarea, textarea, [contenteditable='true']",
        "submit": "[data-testid='send-button'], button[aria-label*='Enviar'], button[aria-label*='Send']",
        # oculta el chrome de la UI para enfocar la CONVERSACIÓN (demo más limpia)
        "hide_pre": ("document.querySelectorAll('header').forEach(e=>e.style.setProperty('display','none','important'));"
                     "[...document.querySelectorAll('*')].forEach(e=>{if(!e.children.length&&"
                     "/can make mistakes|puede cometer errores/i.test(e.textContent||''))"
                     "e.style.setProperty('display','none','important')});"),
        "hide_post": ("(()=>{const t=document.querySelector('#prompt-textarea');"
                      "if(t){const f=t.closest('form')||t.parentElement;"
                      "if(f)f.style.setProperty('display','none','important')}})();"),
    },
    "gemini": {
        "url": "https://gemini.google.com/app",
        "input": "rich-textarea .ql-editor, textarea, [contenteditable='true']",
        "submit": "button[aria-label*='Enviar'], button[aria-label*='Send'], button.send-button",
    },
}


def _port_up(port: int) -> bool:
    s = socket.socket()
    s.settimeout(1)
    try:
        s.connect(("127.0.0.1", port))
        return True
    except OSError:
        return False
    finally:
        s.close()


def _ensure_chrome(port: int, profile: str | None) -> None:
    """Si no hay Chrome escuchando en `port`, lo lanza con el perfil de autoedit."""
    if _port_up(port):
        return
    prof = profile or str(Path.home() / ".autoedit-chrome")
    subprocess.Popen(
        ["google-chrome", f"--remote-debugging-port={port}", f"--user-data-dir={prof}",
         "--no-first-run", "--no-default-browser-check", "--disable-features=Translate",
         "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(40):
        if _port_up(port):
            time.sleep(1.5)   # deja que arranque del todo
            return
        time.sleep(0.5)
    raise RuntimeError(f"no pude lanzar Chrome con --remote-debugging-port={port}")


def _browser_ws(port: int) -> str:
    v = json.loads(urllib.request.urlopen(f"http://localhost:{port}/json/version", timeout=10).read())
    return v["webSocketDebuggerUrl"]


class _CDP:
    """Cliente CDP mínimo sobre un websocket (una sola conexión = un target)."""

    def __init__(self, ws):
        self.ws = ws
        self._id = 0
        self._pending: dict[int, asyncio.Future] = {}
        self._lock = asyncio.Lock()
        self.frames: list[tuple[float, bytes]] = []
        self._recording = False

    async def _raw(self, obj) -> None:
        async with self._lock:
            await self.ws.send(json.dumps(obj))

    async def reader(self) -> None:
        async for raw in self.ws:
            m = json.loads(raw)
            if "id" in m and m["id"] in self._pending:
                self._pending.pop(m["id"]).set_result(m)
            elif m.get("method") == "Page.screencastFrame":
                p = m["params"]
                if self._recording:
                    self.frames.append((time.time(), base64.b64decode(p["data"])))
                self._id += 1     # ack fire-and-forget (no esperar respuesta = no bloquear)
                await self._raw({"id": self._id, "method": "Page.screencastFrameAck",
                                 "params": {"sessionId": p["sessionId"]}})

    async def send(self, method: str, params: dict | None = None):
        self._id += 1
        i = self._id
        fut = asyncio.get_event_loop().create_future()
        self._pending[i] = fut
        await self._raw({"id": i, "method": method, "params": params or {}})
        return await asyncio.wait_for(fut, timeout=30)

    async def evaluate(self, expr: str):
        r = await self.send("Runtime.evaluate",
                            {"expression": expr, "returnByValue": True, "awaitPromise": True})
        return r.get("result", {}).get("result", {}).get("value")


async def _capture(prompt: str, tool: dict, capture_s: float, vp: tuple, port: int) -> list:
    import websockets

    vw, vh, dsf = vp
    # crea una pestaña nueva (no estorba las abiertas) y attacha a su ws directo
    async with websockets.connect(_browser_ws(port), max_size=None) as bws:
        b = _CDP(bws)
        asyncio.create_task(b.reader())
        r = await b.send("Target.createTarget", {"url": tool["url"]})
        target_id = r["result"]["targetId"]
    page_ws = f"ws://localhost:{port}/devtools/page/{target_id}"
    frames: list = []
    try:
        async with websockets.connect(page_ws, max_size=None) as ws:
            c = _CDP(ws)
            asyncio.create_task(c.reader())
            await c.send("Page.enable")
            await c.send("Runtime.enable")
            await c.send("Emulation.setDeviceMetricsOverride",
                         {"width": vw, "height": vh, "deviceScaleFactor": dsf, "mobile": True})
            await asyncio.sleep(5)        # deja cargar la UI de la herramienta
            has = await c.evaluate(f"!!document.querySelector({json.dumps(tool['input'])})")
            if not has:
                raise RuntimeError("no encontré el campo de texto (¿muro de login en esa herramienta?)")
            if tool.get("hide_pre"):          # oculta header/footer antes de grabar
                try:
                    await c.evaluate(tool["hide_pre"])
                except Exception:  # noqa: BLE001
                    pass
            # escribe el prompt (en trozos = efecto de tecleo) — TODAVÍA sin grabar
            await c.evaluate(f"document.querySelector({json.dumps(tool['input'])}).focus()")
            await asyncio.sleep(0.4)
            words = prompt.split(" ")
            for k in range(0, len(words), 6):
                await c.send("Input.insertText", {"text": " ".join(words[k:k + 6]) + " "})
                await asyncio.sleep(0.25)
            await asyncio.sleep(0.4)
            clicked = await c.evaluate(
                "(()=>{const b=document.querySelector(%s);if(b){b.click();return true}return false})()"
                % json.dumps(tool["submit"]))
            if not clicked:
                for ev in ("keyDown", "keyUp"):
                    await c.send("Input.dispatchKeyEvent",
                                 {"type": ev, "key": "Enter", "code": "Enter",
                                  "windowsVirtualKeyCode": 13})
            resp_js = ("(()=>{const a=document.querySelector(\"[data-message-author-role='assistant']\")"
                       "||document.querySelector('.markdown,.prose');"
                       "return a?(a.innerText||'').trim().length:0})()")
            # 1) espera a que la respuesta CARGUE y casi se estabilice (así grabamos algo legible, no
            #    el streaming a saltos) y VERIFICA que ChatGPT respondió (si no → build_seg usa fallback).
            got, prev, stable = 0, -1, 0
            for _ in range(50):                     # hasta ~10s
                await asyncio.sleep(0.2)
                try:
                    got = await c.evaluate(resp_js) or 0
                except Exception:  # noqa: BLE001
                    got = 0
                # sin piso de longitud: "responde solo el número" contesta "76.8" y eso
                # es una respuesta válida (el piso de 15 caracteres tiraba capturas buenas)
                stable = stable + 1 if (got > 0 and got == prev) else 0
                prev = got
                if stable >= 3 or got > 700:        # estable ~0.6s, o respuesta ya suficientemente larga
                    break
            if got < 1:
                raise RuntimeError("ChatGPT no respondió (captura sin contenido)")
            # 2) oculta el composer y SUBE al inicio para mostrar el PROMPT legible
            if tool.get("hide_post"):
                try:
                    await c.evaluate(tool["hide_post"])
                except Exception:  # noqa: BLE001
                    pass
            top_js = ("window.scrollTo(0,0);document.querySelectorAll('main,[class*=overflow],[class*=scroll]')"
                      ".forEach(e=>{e.scrollTop=0});")
            try:
                await c.evaluate(top_js)
            except Exception:  # noqa: BLE001
                pass
            await asyncio.sleep(0.3)
            # 3) graba: mantiene el PROMPT (hold = legible), luego BAJA panneando por la respuesta
            c._recording = True
            await c.send("Page.startScreencast",
                         {"format": "jpeg", "quality": 80, "maxWidth": 1080,
                          "maxHeight": 1920, "everyNthFrame": 1})
            down_js = ("document.querySelectorAll('main,[class*=overflow],[class*=scroll]')"
                       ".forEach(e=>{if(e.scrollHeight>e.clientHeight+40)"
                       "e.scrollTop=Math.min(e.scrollHeight,e.scrollTop+e.clientHeight*0.33)});"
                       "window.scrollBy(0,window.innerHeight*0.33);")
            hold = float(tool.get("prompt_hold", 2.6))    # segundos quieto en el PROMPT (para leerlo)
            for i in range(max(1, int(capture_s / 0.5))):
                await asyncio.sleep(0.5)
                if i * 0.5 >= hold:                        # tras el hold: pan hacia abajo por la respuesta
                    try:
                        await c.evaluate(down_js)
                    except Exception:  # noqa: BLE001
                        pass
            await c.send("Page.stopScreencast")
            c._recording = False
            await asyncio.sleep(0.2)
            frames = c.frames
    finally:
        try:      # cierra la pestaña temporal
            async with websockets.connect(_browser_ws(port), max_size=None) as bws2:
                b2 = _CDP(bws2)
                asyncio.create_task(b2.reader())
                await b2.send("Target.closeTarget", {"targetId": target_id})
        except Exception:  # noqa: BLE001
            pass
    return frames


def _frames_to_clip(frames: list, raw_out: Path) -> None:
    """Ensambla los frames en un mp4 con el timing REAL de captura."""
    d = raw_out.parent / "_sd_frames"
    d.mkdir(exist_ok=True)
    for f in d.glob("*.jpg"):
        f.unlink()
    lines = []
    for idx, (t, jpg) in enumerate(frames):
        fp = d / f"f{idx:05d}.jpg"
        fp.write_bytes(jpg)
        dur = (frames[idx + 1][0] - t) if idx + 1 < len(frames) else 0.1
        # rutas ABSOLUTAS: el demuxer concat resuelve rutas relativas contra el
        # directorio del list.txt (no contra el cwd) → con out_path relativo doblaba
        # la ruta y la captura "fallaba" aunque los frames existieran
        lines.append(f"file '{fp.resolve()}'\nduration {max(0.02, dur):.3f}")
    lines.append(f"file '{(d / f'f{len(frames) - 1:05d}.jpg').resolve()}'")
    lst = d / "list.txt"
    lst.write_text("\n".join(lines))
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
         "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
         "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
         str(raw_out)],
        check=True, timeout=300)


class ScreenDemoError(RuntimeError):
    """La grabación real no salió. NO se sustituye por un dibujo: el video se detiene."""


def _verifica_captura(frames: list) -> None:
    """Rechaza las tres formas en que una grabación puede ser inservible sin avisar.

    Las tres pasaron de verdad el 11-ago-2026: (a) muro de login → captura casi vacía con
    frames de sobra; (c) grabar DESPUÉS de que la respuesta llegó → 82 frames byte-idénticos,
    o sea una foto fija de 13s que rompe la regla de los 3 segundos. Sin estos chequeos, el
    motor entrega y uno se entera abriendo el video.
    """
    import hashlib
    import io

    if len(frames) < 5:
        raise ScreenDemoError(f"solo {len(frames)} frames; no se grabó la demo")

    distintos = len({hashlib.sha1(b).hexdigest() for _, b in frames})
    if distintos < 3:
        raise ScreenDemoError(
            f"captura congelada: {len(frames)} frames y solo {distintos} distinto(s). "
            "Hay que grabar desde que se escribe el prompt, no después de la respuesta.")

    try:
        from PIL import Image
    except ImportError:      # sin PIL nos quedamos con los dos chequeos anteriores
        return
    idx = [int(i * (len(frames) - 1) / 4) for i in range(5)]
    vacios = 0
    for i in idx:
        im = Image.open(io.BytesIO(frames[i][1])).convert("L")
        h = im.histogram()
        total = sum(h) or 1
        usados = [v for v in range(256) if h[v] > total * 0.001]
        rango = (max(usados) - min(usados)) if usados else 0
        casi_blanco = sum(h[240:]) / total
        if rango < 22 or casi_blanco > 0.97:
            vacios += 1
    if vacios >= 3:
        raise ScreenDemoError(
            "captura en blanco: la página no tenía contenido (¿muro de login?). "
            "Inicia sesión una vez en el perfil de automatización de Chrome.")


def record_demo(prompt: str, voz_path: Path, dur: float, out_path: Path, cfg: dict,
                tool_url: str | None = None, tool_name: str = "chatgpt",
                capture_seconds: float | None = None) -> None:
    """Graba `prompt` en la herramienta real y produce una escena `out_path` de `dur` segundos
    (con la narración `voz_path` encima), lista para concatenar con las demás escenas."""
    sd = cfg.get("screen_demo") or {}
    port = int(sd.get("port", 9222))
    tool = dict(TOOLS.get(tool_name, TOOLS["chatgpt"]))
    if tool_url:
        tool["url"] = tool_url
    tool.update(sd.get("tools", {}).get(tool_name, {}))   # overrides de config
    # VENTANA POR ESCENA: `capture_seconds` vivía SOLO en config.yaml y lo leía
    # record_demo de forma global, así que subirlo para una demo lenta (una
    # respuesta larga de ChatGPT tarda 20-35 s) se lo subía a TODAS las demás.
    # Ahora el guion puede pedir su propia ventana en el bloque screen_demo.
    capture_s = float(capture_seconds or sd.get("capture_seconds", 10))
    vp = (int(sd.get("vw", 432)), int(sd.get("vh", 768)), float(sd.get("dsf", 2.5)))

    # TRANSPORTE: primero el Chrome REAL de Windows (sesión de José, sin detección de bot).
    # El Chrome de Linux en WSL2 devolvía capturas en blanco en las herramientas con login;
    # queda de respaldo para sitios abiertos. Ver autoedit/win_browser.py.
    frames: list = []
    if sd.get("puente_windows", True):
        try:
            from . import win_browser
            if win_browser.disponible():
                frames = win_browser.captura_demo(
                    prompt, tool, capture_s, (vp[0], vp[1], vp[2]),
                    hold=float(tool.get("prompt_hold", 2.6)))
        except Exception as e:  # noqa: BLE001
            print(f"  aviso: puente Windows no grabó ({e}); intento Chrome de Linux")
            frames = []
    if not frames:
        _ensure_chrome(port, sd.get("profile"))
        frames = asyncio.run(_capture(prompt, tool, capture_s, vp, port))
    _verifica_captura(frames)

    raw = out_path.parent / f"{out_path.stem}_raw.mp4"
    _frames_to_clip(frames, raw)

    # reproducción casi a TIEMPO REAL (para que SÍ se lea): tope max_speed, nunca 2x.
    # si la captura es más larga que dur*max_speed, el -t la recorta (se muestra prompt + inicio de
    # la respuesta, legibles), en vez de acelerarla hasta que no se alcance a leer.
    rawdur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(raw)],
        capture_output=True, text=True, timeout=60).stdout.strip() or dur)
    max_speed = float(sd.get("max_speed", 1.15))
    speed = min(max_speed, max(0.9, rawdur / max(0.5, dur)))
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-i", str(voz_path),
         # setpts = ajusta a la narración; scale+pad = margen lateral para que el chat NO se corte
         # (sin zoom: el zoom recortaba los bordes y cortaba la primera letra de cada línea)
         "-filter:v", (f"setpts=PTS/{speed:.4f},"
                       "scale=1000:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white,"
                       "fps=30,format=yuv420p"),
         "-af", "apad=pad_dur=0.3",
         "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-t", f"{dur:.3f}", str(out_path)],
        check=True, timeout=300)
    raw.unlink(missing_ok=True)
