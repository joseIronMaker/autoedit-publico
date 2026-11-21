"""Agente de temas: busca en la web qué pasó en IA y propone temas de video del día."""
from __future__ import annotations

from .model_router import ModelRouter

SEARCH_PROMPT = """Hoy es {fecha}. Busca en la web qué pasó en los últimos 2–3 días en \
inteligencia artificial que le importe al PÚBLICO GENERAL hispanohablante: lanzamientos, \
herramientas nuevas o gratuitas, funciones nuevas en apps que la gente ya usa (WhatsApp, \
Google, ChatGPT, TikTok…), noticias virales o polémicas. Ignora papers técnicos y rondas \
de inversión. Resume 8 hallazgos concretos, cada uno con su fuente."""

STRUCTURE_PROMPT = """Eres el estratega de contenido de José, divulgador de IA en español \
("el traductor de la IA"). A partir de estos hallazgos de hoy:

\"\"\"{summary}\"\"\"

Elige los 5 mejores temas para videos cortos (~30 s). Prioriza lo que la gente normal \
puede USAR hoy o lo que le afecta directamente.

FILTRO DE TRENDS (curso M9 — aplícalo a CADA candidato antes de elegirlo):
1. SENTIDO COMÚN: ¿encaja con un canal educativo de IA de un ingeniero mexicano?
2. PERTINENCIA: ¿conecta con la misión (enseñar IA útil a profesionales de LATAM)? Nada \
forzado ni ajeno a la marca.
3. TIEMPO: ¿el trend está en su PICO? Un trend tardío (>72 h enfriándose) se descarta.
4. CREATIVIDAD: ¿podemos darle un GIRO PROPIO (ángulo de ingeniero, demo real, dato que \
nadie está dando)? Copia idéntica de lo que todos ya dijeron = descartado.

Responde SOLO este JSON:
{{"topics": [{{"tema": "<brief listo para generar el video>",
              "angulo": "<por qué le importa a la gente normal>",
              "hook_tipo": "error|beneficio|secreto|novedad|problema",
              "pilar": "usable|noticia",
              "fuente": "<medio o URL>"}}]}}"""


def find_topics(cfg: dict, fecha: str) -> list[dict]:
    router = ModelRouter(cfg)
    try:
        summary = router.generate_text(SEARCH_PROMPT.format(fecha=fecha), grounded=True)
    except Exception as e:  # noqa: BLE001 — sin búsqueda, Gemini propone desde su conocimiento
        print(f"aviso: búsqueda web falló ({e}); generando temas sin grounding")
        summary = router.generate_text(
            SEARCH_PROMPT.format(fecha=fecha) + "\n(No tienes búsqueda: usa tu conocimiento "
            "de tendencias recientes y márcalo en la fuente como 'sin verificar'.)"
        )
    data = router.generate_json(STRUCTURE_PROMPT.format(summary=summary))
    return [t for t in (data.get("topics") or []) if isinstance(t, dict) and t.get("tema")]
