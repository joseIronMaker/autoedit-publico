"""Series/cursos: Gemini arma el temario y la cola genera un video por lección."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from .model_router import ModelRouter

SERIES_PROMPT = """Eres el diseñador instruccional de José, divulgador de IA en español \
("el traductor de la IA"). Diseña una serie de videos {dur_serie} sobre:
\"\"\"{titulo}\"\"\"

Reglas:
- {n_line}
- Orden pedagógico: de cero a avanzado, cada video construye sobre el anterior.
- Cada video debe funcionar AUTOCONTENIDO (quien lo vea suelto lo entiende) pero \
mencionar que es parte de la serie da continuidad.
- Temas concretos y accionables, no teoría abstracta.

Responde SOLO este JSON:
{{"titulo": "<título de la serie>",
  "items": [{{"tema": "<brief del video, listo para generar>",
              "descripcion": "<1 frase: qué aprende el espectador>"}}]}}"""


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:40] or "serie"


def create_series(titulo: str, n: int | None, cfg: dict, series_dir: Path,
                  modo: str = "corto") -> dict:
    """Genera el temario con Gemini y lo guarda como serie pendiente.

    `n` es OPCIONAL (mandato de José): sin número, la serie dura los videos NECESARIOS
    para cubrir el tema (3–8, lo decide el temario) — jamás relleno ni recortes por una
    cifra fija. `modo` ("corto"/"largo") se guarda en serie.json y se propaga a cada
    video al generar (crecimiento vs monetización).
    """
    dur_serie = ("de formato LARGO (80–110 s cada uno, tema a fondo)" if modo == "largo"
                 else "cortos (~30 s cada uno)")
    n_line = (f"La serie tiene EXACTAMENTE {n} videos."
              if n else
              "El NÚMERO de videos lo decides TÚ: los necesarios para cubrir el tema "
              "COMPLETO (mínimo 3, máximo 8) — ni relleno para alargar ni huecos por "
              "recortar; el tema manda.")
    data = ModelRouter(cfg).generate_json(
        SERIES_PROMPT.format(titulo=titulo, n_line=n_line, dur_serie=dur_serie))
    items = [it for it in (data.get("items") or [])
             if isinstance(it, dict) and it.get("tema")][: (n or 8)]
    if not items:
        raise RuntimeError("Gemini no devolvió temario")

    slug = _slugify(data.get("titulo") or titulo)
    sdir = series_dir / slug
    i = 1
    while sdir.exists():
        sdir = series_dir / f"{slug}_{i}"
        i += 1
    sdir.mkdir(parents=True)

    series = {
        "slug": sdir.name,
        "titulo": data.get("titulo") or titulo,
        "modo": modo if modo in ("corto", "largo") else "corto",
        "items": [{"tema": it["tema"], "descripcion": it.get("descripcion", ""),
                   "status": "pendiente", "video": None} for it in items],
    }
    from .util import write_json_atomic

    write_json_atomic(sdir / "serie.json", series)
    return series
