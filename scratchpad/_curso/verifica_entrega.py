"""Revisa lo que de verdad se entrega en Descargas, no lo que dice el log.

Tres fallas MUDAS vistas el 1-sep-2026, todas con "✔" en el log:
  1. mp4 truncado (el render se cortó a media escritura) → "moov atom not found";
  2. ensamblado de una sola escena (temporales del punch compartidos) → dura 12 s de 78;
  3. cama musical inaudible (se renderizó antes de subir el gain a 0.38) → los graves
     por debajo de 120 Hz bajan del 8% de la energía.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
DEST = Path("/mnt/c/Users/USUARIO/Downloads/curso_python")


def dur(p):
    try:
        return float(subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(p)], text=True, stderr=subprocess.DEVNULL).strip())
    except Exception:
        return 0.0


def graves(mp4, ini=20.0, seg=12.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(ini), "-t", str(seg),
                          "-i", str(mp4), "-ac", "1", "-ar", "22050", "-f", "s16le", "-"],
                         capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32)
    if x.size < 2000:
        return 0.0
    X = np.abs(np.fft.rfft(x * np.hanning(x.size))) ** 2
    f = np.fft.rfftfreq(x.size, 1 / 22050)
    return 100 * X[f < 120].sum() / X.sum()


malas = []
for n in range(1, 31):
    a = sorted((RAIZ / "videos").glob(f"gen_curso_py{n:02d}_*.assets"))
    if not a:
        continue
    stem = a[0].name[:-len(".assets")]
    ent = sorted(DEST.glob(f"clase{n:02d}_*.mp4"))
    if not ent:
        malas.append((n, "no entregada"))
        print(f"py{n:02d}  ← NO ENTREGADA")
        continue
    ent = ent[0]
    base = dur(RAIZ / "videos" / f"{stem}.mp4")
    d = dur(ent)
    g = graves(ent)
    fallas = []
    if d < 1:
        fallas.append("mp4 ilegible")
    elif base and d < base * 0.6:
        fallas.append(f"dura {d:.0f}s de ~{base:.0f}s")
    if d >= 1 and g < 8:
        fallas.append(f"cama inaudible ({g:.1f}% graves)")
    print(f"py{n:02d}  {ent.name:34s} {d:5.1f}s  graves {g:4.1f}%  "
          f"{'ok' if not fallas else '← ' + ', '.join(fallas)}")
    if fallas:
        malas.append((n, ", ".join(fallas)))

print()
if malas:
    print("A REPARAR: " + " ".join(f"py{n:02d}" for n, _ in malas))
    sys.exit(1)
print("las 30 clases entregadas están bien")
