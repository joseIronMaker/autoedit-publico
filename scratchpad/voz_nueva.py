"""Sustituye la voz grabada por una voz de ElevenLabs y RECALZA el video a la nueva locución.

El problema que resuelve: si solo pegas el TTS encima, el video y la voz se desincronizan
más y más — en 10 minutos la deriva es de decenas de segundos y los gestos dejan de tener
que ver con lo que se oye. Aquí el video se estira o encoge TRAMO A TRAMO para caer sobre
su frase, así que la deriva se reinicia en cada pausa.

Cómo:
 1. Agrupa las palabras del transcript en FRASES (pausas > `--pausa`).
 2. Genera la locución completa en pocas llamadas (prosodia continua: una frase cortada en
    N llamadas suena a robot leyendo fichas).
 3. Transcribe el TTS con Whisper (local, $0) para saber dónde cae cada palabra dentro de
    la locución nueva.
 4. Empareja palabra a palabra (el texto es el mismo) y saca, por frase, su hueco en la
    locución.
 5. Estira el video de cada frase a ese hueco con setpts y concatena.

    .venv/bin/python scratchpad/voz_nueva.py <stem> --voz 9TcPbUAhHnAV8mzFDAWU
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
FPS = 30
MAX_CHARS = 3800          # por llamada a ElevenLabs


def sh(cmd, **kw):
    subprocess.run(cmd, check=True, **kw)


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def norm(w: str) -> str:
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", w)


def frases(words: list[dict], pausa: float) -> list[dict]:
    """Agrupa palabras en frases separadas por pausas reales."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        sig = words[i + 1] if i + 1 < len(words) else None
        if sig is None or (sig["start"] - w["end"]) > pausa:
            out.append({"ini": cur[0], "fin": cur[-1],
                        "t0": words[cur[0]]["start"], "t1": words[cur[-1]]["end"],
                        "texto": " ".join(words[k]["word"] for k in cur).strip()})
            cur = []
    return out


