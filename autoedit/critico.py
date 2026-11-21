"""Crítico de guiones: Codex juzga lo que escribió Claude, en cinco ejes.

Mandato de José (3-ago-2026): *"quiero que construyas, una vez terminados los guiones,
una segunda supervisión de coherencia, viralidad y explicabilidad con Codex como
discriminador; así, uno vs otro, hasta mejorar los guiones lo más posible"*.

Nace de un fallo real: el motor de hooks de Gemini reemplazó un cold-open escrito con
hilo cerrado ("tu galería encuentra tu cara y nunca vio una cara" → "¿cómo te reconoce
si solo ve números?") y rompió la pregunta que el video contestaba. Un generador no se
audita a sí mismo: hace falta un juez distinto.

Los cinco ejes son los modos de fallar que ya vimos en el canal:
- HOOK — los 3 primeros segundos, con los umbrales medidos de 2026.
- COHERENCIA — el hilo. Un video es UNA pregunta y SU respuesta. Escenas que repiten,
  hooks que prometen lo que el video no entrega, cierres que anuncian otro tema.
- VIRALIDAD — los 2 primeros segundos y la razón para quedarse. Métricas reales:
  el mejor video del canal (595 vistas) abre nombrando un producto que el espectador
  usa y prueba la afirmación con un recibo que él puede abrir.
- MARCA — que suene a un ingeniero de IA que democratiza, no a un canal genérico.
- EXPLICABILIDAD — que lo entienda quien NO sabe. José, ingeniero de IA: *"nunca
  entendí el hilo de tus videos, y soy ingeniero de IA; menos alguien que no lo es"*.

Uso:
    from autoedit.critico import revisar, pulir
    v = revisar(guion)                  # una pasada: veredicto + problemas
    guion2, hist = pulir(guion, arreglar)   # bucle hasta que Codex no encuentre nada
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path
import re
from typing import Callable

EJES = ("apuesta", "hilo", "dueno", "ritmo", "explicabilidad", "rigor")

PROMPT = """Eres el editor jefe de un canal de TikTok de divulgación de IA en español de
México. Tu trabajo NO es felicitar: es encontrar por qué este guion va a fallar. Sé duro y
CONCRETO. Un problema sin escena y sin arreglo propuesto no sirve.

Estos umbrales NO son opinión: salen de medir los 19 guiones anteriores del canal (115
escenas) contra los creadores que sí funcionan. Júzgalos con eso, no con tu intuición.

0) APUESTA — ¿el espectador tiene algo en juego?
   El canal explicaba mecanismos que no cambian ninguna decisión de nadie. MEDIDO en el
   nicho: ese contenido topa en 1.2% de guardado; el que da una palanca real llega a
   4.5-5.3%. El techo NO es la animación, es el tema.
   Exige los tres, explícitos en el guion:
   · QUIÉN DECIDE algo sobre el espectador usando este mecanismo.
   · QUÉ LE CUESTA si ese mecanismo se equivoca — en minutos, pesos, su calificación.
   · QUÉ PALANCA puede jalar HOY, solo, en menos de dos minutos, sin comprar nada.
   Y la palanca debe estar COMPLETA antes del segundo 12. Aunque se vaya, ya se la llevó.
   Miedo sin salida no funciona: cuatro videos de "la IA te quita el trabajo" suman 7.5M
   de vistas y guardan 0.15-0.50%, peor que este canal.

1) HILO — ¿es una cadena causal o una lista con pegamento?
   MEDIDO: 16 conectores causales en 115 escenas. Cinco de cada seis transiciones son
   intercambiables. Eso es una lista, no una historia.
   · PRUEBA DE REORDENAMIENTO: intercambia dos escenas del medio. ¿Sigue teniendo sentido?
     Si sí, es fallo GRAVE.
   · Cada paso debe unirse al anterior por CAUSA ("por eso", "entonces", "lo que hizo que").
     PROHIBIDO unir con "además", "también", "otro dato", "pero hay un detalle", "espera".
   · UNA sola idea nueva y UN solo término técnico nuevo por video. El presupuesto de
     palabras de un video corto alcanza para una idea con dos o tres anclas — repartirlo
     entre seis objetos produce seis titulares y ninguna explicación.

