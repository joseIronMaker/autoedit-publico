#!/usr/bin/env python3
"""Corta la grabación del 11-oct (Claude Code + EasyEDA, dimmer AC 127 V) en piezas por TEMA.

Mismo método y mismo composite que `_j1010/corta.py` (pantalla y 213→825, cara y 1022→1920,
subtítulos en la franja negra con base en y=1006). Dos cambios que pidió José al verla:

  · LAS ESPERAS YA NO SE VEN, SE SALTAN. En el 10-oct la espera de 23 min quedó en 36 s
    y aquí hay una de 60 min (se levantó y Claude siguió ruteando la placa): "aun
    acelerando es minutos sin hacer nada, o los recortas o los pasas de forma
    instantánea". Un hueco sin voz con la pantalla quieta se QUITA. Si la pantalla
    trabaja, un hueco de hasta 90 s pasa en 1-3 s a velocidad uniforme, y uno más largo
    se convierte en un MONTAJE: solo los instantes en que la pantalla cambió (diff de
    keyframes), 0.3 s cada uno, tope 6 s — 60 min de placa ruteándose en 6 s en vez de
    90 s de ×40 donde casi nada se mueve.
  · MÚSICA DE TENDENCIA, distinta por pieza (`"cama"`, pistas de `musica.py`). Bajo la
    voz va a −22.5 LUFS (8.5 dB bajo la voz a −14: "de fondo la voz siempre se debe
    escuchar") con −4 dB en 2 kHz; en los saltos sin voz SUBE a −15 LUFS con rampas de
    0.4 s — es el drop de `cama_festival.py`, por tramos de video, no un ducking que
    respire con cada pausa de la voz.

    .venv/bin/python scratchpad/_j1011/corta.py <id-pieza> [...] | todas
    .venv/bin/python scratchpad/_j1011/corta.py plan <id-pieza>       # solo imprime el plan
    .venv/bin/python scratchpad/_j1011/corta.py requemar <id-pieza>   # subs/música de nuevo
"""
from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, "/home/jose/tiktok")

_spec = importlib.util.spec_from_file_location(
    "j21corta", "/home/jose/tiktok/scratchpad/_j21/corta.py")
j21 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(j21)

AQUI = Path(__file__).resolve().parent
FUENTE = AQUI / "fuente.mp4"
SALIDA = AQUI / "piezas"
ASSETS = Path("/home/jose/tiktok/autoedit/assets")

BASE_SUBS = 1006
SUB_CFG = json.loads(json.dumps(j21.SUB_CFG))
SUB_CFG["subtitles"]["margin_v_ratio"] = (1920 - BASE_SUBS) / 1920

UMBRAL_SILENCIO = 1.2     # s sin voz a partir de los que el hueco se quita o se salta
MARGEN_VOZ = 0.25
EPS = 0.002               # separa tramos contiguos (between() incluye los dos extremos)
ACTIVA = 0.8              # diff de keyframe a partir del cual la pantalla «trabaja»
FF_MIN_HUECO = 8.0        # huecos más cortos se quitan aunque haya movimiento
UNIFORME_MAX = 90.0       # hasta aquí, velocidad uniforme; más largo, montaje
UNIFORME_SALIDA = (1.0, 3.0)
MONTAJE_VENTANA = 3.0     # s de fuente por instante del montaje (el cambio ocurre ahí)
MONTAJE_PASO = 0.3        # s de salida por instante
MONTAJE_N = (4, 20)

LUFS_BAJO_VOZ = -22.5
LUFS_SALTO = -15.0
RAMPA = 0.4

