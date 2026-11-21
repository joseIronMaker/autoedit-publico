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
    "Clase completa de inteligencia artificial: fundamentos, aprendizaje automático, "
    "regresión lineal, red neuronal, neurona, embeddings, tokens, ventana de contexto, "
    "RAG, recuperación, entrenamiento, inferencia, retropropagación, fine-tuning, "
    "alineación, modelos generativos, GPT, ChatGPT, Gemini, Google AI Studio, Claude "
    "Code, agente, agentes, herramientas, function calling, MCP, skills, SKILL.md, "
    "CLAUDE.md, Python, API, KiCad, Konnect, PCB, prompt, orquestación, sigmoide, ReLU."
)
CORRECCIONES = {
    "a gente": "agente", "Cloud": "Claude", "cloud": "Claude",
    "Claudia": "Claude", "Carpati": "Karpathy", "Vlad Well": "Blackwell",
    "Vladwell": "Blackwell", "Blad Well": "Blackwell", "SharedSpeed": "Shakespeare",
    "Shearsfield": "Shakespeare", "compoto": "cómputo", "Arnes": "arnés",
    "retenoronal": "red neuronal", "veto": "vector", "vetores": "vectores",
    "GPs": "GPTs", "apóquito": "a poquito", "Bloodwell": "Blackwell",
    "Bladuel": "Blackwell", "OPPUS": "Opus", "OPUS": "Opus", "FAYBALL": "Fable",
    "fables": "Fable", "entropic": "Anthropic", "torche": "PyTorch",
    "jepe": "GPT", "serpid": "Shakespeare", "sharespeed": "Shakespeare",
    # vocabulario de la clase del 21-sep (agentes, contexto, herramientas)
    "Cloud": "Claude", "cloud": "Claude", "Claudia": "Claude", "clot": "Claude",
    "una gente": "un agente",
    # vistos en las 31 piezas de la clase completa (22-sep)
    "Invases": "Y bases", "comentar y orquestar": "documentar y orquestar",
    "Claude .md": "CLAUDE.md", "claude .md": "CLAUDE.md", "agentes .md": "AGENTS.md",
    "AYEN .md": "AGENTS.md", "Allense .md": "AGENTS.md", "KB caché": "KV caché",
    "memoria KB": "memoria KV", "KB": "KV", "a la gente": "al agente",
    "la gente va": "el agente va", "prentiner": "pretrained",
    "sub -agentes": "subagentes", "sub -agente": "subagente",
    "Yemini": "Gemini", "Heminis": "Gemini", "Gueminis": "Gemini",
    "emcepé": "MCP", "eme ce pe": "MCP", "rag": "RAG", "Rack": "RAG", "rack": "RAG",
    "esquils": "skills", "eskil": "skill", "Kikad": "KiCad", "Kaikad": "KiCad",
    "Konect": "Konnect", "Conect": "Konnect", "fine tuning": "fine-tuning",
    "Asythmoide": "sigmoide", "Asymoide": "sigmoide", "simóide": "sigmoide",
    "relu": "ReLU", "Relu": "ReLU", "bedin": "embedding", "bedins": "embeddings",
    "embeddores": "embeddings", "vetor": "vector", "vetorial": "vectorial",
    "FASAPI": "FastAPI", "Fasapi": "FastAPI", "fasapi": "FastAPI",
    # Whisper oye «Claude» como «clout/clot», «MCP» como «msp» y «la IA» como «la ira»
    "clout": "Claude", "msp": "MCP", "MSP": "MCP", "mcp": "MCP", "LMSP": "MCP",
    "AIA": "IA", "aia": "IA", "ChatGapet": "ChatGPT", "ChatGapt": "ChatGPT",
    "al AIA": "a la IA", "la ira": "la IA", "una ira": "una IA", "la haya": "la IA",
    "una sp": "un MCP", "esquí,": "skills,",
    # dice «compré 3 chicles» y sale «10»: el subtítulo contradiría la cuenta en pantalla
    "compré 10 chicles": "compré 3 chicles", "compre 10 chicles": "compré 3 chicles",
    "vetorizar": "vectorizar", "REI": "rey", "Rei": "rey", "vetorial,": "vectorial,",
    "toque": "token", "toquenizar": "tokenizar",
    "embedding": "embedding", "inferencia": "inferencia",
}


