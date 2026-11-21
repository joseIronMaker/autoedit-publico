"""Localiza los tramos donde aparece la CARA de José en un grabado ya publicado.

El formato viejo pone su cara en un panel (arriba o a pantalla completa) y el resto es
captura de pantalla. Se mide la fracción de píxeles con tono de piel en cada cuadro: en
una captura de FreeCAD o Gazebo es prácticamente cero; con su cara, sube claro.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image


def piel(a: np.ndarray) -> float:
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    y = 0.299 * r + 0.587 * g + 0.114 * b
    cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
    cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    m = (y > 60) & (cb > 80) & (cb < 130) & (cr > 133) & (cr < 180)
    return float(m.mean())


def escanea(mp4: Path, paso: float = 2.0):
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(mp4)], text=True))
    puntos = []
    with tempfile.TemporaryDirectory() as td:
        t = 0.0
        while t < dur:
            png = Path(td) / "f.png"
            subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.1f}", "-i", str(mp4),
                            "-frames:v", "1", "-vf", "scale=180:-2", str(png)],
                           check=False, timeout=60)
            if png.exists():
                puntos.append((t, piel(np.asarray(Image.open(png).convert("RGB")))))
                png.unlink()
            t += paso
    return dur, puntos


if __name__ == "__main__":
    for ruta in sys.argv[1:]:
        mp4 = Path(ruta)
        dur, pts = escanea(mp4)
        con = [t for t, p in pts if p > 0.035]
        # tramos continuos con cara
        tramos, ini = [], None
        for t, p in pts:
            if p > 0.035 and ini is None:
                ini = t
            elif p <= 0.035 and ini is not None:
                tramos.append((ini, t)); ini = None
        if ini is not None:
            tramos.append((ini, dur))
        libre = round(max((b - a for a, b in zip([0] + [b for _, b in tramos],
                                                 [a for a, _ in tramos] + [dur])), default=dur), 1)
        print(f"{mp4.name[:34]:36s} dur {dur:6.1f}s  con cara {len(con)*2:4.0f}s  "
              f"tramos {[(round(a), round(b)) for a, b in tramos][:6]}")
