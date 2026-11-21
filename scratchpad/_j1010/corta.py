#!/usr/bin/env python3
"""Corta la grabación del 10-oct (Claude Code + FreeCAD por MCP) en piezas por TEMA.

Mismo método que `_j21/corta.py` (clase del 21-sep), con dos diferencias que pide esta
grabación:

  · El composite es otro: pantalla arriba (y 213→825), cara abajo (y 1022→1920) y una
    franja negra de 197 px entre las dos. Los subtítulos van ahí, anclados por la base
    a y=1006, sin tapar ni la pantalla ni la cara. El encuadre de José no se toca.
  · Aquí las esperas NO son todas iguales. Hay huecos en que José se calla y la pantalla
    está quieta («Pensando 5 min»): esos se QUITAN. Y hay huecos en que se calla pero la
    pantalla trabaja (FreeCAD armando la pieza, Claude escribiendo): esos se ACELERAN a
    unos segundos, porque es justo lo que el video promete enseñar. Lo decide la
    actividad medida de la pantalla en ese hueco (`actividad.json`, diff entre keyframes).

La voz va a `velocidad` uniforme (medida en ppm); los tramos acelerados van sin voz y la
cama techno del canal (0.45, −4 dB en 2 kHz, constante: nada de ducking) los sostiene.

Cada pieza se TRANSCRIBE YA CORTADA (sin música), así los subtítulos no se remapean a
través de cortes y velocidades.

    .venv/bin/python scratchpad/_j1010/corta.py <id-pieza> [...] | todas
    .venv/bin/python scratchpad/_j1010/corta.py plan <id-pieza>     # sólo imprime el plan
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, "/home/jose/tiktok")

import importlib.util  # noqa: E402

# correcciones de vocabulario y de cifras ya probadas en la clase del 21-sep
_spec = importlib.util.spec_from_file_location(
    "j21corta", "/home/jose/tiktok/scratchpad/_j21/corta.py")
j21 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(j21)

AQUI = Path(__file__).resolve().parent
FUENTE = AQUI / "fuente.mp4"
SALIDA = AQUI / "piezas"
CAMA = Path("/home/jose/tiktok/autoedit/assets/bed_techno_build.m4a")
CAMA_GAIN = 0.45

BASE_SUBS = 1006
SUB_CFG = json.loads(json.dumps(j21.SUB_CFG))
SUB_CFG["subtitles"]["margin_v_ratio"] = (1920 - BASE_SUBS) / 1920

UMBRAL_SILENCIO = 1.2     # s sin voz a partir de los que el hueco se quita o se acelera
MARGEN_VOZ = 0.25
EPS = 0.002               # separa tramos contiguos (between() incluye los dos extremos)
ACTIVA = 0.8              # diff medio de keyframes del hueco para considerarlo «trabajando»
FF_MIN_HUECO = 6.0        # huecos más cortos que esto se quitan aunque haya movimiento
FF_SALIDA = (2.0, 5.0)    # duración final de un tramo acelerado (mín, máx)
FF_FACTOR_MIN = 4.0

PROMPT_WHISPER = (
    "Claude Code instala un servidor MCP y conecta FreeCAD para modelar en 3D: addon, "
    "servidor MCP, FreeCAD, SolidWorks, AutoCAD, GitHub, repositorio, Opus, Python, "
    "ensamble, pieza, boceto, extrusión, cotas, plano, sólido, trituradora, agente, prompt."
)
CORRECCIONES = dict(j21.CORRECCIONES)
CORRECCIONES.update({
    "SolidWords": "SolidWorks", "Solidwords": "SolidWorks", "solidwords": "SolidWorks",
    "Solid Works": "SolidWorks", "CloudCode": "Claude Code", "Cloudcode": "Claude Code",
    "Cloud Code": "Claude Code", "cloud code": "Claude Code", "Free CAD": "FreeCAD",
    "Freecad": "FreeCAD", "freecad": "FreeCAD", "FreeCat": "FreeCAD", "Fricat": "FreeCAD",
    "Fricad": "FreeCAD", "free cat": "FreeCAD", "Autocad": "AutoCAD", "autocad": "AutoCAD",
    "mcps": "MCPs", "MCPS": "MCPs", "Github": "GitHub", "github": "GitHub",
    "Git Hub": "GitHub", "adón": "addon", "adon": "addon",
    # vistos en f01: «Codex» sale como «Codes», ChatGPT como «ChipsGPT», MCP como «MSP»
    "Codes": "Codex", "codes": "Codex", "Codes,": "Codex,", "ChipsGPT": "ChatGPT",
    "ChutzGPT": "ChatGPT", "MSPs": "MCPs", "msps": "MCPs", "mi mía": "mi IA",
    "DibujoCAD": "dibujo CAD", "siguito": "cieguito", "opu5": "Opus 5",
    # dicta la URL del repo: «diagonal neka guion nat diagonal freecad»
    "Diagonal NECA Geonat Diagonal FreeCAD": "/NEKA-NAT/FREECAD-MCP",
    # f02: «por lo regular», «Opus 5.5» partido en tres, «la IA» oída en inglés
    "lo orgular": "lo regular", "Opus 5 5 5": "Opus 5.5", "AI": "IA",
    "ensemble": "ensamble", "ensembles": "ensambles", "Cierrando": "Cerrando",
    "va a apreciar": "va a aparecer",
    # f03 y f05
    "Ya sé imágenes": "Ya sea imágenes,", "no me está a no decirle más": "no le voy a decir más",
    "de prosigui": "de por sí", "jalochambiar": "dejarlo cambiar", "lo instale": "lo instalé",
    "lo configure": "lo configuré", "configurelo": "configúrelo", "les quedo": "les quedó",
    "modo lo potente": "modelo potente", "reiniciamos si puedes": "reiniciamos y puedes",
    "haiku": "Haiku", "estaba lanzando": "está avanzando", "lo logro": "lo logró",
})


def sh(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


dur = j21.dur


def palabras_fuente() -> list[tuple[float, float]]:
    if not (AQUI / "transcript.json").exists():
        # la transcripción completa aún corre: los segmentos ya impresos en el log bastan
        # para ubicar los huecos (es el criterio de segmentos del 21-sep)
        import re
        return [(float(a), float(b)) for a, b in
                re.findall(r"^\s*([\d.]+)\s+([\d.]+) ", (AQUI / "transcribe.log").read_text(), re.M)]
    trans = json.loads((AQUI / "transcript.json").read_text(encoding="utf-8"))
    out = []
    for s in trans:
        ws = [w for w in s.get("words") or [] if w.get("s") is not None]
        if ws:
            out += [(w["s"], w["e"]) for w in ws]
        else:
            out.append((s["start"], s["end"]))
    return sorted(out)


def actividad(a: float, b: float) -> float:
    d = json.loads((AQUI / "actividad.json").read_text())
    vals = [x for t, x in zip(d["t"], d["diff"]) if a <= t <= b + 4]
    return sum(vals) / len(vals) if vals else 0.0


def plan(pieza: dict) -> list[dict]:
    """Lista de tramos {a, b, f, voz}: voz a velocidad uniforme; huecos activos acelerados."""
    vel = float(pieza.get("velocidad", 1.2))
    pal = palabras_fuente()
    out: list[dict] = []
    for a, b in pieza["tramos"]:
        dentro = [(max(a, s), min(b, e)) for s, e in pal if e > a and s < b]
        if not dentro:
            continue
        # bloques de voz separados por huecos > UMBRAL
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
                hueco = g1 - g0
                # timelapse a mano: dentro de una espera larga, cada VENTANA lleva su
                # factor (lo que trabaja va despacio, la pantalla quieta vuela) y lo que
                # no cae en ninguna ventana se quita
                ventanas = sorted((max(g0, x0), min(g1, x1), float(f))
                                  for x0, x1, f in pieza.get("rapido", []) if x1 > g0 and x0 < g1)
                if ventanas:
                    for x0, x1, f in ventanas:
                        if out[-1]["b"] >= x0:
                            x0 = out[-1]["b"] + EPS
                        if x1 - x0 > 0.3:
                            out.append({"a": x0, "b": x1, "f": f, "voz": False})
                    continue
                forzado = any(x0 <= g0 + 0.5 and g1 - 0.5 <= x1
                              for x0, x1 in pieza.get("acelera", []))
                quitado = any(x0 <= g0 + 0.5 and g1 - 0.5 <= x1
                              for x0, x1 in pieza.get("quita", []))
                if quitado or hueco < FF_MIN_HUECO:
                    continue
                if forzado or actividad(g0, g1) >= ACTIVA:
                    salida = min(max(hueco / 10, FF_SALIDA[0]), FF_SALIDA[1])
                    f = max(hueco / salida, FF_FACTOR_MIN)
                    out.append({"a": g0, "b": g1, "f": f, "voz": False})
        # la cola del tramo tras la última frase: sólo entra si hay ventana de timelapse
        for x0, x1, f in sorted((max(out[-1]["b"] + EPS, x0), min(b, x1), float(f))
                                for x0, x1, f in pieza.get("rapido", [])
                                if x1 > out[-1]["b"] and x0 < b):
            if x1 - x0 > 0.3:
                out.append({"a": x0, "b": x1, "f": f, "voz": False})
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
          f"{len(ff)} acelerados ({sum(t['b'] - t['a'] for t in ff):.0f}s → "
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
    # el plan con su tiempo de SALIDA: quema() rotula los tramos acelerados con él
    t_out, filas = 0.0, []
    for t in tramos:
        d = (t["b"] - t["a"]) / t["f"]
        filas.append(dict(t, t0=t_out, t1=t_out + d))
        t_out += d
    destino.with_name(destino.name.replace("_crudo.mp4", "_plan.json")).write_text(
        json.dumps(filas, indent=1), encoding="utf-8")
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


def rotula_acelerados(stem: str, ass: Path) -> None:
    """En los tramos acelerados no hay voz y la franja de subtítulos queda vacía: ahí se
    dice cuánto se aceleró, para que nadie lea el salto del reloj de Claude como un corte."""
    plan_p = SALIDA / f"{stem}_plan.json"
    if not plan_p.exists():
        return
    filas, runs = json.loads(plan_p.read_text(encoding="utf-8")), []
    for t in filas:
        if t["voz"]:
            continue
        if runs and abs(runs[-1]["t1"] - t["t0"]) < 0.05:
            runs[-1]["t1"] = t["t1"]; runs[-1]["src"] += t["b"] - t["a"]
        else:
            runs.append({"t0": t["t0"], "t1": t["t1"], "src": t["b"] - t["a"]})
    lineas = []
    for r in runs:
        if r["t1"] - r["t0"] < 1.5:
            continue
        mins = r["src"] / 60
        rot = (f"{mins:.0f} MIN EN {r['t1'] - r['t0']:.0f} S" if mins >= 2
               else f"ACELERADO ×{r['src'] / (r['t1'] - r['t0']):.0f}")
        lineas.append(f"Dialogue: 0,{_ts(r['t0'] + 0.1)},{_ts(r['t1'] - 0.1)},Cap,,0,0,0,,"
                      f"{{\\fad(150,150)\\1c&H04C2F7&}}{rot}")
    if lineas:
        with ass.open("a", encoding="utf-8") as f:
            f.write("\n".join(lineas) + "\n")


def quema(stem: str, palabras: list[dict]) -> Path:
    from autoedit.subtitles import build_ass
    crudo = SALIDA / f"{stem}_crudo.mp4"
    ass = build_ass(palabras, 1080, 1920, SUB_CFG, SALIDA / f"{stem}.ass")
    rotula_acelerados(stem, ass)
    destino = SALIDA / f"{stem}.mp4"
    tapas = SALIDA / f"{stem}_tapas.txt"          # drawbox de privacidad, si hace falta
    vf = (tapas.read_text().strip() + "," if tapas.exists() and tapas.read_text().strip()
          else "") + f"ass='{ass}'"
    sh(["ffmpeg", "-v", "error", "-stats", "-y", "-i", str(crudo),
        "-stream_loop", "-1", "-i", str(CAMA),
        "-filter_complex",
        f"[0:v]{vf}[v];"
        f"[1:a]volume={CAMA_GAIN},equalizer=f=2000:t=q:w=1:g=-4,aresample=48000[m];"
        "[0:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
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
        pal = transcribe(crudo, pieza.get("vad", True), False)
    palabras = aplica_correcciones(pal)
    (SALIDA / f"{stem}_palabras.json").write_text(
        json.dumps(palabras, ensure_ascii=False), encoding="utf-8")
    return quema(stem, palabras)


def requema(stem: str) -> Path:
    pal = json.loads((SALIDA / f"{stem}_palabras.json").read_text(encoding="utf-8"))
    palabras = aplica_correcciones(pal)
    (SALIDA / f"{stem}_palabras.json").write_text(
        json.dumps(palabras, ensure_ascii=False), encoding="utf-8")
    return quema(stem, palabras)


def main() -> None:
    piezas = json.loads((AQUI / "piezas.json").read_text(encoding="utf-8"))
    args = sys.argv[1:] or ["todas"]
    if args[0] == "plan":
        for p in piezas:
            if p["id"] in args[1:]:
                for t in plan(p):
                    print(f"  {t['a']:8.2f} {t['b']:8.2f}  ×{t['f']:<6.2f} "
                          f"{'voz' if t['voz'] else 'RÁPIDO'}")
        return
    if args[0] == "requemar":
        for stem in args[1:]:
            print(f"↻ {stem}  ✔ {dur(requema(stem)):.1f}s", flush=True)
        return
    for p in piezas:
        if "todas" not in args and p["id"] not in args:
            continue
        print(f"→ {p['id']}  {p['titulo']}", flush=True)
        salida = renderiza(p)
        print(f"   ✔ {salida.name}  {dur(salida):.1f}s", flush=True)


if __name__ == "__main__":
    main()
