"""Valida los guiones de la serie ANTES de producir: paleta que exista en los dos motores,
regla cold-open, CTA implícito, duración estimada y código de ml_demo que compile."""
import ast
import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

from autoedit.critico import medir
from autoedit.diagrams import THEMES
from autoedit.generate import _normalizar_diagrama
from autoedit.remotion_scenes import remotion_themes

BAN = re.compile(r"\b(gu[áa]rda(lo|te)|s[íi]gueme|suscr[íi]b\w*|comenta|dale like|comparte)\b", re.I)
VT_OK = {"image", "diagram", "screen_demo", "big_text", "host", "ml_demo", "kinetic",
         "kinetic_video", "terminal", "cutout", "mascota", "receipt", "veo", "showcase",
         "custom", "perceptron", "activation_bend", "gradient_descent", "backprop",
         "lottie"}
CHARS_POR_SEG = 16.0     # medido en los videos ya producidos (ElevenLabs a esta velocidad)

# MIX VISUAL (27-jul): la primera versión de la serie salió con 48/115 escenas de texto sobre
# negro y 13 de 19 videos SIN una sola imagen. José: "los hooks horribles, sin animaciones,
# sin imágenes". Rompía la regla "no tarjetas de solo texto" (commit a62ecd9) y el uso de
# `kinetic`, que en CLAUDE.md es para la TESIS — una por video, no tres.
TEXTO_PURO = {"kinetic", "big_text"}          # tipografía sobre fondo, sin material
MATERIAL = {"image", "showcase", "receipt", "screen_demo", "veo", "kinetic_video",
            "cutout", "mascota", "custom", "lottie"}    # algo real o dibujado que MIRAR
                                              # ("custom" = animación a medida escrita por Codex)
# porcentaje dicho en voz sin traducir a personas, pesos o minutos: no se siente
PCT = re.compile(r"(\d+\s*%|\bpor ciento\b)", re.I)
TRAD = re.compile(r"(de cada|\$|\bpesos\b|\bminutos?\b|\bhoras?\b|\bveces\b)", re.I)

MAX_TEXTO_PURO = 1                            # solo la tesis
MIN_MATERIAL = 2                              # por video

rem = remotion_themes()
# ACEPTA ARCHIVOS Y CARPETAS. Antes solo hacía glob('*.json') sobre el argumento: pasarle
# UN guion devolvía cero archivos y aun así imprimía "TODO OK" — una validación vacía que
# parece aprobada. Cazado el 13-ago-2026, después de haber "validado" así media serie.
_args = [Path(a) for a in sys.argv[1:]] or [Path("scratchpad/guiones_serie2")]
archivos: list[Path] = []
for a in _args:
    if a.is_dir():
        archivos += sorted(a.glob("*.json"))
    elif a.is_file():
        archivos.append(a)
    else:
        print(f"[ERROR] no existe: {a}")
        sys.exit(2)
if not archivos:
    print("[ERROR] no hay guiones que validar")
    sys.exit(2)
fallos = 0

