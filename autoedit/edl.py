from __future__ import annotations

import json
from pathlib import Path

from .model_router import ModelRouter

GEMINI_PROMPT = """Eres el editor de video de José, un divulgador de IA en español. \
Recibes la transcripción de un video hablado a cámara, como lista de palabras numeradas \
con sus tiempos en segundos.

Tu trabajo (estilo CapCut / Submagic):
1. CORTES: identifica rangos de palabras que deben eliminarse del video:
   - muletillas ("eee", "este...", "o sea", "¿no?", "em", "eh") que no aportan
   - falsos comienzos y frases repetidas: si dice lo mismo dos veces, elimina la PEOR toma \
(normalmente la primera) y conserva la mejor. EXCEPCIÓN: una frase CORTA y pulida (≤5 \
palabras, tipo eslogan) que resume lo dicho NO es redundancia — es la TESIS quotable del \
video (a propósito hace eco del desarrollo). JAMÁS la cortes.
   - divagaciones que no aportan al mensaje central
   Sé conservador: ante la duda, NO cortes. Nunca cortes contenido que cambie el significado.
   PROTEGIDO (JAMÁS lo cortes, es estrategia del canal, no divagación): las preguntas \
directas al espectador ("¿X o Y?"), la postura del creador ("yo digo…", "yo prefiero…"), \
los números/cifras, y las promesas de lo que viene ("mañana: …"). Además, los ÚLTIMOS 6 \
segundos del video son el cierre estratégico (pregunta + promesa): ahí SOLO puedes cortar \
silencios, nunca palabras — aunque la transcripción se lea rara (el ASR suele deformar esa \
zona: "Número su ideas" era "¿Números o ideas?").
2. ÉNFASIS: elige las palabras clave que deben resaltarse en los subtítulos \
(máximo ~1 de cada 8 palabras): números, beneficios, nombres de herramientas, palabras de impacto.

Transcripción (índice | inicio–fin | palabra):
{words_table}

Responde SOLO este JSON:
{{
  "cuts": [{{"first_word": <índice>, "last_word": <índice>, "reason": "<motivo corto>"}}],
  "emphasis": [<índices de palabras a resaltar>]
}}
Si no hay nada que cortar, "cuts" va vacío."""


def _merge_intervals(intervals: list[tuple[float, float, str]]) -> list[dict]:
    """Une intervalos solapados conservando el primer motivo."""
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [list(intervals[0])]
    for start, end, reason in intervals[1:]:
        if start <= merged[-1][1] + 0.01:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end, reason])
    return [{"start": round(s, 3), "end": round(e, 3), "reason": r} for s, e, r in merged]


def silence_cuts(transcript: dict, cfg: dict) -> list[tuple[float, float, str]]:
    """Cortes por silencio: huecos largos entre palabras, y colas al inicio/final."""
    ecfg = cfg["edit"]
    pad = ecfg["padding"]
    min_sil = ecfg["min_silence"]
    words = transcript["words"]
    duration = transcript["duration"]
    cuts: list[tuple[float, float, str]] = []
    if not words:
        return cuts

    if words[0]["start"] > min_sil:
        cuts.append((0.0, words[0]["start"] - pad, "silencio inicial"))
    for a, b in zip(words, words[1:]):
        gap = b["start"] - a["end"]
        if gap > min_sil:
            cuts.append((a["end"] + pad, b["start"] - pad, f"silencio de {gap:.1f}s"))
    # COLA FINAL: el corte del silencio final dejaba el video terminando a 0.2 s de la
    # última sílaba y se oía como audio cortado (José, 3-ago-2026: "están cortados los
    # audios"). Se conserva medio segundo de respiro para que la voz y la música cierren.
    # NUNCA se toca el último segundo: generate.py deja 1.0 s de cola en la escena final
    # a propósito. Con cola=0.55 y min_sil=0.45 el umbral daba exactamente 1.0 y el corte
    # entraba o no según el redondeo de whisper — 5 de 8 videos cerraban en seco
    # (medido 8-ago-2026). Con 1.2 el silencio final queda siempre intacto.
    cola = max(pad, 1.2)
    if duration - words[-1]["end"] > min_sil + cola:
        cuts.append((words[-1]["end"] + cola, duration, "silencio final"))
    return cuts