PROMPT_WHISPER = (
    "Claude Code controla EasyEDA para diseñar la PCB de un dimmer de corriente alterna de "
    "127 V: esquemático, PCB, huella, footprint, pistas, ruteo, TRIAC, optoacoplador, "
    "cruce por cero, ESP32, resistencia, capacitor, Gerber, JLCPCB, MCP, bridge, API, Opus."
)
CORRECCIONES = dict(j21.CORRECCIONES)
CORRECCIONES.update({
    "CloudCode": "Claude Code", "Cloudcode": "Claude Code", "Cloud Code": "Claude Code",
    "cloud code": "Claude Code", "Github": "GitHub", "github": "GitHub", "Git Hub": "GitHub",
    "mcps": "MCPs", "MCPS": "MCPs", "MSPs": "MCPs", "msps": "MCPs", "MSP": "MCP",
    "Codes": "Codex", "codes": "Codex", "ChipsGPT": "ChatGPT", "AI": "IA",
    "Easy EDA": "EasyEDA", "easy EDA": "EasyEDA", "Easyeda": "EasyEDA", "easyeda": "EasyEDA",
    "Easy Eda": "EasyEDA", "IZEDA": "EasyEDA", "Izeda": "EasyEDA",
    "PCV": "PCB", "pcv": "PCB", "PSB": "PCB", "pcb": "PCB", "Triac": "TRIAC", "triac": "TRIAC",
    "Gerbers": "Gerbers", "JLC PCB": "JLCPCB", "ESP 32": "ESP32",
    # p01: la ESP32 sale como «SP32»/«SAP», el dimmer con una m, «atenuación» como
    # «renovación» y «luces» como «lúceres»
    "SP32": "ESP32", "SP": "ESP", "SAP": "ESP", "SAP32": "ESP32", "SCP-32": "ESP32",
    "SAP 32": "ESP32", "SP 32": "ESP32", "dimer": "dimmer", "dimers": "dimmers",
    "lúceres": "luces", "glúceres": "luces", "analogica": "analógica",
    "va a pagar": "va a apagar", "una renovación": "una atenuación",
    "desde si tiene su foco": "es decir, si tienes un foco",
    "Esto que va a hacer un dimer": "Esto que va a ser un dimmer",
    "se logran con su cuenta": "se logueen con su cuenta, es",
    # el resto de la sesión (leído en el transcript del fuente)
    "through hold": "through-hole", "Truehold": "through-hole", "true hold": "through-hole",
    "TruHalt": "through-hole", "truehold": "through-hole", "Trueholt": "through-hole",
    "couting": "cautín", "ACEDA": "EasyEDA", "ACIDA": "EasyEDA", "EACEDA": "EasyEDA",
    "ICDAPRO": "EasyEDA Pro", "hiciedad": "EasyEDA", "EICieda": "EasyEDA",
    "e-isi, eda": "EasyEDA", "CloudCout": "Claude Code", "Cloudcito": "Claudecito",
    "Cloud": "Claude", "Compuderios": "computer use", "Puderios": "computer use",
    "picketway": "API Gateway", "Getaway": "Gateway", "Mock": "MOC", "mock": "MOC",
    "optocupadores": "optoacopladores", "optocupador": "optoacoplador",
    "autocoplador": "optoacoplador", "book": "buck", "Deadkit30pines": "DevKit de 30 pines",
    "Deadkit": "DevKit", "JLSPB": "JLCPCB", "JPCB": "JLCPCB", "PSD": "PCB",
    "growers": "crawlers", "scrubbers": "scrapers", "semédicos": "semánticos",
    "Note": "Node", "Npx": "npx", "lots": "logs", "ampers": "amperes",
    "estampers": "amperes", "Eregar": "Agregar", "Abilidades": "Habilidades",
    "recocutando": "ejecutando", "Embra": "hembra", "Alaya": "a la IA",
    "para la idea": "para la IA", "ahora la idea": "ahora la IA",
    # p02-p03
    "TrueHole": "through-hole", "Truehole": "through-hole", "True Hole": "through-hole",
    "celares": "celulares", "lámpar": "lámpara", "provece fe": "provee CFE",
    "encienda abajo": "encienda bajo", "Wi -Fi": "Wi-Fi",
    # p04-p06 (el prompt dictado y EasyEDA oído de diez maneras)
    "mejor era de": "mejor manera de", "es el Pro": "es el prompt",
    "de Ctrl -A": "de controlar EasyEDA", "Win, Dos": "Windows", "ACID a Pro": "EasyEDA Pro",
    "screw -overs": "scrapers", "semédes": "semánticos", "archivos maps": "archivos sitemap",
    "le doy CLI": "le doy clic", "Si. Eda Pro": "EasyEDA Pro", "Arnuel": "Ah, no el",
    "NAPX": "npx", "Icieda": "EasyEDA", "van a adoptar": "van a dotar",
    "BridgeShade tiene": "bridge se detiene", "PowerPen": "PowerShell", "taré": "tarea",
    "que está tarea": "qué está trayendo", "secuta": "ejecuta", "levanta, Eda": "levanta EasyEDA",
    "tuyoso": "tuyos", "si es AC": "si es EasyEDA",
    # p07-p08
    "Claude Claude": "Claude Code", "compiudarios": "computer use", "que me amas": "quema más",
    "Lappy": "la API", "Pueba": "Prueba", "la ya haga": "la IA haga", "configurelo": "configúralo",
    "PROM": "prompt", "pron": "prompt", "Pron": "prompt", "5B USB C": "5 V USB-C",
    "a isla, is la": "aísla, aísla la", "contextor": "contexto", "Me voy a ayudar": "Le voy a ayudar",
    # p09-p10
    "el finger": "el firmware", "dina vez": "de una vez", "bug": "buck", "PROB": "Pro",
    "SolidWords": "SolidWorks", "octocupladores": "optoacopladores", "octocuplador": "optoacoplador",
    "MOC 3052": "MOC3052", "el LLM": "el LM", "to hold": "through-hole",
    "inundancias": "inductancias", "la ya lo": "la IA lo", "dar permítie": "dar permitir",
    "Entonces decidí": "Entonces decidió", "que estoy utilizando computer": "que está utilizando computer",
    "pigtway": "API Gateway", "milionarios": "millonarios", "ICA": "EasyEDA", "ACA": "EasyEDA",
    # p11-p14
    "tarachita": "talachita", "la SQL referentemente": "la skill preferentemente",
    "skips": "skills", "y malas skills": "y más las skills", "Claro, eso está": "Para eso está",
    "abar con poco": "va a abarcar un poco", "al área que lo hago": "a la IA que lo haga",
    "adsorben": "absorben", "van de limpiar": "han de limpiar", "por 10 puntos": "por 10",
    "exportada, fabricación": "exporta, fabricación", "me podrás salir": "me podría salir",
    "Ya he puesto": "Ya puestas", "respeto algo": "respetó algo", "poder participar": "poder disipar",
    "Se recuerden": "Recuerden", "lo checo": "lo checó", "mi personal": "mi PCB",
    "archivo MDK": "archivo MD", "lo que se diría": "lo que seguiría",
    "trabajo ingeniería": "trabajo de ingeniería",
})


