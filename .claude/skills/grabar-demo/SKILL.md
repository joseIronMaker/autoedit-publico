---
name: grabar-demo
description: Graba una demo REAL de una herramienta web (ChatGPT, Gemini, generadores de imágenes) en 9:16 para meterla como escena de un video de autoedit. Úsala cuando un video deba mostrar un prompt o una herramienta EN ACCIÓN de verdad (no una animación falsa), o cuando quieras probar/depurar el módulo screen_demo. En 2026 la demo real es "input original" y el formato que crece; el slideshow de foto-IA es "AI slop" que TikTok frena.
---

# Grabar demo real de una herramienta (screen_demo)

## Qué hace
`autoedit/screen_demo.py` maneja Chrome por CDP (Chrome DevTools Protocol), abre la herramienta
en un viewport **9:16**, escribe el prompt real, y graba la pantalla con `Page.startScreencast`.
El clip se **ajusta a la duración de la narración** (normalmente se acelera = demo ágil) y se
muxea la voz → escena 1080×1920 con los MISMOS parámetros de encode que `_render_scene`
(concatenable sin re-encodear).

## Requisitos
- Chrome de **Linux** (`google-chrome`) con `--remote-debugging-port=9222 --user-data-dir=~/.autoedit-chrome`.
  El módulo lo **auto-lanza** si el puerto no responde. En WSL NO usar el Chrome de Windows.
- Herramientas con login (Gemini, ChatGPT logueado): la sesión debe estar en ese perfil.
  ChatGPT funciona **anónimo** (sin login) para demos simples.
- ffmpeg.

## Uso desde el pipeline (automático)
El guion (GUION_PROMPT) ya puede pedir `visual_type: "screen_demo"` con
`{"tool": "chatgpt", "prompt": "<prompt exacto>"}`. `generate.py` lo graba; si falla (muro de
login, Chrome caído), **degrada a la animación "prompt"** sin tumbar el video. Config en
`config.yaml → screen_demo` (`enabled`, `port`, `capture_seconds`, viewport `vw/vh/dsf`).

## Uso directo (probar / depurar)
```python
from autoedit.config import load_config
from autoedit.screen_demo import record_demo
cfg = load_config()
record_demo("<prompt a ejecutar>", voz_path, dur, out_path, cfg, tool_name="chatgpt")
```
POC autónomo (sin voz, solo prueba de captura): `scratchpad/rec_chatgpt.py`.

## Añadir una herramienta nueva
Agrega su selector de input y de botón enviar en `TOOLS` de `screen_demo.py`, o en
`config.yaml → screen_demo.tools.<nombre>`. **Verifica el selector con el navegador MCP primero**
(inspecciona el composer y el botón de enviar reales).

## Gotchas (aprendidos)
- El lector CDP debe ackear cada frame **fire-and-forget** (no `await` a la respuesta del ack)
  o el lector se bloquea (deadlock) y no llegan frames.
- El `list.txt` del concat lleva rutas **ABSOLUTAS** (fixed jul-2026): el demuxer resuelve
  rutas relativas contra el directorio del list, no contra el cwd — con `out_path` relativo
  doblaba la ruta y la captura "fallaba" con frames sanos en disco.
- El módulo puede RELANZAR Chrome: no dejes sesiones del navegador MCP (devtools) abiertas
  durante una captura — chocan y la grabación sale vacía.
- Anti-bot: usar el Chrome real (eventos "trusted") minimiza retos. Si una herramienta pide
  captcha, loguéate a mano una vez en el perfil `~/.autoedit-chrome`.
- La UI (botón "Log in", composer, footer "ChatGPT is AI…") sale en el frame; se puede recortar
  subiendo el `crop` (mejora futura). Por ahora da autenticidad de "es ChatGPT de verdad".
- Cada escena `screen_demo` es en tiempo real (~`capture_seconds` + arranque de Chrome): hace la
  generación más lenta, pero normalmente es 1 escena por video.

Relacionado: skill [formato-viral-2026] (por qué la demo real gana al slop).