for f in archivos:
    errs, warns = [], []
    g = json.loads(f.read_text(encoding="utf-8"))
    if "scenes" not in g:      # metadatos de la serie (serie.json), no es un guion
        continue
    sc = g["scenes"]

    th = g.get("theme")
    if th not in THEMES:
        errs.append(f"paleta '{th}' no existe en diagrams.THEMES")
    elif rem and th not in rem:
        errs.append(f"paleta '{th}' no existe en remotion/src/theme.ts")

    if sc[0].get("visual_type") == "host":
        errs.append("REGLA COLD-OPEN: la escena 1 no puede ser host")

    # PRUEBA DEL TEMA (ago-2026): sin estos tres campos el video explica algo que no cambia
    # ninguna decisión del espectador — techo medido de 1.2% de guardado contra 4.5-5.3%.
    for campo, que in (("quien_decide", "quién decide algo sobre el espectador"),
                       ("que_cuesta", "qué pierde él si el mecanismo se equivoca"),
                       ("palanca", "qué puede hacer hoy, solo, en 2 minutos")):
        if not str(g.get(campo, "")).strip():
            errs.append(f"PRUEBA DEL TEMA: falta '{campo}' ({que})")

    # TERMINAL SOLO EN TEMAS DE PROGRAMAR. Un video sobre prompts que enseña bash expulsa
    # al espectador que sí escribe prompts (José, 10-ago-2026).
    _txt = (str(g.get("tema", "")) + " " + str(g.get("title", ""))).lower()
    _es_codigo = any(k in _txt for k in ("program", "código", "codigo", "harness", "agente",
                                         "claude code", "codex", "mcp", "python", "script"))
    if not _es_codigo:
        for _i, _s in enumerate(sc, 1):
            if _s.get("visual_type") == "terminal":
                errs.append(f"escena {_i}: 'terminal' en un tema que no es de programar — "
                            f"usa screen_demo de la herramienta que el espectador SÍ usa")

    # PROHIBIDO EL TEXTO SOBRE NEGRO (José, 10-ago-2026, viendo la escena 5 del primer video
    # del motor nuevo: "porquerías vacías; animaciones o imágenes sí"). El texto SIEMPRE va
    # encima de algo — un clip (kinetic_video), una animación o una foto. Nunca solo.
    _VACIOS = {"kinetic", "big_text"}
    for _i, _s in enumerate(sc, 1):
        if _s.get("visual_type") in _VACIOS:
            errs.append(f"escena {_i}: '{_s['visual_type']}' es texto sobre negro — "
                        f"usa kinetic_video (tipografía sobre clip) o una animación")

    # UN CLIP DEMASIADO OSCURO ES TEXTO SOBRE NEGRO CON OTRO NOMBRE (13-ago-2026): la tesis
    # de pro01 usaba un clip cuyo fondo es casi negro y salió exactamente el plano prohibido,
    # pero pasando todos los controles porque el visual_type SÍ era kinetic_video. Se mide el
    # brillo medio real del clip (los que sirven van de 60 a 111; ese estaba en 34).
    for _i, _s in enumerate(sc, 1):
        _kv = _s.get("kinetic_video") or {}
        _ruta = _kv.get("video")
        if not _ruta:
            continue
        _p = Path(_ruta) if Path(_ruta).is_absolute() else RAIZ / _ruta
        if not _p.exists():
            errs.append(f"escena {_i}: no existe el clip {_ruta}")
            continue
        # El brillo MEDIO no sirve de criterio: el clip de la cadena promedia 34 y se ve
        # perfecto (hay un sujeto), y el del cubo promedia 34 y es un plano vacío. Lo que
        # separa a los dos es cuánta imagen está ENCENDIDA. Es un piso, no un juez de
        # calidad: solo caza el plano practicamente negro.
        try:
            import numpy as _np

            _raw = subprocess.run(
                ["ffmpeg", "-v", "error", "-i", str(_p), "-vf",
                 "select='between(t,1,6)',fps=2,scale=96:96,format=gray",
                 "-f", "rawvideo", "-"], capture_output=True, timeout=120).stdout
            _a = _np.frombuffer(_raw, dtype=_np.uint8)
            _enc = float((_a > 60).mean() * 100) if _a.size else 100.0
        except Exception:  # noqa: BLE001
            _enc = 100.0
        if _enc < 7.0:
            errs.append(f"escena {_i}: el clip {Path(_ruta).parent.name} tiene solo "
                        f"{_enc:.1f}% de imagen encendida (mín 7%) — con la tipografía "
                        f"encima queda texto blanco sobre negro, que es lo prohibido")

    # PREFLIGHT DE ml_demo: se EJECUTA el código antes de producir. Si falla, el motor
    # degrada a big_text en silencio y el recibo del video se vuelve una tarjeta de texto
    # de 24 segundos — pasó el 10-ago-2026 por usar MUTED/ACCENT, que no existen en la
    # paleta de ml_demo (es BG/CYAN/ORANGE/MAG/GREEN/RED/TXT).
    for _i, _s in enumerate(sc, 1):
        if _s.get("visual_type") != "ml_demo":
            continue
        _cod = (_s.get("ml_demo") or {}).get("code", "")
        if not _cod:
            errs.append(f"escena {_i}: ml_demo sin 'code'")
            continue
        try:
            from autoedit.ml_demo import run_model_code
            import tempfile as _tmp
            with _tmp.TemporaryDirectory() as _d:
                run_model_code(_cod, Path(_d) / "g.png", timeout=180)
        except Exception as _e:
            _m = str(_e).strip().splitlines()[-1][:120]
            errs.append(f"escena {_i}: el ml_demo NO CORRE → {_m}")

    # MEDICIONES DETERMINISTAS (autoedit.critico.medir): causalidad, dueño, ritmo y
    # presupuesto de palabras. Los umbrales salen de medir los 19 guiones anteriores.
    m = medir(g)
    if m:
        if not m["ok_causalidad"]:
            errs.append(f"HILO: solo {m['causales']}/{m['transiciones']} transiciones con "
                        f"conector causal (mínimo 70%) — es una lista, no una historia")
        if m["pegamento"]:
            errs.append(f"HILO: {m['pegamento']} escena(s) con pegamento falso "
                        f"('además', 'pero hay un detalle', 'espera')")
        if not m["ok_dueno"]:
            errs.append(f"DUEÑO: {m['primera_persona']} marcas de 1ª persona y "
                        f"{m['segunda_persona']} de 2ª (mínimo 2 y 3) — voz sin dueño")
        if not m["ok_ritmo"]:
            errs.append(f"RITMO: frase más larga {m['frase_mas_larga']} palabras y "
                        f"{m['martillazos_5']} martillazos (hace falta ≥1 de 25+ y ≥1 de ≤5)")
        # DOCENCIA (José, 16-ago-2026): "no explica, se la pasa diciendo cosas de
        # mediciones". Un video que solo reporta un numero no deja al espectador
        # pudiendo explicarle la cosa a nadie.
        if not m["ok_define"]:
            errs.append("DOCENCIA: ninguna escena DEFINE el concepto — el que lo vea "
                        "completo no va a poder decir qué es la cosa")
        if not m["ok_mecanismo"]:
            errs.append("DOCENCIA: ninguna escena cuenta el MECANISMO (el cómo, en verbos "
                        "de proceso) — solo dice cuánto")
        if not m["ok_balance"]:
            errs.append(f"DOCENCIA: {m['escenas_con_cifra']}/{m['escenas']} escenas llevan "
                        f"cifra (tope: 2) — es un reporte, no una clase")
        # TITULO-EXPERIMENTO (José, 17-ago-2026): "siempre tus videos son medí el siguiente
        # prompt 90 veces". Medido sobre lo escrito: 12 de 13 títulos de las últimas cuatro
        # series son un experimento mío ("Medí los 4 trucos", "Pedí 40 historias", "Le vacié
        # la memoria 12 veces"). Los 19 de la serie de lenguaje, escritos como clase, cero.
        # El título dice DE QUÉ ES el video, no cuántas veces lo corrí.
        _t = str(g.get("title", ""))
        _mide = re.search(r"\b(med[íi]|cont[éeé]|corr[íi]|prob[ée]|ped[íi]|le ped[íi]|"
                          r"escrib[íi]|le dije|le escond[íi]|le vaci[ée]|mand[ée]|lanc[ée])\b",
                          _t, re.I)
        _repite = re.search(r"\d+\s*(veces|vueltas|corridas|llamadas|intentos)|"
                            r"\d+\s+de\s+\d+", _t, re.I)
        if (_mide and re.search(r"\d", _t)) or _repite:
            errs.append(f"TÍTULO-EXPERIMENTO: «{_t}» — el título reporta cuántas veces corrí "
                        f"algo. Tiene que decir QUÉ ES la cosa o QUÉ LE PASA al que ve")
        if not m["ok_una_idea"]:
            warns.append(f"{m['palabras_por_escena']} palabras por escena: son titulares, "
                         f"no una idea desarrollada (mínimo 22)")
        for i in m["cifras_sin_traducir"]:
            warns.append(f"escena {i}: cifra sin traducir a personas/pesos/minutos")

    # LA PALANCA ANTES DEL SEGUNDO 12: la solución en el segundo 29 llega cuando ya se fue.
    _acum, _pal = 0.0, None
    for _i, _s in enumerate(sc):
        _acum += float(_s.get("seconds") or len(_s.get("narration", "")) / 16.0)
        if _s.get("beat_type") == "palanca" and _pal is None:
            _pal = _acum
    if _pal is None:
        warns.append("ninguna escena marcada beat_type='palanca'")
    else:
        # El tope es PROPORCIONAL, no absoluto: los 12 s salían de un formato de 40 s.
        # En el forense de 80-90 s la palanca sigue yendo en el primer tercio.
        _tope = max(12.5, _acum * 0.38)
        if _pal > _tope:
            errs.append(f"la palanca cierra en el segundo {_pal:.1f} "
                        f"(tope {_tope:.0f} = primer tercio de {_acum:.0f}s)")

    # SIN CARA: la señal de persona sale de la narración, y es obligatoria.
    _todo = " ".join(s.get("narration", "") for s in sc).lower()
    if not re.search(r"\b(yo|me |mi |mí|conmigo|a mí)\b", _todo):
        errs.append("SIN CARA: no hay una sola frase en primera persona (anécdota o motivo)")
    if sc[-1].get("beat_type") != "cta":
        warns.append("la última escena no es cta")

    total = 0.0
    for i, s in enumerate(sc):
        n = s.get("narration", "")
        if not n:
            errs.append(f"escena {i} sin narración")
        if PCT.search(n) and not TRAD.search(n):
            warns.append(f"escena {i}: dice un porcentaje sin traducirlo a personas/pesos/minutos")
        if BAN.search(n):
            errs.append(f"escena {i}: CTA explícito prohibido -> {BAN.search(n).group(0)}")
        vt = s.get("visual_type")
        if vt not in VT_OK:
            errs.append(f"escena {i}: visual_type desconocido '{vt}'")
        # el bloque de datos no siempre se llama igual que el visual_type
        bloque = {"custom": "custom_anim"}.get(vt, vt)
        if vt not in ("host",) and not s.get(bloque) and vt not in ("image", "big_text"):
            errs.append(f"escena {i}: falta el bloque '{bloque}'")
        total += len(n) / CHARS_POR_SEG + float(s.get("pause_after") or 0) + 0.3
        # el motor dibuja los diagramas desde "items". Si el guion le puso otro nombre
        # (yo escribí "steps" en 5 guiones), salía el TÍTULO SOLO sobre el fondo durante
        # toda la escena y nada fallaba: 8s de nada en ln04 (28-jul, lo cachó José).
        if vt == "diagram":
            # flow/list se dibujan como una PILA DE TARJETAS DE TEXTO, que es
            # exactamente lo que José prohibió (30-jul, video 4: "estas porquerías
            # de tarjetas están prohibidas"). Si el concepto es un proceso, se
            # dibuja con "custom", no se lista.
            if (s.get("diagram") or {}).get("type") in ("flow", "list", "bars", "compare"):
                errs.append(f"escena {i}: diagrama '{s['diagram']['type']}' = tarjetas "
                            f"de texto (prohibidas); usa visual_type 'custom' y describe "
                            f"la animación que DIBUJA el concepto")
            try:
                s["diagram"] = _normalizar_diagrama(s.get("diagram") or {})
            except ValueError as e:
                errs.append(f"escena {i}: {e}")
        if vt == "ml_demo":
            code = s["ml_demo"]["code"]
            try:
                ast.parse(code)
            except SyntaxError as e:
                errs.append(f"escena {i}: ml_demo no compila ({e})")
            if "\\\\" in code:
                errs.append(f"escena {i}: ml_demo con doble backslash (regex rota al escapar)")
            # display_code es lo que LEE el espectador; code es lo que se EJECUTA. Son campos
            # sueltos y se desincronizan: en ln03 la pantalla decía 'cl100k_base' mientras
            # corría 'o200k_base' (27-jul). Enseñar una cosa y correr otra es mentirle al que
            # mira. Los literales de texto que aparecen en pantalla deben existir en el código.
            mostrado = " ".join(s["ml_demo"].get("display_code") or [])
            for lit in set(re.findall(r"'([^']{3,})'|\"([^\"]{3,})\"", mostrado)):
                lit = lit[0] or lit[1]
                if lit not in code:
                    errs.append(f"escena {i}: display_code muestra '{lit}' pero el código "
                                f"ejecutado no lo contiene")

    # DURACIÓN: el objetivo de 30-42s venía del arranque del canal y ya no describe lo que
    # funciona. José, 17-ago-2026, leyendo TikTok Studio: "aunque duran más se han visto más
    # los de más duración que los de 30s". Coincide con los 9 referentes del nicho medidos en
    # julio: mediana de 58s, ninguno de 30. Un video que ENSEÑA necesita el aire.
    if not 55 <= total <= 105:
        warns.append(f"duración estimada {total:.0f}s fuera de 55-105s (final ~{total * 0.9:.0f}s)")

    vts = [s.get("visual_type") for s in sc]
    n_texto = sum(1 for v in vts if v in TEXTO_PURO)
    n_material = sum(1 for v in vts if v in MATERIAL)
    if n_texto > MAX_TEXTO_PURO:
        errs.append(f"{n_texto} escenas de texto sobre negro (máx {MAX_TEXTO_PURO}, la tesis): "
                    f"{[v for v in vts if v in TEXTO_PURO]}")
    if n_material < MIN_MATERIAL:
        errs.append(f"solo {n_material} escenas con material que mirar (mín {MIN_MATERIAL}): "
                    f"imagen/showcase/receipt/screen_demo/veo/cutout")
    if vts[0] in TEXTO_PURO and n_material == 0:
        errs.append("el cold-open es texto y el video no tiene NADA de material real")

    estado = "ERROR" if errs else ("aviso" if warns else "ok")
    print(f"[{estado:5}] {f.name}  ~{total:.0f}s  tema={th}  escenas={len(sc)}")
    for e in errs:
        print(f"          ✗ {e}")
    for w in warns:
        print(f"          · {w}")
    fallos += len(errs)

print(f"\n{'TODO OK' if not fallos else str(fallos) + ' ERRORES'}")
sys.exit(1 if fallos else 0)
