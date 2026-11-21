from __future__ import annotations

import json
from pathlib import Path

from .model_router import ModelRouter

CLIPS_PROMPT = """Eres editor de video especializado en contenido corto (TikTok/Reels). \
Recibes la transcripción de un video largo de José, divulgador de IA en español, como lista \
de palabras numeradas con sus tiempos en segundos.

Propón entre 1 y {max_clips} CLIPS autocontenidos para publicar como videos independientes:
- duración ideal {min_len}–{max_len} segundos
- cada clip debe entenderse SOLO, sin el resto del video
- debe EMPEZAR en una frase con gancho (dato sorprendente, beneficio, pregunta); nunca a \
mitad de una idea
- debe TERMINAR en un cierre natural de la idea
- si el video no da para varios clips buenos, propone menos; calidad sobre cantidad

Transcripción (índice | inicio–fin | palabra):
{words_table}

Responde SOLO este JSON:
{{"clips": [{{"first_word": <índice>, "last_word": <índice>, "title": "<título corto del clip>",
             "hook": "<por qué la primera frase engancha>"}}]}}"""


def propose_clips(transcript: dict, cfg: dict, workdir: Path) -> list[dict]:
    """Pide a Gemini los rangos de clips autocontenidos y los guarda en clips.json."""
    ccfg = cfg["clips"]
    words = transcript["words"]
    table = "\n".join(
        f"{i} | {w['start']:.2f}–{w['end']:.2f} | {w['word']}" for i, w in enumerate(words)
    )
    print("→ Gemini buscando clips autocontenidos…")
    data = ModelRouter(cfg).generate_json(
        CLIPS_PROMPT.format(
            max_clips=ccfg["max_clips"], min_len=ccfg["min_len"],
            max_len=ccfg["max_len"], words_table=table,
        )
    )

    n = len(words)
    clips = []
    for c in data.get("clips") or []:
        try:
            i, j = int(c["first_word"]), int(c["last_word"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (0 <= i < j < n):
            continue
        clips.append({
            "first_word": i, "last_word": j,
            "start": round(max(0.0, words[i]["start"] - 0.15), 3),
            "end": round(words[j]["end"] + 0.25, 3),
            "title": c.get("title", f"clip {len(clips) + 1}"),
            "hook": c.get("hook", ""),
        })

    from .util import write_json_atomic

    write_json_atomic(workdir / "clips.json", {"clips": clips})
    return clips


def print_clips_summary(clips: list[dict]) -> None:
    if not clips:
        print("\nGemini no encontró clips autocontenidos con gancho suficiente.")
        return
    print(f"\nClips propuestos ({len(clips)}):")
    for k, c in enumerate(clips, 1):
        print(f"  ▶ clip{k}: {c['start']:.1f}s–{c['end']:.1f}s "
              f"({c['end'] - c['start']:.0f}s) — {c['title']}")
        print(f"      gancho: {c['hook']}")
