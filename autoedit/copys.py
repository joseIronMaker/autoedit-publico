from __future__ import annotations

import json
import re
from pathlib import Path

from .model_router import ModelRouter

COPY_PROMPT = """Eres el community manager de José, divulgador de IA en español para público \
general (LATAM). Su posicionamiento: "el traductor de la IA", el ingeniero que convierte lo de \
frontera en algo que cualquiera puede usar hoy.

Transcripción del video que se va a publicar:
\"\"\"{text}\"\"\"

REGLA DE LAS 3 PRIMERAS LÍNEAS (el 73% decide interactuar leyendo SOLO eso, antes del "ver
más"): línea 1 = gancho poderoso con la keyword; línea 2 = refuerzo del concepto clave;
línea 3 = curiosidad que hace seguir leyendo. Nada importante después de la línea 3.

CTA IMPLÍCITO (TikTok penaliza el CTA directo — dato del curso: −15% engagement): PROHIBIDO
en cualquier copy los imperativos de plataforma ("guarda", "sígueme", "comenta", "dale like",
"toca ver más", "compártelo"). El guardado se provoca con utilidad futura ("esto lo vas a
necesitar el día que…"); el comentario, con la pregunta A-o-B + POSTURA propia ("Yo digo que
X."); el follow, con lo que viene mañana. La acción se INSINÚA, nunca se ordena.

Genera el copy para cada red siguiendo EXACTAMENTE estas plantillas:

- tiktok → [keyword + beneficio en 1 línea] + [micro-cómo] + [pregunta BINARIA A-o-B que se \
responda en UNA palabra] + 3–5 hashtags. La keyword principal debe aparecer en los primeros \
150 caracteres. ALINEACIÓN SEO: la keyword y los hashtags deben usar las MISMAS palabras que \
se DICEN en el video (TikTok cruza transcript↔caption↔hashtags; la alineación sube el alcance \
30–60%). Mezcla de hashtags: 1 de nicho específico + 2–3 medios + 1 masivo — jamás más de 5.
- instagram → [reframe/hook] + [valor concreto] + [utilidad futura que provoca guardar: \
"para cuando te toque…"] + [a quién le serviría: "el amigo que sigue haciendo X lo \
necesita"] + [pregunta con postura] + 3–5 hashtags.
- facebook → [problema relatable] + [POV de experto en primera persona] + [valor] + \
[pregunta abierta que genere conversación] + 1–2 hashtags.
- tiktok_gate → variante RETO del copy de TikTok: mismo gancho, pero el cierre anuncia un \
JUEGO sin imperativos: "El primero que escriba '<PALABRA>' se lleva <recurso concreto del \
video: el prompt, la lista, la guía>". La PALABRA va en MAYÚSCULAS, corta y ligada al tema. \
(Los comentarios disparan el alcance; se publica UNA de las dos variantes por video, como \
experimento.)

Tono: cercano, primera persona, sin sonar a robot ni a vendedor. Español neutro LATAM.
LOOP CAPTION↔VIDEO: si la última frase del video plantea algo (pregunta, sentencia, reto), \
la PRIMERA línea del copy de TikTok la RESPONDE o la remata (ej.: el video termina "acepto \
mi sentencia" → caption "Me declaro culpable."). Eso convierte el copy en el cierre del video.
{handle_line}

Responde SOLO este JSON:
{{"keyword": "<keyword principal del video>", "tiktok": "...", "tiktok_gate": "...", \
"instagram": "...", "facebook": "..."}}"""


_COERCIVOS = re.compile(
    r"\b(gu[aá]rdal[oa]|guarda\s+est[eoa]|s[ií]guem[e]|dale\s+like|comp[aá]rtel[oa]|"
    r"toca\s+(aqu[ií]|.ver m[aá]s.)|comenta\s+['\"“])", re.I)

_REPAIR = """Estos copys contienen imperativos de plataforma prohibidos (TikTok penaliza el \
CTA directo). Reescríbelos SOLO donde haga falta, en implícito: guardado → utilidad futura; \
follow → lo que viene mañana; comentario → pregunta con postura ("Yo digo que X"); el reto \
del gate se anuncia como juego ("el primero que escriba X se lleva Y"). Mantén longitud, \
hashtags y todo lo demás igual. Copys:
{copys}
Responde SOLO el MISMO JSON con las mismas claves."""


def generate_copys(text: str, router: ModelRouter, handle: str = "") -> dict:
    handle_line = (f"El canal es {handle}: menciónalo con naturalidad cuando aporte "
                   f"(sin pedir el follow)." if handle else "")
    copys = router.generate_json(COPY_PROMPT.format(text=text, handle_line=handle_line))
    # red de seguridad CTA implícito: un slip del modelo no llega a publicarse
    con_imperativo = {k: v for k, v in copys.items()
                      if isinstance(v, str) and _COERCIVOS.search(v)}
    if con_imperativo:
        try:
            fixed = router.generate_json(_REPAIR.format(
                copys=json.dumps(copys, ensure_ascii=False)))
            for k, v in fixed.items():
                if isinstance(v, str) and v.strip() and not _COERCIVOS.search(v):
                    copys[k] = v
        except Exception as e:  # noqa: BLE001
            print(f"  aviso: reparación de copys falló ({e}); quedan los originales")
    return copys


def write_copys_md(copys: dict, out_path: Path, title: str = "") -> Path:
    from .util import write_json_atomic

    copys = {k: v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
             for k, v in (copys or {}).items()}  # tolera respuestas anidadas de Gemini
    write_json_atomic(out_path.with_suffix(".json"), copys)
    md = [f"# Copys{': ' + title if title else ''}", ""]
    md += [f"**Keyword:** {copys.get('keyword', '')}", ""]
    for red in ("tiktok", "tiktok_gate", "instagram", "facebook"):
        if red == "tiktok_gate" and not copys.get(red):
            continue  # compat con copys viejos sin la variante comment-gate
        label = "Tiktok (comment-gate)" if red == "tiktok_gate" else red.capitalize()
        md += [f"## {label}", "", copys.get(red, "").strip(), ""]
    out_path.write_text("\n".join(md), encoding="utf-8")
    return out_path
