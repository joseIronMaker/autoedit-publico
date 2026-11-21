from __future__ import annotations

import json
from pathlib import Path


def _corrige_vocabulario(words: list[dict], reglas: dict) -> list[dict]:
    """Sustituye secuencias de palabras mal transcritas conservando los tiempos.

    `reglas` es {"a la gente": "al agente", ...}: la clave se compara sin acentos ni
    mayúsculas sobre palabras COMPLETAS, y el reemplazo se reparte proporcionalmente en el
    tramo que ocupaban. Existe porque el error de Whisper cae justo en el término que la
    clase está enseñando y queda QUEMADO en el video (José, 5-sep-2026).
    """
    import unicodedata

    def llano(t: str) -> str:
        t = unicodedata.normalize("NFKD", t.lower())
        return "".join(c for c in t if not unicodedata.combining(c)).strip(" .,;:¿?¡!")

    if not reglas:
        return words
    pares = sorted(((llano(k).split(), v.split()) for k, v in reglas.items()),
                   key=lambda p: -len(p[0]))
    fuera: list[dict] = []
    i = 0
    while i < len(words):
        for mal, bien in pares:
            n = len(mal)
            if [llano(w["word"]) for w in words[i:i + n]] == mal:
                ini, fin = words[i]["start"], words[i + n - 1]["end"]
                paso = (fin - ini) / max(1, len(bien))
                for j, palabra in enumerate(bien):
                    fuera.append({"word": palabra,
                                  "start": round(ini + j * paso, 3),
                                  "end": round(ini + (j + 1) * paso, 3)})
                i += n
                break
        else:
            fuera.append(words[i])
            i += 1
    return fuera


def transcribe(video: Path, workdir: Path, cfg: dict, model_override: str | None = None) -> dict:
    """Transcribe el audio del video con timestamps por palabra (Whisper local)."""
    from faster_whisper import WhisperModel  # import perezoso: tarda en cargar

    wcfg = cfg["whisper"]
    model_name = model_override or wcfg["model"]
    print(f"→ Transcribiendo con Whisper ({model_name}, CPU)…")
    model = WhisperModel(model_name, device="cpu", compute_type=wcfg["compute_type"])
    # VOCABULARIO DEL CANAL: Whisper no conoce los términos que el video está ENSEÑANDO y
    # el error cae justo ahí — "le pido a la gente" por "al agente", "bad propagation" por
    # backpropagation, "toque" por token. `initial_prompt` sesga el decodificador hacia esas
    # palabras sin tocar los tiempos. La lista vive en config (whisper.vocabulario).
    # `initial_prompt` sesga la primera ventana de 30 s y ayuda ("un if con elif" en vez de
    # "un if con el if"). `hotwords` NO se usa: medido sobre la clase 12, se COME palabras
    # —80 contra 138 en el mismo tramo de 50 s— y el corte por silencios se llevó 30 s de
    # narración que Whisper nunca escribió. Lo que garantiza el vocabulario es la corrección
    # determinista de abajo, no el sesgo.
    vocab = wcfg.get("vocabulario") or ""
    segments, info = model.transcribe(
        str(video),
        language=wcfg["language"],
        word_timestamps=True,
        vad_filter=True,
        initial_prompt=vocab or None,
    )

    words: list[dict] = []
    for seg in segments:
        for w in seg.words or []:
            words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})

    # …y aun con el sesgo, lo que NO puede pasar es que el término que el video enseña
    # salga mal en los subtítulos quemados. Las correcciones son deterministas y respetan
    # los tiempos: al fundir dos palabras en una, la nueva abarca de la primera a la última.
    words = _corrige_vocabulario(words, wcfg.get("correcciones") or {})

    transcript = {
        "video": str(video),
        "language": info.language,
        "duration": round(info.duration, 3),
        "text": " ".join(w["word"] for w in words),
        "words": words,
    }
    from .util import write_json_atomic

    out = workdir / "transcript.json"
    write_json_atomic(out, transcript)
    print(f"  {len(words)} palabras, {transcript['duration']:.1f}s → {out}")
    return transcript