def locucion(textos: list[str], voz: str, destino: Path) -> Path:
    """Genera el audio en pocas llamadas y lo deja en un wav 48 kHz."""
    from dotenv import load_dotenv
    load_dotenv(RAIZ / ".env")
    from autoedit.config import load_config
    from autoedit.model_router import ModelRouter

    router = ModelRouter(load_config())
    lotes, actual = [], ""
    for t in textos:
        if actual and len(actual) + len(t) + 1 > MAX_CHARS:
            lotes.append(actual); actual = ""
        actual = (actual + " " + t).strip()
    if actual:
        lotes.append(actual)
    print(f"  · {len(lotes)} llamadas a ElevenLabs ({sum(len(x) for x in lotes)} caracteres)", flush=True)

    trozos = []
    for i, texto in enumerate(lotes):
        pcm = router._tts_elevenlabs(texto, {"voice_id": voz})
        crudo = destino.parent / f"_tts_{i}.pcm"
        crudo.write_bytes(pcm)
        wav = destino.parent / f"_tts_{i}.wav"
        sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1",
            "-i", str(crudo), "-ar", "48000", "-ac", "1", str(wav)])
        crudo.unlink(missing_ok=True)
        trozos.append(wav)
        print(f"    lote {i+1}/{len(lotes)}: {dur(wav):.1f}s", flush=True)

    lista = destino.parent / "_tts_lista.txt"
    lista.write_text("".join(f"file '{w.resolve()}'\n" for w in trozos), encoding="utf-8")
    sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c", "copy", str(destino)])
    for w in trozos:
        w.unlink(missing_ok=True)
    lista.unlink(missing_ok=True)
    return destino


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stem")
    ap.add_argument("--voz", required=True)
    ap.add_argument("--pausa", type=float, default=0.42)
    ap.add_argument("--max-factor", type=float, default=1.6)
    a = ap.parse_args()

    src = RAIZ / f"{a.stem}.mp4"
    wd = RAIZ / f"{a.stem}.autoedit"
    assets = RAIZ / f"{a.stem}.assets"
    assets.mkdir(exist_ok=True)
    words = json.loads((wd / "transcript.json").read_text(encoding="utf-8"))["words"]
    fr = frases(words, a.pausa)
    print(f"→ {a.stem}: {len(words)} palabras en {len(fr)} frases", flush=True)

    # 1) locución nueva
    voz_wav = assets / "voz_nueva.wav"
    if not voz_wav.exists():
        locucion([f["texto"] for f in fr], a.voz, voz_wav)
    print(f"  · locución: {dur(voz_wav):.1f}s (video original {dur(src):.1f}s)", flush=True)

    # 2) dónde cae cada palabra DENTRO de la locución nueva
    tw = assets / "voz_words.json"
    if not tw.exists():
        from autoedit.config import load_config
        from autoedit.transcribe import transcribe
        tmpdir = assets / "_voz_tr"
        tmpdir.mkdir(exist_ok=True)
        d = transcribe(voz_wav, tmpdir, load_config())
        tw.write_text(json.dumps(d["words"], ensure_ascii=False), encoding="utf-8")
    nuevas = json.loads(tw.read_text(encoding="utf-8"))
    print(f"  · la locución trae {len(nuevas)} palabras", flush=True)

    # 3) emparejar por secuencia (mismo texto): avance codicioso tolerante a fallos de oído
    mapa: dict[int, int] = {}
    j = 0
    for i, w in enumerate(words):
        objetivo = norm(w["word"])
        if not objetivo:
            continue
        for k in range(j, min(j + 8, len(nuevas))):
            if norm(nuevas[k]["word"]) == objetivo:
                mapa[i] = k
                j = k + 1
                break
    print(f"  · {len(mapa)}/{len(words)} palabras emparejadas ({len(mapa)/len(words)*100:.0f}%)", flush=True)

    # 4) hueco de cada frase en la locución
    plan = []
    fin_prev = 0.0
    for f in fr:
        ks = [mapa[i] for i in range(f["ini"], f["fin"] + 1) if i in mapa]
        if not ks:
            continue
        n0, n1 = nuevas[min(ks)]["start"], nuevas[max(ks)]["end"]
        plan.append({"v0": f["t0"], "v1": f["t1"], "n0": max(fin_prev, n0), "n1": n1})
        fin_prev = n1
    if not plan:
        sys.exit("no se pudo emparejar ninguna frase")

    # 5) recalzar: cada frase de video se estira a su hueco de audio
    total_n = dur(voz_wav)
    partes, filtros, i = [], [], 0
    for k, p in enumerate(plan):
        dv = max(0.05, p["v1"] - p["v0"])
        # el hueco incluye el silencio que la locución deja ANTES de la frase siguiente
        n1 = plan[k + 1]["n0"] if k + 1 < len(plan) else total_n
        dn = max(0.05, n1 - p["n0"])
        factor = dn / dv
        factor = min(max(factor, 1 / a.max_factor), a.max_factor)
        filtros.append(f"[0:v]trim={p['v0']:.3f}:{p['v1']:.3f},setpts=(PTS-STARTPTS)/{1/factor:.6f}[s{i}]")
        partes.append(f"[s{i}]")
        i += 1
    fc = ";".join(filtros) + ";" + "".join(partes) + f"concat=n={len(partes)}:v=1:a=0[v]"
    mudo = assets / "video_recalzado.mp4"
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-filter_complex", fc,
        "-map", "[v]", "-an", "-r", str(FPS), "-c:v", "libx264", "-crf", "19",
        "-preset", "veryfast", "-pix_fmt", "yuv420p", str(mudo)])
    print(f"  · video recalzado: {dur(mudo):.1f}s para {total_n:.1f}s de locución", flush=True)

    out = RAIZ / f"{a.stem}_dob.mp4"
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mudo), "-i", str(voz_wav),
        "-map", "0:v", "-map", "1:a",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out)])
    print(f"✔ {out.name}  {dur(out):.1f}s", flush=True)

    # 6) transcript nuevo para los subtítulos: los tiempos de la LOCUCIÓN
    (wd / "transcript_voz.json").write_text(
        json.dumps({"words": nuevas}, ensure_ascii=False), encoding="utf-8")
    print("  · subtítulos: usar transcript_voz.json", flush=True)


if __name__ == "__main__":
    main()