def sh(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


dur = j21.dur


def palabras_fuente() -> list[tuple[float, float]]:
    """Tiempos de voz: las palabras de Whisper RECORTADAS al VAD (`vad.json`).

    Mientras José dicta el prompt y teclea, Whisper estira la palabra sobre la pausa
    («Deadkit30pines» midió 5.2 s) y el hueco no se ve; el VAD sí lo ve. Una palabra que
    no toca ningún tramo del VAD se queda como está: mejor una pausa de más que una
    palabra cortada."""
    trans = json.loads((AQUI / "transcript.json").read_text(encoding="utf-8"))
    vad = json.loads((AQUI / "vad.json").read_text())
    out = []
    for s in trans:
        ws = [w for w in s.get("words") or [] if w.get("s") is not None]
        for a, b in ([(w["s"], w["e"]) for w in ws] if ws else [(s["start"], s["end"])]):
            trozos = [(max(a, x), min(b, y)) for x, y in vad if y > a and x < b]
            out += trozos or [(a, b)]
    return sorted(out)


_ACT: dict | None = None


def keyframes(a: float, b: float) -> list[tuple[float, float]]:
    global _ACT
    if _ACT is None:
        _ACT = json.loads((AQUI / "actividad.json").read_text())
    return [(t, x) for t, x in zip(_ACT["t"], _ACT["diff"]) if a <= t <= b]


def salta(g0: float, g1: float) -> list[dict]:
    """Un hueco sin voz → [] (se quita) o los tramos rápidos que lo representan."""
    hueco = g1 - g0
    if hueco < FF_MIN_HUECO:
        return []
    # el keyframe en t mide el cambio entre t-4 y t: un cambio que acaba de empezar el
    # hueco todavía cuenta, uno que cae en el último keyframe ya es de la frase siguiente
    kfs = keyframes(g0 + 4, g1)
    activos = [t for t, x in kfs if x >= ACTIVA]
    if not activos:
        return []
    if hueco <= UNIFORME_MAX:
        salida = min(max(hueco / 10, UNIFORME_SALIDA[0]), UNIFORME_SALIDA[1])
        return [{"a": g0, "b": g1, "f": hueco / salida, "voz": False, "src": hueco}]
    n = int(min(max(3 + hueco / 150, MONTAJE_N[0]), MONTAJE_N[1]))
    if len(activos) > n:                      # repartidos a lo largo de toda la espera
        paso = (len(activos) - 1) / (n - 1)
        activos = [activos[round(i * paso)] for i in range(n)]
    out: list[dict] = []
    for t in activos:
        a, b = max(g0, t - MONTAJE_VENTANA), min(g1, t)
        if out and a <= out[-1]["b"]:
            a = out[-1]["b"] + EPS
        if b - a > 0.5:
            out.append({"a": a, "b": b, "f": (b - a) / MONTAJE_PASO, "voz": False, "src": 0.0})
    if out:
        out[0]["src"] = hueco                 # el rótulo cuenta la espera entera
    return out


def plan(pieza: dict) -> list[dict]:
    """Lista de tramos {a, b, f, voz}: voz a velocidad uniforme; esperas quitadas o saltadas."""
    vel = float(pieza.get("velocidad", 1.1))
    pal = palabras_fuente()
    quita = pieza.get("quita", [])
    out: list[dict] = []
    for a, b in pieza["tramos"]:
        dentro = [(max(a, s), min(b, e)) for s, e in pal if e > a and s < b
                  and not any(x0 <= s and e <= x1 for x0, x1 in quita)]
        if not dentro:
            continue
        # la espera ANTES de la primera frase (p. ej. la hora de ruteo abre la pieza: el
        # montaje es el gancho visual y el drop de la música)
        if pieza.get("cabeza") and dentro[0][0] - MARGEN_VOZ - a > FF_MIN_HUECO:
            out += salta(a, dentro[0][0] - MARGEN_VOZ - EPS)
        bloques = [[dentro[0][0], dentro[0][1]]]
        for s, e in dentro[1:]:
            if s - bloques[-1][1] > UMBRAL_SILENCIO:
                bloques.append([s, e])
            else:
                bloques[-1][1] = max(bloques[-1][1], e)
        for i, (s, e) in enumerate(bloques):
            va = max(a, s - MARGEN_VOZ)
            vb = min(b, e + MARGEN_VOZ)
            if out and va <= out[-1]["b"]:
                va = out[-1]["b"] + EPS
            out.append({"a": va, "b": vb, "f": vel, "voz": True})
            if i + 1 < len(bloques):
                g0, g1 = vb + EPS, max(a, bloques[i + 1][0] - MARGEN_VOZ) - EPS
                if not any(x0 <= g0 + 0.5 and g1 - 0.5 <= x1 for x0, x1 in quita):
                    out += salta(g0, g1)
        # la cola del tramo tras la última frase (p. ej. la placa terminándose sola)
        if pieza.get("cola") and b - out[-1]["b"] > FF_MIN_HUECO:
            out += salta(out[-1]["b"] + EPS, b)
    return [t for t in out if t["b"] - t["a"] > 0.15]


def atempo(f: float) -> str:
    etapas = []
    while f > 100:
        etapas.append("atempo=100")
        f /= 100
    etapas.append(f"atempo={f:.5f}")
    return ",".join(etapas)


def corta_sin_subs(pieza: dict, destino: Path) -> Path:
    tramos = plan(pieza)
    bruto = tramos[-1]["b"] - tramos[0]["a"]
    neto = sum((t["b"] - t["a"]) / t["f"] for t in tramos)
    ff = [t for t in tramos if not t["voz"]]
    print(f"   {bruto:.0f}s de fuente → {neto:.1f}s · {len(tramos)} tramos, "
          f"{len(ff)} rápidos ({sum(t['src'] for t in ff):.0f}s de espera → "
          f"{sum((t['b'] - t['a']) / t['f'] for t in ff):.0f}s)", flush=True)
    base = max(0.0, tramos[0]["a"] - 2.0)
    rel = [dict(t, a=t["a"] - base, b=t["b"] - base) for t in tramos]

    sel = "+".join(f"between(t,{t['a']:.3f},{t['b']:.3f})" for t in rel)
    off, terms = 0.0, []
    for t in rel:
        terms.append(f"between(T,{t['a']:.3f},{t['b']:.3f})*({off:.4f}+(T-{t['a']:.3f})/{t['f']:.5f})")
        off += (t["b"] - t["a"]) / t["f"]
    vf = f"select='{sel}',setpts='({'+'.join(terms)})/TB',fps=30"

    n = len(rel)
    fc = [f"[0:a]asplit={n}" + "".join(f"[s{i}]" for i in range(n))]
    for i, t in enumerate(rel):
        cad = f"[s{i}]atrim=start={t['a']:.3f}:end={t['b']:.3f},asetpts=PTS-STARTPTS"
        if not t["voz"]:
            cad += ",volume=0"
        if abs(t["f"] - 1) > 1e-3:
            cad += "," + atempo(t["f"])
        fc.append(cad + f"[c{i}]")
    fc.append("".join(f"[c{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,"
              "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
    fc.append(f"[0:v]{vf}[v]")
    t_out, filas = 0.0, []
    for t in tramos:
        d = (t["b"] - t["a"]) / t["f"]
        filas.append(dict(t, t0=t_out, t1=t_out + d))
        t_out += d
    (SALIDA / f"{pieza['id']}_plan.json").write_text(json.dumps(filas, indent=1), encoding="utf-8")
    script = destino.with_suffix(".filtro.txt")
    script.write_text(";\n".join(fc), encoding="utf-8")

    sh(["ffmpeg", "-v", "error", "-stats", "-y",
        "-ss", f"{base:.3f}", "-to", f"{tramos[-1]['b'] + 1:.3f}", "-i", str(FUENTE),
        "-filter_complex_script", str(script), "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        str(destino)])
    return destino


def transcribe(video: Path, vad: bool = True, prompt: bool = True) -> list[dict]:
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=8)
    segs, _ = m.transcribe(str(video), language="es", word_timestamps=True,
                           vad_filter=vad, initial_prompt=PROMPT_WHISPER if prompt else None)
    return [{"word": w.word.strip(), "start": w.start, "end": w.end}
            for s in segs for w in (s.words or [])]


def aplica_correcciones(palabras: list[dict]) -> list[dict]:
    viejo = j21.CORRECCIONES
    j21.CORRECCIONES = CORRECCIONES
    try:
        return j21.aplica_correcciones(palabras)
    finally:
        j21.CORRECCIONES = viejo


def _ts(t: float) -> str:
    h, r = divmod(max(0.0, t), 3600)
    m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def saltos(stem: str) -> list[dict]:
    """Tramos sin voz contiguos en la SALIDA, con la espera de fuente que representan."""
    filas, runs = json.loads((SALIDA / f"{stem}_plan.json").read_text(encoding="utf-8")), []
    for t in filas:
        if t["voz"]:
            continue
        if runs and abs(runs[-1]["t1"] - t["t0"]) < 0.05:
            runs[-1]["t1"] = t["t1"]
            runs[-1]["src"] += t.get("src", t["b"] - t["a"])
        else:
            runs.append({"t0": t["t0"], "t1": t["t1"], "src": t.get("src", t["b"] - t["a"])})
    return runs


def rotula_saltos(stem: str, ass: Path) -> None:
    """En los saltos no hay voz y la franja de subtítulos queda vacía: ahí se dice cuánto
    tiempo se saltó, para que el reloj de Claude brincando no se lea como un corte."""
    lineas = []
    for r in saltos(stem):
        d = r["t1"] - r["t0"]
        if d < 0.9:
            continue
        m = r["src"] / 60
        if m >= 55:
            rot = f"{m / 60:.0f} H EN {d:.0f} S" if m >= 90 else f"1 HORA EN {d:.0f} S"
        elif m >= 2:
            rot = f"{m:.0f} MIN EN {d:.0f} S"
        else:
            rot = f"×{r['src'] / d:.0f}"
        lineas.append(f"Dialogue: 0,{_ts(r['t0'] + 0.05)},{_ts(r['t1'] - 0.05)},Cap,,0,0,0,,"
                      f"{{\\fad(120,120)\\1c&H04C2F7&}}{rot}")
    if lineas:
        with ass.open("a", encoding="utf-8") as f:
            f.write("\n".join(lineas) + "\n")


def lufs(p: Path) -> float:
    r = subprocess.run(["ffmpeg", "-nostats", "-i", str(p), "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])


def ganancia_cama(stem: str, cama: Path) -> str:
    """Expresión de volume: bajo la voz a LUFS_BAJO_VOZ, en los saltos a LUFS_SALTO."""
    l = lufs(cama)
    lo = 10 ** ((LUFS_BAJO_VOZ - l) / 20)
    hi = 10 ** ((LUFS_SALTO - l) / 20)
    sube = [f"min(clip((t-{r['t0']:.3f})/{RAMPA},0,1),clip(({r['t1']:.3f}-t)/{RAMPA},0,1))"
            for r in saltos(stem) if r["t1"] - r["t0"] >= 0.9]
    if not sube:
        return f"{lo:.4f}"
    return f"{lo:.4f}+{hi - lo:.4f}*({'+'.join(sube)})"


def cama_larga(cama: Path, objetivo: float, destino: Path) -> Path:
    """Las pistas duran ~3 min; una pieza más larga encadena copias con acrossfade de 3 s
    (un `-stream_loop` cortaría seco en el punto de vuelta)."""
    d = dur(cama)
    if d >= objetivo + 1:
        return cama
    n = int((objetivo + 3) // (d - 3)) + 1
    ins = sum((["-i", str(cama)] for _ in range(n)), [])
    cad, prev = [], "0:a"
    for i in range(1, n):
        cad.append(f"[{prev}][{i}:a]acrossfade=d=3:c1=tri:c2=tri[x{i}]")
        prev = f"x{i}"
    sh(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(cad),
        "-map", f"[{prev}]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(destino)])
    return destino


def mosaico(tapas: str) -> str:
    """Cada `drawbox` de tapas.txt pasa a PIXELADO del propio contenido (crop → 1/12 → de
    vuelta). Una caja de color fijo se veía como parche en cuanto la pantalla cambiaba
    bajo ella: barra azul sobre el chat claro (p07 s. 17), barra blanca encima de
    «Ejecutando habilidad» (p07 s. 108.5), o más clara que una barra de título atenuada
    por un modal. El pixelado toma el color de lo que tapa y el texto sigue ilegible."""
    cajas = re.findall(r"x=(\d+):y=(\d+):w=(\d+):h=(\d+):.*?enable='([^']+)'", tapas)
    par = lambda v: int(v) // 2 * 2
    cad = ""
    for i, (x, y, w, h, en) in enumerate(cajas):
        x, y = par(x), par(y)
        w, h = min(par(int(w) + 1), 1080 - x), par(int(h) + 1)
        cad += (f"split=2[m{i}a][m{i}b];[m{i}b]crop={w}:{h}:{x}:{y},"
                f"scale={max(2, par(w / 12))}:{max(2, par(h / 12))}:flags=area,"
                f"scale={w}:{h}:flags=bilinear[m{i}c];"
                f"[m{i}a][m{i}c]overlay={x}:{y}:enable='{en}',")
    return cad


def quema(pieza: dict, palabras: list[dict]) -> Path:
    from autoedit.subtitles import build_ass
    stem = pieza["id"]
    crudo = SALIDA / f"{stem}_crudo.mp4"
    ass = build_ass(palabras, 1080, 1920, SUB_CFG, SALIDA / f"{stem}.ass")
    rotula_saltos(stem, ass)
    cama = cama_larga(ASSETS / f"bed_tt_{pieza['cama']}.m4a", dur(crudo),
                      SALIDA / f"{stem}_cama.m4a")
    gan = ganancia_cama(stem, cama)
    destino = SALIDA / f"{stem}.mp4"
    tapas = SALIDA / f"{stem}_tapas.txt"          # drawbox de privacidad, si hace falta
    vf = (mosaico(tapas.read_text()) if tapas.exists() else "") + f"ass='{ass}'"
    script = SALIDA / f"{stem}.quema.txt"
    script.write_text(
        f"[0:v]{vf}[v];\n"
        f"[1:a]volume='{gan}':eval=frame,equalizer=f=2000:t=q:w=1:g=-4,aresample=48000[m];\n"
        "[0:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",
        encoding="utf-8")
    sh(["ffmpeg", "-v", "error", "-stats", "-y", "-i", str(crudo), "-i", str(cama),
        "-filter_complex_script", str(script), "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(destino)])
    return destino


def renderiza(pieza: dict) -> Path:
    SALIDA.mkdir(exist_ok=True)
    stem = pieza["id"]
    crudo = SALIDA / f"{stem}_crudo.mp4"
    if not crudo.exists():
        corta_sin_subs(pieza, crudo)
    total = dur(crudo)
    print(f"   corte {total:.1f}s, transcribiendo…", flush=True)
    pal = transcribe(crudo, pieza.get("vad", True), pieza.get("prompt", True))
    # el prompt de vocabulario puede comerse el arranque (c02 del 21-sep): se comprueba
    if pal and (pal[0]["start"] > 2.0 or total - pal[-1]["end"] > 4.0):
        print(f"   ⚠ primera palabra {pal[0]['start']:.1f}s / última {pal[-1]['end']:.1f}s "
              f"de {total:.1f}: reintento sin prompt", flush=True)
        pal2 = transcribe(crudo, pieza.get("vad", True), False)
        if pal2 and pal2[0]["start"] < pal[0]["start"]:
            pal = pal2
    palabras = aplica_correcciones(pal)
    (SALIDA / f"{stem}_palabras.json").write_text(
        json.dumps(palabras, ensure_ascii=False), encoding="utf-8")
    return quema(pieza, palabras)


def requema(pieza: dict) -> Path:
    stem = pieza["id"]
    pal = json.loads((SALIDA / f"{stem}_palabras.json").read_text(encoding="utf-8"))
    palabras = aplica_correcciones(pal)
    (SALIDA / f"{stem}_palabras.json").write_text(
        json.dumps(palabras, ensure_ascii=False), encoding="utf-8")
    return quema(pieza, palabras)


def main() -> None:
    piezas = json.loads((AQUI / "piezas.json").read_text(encoding="utf-8"))
    args = sys.argv[1:] or ["todas"]
    if args[0] == "plan":
        for p in piezas:
            if p["id"] in args[1:]:
                for t in plan(p):
                    print(f"  {t['a']:8.2f} {t['b']:8.2f}  ×{t['f']:<7.2f} "
                          f"{'voz' if t['voz'] else 'RÁPIDO'}")
        return
    if args[0] == "requemar":
        for p in piezas:
            if p["id"] in args[1:]:
                print(f"↻ {p['id']}  ✔ {dur(requema(p)):.1f}s", flush=True)
        return
    for p in piezas:
        if "todas" not in args and p["id"] not in args:
            continue
        print(f"→ {p['id']}  {p['titulo']}", flush=True)
        salida = renderiza(p)
        print(f"   ✔ {salida.name}  {dur(salida):.1f}s", flush=True)


if __name__ == "__main__":
    main()
