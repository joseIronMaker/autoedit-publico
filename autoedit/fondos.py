"""Elige el FONDO de cada panel para que dos seguidos nunca se vean igual.

MOTIVO (José, 23-ago-2026: "todos tus videos se ven monótonos"): de los 117 paneles de
los seis videos grabados, 71 —el 61%— eran texto sobre EL MISMO degradado violeta, con
el mismo halo y los mismos puntitos. La causa no era el diseño de cada panel sino que
todos compartían fondo.

Aquí se resuelve con lo que YA está pagado: los 76 clips de `videos/_clips_pagados/`
(catálogo en `catalogo.json`, con `fondo_ok` marcando los que sirven detrás de texto),
las fotos editoriales de Codex ($0) y, cuando no hay material, una trama animada que se
alterna. Nunca se genera un clip nuevo.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / "videos" / "_clips_pagados" / "catalogo.json"
TRAMAS = ["malla", "polvo", "barrido", "ondas"]          # espejo de Fondo.tsx

# Kinds que YA traen su propia imagen a pantalla completa: ponerles fondo sería taparlo.
# Solo los que llenan el panel ENTERO. `plot`, `shot` y `reveal` dejan márgenes y
# tarjetas translúcidas, así que el fondo animado se ve por detrás y les quita el
# congelamiento (medido: la gráfica de temperatura estaba parada 19 s de 19).
CON_IMAGEN_PROPIA = {"photo", "clip", "mosaico"}


def _normaliza(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def carga_catalogo() -> list[dict]:
    if not CATALOGO.exists():
        return []
    return json.loads(CATALOGO.read_text(encoding="utf-8")).get("clips", [])


def _texto_del_panel(spec: dict) -> str:
    """Junta todo el texto visible del panel para buscarle una metáfora en el catálogo."""
    partes: list[str] = []
    for clave in ("lines", "steps", "labels"):
        v = spec.get(clave)
        if isinstance(v, list):
            partes += [str(x) for x in v]
    for clave in ("term", "body", "title", "caption", "label", "kicker", "verdict",
                  "sign_text", "text", "sub"):
        v = spec.get(clave)
        if isinstance(v, str):
            partes.append(v)
    return _normaliza(" ".join(partes))


def _puntua(clip: dict, texto: str) -> int:
    """Cuántas keywords del clip aparecen en el texto del panel."""
    return sum(1 for k in clip.get("keywords", []) if _normaliza(k) in texto)


def asigna_fondos(paneles: list[dict], *, ratio_clip: float = 0.45,
                  catalogo: list[dict] | None = None) -> list[dict]:
    """Devuelve los paneles con un `fondo` puesto donde hace falta.

    `ratio_clip` es el techo de paneles con video de fondo: OffthreadVideo es lo más caro
    del render (la referencia medida del repo son 6.3 fps por beat normal), así que el
    resto va a foto o trama, que cuestan casi nada. Los paneles que ya traen imagen
    propia se dejan intactos.
    """
    clips = [c for c in (catalogo if catalogo is not None else carga_catalogo())
             if c.get("fondo_ok")]
    candidatos = [p for p in paneles
                  if p.get("spec", {}).get("kind") not in CON_IMAGEN_PROPIA
                  and "fondo" not in p.get("spec", {})]
    cupo = int(len(candidatos) * ratio_clip) if clips else 0

    usados: list[str] = []
    ultimo_modo = ""
    i_trama = 0
    puestos = 0

    for panel in paneles:
        spec = panel.get("spec", {})
        if spec.get("kind") in CON_IMAGEN_PROPIA or "fondo" in spec:
            ultimo_modo = "propio"
            continue

        texto = _texto_del_panel(spec)
        elegido = None
        if puestos < cupo and ultimo_modo != "clip":
            # el que más keywords comparte y lleva más tiempo sin usarse. Si NINGUNO pega
            # por metáfora igual se pone uno: probando la tira, las tramas solas se ven
            # tímidas y el video volvía a sentirse plano (José: "más cosas llamativas").
            libres = [c for c in clips if c["file"] not in usados] or clips
            elegido = sorted(libres, key=lambda c: -_puntua(c, texto))[0]

        if elegido is not None:
            spec["fondo"] = {"kind": "fondo", "modo": "clip",
                             "video": f"videos/_clips_pagados/{elegido['file']}",
                             "clip_dur": elegido.get("dur", 4.0),
                             "intensidad": 0.55,
                             "foco": ("centro", "abajo", "arriba")[puestos % 3]}
            usados.append(elegido["file"])
            ultimo_modo = "clip"
            puestos += 1
        else:
            # sin clip que pegue: trama animada, alternando variante para que dos paneles
            # seguidos jamás compartan textura
            spec["fondo"] = {"kind": "fondo", "modo": "trama",
                             "variante": TRAMAS[i_trama % len(TRAMAS)],
                             "seed": f"p{i_trama}"}
            i_trama += 1
            ultimo_modo = "trama"
        panel["spec"] = spec
    return paneles


def diagnostico(paneles: list[dict]) -> str:
    """Una línea con el reparto, para no volver a publicar un video monótono sin verlo."""
    from collections import Counter
    kinds = Counter(p.get("spec", {}).get("kind", "?") for p in paneles)
    modos = Counter((p.get("spec", {}).get("fondo") or {}).get("modo", "propio")
                    for p in paneles)
    racha, mx = 1, 1
    ks = [p.get("spec", {}).get("kind") for p in paneles]
    for a, b in zip(ks, ks[1:]):
        racha = racha + 1 if a == b else 1
        mx = max(mx, racha)
    return (f"{len(paneles)} paneles · kinds {dict(kinds)} · fondos {dict(modos)} · "
            f"racha máxima del mismo kind: {mx}")