def gemini_cuts(transcript: dict, router: ModelRouter) -> tuple[list[tuple[float, float, str]], list[int]]:
    """Pide a Gemini las decisiones de contenido: muletillas, tomas malas, énfasis."""
    words = transcript["words"]
    table = "\n".join(
        f"{i} | {w['start']:.2f}–{w['end']:.2f} | {w['word']}" for i, w in enumerate(words)
    )
    print("→ Gemini analizando la transcripción (cortes + énfasis)…")
    data = router.generate_json(GEMINI_PROMPT.format(words_table=table))

    cuts: list[tuple[float, float, str]] = []
    n = len(words)
    # REGLA COLD-OPEN: el gancho de los primeros segundos es SAGRADO (métricas 19-jul:
    # arranque flojo = la mitad de la audiencia se va en el segundo 2). Gemini a veces
    # marca el cold-open como "falso comienzo" porque es una frase suelta sin contexto;
    # ese corte se descarta. Los silencios del arranque sí se siguen recortando.
    cold_open_s = 3.5
    for c in data.get("cuts") or []:
        try:
            i, j = int(c["first_word"]), int(c["last_word"])
        except (KeyError, TypeError, ValueError):
            continue  # corte malformado de Gemini: se ignora, no se rompe el job
        if not (0 <= i <= j < n):
            continue
        start = max(0.0, words[i]["start"] - 0.05)
        end = words[j]["end"] + 0.05
        if j + 1 < n:  # no comerse el arranque de la siguiente palabra conservada
            end = min(end, words[j + 1]["start"] - 0.01)
        text = " ".join(w["word"] for w in words[i : j + 1])
        if i == 0 or start < cold_open_s:
            print(f"  ⚠ descartado (cold-open intocable): {c.get('reason', 'corte')}: “{text}”")
            continue
        cuts.append((start, end, f"{c.get('reason', 'corte')}: “{text}”"))

    emphasis = []
    for i in data.get("emphasis") or []:
        try:
            i = int(i)
        except (TypeError, ValueError):
            continue
        if 0 <= i < n:
            emphasis.append(i)
    return cuts, emphasis


def build_edl(transcript: dict, cfg: dict, workdir: Path, use_llm: bool) -> dict:
    """Combina cortes por silencio + cortes de Gemini y escribe edl.json para revisión."""
    cuts = silence_cuts(transcript, cfg)
    emphasis: list[int] = []

    if use_llm:
        router = ModelRouter(cfg)
        llm_cuts, emphasis = gemini_cuts(transcript, router)
        cuts.extend(llm_cuts)
    else:
        print("→ Modo sin LLM: solo cortes por silencio, sin énfasis.")

    duration = transcript["duration"]
    bounded = [(max(0.0, s), min(duration, e), r) for s, e, r in cuts if e - s > 0.05]
    edl = {
        "video": transcript["video"],
        "duration": duration,
        "cuts": _merge_intervals(bounded),
        "emphasis_indices": sorted(set(emphasis)),
    }
    from .util import write_json_atomic

    write_json_atomic(workdir / "edl.json", edl)
    return edl


def print_edl_summary(edl: dict) -> None:
    cut_total = sum(c["end"] - c["start"] for c in edl["cuts"])
    print(f"\nPlan de edición ({len(edl['cuts'])} cortes, −{cut_total:.1f}s "
          f"de {edl['duration']:.1f}s):")
    for c in edl["cuts"]:
        print(f"  ✂ {c['start']:7.2f} → {c['end']:7.2f}  {c['reason']}")
    if edl["emphasis_indices"]:
        print(f"  ★ {len(edl['emphasis_indices'])} palabras enfatizadas en subtítulos")