def sh(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


UMBRAL_SILENCIO = 1.2   # s sin voz entre dos frases a partir de los que se recorta
MARGEN_VOZ = 0.25       # aire que se deja antes y después de cada frase


def sin_silencios(tramos: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Quita de cada tramo los huecos en que José se calla (esperas, tecleo, lectura).

    José (22-sep-2026): «quita donde se calla mucho o espera, adelanta a velocidad
    rápida lo necesario, pero no quites información de temas tratados». Los huecos se
    sacan de la transcripción con VAD: entre dos frases consecutivas, un silencio mayor
    que UMBRAL_SILENCIO es una espera, no una pausa de dicción. Se deja MARGEN_VOZ de
    aire a cada lado para no cortar sílabas. Todo lo que tiene voz se conserva.
    """
    trans = json.loads((AQUI / "transcript.json").read_text(encoding="utf-8"))
    segs = [(s["start"], s["end"]) for s in trans]
    out: list[tuple[float, float]] = []
    for a, b in tramos:
        dentro = [(max(a, s), min(b, e)) for s, e in segs if e > a and s < b]
        if not dentro:
            out.append((a, b))
            continue
        cur = [dentro[0][0] - MARGEN_VOZ, dentro[0][1] + MARGEN_VOZ]
        for s, e in dentro[1:]:
            if s - cur[1] > UMBRAL_SILENCIO:
                out.append((max(a, cur[0]), min(b, cur[1])))
                cur = [s - MARGEN_VOZ, e + MARGEN_VOZ]
            else:
                cur[1] = e + MARGEN_VOZ
        out.append((max(a, cur[0]), min(b, cur[1])))
    return [(round(x, 3), round(y, 3)) for x, y in out if y - x > 0.2]


def corta_sin_subs(pieza: dict, destino: Path) -> Path:
    tramos = [(float(a), float(b)) for a, b in pieza["tramos"]]
    if pieza.get("recorta_silencios", True):
        bruto = sum(b - a for a, b in tramos)
        tramos = sin_silencios(tramos)
        neto = sum(b - a for a, b in tramos)
        print(f"   silencios fuera: {bruto - neto:.1f}s de {bruto:.1f}s "
              f"({(bruto - neto) / bruto:.0%}), {len(tramos)} tramos", flush=True)
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


def transcribe(video: Path, vad: bool = True, prompt: bool = True) -> list[dict]:
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=8)
    # el VAD se comió los primeros 7,7 s de c02 (la pieza ya viene sin silencios largos,
    # así que dentro de ella el VAD solo puede quitar voz)
    segs, _ = m.transcribe(str(video), language="es", word_timestamps=True,
                           vad_filter=vad, initial_prompt=PROMPT_WHISPER if prompt else None)
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
    """Corrige el vocabulario respetando los tiempos.

    Las entradas de varias palabras («a gente» → «agente») estaban en el diccionario pero
    NO se aplicaban: el código solo miraba las de una. En esta clase eso importa, porque
    Whisper parte «agente» en «a gente» / «una gente» por todo el video. Al fusionar, la
    palabra resultante se queda con el inicio de la primera y el final de la última.
    """
    simples = {k.lower(): v for k, v in CORRECCIONES.items() if " " not in k}
    def limpia(p: str) -> str:
        return p.strip(" ,.¿?¡!:;").lower()

    # las claves se normalizan IGUAL que las palabras: «Claude .md» no se aplicaba nunca
    # porque la clave guardaba «.md» y la palabra de Whisper llegaba limpia como «md»
    multi = sorted((([limpia(x) for x in k.split()], v) for k, v in CORRECCIONES.items()
                    if " " in k), key=lambda kv: -len(kv[0]))

    fusion: list[dict] = []
    i = 0
    while i < len(palabras):
        for partes, nuevo in multi:
            n = len(partes)
            if [limpia(x["word"]) for x in palabras[i:i + n]] == partes:
                fusion.append({"word": nuevo, "start": palabras[i]["start"],
                               "end": palabras[i + n - 1]["end"]})
                i += n
                break
        else:
            w = dict(palabras[i])
            if limpia(w["word"]) in simples:
                w["word"] = w["word"].replace(w["word"].strip(" ,.¿?¡!:;"),
                                              simples[limpia(w["word"])])
            fusion.append(w)
            i += 1
    return junta_numeros(fusion)


def renderiza(pieza: dict) -> Path:
    from autoedit.subtitles import build_ass

    SALIDA.mkdir(exist_ok=True)
    stem = pieza["id"]
    crudo = SALIDA / f"{stem}_crudo.mp4"
    if not crudo.exists():
        corta_sin_subs(pieza, crudo)
    print(f"   corte {dur(crudo):.1f}s, transcribiendo…", flush=True)

    palabras = aplica_correcciones(transcribe(crudo, pieza.get("vad", True), pieza.get("prompt", True)))
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


def requema(pieza: dict) -> Path:
    """Vuelve a quemar los subtítulos con el diccionario actual, sin transcribir."""
    from autoedit.subtitles import build_ass
    stem = pieza["id"]
    crudo = SALIDA / f"{stem}_crudo.mp4"
    pal = json.loads((SALIDA / f"{stem}_palabras.json").read_text(encoding="utf-8"))
    palabras = aplica_correcciones(pal)
    (SALIDA / f"{stem}_palabras.json").write_text(
        json.dumps(palabras, ensure_ascii=False), encoding="utf-8")
    ass = build_ass(palabras, 1080, 1920, SUB_CFG, SALIDA / f"{stem}.ass")
    destino = SALIDA / f"{stem}.mp4"
    sh(["ffmpeg", "-v", "error", "-y", "-i", str(crudo), "-vf", f"ass='{ass}'",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-level", "4.1", "-c:a", "copy", "-movflags", "+faststart",
        str(destino)])
    return destino


def main() -> None:
    piezas = json.loads((AQUI / "piezas.json").read_text(encoding="utf-8"))
    pedidos = sys.argv[1:] or ["todas"]
    if pedidos and pedidos[0] == "requemar":
        for p in piezas:
            if p["id"] in pedidos[1:]:
                print(f"↻ {p['id']}", flush=True)
                print(f"   ✔ requemada {dur(requema(p)):.1f}s", flush=True)
        return
    for p in piezas:
        if "todas" not in pedidos and p["id"] not in pedidos:
            continue
        print(f"→ {p['id']}  {p['titulo']}", flush=True)
        salida = renderiza(p)
        print(f"   ✔ {salida.name}  {dur(salida):.1f}s", flush=True)


if __name__ == "__main__":
    main()
