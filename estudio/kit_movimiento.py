"""Cuánto se mueve una pieza, medido igual que los referentes.

python estudio/kit_movimiento.py <video.mp4> [otro.mp4 ...]
Referencia: r6 17% parado, mediana 1.45, primeros 3 s 2.67. r2 0.4%, 7.19, 17.37.
"""
import subprocess, sys
import numpy as np
for f in sys.argv[1:]:
    b = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f, "-vf", "fps=10,scale=80:142,format=gray", "-f", "rawvideo", "-"])
    a = np.frombuffer(b, np.uint8).reshape(-1, 142, 80).astype(np.float32)
    d = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2))
    tramos = "".join("1" if v < .35 else "0" for v in d).split("0")
    print(f"{f}: parados {100 * (d < .35).mean():.1f}% | mediana {np.median(d):.2f} | primeros 3 s {d[:30].mean():.2f} | tramo parado máx {max(map(len, tramos)) / 10} s")
