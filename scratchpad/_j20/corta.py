#!/usr/bin/env python3
"""Corta la grabación del 20-sep en piezas de TikTok y les quema subtítulos.

El cuadro NO se toca: la grabación ya viene compuesta 1080x1920 con la pantalla arriba
(y 288..896) y la cara de José abajo (y 1058..1667). Entre las dos hay una franja negra
de 162 px que es el único sitio del cuadro sin información: ahí van los subtítulos, sin
tapar ni una línea de la pantalla ni la cara, y muy lejos de la UI de TikTok.

Cada pieza se declara con uno o varios TRAMOS del fuente (para saltarse las divagaciones)
y una velocidad. Los tramos se extraen en UN SOLO pase de decodificación con `select`,
no con trim encadenados: el fuente es 1.5 GB y decodificarlo una vez por tramo tarda
horas (misma razón que en corta_esperas.py). Y con seek de ENTRADA, o ffmpeg decodifica
los 25 min desde el principio en cada pieza.

La transcripción se hace SOBRE LA PIEZA YA CORTADA, no sobre el fuente: así los tiempos
de los subtítulos no hay que remapearlos a través de los cortes ni de la velocidad (el
error de remapeo es mudo y se ve como subtítulos desfasados medio segundo).

    .venv/bin/python scratchpad/_j20/corta.py <id-pieza> [...]
    .venv/bin/python scratchpad/_j20/corta.py todas
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, "/home/jose/tiktok")

AQUI = Path(__file__).resolve().parent
FUENTE = AQUI / "fuente.mp4"
SALIDA = AQUI / "piezas"

# La franja negra del composite: 896 (fin de la pantalla) .. 1058 (inicio de la cara).
# El texto se ancla por su base a 1040 -> MarginV = 1920 - 1040.
SUB_CFG = {
    "subtitles": {
        "font": "Anton",
        "bold": False,
        "uppercase": True,
        "size_ratio": 0.050,      # 96 px: dos líneas siguen cabiendo en la franja
        "max_words": 3,
        "max_gap": 0.6,
        "max_duration": 1.6,
        "base_color": "FFFFFF",
        "highlight_color": "04C2F7",   # BGR -> ámbar
        "outline_color": "000000",
        "outline": 6,
        "shadow": 3,
        "margin_v_ratio": 880 / 1920,
        "pop": True,
    }
}

# El vocabulario que Whisper no conoce y que es justo lo que la clase enseña.
PROMPT_WHISPER = (
    "Hablamos de cómo se entrena un modelo de lenguaje: GPT, ChatGPT, transformador, "
    "nanoGPT, Andrej Karpathy, PyTorch, TensorFlow, GPU, Blackwell, B200, token, tokens, "
    "embeddings, la atención, query, key, value, red neuronal, perceptrón multicapa, "
    "gradiente, optimizador, pesos, parámetros, entrenamiento, Claude Code, Opus, "
    "arnés, agente, Shakespeare, Romeo, Julieta, prompt, Anthropic, OpenAI, Tesla."
)
CORRECCIONES = {
    "a gente": "agente", "la gente": "el agente", "Cloud": "Claude", "cloud": "Claude",
    "Claudia": "Claude", "Carpati": "Karpathy", "Vlad Well": "Blackwell",
    "Vladwell": "Blackwell", "Blad Well": "Blackwell", "SharedSpeed": "Shakespeare",
    "Shearsfield": "Shakespeare", "compoto": "cómputo", "Arnes": "arnés",
    "retenoronal": "red neuronal", "veto": "vector", "vetores": "vectores",
    "GPs": "GPTs", "apóquito": "a poquito", "Bloodwell": "Blackwell",
    "Bladuel": "Blackwell", "OPPUS": "Opus", "OPUS": "Opus", "FAYBALL": "Fable",
    "fables": "Fable", "entropic": "Anthropic", "torche": "PyTorch",
    "jepe": "GPT", "serpid": "Shakespeare", "sharespeed": "Shakespeare",
}


def sh(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def corta_sin_subs(pieza: dict, destino: Path) -> Path:
    tramos = [(float(a), float(b)) for a, b in pieza["tramos"]]
    vel = float(pieza.get("velocidad", 1.0))
    base = max(0.0, tramos[0][0] - 2.0)
    rel = [(a - base, b - base) for a, b in tramos]

    sel = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in rel)
    vf = [f"select='{sel}'", "setpts=N/FRAME_RATE/TB"]
    af = [f"aselect='{sel}'", "asetpts=N/SR/TB"]
    if abs(vel - 1.0) > 1e-3:
        vf.append(f"setpts=PTS/{vel}")
        af.append(f"atempo={vel}")          # atempo no cambia el tono
    af.append("loudnorm=I=-14:TP=-1.5:LRA=11")

    sh(["ffmpeg", "-v", "error", "-stats", "-y",
        "-ss", f"{base:.3f}", "-to", f"{tramos[-1][1] + 1:.3f}", "-i", str(FUENTE),
        "-vf", ",".join(vf), "-af", ",".join(af),
        "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        str(destino)])
    return destino


def transcribe(video: Path) -> list[dict]:
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=8)
    segs, _ = m.transcribe(str(video), language="es", word_timestamps=True,
                           vad_filter=True, initial_prompt=PROMPT_WHISPER)
    palabras = []
    for s in segs:
        for w in (s.words or []):
            palabras.append({"word": w.word.strip(), "start": w.start, "end": w.end})
    return palabras


def junta_numeros(palabras: list[dict]) -> list[dict]:
    """Whisper parte las cifras grandes: 71 · .400 · .000 · .000.

    En un subtítulo de tres palabras eso sale como «71 .400 .000» y no se lee como una
    cantidad. Se pegan los grupos de millar a su número y luego se dicen con palabras,
    que es como José las pronuncia: «71 MIL 400 MILLONES».
    """
    import re

    fusion: list[dict] = []
    for w in palabras:
        # el separador de millares viene unas veces como punto y otras como coma, en la
        # misma grabación: «100 .000 GPUs» en una pieza y «100 ,000 GPUs» en la siguiente
        if fusion and re.fullmatch(r"[.,]\d{3}[.,]?", w["word"]):
            fusion[-1]["word"] = fusion[-1]["word"].rstrip(".,") + "." + w["word"].strip(".,")
            fusion[-1]["end"] = w["end"]
            continue
        fusion.append(dict(w))

    def en_palabras(n: int) -> str:
        # Whisper alucina grupos de ceros en las cifras largas dichas en voz alta: el
        # «71 mil 400 millones 500 mil» de José salió como 71.400.000.500.000, o sea
        # billones. Ninguna cifra de este canal pasa del orden de los miles de millones,
        # así que por encima de eso se dice con los dos primeros grupos, que es lo que él
        # pronunció y lo que se lee en pantalla.
        while n >= 10 ** 12:
            n //= 1000
        if n >= 10 ** 6:                       # se cuenta en millones, como él lo dice
            millones = n // 10 ** 6
            if millones >= 1000:
                miles, resto = divmod(millones, 1000)
                return f"{miles} MIL {resto} MILLONES" if resto else f"{miles} MIL MILLONES"
            return f"{millones} MILLONES"
        miles, resto = divmod(n, 1000)
        return f"{miles} MIL {resto}" if resto else f"{miles} MIL"

    for w in fusion:
        crudo = w["word"].strip(" ,.¿?¡!:;")
        if re.fullmatch(r"\d{1,3}(\.\d{3})+", crudo):
            w["word"] = w["word"].replace(crudo, en_palabras(int(crudo.replace(".", ""))))
    return fusion


def aplica_correcciones(palabras: list[dict]) -> list[dict]:
    """Palabra a palabra, respetando los tiempos (las multipalabra se marcan en la 1ª)."""
    simples = {k.lower(): v for k, v in CORRECCIONES.items() if " " not in k}
    for w in palabras:
        limpia = w["word"].strip(" ,.¿?¡!:;").lower()
        if limpia in simples:
            w["word"] = w["word"].replace(w["word"].strip(" ,.¿?¡!:;"), simples[limpia])
    return junta_numeros(palabras)


def renderiza(pieza: dict) -> Path:
    from autoedit.subtitles import build_ass

    SALIDA.mkdir(exist_ok=True)
    stem = pieza["id"]
    crudo = SALIDA / f"{stem}_crudo.mp4"
    if not crudo.exists():
        corta_sin_subs(pieza, crudo)
    print(f"   corte {dur(crudo):.1f}s, transcribiendo…", flush=True)

    palabras = aplica_correcciones(transcribe(crudo))
    (SALIDA / f"{stem}_palabras.json").write_text(
        json.dumps(palabras, ensure_ascii=False), encoding="utf-8")
    ass = build_ass(palabras, 1080, 1920, SUB_CFG, SALIDA / f"{stem}.ass")

    destino = SALIDA / f"{stem}.mp4"
    sh(["ffmpeg", "-v", "error", "-stats", "-y", "-i", str(crudo),
        "-vf", f"ass='{ass}'",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1",
        "-c:a", "copy", "-movflags", "+faststart", str(destino)])
    return destino


def main() -> None:
    piezas = json.loads((AQUI / "piezas.json").read_text(encoding="utf-8"))
    pedidos = sys.argv[1:] or ["todas"]
    for p in piezas:
        if "todas" not in pedidos and p["id"] not in pedidos:
            continue
        print(f"→ {p['id']}  {p['titulo']}", flush=True)
        salida = renderiza(p)
        print(f"   ✔ {salida.name}  {dur(salida):.1f}s", flush=True)


if __name__ == "__main__":
    main()
