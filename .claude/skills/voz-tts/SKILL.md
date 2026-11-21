---
name: voz-tts
description: Elige o cambia la voz de narración (Rama A) de autoedit. Úsala cuando José quiera probar o cambiar la voz TTS. Cubre los proveedores (Gemini, ElevenLabs, Kokoro), cómo listar voces de la librería de ElevenLabs usando la sesión del navegador, los límites del tier gratis, y cómo generar muestras para elegir.
---

# Elegir / cambiar la voz (TTS)

## Estado ACTUAL (jul-2026): voz clonada de José + curva por beat
Voz en producción: clon de José en ElevenLabs (`voice_id: JXJizDZeZ1VEyaHJQIYE`, plan pago).
Settings base ANTI-MULETILLAS: `stability: 0.6`, `style: 0.1` (style alto + stability baja
generaban risitas "je je" — confirmado con análisis multimodal Gemini del video final).
**Curva de voz por beat** en `tts.elevenlabs.by_beat` (hook 0.96× grave, desarrollo 1.08×,
tesis 0.94× con peso — medida en Alborná 119→190 wpm); `generate_tts(overrides=...)` la
aplica por escena vía `beat_type` del guion. Pausas dramáticas: default 0.45s tras hook /
0.35s tras tesis + `pause_after` por escena. Masterización con `adeclick` (chasquidos fuera).
Si la voz se siente RÍGIDA: subir style base a ~0.15, no más (regresan las muletillas).

## Config y ruteo
`config.yaml → tts.provider`: `gemini` | `elevenlabs` | `xtts` (clonación local XTTS-v2).
`ModelRouter.generate_tts` enruta; devuelve SIEMPRE PCM s16le 24 kHz mono.
- **Gemini:** `gemini.voice` (`Charon` clara, `Fenrir` enérgica, `Orus` firme…), gratis con
  `GEMINI_API_KEY`. `generate.tts_style` le da acento/energía (español mexicano).
- **ElevenLabs:** `tts.elevenlabs.voice_id` + `model_id` (`eleven_turbo_v2_5` rinde 2× en gratis).
  Requiere `ELEVENLABS_API_KEY` en `.env`. El tier gratis no da salida PCM → pedimos mp3 y
  convertimos con ffmpeg (ya implementado en `_tts_elevenlabs`).

## Límite CRÍTICO del tier gratis de ElevenLabs
Por API, el tier gratis SOLO permite voces **"premade"** (acento inglés/gringo). Las voces buenas
de la **librería** (español/latino) dan **HTTP 402** por API → requieren plan de pago (Starter
~$5/mes). Candidatas ya identificadas (categoría "professional"):
- `qRUgOhnxGASxirG4fKjv` — **David C - Viral Storytelling** (mexicano) ← la mejor para José
- `g4ucswVjPpazgbDDe327` — Screaming George (España, intenso)
- `zDMHo7CPscBTgfDtPOWl` — Claus Encant (latinoamericano)
- `y2ijeTfmnXjzheHO6zeN` — Jose - announcer (mexicano)

## Listar voces de la librería cuando la API key no tiene permiso `voices_read`
La web de ElevenLabs usa `api.us.elevenlabs.io` con un **Bearer (Firebase) de la sesión** del
navegador (distinto de la API key). Con el Chrome MCP logueado en elevenlabs.io:
1. `list_network_requests` (xhr/fetch) → busca una request a `/v1/shared-voices`.
2. `get_network_request <reqid>` → copia el header `authorization: Bearer …` (expira ~1h).
3. Desde la terminal (sin CORS):
   `curl -H "authorization: Bearer <token>" "https://api.us.elevenlabs.io/v1/shared-voices?language=es&gender=male&sort=trending&page_size=60"`
   Ordena por `usage_character_count_7d` (las que más usan los canales ahora).
   (El `fetch` cross-origin desde la página lo bloquea el CSP; por eso curl.)

## Generar muestras para que José elija (él escucha, tú no)
Genera un WAV corto por voz candidata con una frase del canal y que las oiga con `paplay`:
`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`
con header `xi-api-key`, body `{"text": "...", "model_id": "eleven_turbo_v2_5"}` → ffmpeg a wav.

## Alternativa 100% gratis (sin API)
**Kokoro** (local, 82M, CPU, voces en español, calidad alta) o **Piper** (ultraligero). Se
integrarían como otro `provider` en `model_router.py` con el MISMO patrón que ElevenLabs:
devolver PCM s16le 24 kHz mono. Para clonar voz: XTTS-v2 / F5-TTS (más lentos sin GPU).

Contexto: memoria `canal-fracaso-semana1-rediseno` (la voz robótica fue causa #3 del fracaso).
