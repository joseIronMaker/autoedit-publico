"""Compara la duración del mp4 ensamblado con la suma de sus segmentos.

El bug de los temporales compartidos (`videos/_punch_N.mp4`) hacía que un ensamblado en
paralelo leyera el mp4 de OTRO a medio escribir: el concat fallaba y el video salía con una
sola escena, sin que nadie se enterara hasta abrirlo. Esto lo caza en segundos.
"""
import glob
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def dur(p):
    try:
        return float(subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(p)], text=True).strip())
    except Exception:
        return 0.0


malos = []
for n in range(1, 31):
    a = sorted((RAIZ / "videos").glob(f"gen_curso_py{n:02d}_*.assets"))
    if not a:
        continue
    assets = a[0]
    stem = assets.name[:-len(".assets")]
    mp4 = RAIZ / "videos" / f"{stem}.mp4"
    segs = sorted(assets.glob("seg_*.mp4"), key=lambda p: int(p.stem.split("_")[1]))
    if not mp4.exists() or not segs:
        malos.append((n, stem, "faltan piezas"))
        continue
    esperado = sum(dur(s) for s in segs)
    real = dur(mp4)
    ok = abs(real - esperado) < 1.0
    print(f"py{n:02d}  segs={len(segs)}  esperado={esperado:6.1f}s  real={real:6.1f}s  "
          f"{'ok' if ok else '← MAL'}")
    if not ok:
        malos.append((n, stem, f"{real:.1f}s vs {esperado:.1f}s"))
print()
if malos:
    print("HAY QUE RE-ENSAMBLAR:")
    for n, stem, por in malos:
        print(f"  py{n:02d}  {stem}  ({por})")
    sys.exit(1)
print("todas las clases cuadran")