2) DUEÑO — ¿quién habla y a quién?
   MEDIDO: UNA sola frase en primera persona en 19 videos completos. Nadie sigue a una voz
   sin dueño, y eso es exactamente el 0.5% de visitas al perfil de este canal.
   · ¿Hay una anécdota PROPIA con detalle concreto ("a mí me llegó el mensaje un martes")?
   · ¿Se dice el MOTIVO, no la credencial? Lo que predice la confianza no es que se note
     que sabe, es que se note por qué lo hace.
   · ¿Habla de TÚ al espectador desde la primera frase, o describe el mundo en tercera
     persona como un documental?
   Este canal va SIN CARA por decisión de José, así que toda la señal de persona tiene que
   estar en las palabras. Si el guion se lo podría leer cualquiera, es fallo GRAVE.

3) RITMO — ¿hay rango o todo suena igual?
   MEDIDO: media de 9.2 palabras por oración, máximo 28. Los referentes van en 15.6-17.3
   de media, con picos de 42-47 y martillazos de 4 palabras. Puros martillazos = ningún
   martillazo suena.
   · ¿Hay al menos UNA oración larga (25+ palabras) que acumule antes de un corte seco?
   · ¿Hay al menos una frase de 3-5 palabras que caiga como sentencia?
   · ¿O todas miden lo mismo?

4) EXPLICABILIDAD — que lo entienda quien NO sabe de IA.
   · El mecanismo entra POR REFUTACIÓN: "crees que X — no es X". PROHIBIDO abrirlo con
     "cómo funciona", "vamos a ver" o el nombre del concepto.
   · Toda cifra dicha en voz va traducida a personas, pesos o minutos EN LA MISMA FRASE.
     "La exactitud cae 20%" no se siente; "veinte minutos de tu día" sí.
   · ¿Qué término aparece sin explicarse? ¿Qué frase hay que releer?
   · La metáfora se etiqueta como metáfora Y se dice el término real.

5) DOCENCIA — ¿el que lo vea completo puede EXPLICARLE el concepto a alguien más?
   MEDIDO (José, 16-ago-2026, viendo la serie de agentes terminada): "no explica; en el de
   los agentes qué es un agente, se la pasa diciendo cosas de mediciones". Cuatro videos
   sobre agentes y ninguno define qué es un agente. La serie de prompts compara trucos y
   nunca enseña a escribir un prompt. La medición dejó de ser el RESPALDO y se volvió EL
   TEMA — y una medición no es una clase.
   · ¿Hay una escena que DEFINA la cosa ("un agente es un modelo que además puede...")?
     Sin definición explícita, el video es un reporte de resultados, no una explicación.
   · ¿Hay una escena de MECANISMO que cuente el CÓMO en verbos de proceso (lee, manda,
     devuelve, repite), no en cuántos? El cuánto sin el cómo no se puede repetir ni contar.
   · La cifra es EL ANCLA, no el contenido: UNA sola, y para probar lo que ya explicaste.
     Si al quitar todos los números el video se queda sin nada que decir, es fallo GRAVE.
   · Prueba del amigo: si el espectador no puede repetirle a alguien qué es la cosa y cómo
     funciona, no importa qué tan buena sea la medición.

