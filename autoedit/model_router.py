from __future__ import annotations

import json
import os
from pathlib import Path

USAGE_PATH = Path(__file__).resolve().parent.parent / "usage.jsonl"

# $/1M tokens (texto y audio TTS), $/imagen y $/clip de música; sobreescribibles en
# config gemini.prices ("music" queda en 0 hasta que Google publique precio del preview)
DEFAULT_PRICES = {"text_in": 0.30, "text_out": 2.50, "tts_audio_out": 20.0, "image": 0.039,
                  "music": 0.0}

# masterización tipo LOCUTOR/radio: quita rumble, compacta la dinámica, da presencia y nivela
_MASTER_FILTER = (
    "adeclick,"                             # chasquidos/ruidos de boca fuera
    "highpass=f=80,"
    "acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=2,"
    "equalizer=f=220:t=q:w=1.2:g=-2,"       # menos 'caja'/boxiness
    "equalizer=f=5500:t=q:w=1.4:g=2.5,"     # presencia y aire (claridad de locutor)
    "loudnorm=I=-16:TP=-1.5:LRA=11")


class ModelRouter:
    """Única puerta de entrada a modelos LLM. Versión pineada en config + fallbacks.

    Regla del plan maestro: ningún nombre de modelo se hardcodea fuera de config.yaml.
    """

    def __init__(self, cfg: dict):
        self.cfg = cfg["gemini"]
        self.tts_cfg = cfg.get("tts") or {}   # proveedor de voz (elevenlabs | gemini | xtts)
        self._client = None
        self._xtts = None                     # modelo XTTS cacheado (carga perezosa, 1 vez por video)

    @property
    def available(self) -> bool:
        return bool(os.environ.get("GEMINI_API_KEY"))

    def _get_client(self):
        if self._client is None:
            from google import genai  # import perezoso

            self._client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        return self._client

    def _prices(self) -> dict:
        return {**DEFAULT_PRICES, **(self.cfg.get("prices") or {})}

    def _log_usage(self, kind: str, model: str, in_tok: int, out_tok: int, cost: float) -> None:
        """Registro de costo real por llamada en usage.jsonl (nunca tumba nada)."""
        try:
            from datetime import datetime

            rec = {"ts": datetime.now().isoformat(timespec="seconds"), "kind": kind,
                   "model": model, "in_tokens": in_tok, "out_tokens": out_tok,
                   "cost_usd": round(cost, 6)}
            with USAGE_PATH.open("a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        except Exception:  # noqa: BLE001
            pass

    def _log_text_usage(self, kind: str, model: str, resp) -> None:
        p = self._prices()
        u = getattr(resp, "usage_metadata", None)
        in_tok = getattr(u, "prompt_token_count", 0) or 0
        out_tok = getattr(u, "candidates_token_count", 0) or 0
        self._log_usage(kind, model, in_tok, out_tok,
                        (in_tok * p["text_in"] + out_tok * p["text_out"]) / 1e6)

    def generate_text(self, prompt: str, grounded: bool = False) -> str:
        """Genera texto libre; con grounded=True usa la búsqueda de Google de Gemini."""
        from google.genai import types

        client = self._get_client()
        models = [self.cfg["model"], *self.cfg.get("fallbacks", [])]
        last_err: Exception | None = None
        for model in models:
            try:
                config = types.GenerateContentConfig(
                    temperature=self.cfg.get("temperature", 0.3),
                    tools=[types.Tool(google_search=types.GoogleSearch())] if grounded else None,
                )
                resp = client.models.generate_content(model=model, contents=prompt, config=config)
                if resp.text:
                    self._log_text_usage("text", model, resp)
                    return resp.text
                raise RuntimeError("respuesta vacía")
            except Exception as e:  # noqa: BLE001
                last_err = e
                print(f"  aviso: {model} falló ({e}); probando fallback…")
        raise RuntimeError(f"Todos los modelos fallaron. Último error: {last_err}")

    def generate_tts(self, text: str, style: str = "",
                     overrides: dict | None = None) -> bytes:
        """Genera voz (PCM s16le 24 kHz mono). Proveedor elegible en config `tts.provider`:
        'elevenlabs' (voz natural, recomendado) o 'gemini'. El resto del pipeline es idéntico.

        ``overrides``: ajustes de entrega por llamada (speed/stability/style) — la CURVA DE
        VOZ por beat del guion (hook lento y grave, desarrollo ágil, tesis con peso)."""
        provider = (self.tts_cfg.get("provider") or "gemini").lower()
        if provider == "elevenlabs":
            # sin fallback silencioso a Gemini: la calidad de voz es el objetivo, un error
            # debe verse (revisar ELEVENLABS_API_KEY / voice_id), no degradar a voz robótica.
            return self._tts_elevenlabs(text, overrides)
        if provider == "xtts":
            return self._tts_xtts(text)       # clonación local (XTTS-v2)
        return self._tts_gemini(text, style)

    def generate_tts_batch(self, texts: list[str], style: str = "") -> list[bytes]:
        """Sintetiza TODAS las narraciones del video en UNA sola petición y las parte por
        la alineación de caracteres que devuelve ElevenLabs.

        Por qué: pedir una escena por petición reinicia la entonación en frío 6 veces por
        video — es la causa audible de que la voz suene "de robot" aunque el timbre sea el
        de José. En una toma la prosodia es continua y las frases encadenan.

        Contrapartida: la curva `by_beat` (speed/style por beat) NO se puede aplicar dentro
        de una toma; el peso de hook y tesis se consigue con `pause_after` y la escritura.
        Si algo no cuadra (proveedor distinto, alineación rara) degrada a una petición por
        escena, que siempre funciona."""
        ec = self.tts_cfg.get("elevenlabs") or {}
        provider = (self.tts_cfg.get("provider") or "gemini").lower()
        if provider != "elevenlabs" or not ec.get("single_take") or len(texts) < 2:
            return [self.generate_tts(t, style) for t in texts]
        try:
            return self._tts_elevenlabs_batch(texts, ec)
        except Exception as e:  # noqa: BLE001 — la voz nunca debe bloquear el render
            print(f"  aviso: toma única falló ({e}); sintetizo escena por escena")
            return [self.generate_tts(t, style) for t in texts]

    def _tts_elevenlabs_batch(self, texts: list[str], ec: dict) -> list[bytes]:
        import base64
        import urllib.error
        import urllib.request

        if os.environ.get("AUTOEDIT_TRACE_TTS"):
            import traceback
            print("### TTS BATCH desde:\n" + "".join(traceback.format_stack()[-6:-1]), flush=True)

        key = os.environ.get("ELEVENLABS_API_KEY")
        if not key:
            raise RuntimeError("ELEVENLABS_API_KEY no está en .env")
        voice_id = ec.get("voice_id")
        if not voice_id:
            raise RuntimeError("falta tts.elevenlabs.voice_id en config.yaml")
        # separador de dos espacios: no lo pronuncia y sobrevive a la normalización
        sep = "  "
        joined = sep.join(t.strip() for t in texts)
        out_fmt = ec.get("output_format", "mp3_44100_128")
        model_id = ec.get("model_id", "eleven_multilingual_v2")
        settings = {
            "stability": ec.get("stability", 0.4),
            "similarity_boost": ec.get("similarity_boost", 0.8),
            "use_speaker_boost": ec.get("speaker_boost", True),
        }
        if not model_id.startswith("eleven_v3"):   # v3 no acepta style ni speed
            settings["style"] = ec.get("style", 0.35)
            if ec.get("speed"):
                settings["speed"] = ec["speed"]
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            f"/with-timestamps?output_format={out_fmt}",
            data=json.dumps({"text": joined, "model_id": model_id,
                             "voice_settings": settings}).encode("utf-8"),
            method="POST",
            headers={"xi-api-key": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                payload = json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise RuntimeError(
                f"ElevenLabs HTTP {e.code}: {e.read().decode('utf-8', 'ignore')[:300]}") from e

        al = payload.get("alignment") or {}
        chars = "".join(al.get("characters") or [])
        starts = al.get("character_start_times_seconds") or []
        ends = al.get("character_end_times_seconds") or []
        if len(chars) != len(joined) or len(starts) != len(chars):
            raise RuntimeError("la alineación no coincide con el texto enviado")

        af = ec.get("master_filter") if ec.get("master", False) else ""
        if ec.get("master", False) and not af:
            af = _MASTER_FILTER
        pcm = self._to_pcm24(base64.b64decode(payload["audio_base64"]), out_fmt, af)

        # cortes: cada escena termina donde EMPIEZA la siguiente, así no se pierde audio
        bounds, pos = [], 0
        for t in texts:
            bounds.append((pos, pos + len(t.strip())))
            pos += len(t.strip()) + len(sep)
        total = len(pcm) // 2 / 24000.0
        cuts = [0.0]
        for i in range(1, len(bounds)):
            cuts.append(min(starts[bounds[i][0]], total))
        cuts.append(total)

        segs = []
        for i in range(len(texts)):
            a = int(cuts[i] * 24000) * 2
            b = int(cuts[i + 1] * 24000) * 2
            segs.append(pcm[a:b])
        price_1k = float(ec.get("price_per_1k_chars", 0.0))
        self._log_usage("tts", f"elevenlabs:{model_id}:toma_unica", len(joined),
                        int(len(pcm) / 2 / 24000 * 25), len(joined) / 1000 * price_1k)
        print(f"  voz: 1 toma de {total:.1f}s partida en {len(texts)} escenas "
              f"(prosodia continua, modelo {model_id})")
        return segs

    def _tts_gemini(self, text: str, style: str = "") -> bytes:
        """TTS de Gemini (voz prebuilt). Modelo pineado en config + fallbacks."""
        from google.genai import types

        client = self._get_client()
        models = [self.cfg["tts_model"], *self.cfg.get("tts_fallbacks", [])]
        last_err: Exception | None = None
        for model in models:
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents=f"{style} {text}".strip(),
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                    voice_name=self.cfg.get("voice", "Puck")
                                )
                            )
                        ),
                    ),
                )
                pcm = resp.candidates[0].content.parts[0].inline_data.data
                p = self._prices()
                audio_tok = int(len(pcm) / 2 / 24000 * 25)  # 25 tokens por segundo
                self._log_usage("tts", model, len(text) // 4, audio_tok,
                                audio_tok * p["tts_audio_out"] / 1e6)
                return pcm
            except Exception as e:  # noqa: BLE001 — probar siguiente fallback
                last_err = e
                print(f"  aviso: TTS {model} falló ({e}); probando fallback…")
        raise RuntimeError(f"Todos los modelos TTS fallaron. Último error: {last_err}")

    def _tts_elevenlabs(self, text: str, overrides: dict | None = None) -> bytes:
        """TTS de ElevenLabs → PCM s16le 24 kHz mono (normalizado con ffmpeg).
        El tier gratis NO permite salida PCM directa: pedimos mp3 y lo convertimos."""
        import urllib.error
        import urllib.request

        ec = {**(self.tts_cfg.get("elevenlabs") or {}), **(overrides or {})}
        key = os.environ.get("ELEVENLABS_API_KEY")
        if not key:
            raise RuntimeError(
                "ELEVENLABS_API_KEY no está en .env (voz ElevenLabs activada en config.yaml)")
        voice_id = ec.get("voice_id")
        if not voice_id:
            raise RuntimeError("falta tts.elevenlabs.voice_id en config.yaml")
        out_fmt = ec.get("output_format", "mp3_44100_128")
        model_id = ec.get("model_id", "eleven_turbo_v2_5")
        settings = {
            "stability": ec.get("stability", 0.4),
            "similarity_boost": ec.get("similarity_boost", 0.8),
            "use_speaker_boost": ec.get("speaker_boost", True),
        }
        # eleven_v3 rechaza style y speed (400): su expresividad va toda en `stability`
        # (0.0 creativo · 0.5 natural · 1.0 robusto). La curva by_beat no aplica ahí.
        if not model_id.startswith("eleven_v3"):
            settings["style"] = ec.get("style", 0.35)
            if ec.get("speed"):
                settings["speed"] = ec["speed"]
        body = json.dumps(
            {"text": text, "model_id": model_id, "voice_settings": settings}
        ).encode("utf-8")
        url = (f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
               f"?output_format={out_fmt}")
        req = urllib.request.Request(url, data=body, method="POST", headers={
            "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                audio = r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")[:300]
            raise RuntimeError(f"ElevenLabs HTTP {e.code}: {detail}") from e
        # masterización tipo LOCUTOR/radio: quita rumble, compacta la dinámica, da presencia y nivela
        af = ""
        if ec.get("master", False):
            af = ec.get("master_filter") or _MASTER_FILTER
        pcm = self._to_pcm24(audio, out_fmt, af)
        # ElevenLabs cobra por caracteres (no tokens); registra el costo si defines el precio del plan
        price_1k = float(ec.get("price_per_1k_chars", 0.0))
        self._log_usage("tts", f"elevenlabs:{model_id}", len(text),
                        int(len(pcm) / 2 / 24000 * 25), len(text) / 1000 * price_1k)
        return pcm

    @staticmethod
    def _to_pcm24(audio: bytes, out_fmt: str, af: str = "") -> bytes:
        """Normaliza el audio de ElevenLabs a PCM s16le 24 kHz mono. Con `af` aplica un filtro
        de audio (masterización tipo locutor) durante la conversión."""
        if out_fmt == "pcm_24000" and not af:
            return audio                     # ya es el formato correcto, sin masterizar
        import subprocess

        cmd = ["ffmpeg", "-v", "error"]
        if out_fmt == "pcm_24000":
            cmd += ["-f", "s16le", "-ar", "24000", "-ac", "1"]   # la entrada ya es PCM crudo
        cmd += ["-i", "pipe:0"]
        if af:
            cmd += ["-af", af]
        cmd += ["-f", "s16le", "-acodec", "pcm_s16le", "-ar", "24000", "-ac", "1", "pipe:1"]
        r = subprocess.run(cmd, input=audio, capture_output=True, check=True, timeout=120)
        return r.stdout

    def _get_xtts(self, model_name: str):
        """Carga XTTS-v2 una sola vez (CPU si no hay GPU). ~1.8 GB en la primera descarga."""
        if self._xtts is None:
            os.environ.setdefault("COQUI_TOS_AGREED", "1")   # acepta la licencia CPML (descarga)
            from TTS.api import TTS  # import perezoso (dependencia pesada)

            self._xtts = TTS(model_name)
        return self._xtts

    def _tts_xtts(self, text: str) -> bytes:
        """CLONA la voz de un wav de referencia con XTTS-v2 (local, gratis, offline).
        Devuelve PCM s16le 24 kHz mono (sample rate nativo de XTTS)."""
        import numpy as np

        xc = self.tts_cfg.get("xtts") or {}
        ref = xc.get("speaker_wav")
        if not ref or not Path(ref).exists():
            raise RuntimeError(
                f"falta la muestra de voz de referencia (tts.xtts.speaker_wav={ref!r}); "
                "graba ~30s de audio limpio de TU voz y ponlo ahí")
        model = self._get_xtts(xc.get("model", "tts_models/multilingual/multi-dataset/xtts_v2"))
        kw = {"text": text, "speaker_wav": ref, "language": xc.get("language", "es")}
        speed = float(xc.get("speed", 1.0))
        try:
            wav = model.tts(**kw, speed=speed) if speed != 1.0 else model.tts(**kw)
        except TypeError:      # versiones de XTTS sin parámetro speed
            wav = model.tts(**kw)
        arr = np.clip(np.asarray(wav, dtype=np.float32), -1.0, 1.0)
        pcm = (arr * 32767.0).astype("<i2").tobytes()
        self._log_usage("tts", "xtts_v2", len(text), int(len(pcm) / 2 / 24000 * 25), 0.0)
        return pcm

    def generate_image(self, prompt: str, reference_images: list[bytes] | None = None) -> bytes:
        """Genera una imagen (bytes PNG/JPEG). Pide 9:16; si el SDK no lo soporta, sin ratio.
        reference_images: imágenes de referencia (ej. ancla de estilo) para cohesión de marca."""
        from google.genai import types

        client = self._get_client()
        refs = [types.Part.from_bytes(data=b, mime_type="image/png")
                for b in (reference_images or []) if b]
        contents = ([*refs, prompt] if refs else prompt)
        models = [self.cfg["image_model"], *self.cfg.get("image_fallbacks", [])]
        last_err: Exception | None = None
        for model in models:
            for config in (
                types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio="9:16"),
                ),
                types.GenerateContentConfig(response_modalities=["IMAGE"]),
            ):
                try:
                    resp = client.models.generate_content(
                        model=model, contents=contents, config=config
                    )
                    for part in resp.candidates[0].content.parts:
                        data = getattr(part, "inline_data", None)
                        if data and data.mime_type.startswith("image/"):
                            self._log_usage("image", model, 0, 0, self._prices()["image"])
                            return data.data
                    raise RuntimeError("la respuesta no trajo imagen")
                except Exception as e:  # noqa: BLE001
                    last_err = e
            print(f"  aviso: imagen {model} falló ({last_err}); probando fallback…")
        raise RuntimeError(f"Todos los modelos de imagen fallaron. Último error: {last_err}")

    def generate_music(self, prompt: str) -> bytes:
        """Genera un clip de música instrumental (bytes mp3, ~30s) con Lyria 3.

        Lyria responde por generateContent normal: part[0] = tag de texto
        ('<instrumental>'), part[1] = inline_data audio/mpeg. Modelo pineado en
        config ``gemini.music_model`` + fallbacks (regla: nombres solo en config).
        """
        from google.genai import types

        client = self._get_client()
        models = [m for m in
                  [self.cfg.get("music_model"), *self.cfg.get("music_fallbacks", [])] if m]
        if not models:
            raise RuntimeError("falta gemini.music_model en config.yaml")
        last_err: Exception | None = None
        for model in models:
            try:
                resp = client.models.generate_content(
                    model=model, contents=prompt,
                    config=types.GenerateContentConfig(response_modalities=["AUDIO"]),
                )
                for part in (resp.candidates[0].content.parts or []):
                    d = getattr(part, "inline_data", None)
                    if d and d.data and str(d.mime_type or "").startswith("audio/"):
                        p = self._prices()
                        self._log_usage("music", model, 0, 0, p.get("music", 0.0))
                        return d.data
                raise RuntimeError("la respuesta no trajo audio")
            except Exception as e:  # noqa: BLE001 — probar siguiente fallback
                last_err = e
                print(f"  aviso: música {model} falló ({e}); probando fallback…")
        raise RuntimeError(f"Todos los modelos de música fallaron. Último error: {last_err}")

    def generate_video_clip(self, prompt: str, out_path: Path, seconds: int = 4) -> Path:
        """Genera un clip de VIDEO 9:16 con Veo (Gemini) — mandato de José: video generado
        integrado al hook. Es una long-running operation: se sondea hasta terminar (tope 5
        min). Modelos pineados en config ``gemini.video_model`` + fallbacks. Devuelve la
        ruta al mp4. SOLO para conceptos/metáforas (regla de realidad: jamás productos
        reales en video IA)."""
        import time as _t

        from google.genai import types

        client = self._get_client()
        models = [m for m in
                  [self.cfg.get("video_model"), *self.cfg.get("video_fallbacks", [])] if m]
        if not models:
            raise RuntimeError("falta gemini.video_model en config.yaml")
        last_err: Exception | None = None
        for model in models:
            try:
                if "veo" in model.lower():
                    data = self._video_veo(client, types, model, prompt, seconds)
                else:
                    # Gemini Omni (jul-2026): omni-modelo con salida de video NATIVA por
                    # generateContent — mismo patrón que Lyria (inline_data en las parts)
                    data = self._video_omni(client, types, model, prompt, seconds)
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_bytes(data)
                self._log_usage("video", model, 0, 0, self._prices().get("video", 0.0))
                return out_path
            except Exception as e:  # noqa: BLE001 — probar siguiente fallback
                last_err = e
                print(f"  aviso: video {model} falló ({e}); probando fallback…")
        raise RuntimeError(f"Todos los modelos de video fallaron. Último error: {last_err}")

    @staticmethod
    def _video_omni(client, types, model: str, prompt: str, seconds: int) -> bytes:
        """Gemini Omni (Interactions API, jul-2026 — VALIDADO): create con response_format
        video 9:16 + duración; el mp4 llega en ``interaction.output_video`` (base64 inline).
        Suele completar síncrono; si queda in_progress se sondea hasta 7 min."""
        import base64
        import time as _t
        import urllib.request

        it = client.interactions.create(
            model=model, input=prompt,
            response_format={"type": "video", "aspect_ratio": "9:16",
                             "duration": f"{seconds}s", "delivery": "inline"})
        t0 = _t.time()
        while getattr(it, "status", "") == "in_progress":
            if _t.time() - t0 > 420:
                raise RuntimeError("timeout de 7 min esperando a Omni")
            _t.sleep(8)
            it = client.interactions.get(it.id)
        if getattr(it, "status", "") != "completed":
            raise RuntimeError(f"interacción Omni terminó en '{getattr(it, 'status', '?')}'")
        v = getattr(it, "output_video", None)
        if v is None:
            raise RuntimeError("la interacción no trajo output_video")
        if getattr(v, "data", None):
            return base64.b64decode(v.data) if isinstance(v.data, str) else v.data
        if getattr(v, "uri", None):
            import os

            req = urllib.request.Request(
                v.uri, headers={"x-goog-api-key": os.environ.get("GEMINI_API_KEY", "")})
            return urllib.request.urlopen(req, timeout=180).read()
        raise RuntimeError("output_video sin data ni uri")

    @staticmethod
    def _video_veo(client, types, model: str, prompt: str, seconds: int) -> bytes:
        """Veo 3.1: predictLongRunning (se sondea la operación hasta 5 min)."""
        import time as _t

        last_err: Exception | None = None
        for config in (
            types.GenerateVideosConfig(aspect_ratio="9:16", duration_seconds=seconds),
            types.GenerateVideosConfig(aspect_ratio="9:16"),
            None,
        ):
            try:
                op = (client.models.generate_videos(model=model, prompt=prompt,
                                                    config=config)
                      if config is not None else
                      client.models.generate_videos(model=model, prompt=prompt))
                t0 = _t.time()
                while not op.done:
                    if _t.time() - t0 > 300:
                        raise RuntimeError("timeout de 5 min esperando a Veo")
                    _t.sleep(8)
                    op = client.operations.get(op)
                if getattr(op, "error", None):
                    raise RuntimeError(f"operación Veo con error: {op.error}")
                vids = getattr(op.response, "generated_videos", None) or []
                if not vids:
                    raise RuntimeError("la operación no trajo videos")
                video = vids[0].video
                client.files.download(file=video)
                data = getattr(video, "video_bytes", None)
                if not data:
                    raise RuntimeError("el video no trajo bytes")
                return data
            except Exception as e:  # noqa: BLE001 — probar siguiente config
                last_err = e
                if "not found" in str(e).lower() or "permission" in str(e).lower():
                    break  # sin acceso al modelo: no quemar más intentos
        raise RuntimeError(str(last_err))

    def generate_json(self, prompt: str, images: list[bytes] | None = None) -> dict:
        """Genera una respuesta JSON (opcionalmente evaluando imágenes).
        Prueba el modelo pineado y luego los fallbacks."""
        client = self._get_client()
        if images:
            from google.genai import types

            contents = [types.Part.from_bytes(data=b, mime_type="image/jpeg")
                        for b in images] + [prompt]
        else:
            contents = prompt
        models = [self.cfg["model"], *self.cfg.get("fallbacks", [])]
        last_err: Exception | None = None
        for model in models:
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config={
                        "temperature": self.cfg.get("temperature", 0.3),
                        "response_mime_type": "application/json",
                    },
                )
                data = json.loads(resp.text)
                self._log_text_usage("json", model, resp)
                return data
            except json.JSONDecodeError as e:
                last_err = e
                # respuesta no-JSON: reintenta una vez con instrucción explícita
                strict = "\n\nResponde ÚNICAMENTE con el objeto JSON, sin texto adicional."
                resp = client.models.generate_content(
                    model=model,
                    contents=(contents[:-1] + [contents[-1] + strict]) if images else prompt + strict,
                    config={"temperature": 0, "response_mime_type": "application/json"},
                )
                try:
                    return json.loads(resp.text)
                except json.JSONDecodeError as e2:
                    last_err = e2
            except Exception as e:  # modelo deprecado/no disponible → siguiente fallback
                last_err = e
                print(f"  aviso: {model} falló ({e}); probando fallback…")
        raise RuntimeError(f"Todos los modelos fallaron. Último error: {last_err}")
