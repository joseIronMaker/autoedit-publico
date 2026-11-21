"""Quita las ESPERAS de una grabación con ChatGPT en pantalla.

En el formastrabajochatgpt4 el 84% del metraje (54.8 de 65.3 min) es José mirando cómo la
IA genera: "En proceso desde hace 28s". Eso no se edita panel a panel, se quita.

Un solo pase de decodificación con `select`/`aselect` en vez de 37 `trim` encadenados: el
fuente es HEVC de 2.1 GB y decodificarlo 37 veces tardaría horas. El corte es duro (sin
disolvencia) a propósito — cae siempre en un silencio, y con la voz nueva encima no se
oye ningún empalme.

    .venv/bin/python scratchpad/corta_esperas.py <origen.mp4> <destino.mp4> [--min-silencio 1.2]
"""
import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np


def envolvente(src: Path, paso: float = 0.1) -> np.ndarray:
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-ac", "1", "-ar", "16000",
                        "-f", "s16le", "-"], capture_output=True)
    a = np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768
    V = int(16000 * paso)
    m = len(a) // V
    return 20 * np.log10(np.sqrt((a[:m * V].reshape(m, V) ** 2).mean(axis=1)) + 1e-9)


def tramos_habla(db: np.ndarray, paso: float, umbral: float, min_sil: float,
                 margen: float) -> list[tuple[float, float]]:
    """Devuelve los tramos a CONSERVAR, con un margen antes y después de cada frase."""
    habla = db > umbral
    n = len(habla)
    # un silencio corto NO corta: es una respiración dentro de la frase
    i, tramos = 0, []
    while i < n:
        if habla[i]:
            j = i
            while j < n:
                if habla[j]:
                    j += 1
                    continue
                k = j
                while k < n and not habla[k]:
                    k += 1
                if (k - j) * paso >= min_sil:
                    break
                j = k
            tramos.append((max(0.0, i * paso - margen), min(n * paso, j * paso + margen)))
            i = j
        else:
            i += 1
    # funde los que se solapan tras aplicar el margen
    fusion = []
    for a, b in tramos:
        if fusion and a <= fusion[-1][1] + 0.05:
            fusion[-1] = (fusion[-1][0], b)
        else:
            fusion.append((a, b))
    return fusion


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("origen")
    ap.add_argument("destino")
    ap.add_argument("--umbral", type=float, default=-42.0)
    ap.add_argument("--min-silencio", type=float, default=1.2)
    ap.add_argument("--margen", type=float, default=0.30)
    a = ap.parse_args()

    src, dst = Path(a.origen), Path(a.destino)
    db = envolvente(src)
    tr = tramos_habla(db, 0.1, a.umbral, a.min_silencio, a.margen)
    total = len(db) * 0.1
    util = sum(b - x for x, b in tr)
    print(f"→ {src.name}: {total/60:.1f} min → {util/60:.1f} min en {len(tr)} tramos "
          f"({(1-util/total)*100:.0f}% quitado)", flush=True)
    if not tr:
        sys.exit("no se detectó habla")

    expr = "+".join(f"between(t,{x:.3f},{b:.3f})" for x, b in tr)
    sh = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
          "-vf", f"select='{expr}',setpts=N/FRAME_RATE/TB",
          "-af", f"aselect='{expr}',asetpts=N/SR/TB",
          "-r", "30", "-c:v", "libx264", "-crf", "19", "-preset", "veryfast",
          "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", str(dst)]
    subprocess.run(sh, check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(dst)],
                             capture_output=True, text=True, check=True).stdout)
    print(f"✔ {dst.name}  {d/60:.1f} min", flush=True)


if __name__ == "__main__":
    main()