6) RIGOR — el canal es de un ingeniero de IA mexicano que democratiza la IA.
   · ¿Algún término técnico mal usado? Un error destruye la autoridad, que es su única
     ventaja.
   · ¿Alguna cifra sin origen, o presentada como medida cuando es estimada?
   · ¿El LÍMITE de la evidencia se dice EN VOZ, y resta drama? ("eso se midió en modelos
     de 2023"). El límite chiquito en pantalla es coartada, no honestidad.
   · ¿Hay un aterrizaje mexicano verdadero, o el dato se disuelve como cosa de gringos?
   · PROHIBIDO pedir like/seguir/comentar/guardar: TikTok lo penaliza.

GUION A JUZGAR:
{guion}

Devuelve este JSON exacto:
{{"nota": {{"apuesta": 0-10, "hilo": 0-10, "dueno": 0-10, "ritmo": 0-10,
            "explicabilidad": 0-10, "docencia": 0-10, "rigor": 0-10}},
  "reordenable": true|false,
  "idea_unica": "<la ÚNICA idea nueva del video, en una frase; si hay más de una, dilo>",
  "prueba_del_amigo": "<qué exactamente podría repetirle el espectador a un amigo después
                       de verlo; si solo puede repetir una cifra, dilo así>",
  "problemas": [
    {{"escena": <número desde 1, o 0 si es del guion completo>,
      "eje": "apuesta|hilo|dueno|ritmo|explicabilidad|docencia|rigor",
      "gravedad": "grave|medio|menor",
      "que": "<qué está mal, en una frase>",
      "arreglo": "<qué hacer exactamente, en una frase>"}}
  ],
  "lo_que_funciona": ["<lo que NO hay que tocar, máx 3>"]}}

Si "reordenable" es true, TIENE que haber un problema grave de hilo.
Si un eje está por debajo de 8, TIENE que haber al menos un problema de ese eje.
No inventes problemas para rellenar: si algo está bien, dilo en lo_que_funciona."""


def _resumen(guion: dict) -> str:
    """El guion en el formato que ve el crítico: narración + visual por escena."""
    filas = []
    for i, s in enumerate(guion.get("scenes", []), 1):
        vt = s.get("visual_type", "")
        extra = ""
        if vt == "receipt":
            extra = f" [captura real de {(s.get('receipt') or {}).get('url_label', '?')}]"
        elif vt == "ml_demo":
            extra = " [gráfica de código que se EJECUTA de verdad]"
        elif vt in ("kinetic_video", "veo"):
            extra = " [tipografía sobre clip de video generado]"
        elif vt == "image":
            extra = " [fotografía ultra realista]"
        elif vt == "custom":
            extra = " [animación programada]"
        filas.append(f"{i}. ({s.get('beat_type', '?')} · {vt}{extra})\n   {s['narration']}")
    return (f"TEMA: {guion.get('tema', '')}\n"
            f"PREGUNTA A-o-B: {guion.get('pregunta_ab', '')}\n\n" + "\n".join(filas))


CAUSALES = re.compile(
    r"\b(por eso|entonces|lo que hizo que|así que|de ahí que|porque|por eso mismo|"
    r"y por eso|de modo que|resultado:|eso obligó|eso hizo)\b", re.I)
PEGAMENTO = re.compile(
    r"\b(además|también|otro dato|pero hay un detalle|espera|y otra cosa|"
    r"por cierto|aparte)\b", re.I)
PERSONA = re.compile(r"\b(yo|me|mi|mí|conmigo|mío|nosotros|tú|te|ti|tu|tus|ustedes)\b", re.I)
PCT = re.compile(r"(\d+\s*%|\bpor ciento\b)", re.I)
TRAD = re.compile(r"(de cada|\$|\bpesos\b|\bminutos?\b|\bhoras?\b|\bveces\b)", re.I)

# DOCENCIA (José, 16-ago-2026): "no explica... se la pasa diciendo cosas de mediciones".
# Una escena DEFINE si dice qué ES la cosa; explica el MECANISMO si cuenta el cómo en
# verbos de proceso. Un video sin ninguna de las dos es un reporte, no una clase.
DEFINE = re.compile(
    r"\b(es (un|una|el|la|lo)|no es (un|una|el|la)|son (un|unos|las|los)|se llama|"
    r"se le llama|significa|quiere decir|consiste en|lo que hace es|en realidad es|"
    r"la diferencia entre|no confundas|técnicamente es)\b", re.I)
PROCESO = re.compile(
    r"\b(lee|leer|leyendo|escribe|escribir|escribiendo|manda|mandar|env[íi]a|enviar|"
    r"devuelve|devolver|repite|repetir|convierte|convertir|guarda|guardar|abre|abrir|"
    r"corre|correr|ejecuta|ejecutar|revisa|revisar|parte|partir|pasa|pasar|recibe|"
    r"recibir|vuelve|arma|armar|busca|buscar|compara|comparar|decide|decidir)\b", re.I)
CIFRA = re.compile(
    # OJO: "un"/"una" NO entran — son artículos, no cifras, y contarlos marcaba el 100%
    # de las escenas de cualquier guion.
    r"\d|\b(cero|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|"
    r"catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|"
    r"cien|ciento|mil|mill[óo]n|millones|por ciento)\b", re.I)


def medir(guion: dict) -> dict:
    """Todo lo del guion que se puede medir sin pedirle nada a nadie.

    Los umbrales salen de medir los 19 guiones anteriores (115 escenas) contra los
    creadores que sí funcionan — no de intuición:
    · CAUSA: había 16 conectores causales en 115 escenas → 5 de cada 6 transiciones
      eran intercambiables. Una lista, no una historia.
    · DUEÑO: 14 marcas de persona en 115 escenas, UNA sola de primera persona en 19
      videos. Nadie sigue a una voz sin dueño (= el 0.5% de visitas al perfil).
    · RITMO: media de 9.2 palabras por oración y máximo 28. Los referentes van en
      15.6-17.3 de media con picos de 42-47 y martillazos de 4. Puros martillazos =
      ningún martillazo suena.
    · PRESUPUESTO: 105 palabras entre 6 escenas = 17 por escena = seis titulares con
      presupuesto para UNA idea.
    """
    esc = [s for s in guion.get("scenes", []) if s.get("narration")]
    if not esc:
        return {}
    narr = [s["narration"] for s in esc]
    todo = " ".join(narr)
    frases = [f.strip() for f in re.split(r"[.!?]+", todo) if f.strip()]
    largos = [len(f.split()) for f in frases] or [0]
    palabras = len(todo.split())

    transiciones = len(esc) - 1
    causa = sum(1 for n in narr[1:] if CAUSALES.search(n))
    pegam = sum(1 for n in narr if PEGAMENTO.search(n))
    yo = len(re.findall(r"\b(yo|me|mi|mí|conmigo|mío)\b", todo, re.I))
    tu = len(re.findall(r"\b(tú|te|ti|tu|tus|ustedes)\b", todo, re.I))
    sin_trad = [i + 1 for i, n in enumerate(narr) if PCT.search(n) and not TRAD.search(n)]

    # DOCENCIA: una escena DEFINE si dice qué ES la cosa; es de MECANISMO si encadena al
    # menos tres verbos de proceso DISTINTOS (contar el cómo, no el cuánto). Y si casi
    # todas las escenas llevan cifra, el video es un reporte de resultados.
    definen = [i + 1 for i, n in enumerate(narr) if DEFINE.search(n)]
    mecanismo = [i + 1 for i, n in enumerate(narr)
                 if len({m.group(0).lower() for m in PROCESO.finditer(n)}) >= 3]
    con_cifra = [i + 1 for i, n in enumerate(narr) if CIFRA.search(n)]

    return {
        "escenas": len(esc), "palabras": palabras,
        "palabras_por_escena": round(palabras / len(esc), 1),
        "segundos_aprox": round(len(todo) / 16.0, 1),
        # HILO
        "transiciones": transiciones, "causales": causa,
        "causalidad": round(causa / transiciones, 2) if transiciones else 0.0,
        "pegamento": pegam,
        # DUEÑO
        "primera_persona": yo, "segunda_persona": tu,
        "persona_por_escena": round((yo + tu) / len(esc), 2),
        # RITMO
        "palabras_por_frase": round(sum(largos) / len(largos), 1),
        "frase_mas_larga": max(largos),
        "frases_largas_25": sum(1 for x in largos if x >= 25),
        "martillazos_5": sum(1 for x in largos if x <= 5),
        # APUESTA
        "tiene_apuesta": all(str(guion.get(k, "")).strip()
                             for k in ("quien_decide", "que_cuesta", "palanca")),
        "cifras_sin_traducir": sin_trad,
        # DOCENCIA
        "escenas_que_definen": definen, "escenas_de_mecanismo": mecanismo,
        "escenas_con_cifra": len(con_cifra),
        "pct_escenas_con_cifra": round(100.0 * len(con_cifra) / len(esc)),
        # veredictos binarios contra los umbrales medidos
        "ok_causalidad": (causa / transiciones if transiciones else 0) >= 0.7,
        "ok_dueno": yo >= 2 and tu >= 3,
        "ok_ritmo": max(largos) >= 25 and any(x <= 5 for x in largos),
        "ok_una_idea": palabras / len(esc) >= 22,
        "ok_define": bool(definen),
        "ok_mecanismo": bool(mecanismo),
        # José, 17-ago-2026 (segunda vez que lo dice): "siempre tus videos son medí
        # el siguiente prompt 90 veces". Un porcentaje del 75% dejaba pasar guiones
        # donde CASI TODA escena traía cifra. El tope es dos escenas: una que ancla
        # y a lo mucho una que remata. El resto tiene que enseñar sin números.
        "ok_balance": len(con_cifra) <= 2,
    }


def revisar(guion: dict, timeout: int = 600) -> dict:
    """Una pasada del crítico. Devuelve {nota, problemas, lo_que_funciona}."""
    from .codex_client import codex_available, codex_json

    if not codex_available():
        raise RuntimeError("codex no está instalado: no hay crítico")
    with tempfile.TemporaryDirectory() as tmp:
        v = codex_json(PROMPT.format(guion=_resumen(guion)), Path(tmp), timeout=timeout)
    v.setdefault("problemas", [])
    v.setdefault("nota", {})
    for e in EJES:
        v["nota"].setdefault(e, 0)
    return v


# TOPE DURO DE ITERACIÓN (José, 10-ago-2026: "¿cómo es posible que lleves 11 horas
# corrigiendo un guion? Ahí está el problema"). El crítico encuentra algo SIEMPRE — es su
# trabajo. Sin tope, pulir un guion no termina nunca y el video no se produce.
# La regla es: DOS rondas de guion como máximo, y a la tercera se produce y se corrige
# sobre el video real, que es lo único que se puede juzgar de verdad.
MAX_RONDAS_GUION = 2


def bloquea(veredicto: dict, ronda: int) -> bool:
    """¿Este veredicto detiene la producción? Solo en las primeras rondas.

    Después de MAX_RONDAS_GUION el crítico pasa a ser ASESOR: sus notas se guardan para
    el siguiente video, pero este ya se produce. Un guion 7/10 producido enseña más que
    un guion 9/10 que nunca salió.
    """
    if ronda > MAX_RONDAS_GUION:
        return False
    return bool(graves(veredicto))


def graves(veredicto: dict) -> list[dict]:
    return [p for p in veredicto.get("problemas", []) if p.get("gravedad") == "grave"]


def pulir(guion: dict, arreglar: Callable[[dict, dict], dict],
          rondas: int = 3, minimo: int = 8,
          on_step: Callable[[str], None] = print) -> tuple[dict, list[dict]]:
    """Bucle Claude ↔ Codex hasta que no queden problemas graves y las notas suban.

    ``arreglar(guion, veredicto) -> guion`` la pone el llamador: es donde Claude
    reescribe. El bucle para cuando no hay graves y los tres ejes llegan a ``minimo``,
    o cuando se acaban las rondas, o si una ronda EMPEORA la suma de notas (se queda
    con la versión anterior, que es la buena).
    """
    rondas = min(rondas, MAX_RONDAS_GUION)   # tope duro: el video se produce
    historia: list[dict] = []
    mejor, mejor_suma = guion, -1
    for r in range(1, rondas + 1):
        v = revisar(guion)
        suma = sum(v["nota"].get(e, 0) for e in EJES)
        historia.append({"ronda": r, "nota": v["nota"], "suma": suma,
                         "problemas": len(v["problemas"]), "graves": len(graves(v))})
        on_step(f"  ronda {r}: " + " · ".join(f"{e} {v['nota'].get(e, 0)}" for e in EJES)
                + f"  ({len(graves(v))} graves de {len(v['problemas'])})")
        if suma > mejor_suma:
            mejor, mejor_suma = guion, suma
        if not graves(v) and all(v["nota"].get(e, 0) >= minimo for e in EJES):
            on_step("  ✔ el crítico ya no encuentra problemas graves")
            return guion, historia
        if r == rondas:
            break
        for p in v["problemas"][:6]:
            on_step(f"      esc {p.get('escena')} [{p.get('gravedad')}/{p.get('eje')}] "
                    f"{p.get('que')}")
        guion = arreglar(guion, v)
    return mejor, historia
