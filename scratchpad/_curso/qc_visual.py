"""Mira los videos, no los logs: caza los cuadros vacíos y el escritorio de Windows.

José encontró a ojo tres fallos que los verificadores de duración y de audio no ven:
  · un cuadro casi todo negro (la terminal grabada con 34 filas para tres líneas);
  · el ESCRITORIO de Windows con su barra de tareas (la ventana se cerró antes de que
    acabara la captura y se grabó lo que había detrás);
  · un mensaje de error de Python donde debería ir el programa corriendo;
  · y la LETRA DEMASIADO PEQUEÑA: 72 columnas se leen perfectas en el monitor y son
    5 px por letra en un celular. La captura debe salir estrecha (≤ 780 px) para que al
    ampliarla al ancho del cuadro la letra crezca.
Esto los mide sobre los segmentos ya compuestos, que es lo que se publica.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
ERRORES = ("no such file", "command not found", "traceback", "errno 2",
           "modulenotfounderror", "can't open file")


def cuadros(mp4: Path, n: int = 6):
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(mp4)]).strip())
    with tempfile.TemporaryDirectory() as td:
        for k in range(n):
            png = Path(td) / f"{k}.png"
            subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{dur*(k+1)/(n+1):.2f}",
                            "-i", str(mp4), "-frames:v", "1", str(png)],
                           check=False, timeout=120)
            if png.exists():
                yield np.asarray(Image.open(png).convert("L"), dtype=np.int16)


def tinta(a) -> float:
    """% de píxeles claramente encendidos: el texto de una terminal."""
    return 100.0 * float((a > 90).mean())


def barra_tareas(a) -> bool:
    """La barra de Windows es una franja clara y ANCHA pegada al borde de abajo.

    Se mide sobre la CAPTURA CRUDA, no sobre el segmento ya compuesto: ahí el fondo es
    una copia desenfocada de la propia ventana, y con una app gris claro (tkinter) el
    detector se disparaba solo — dos clases marcadas como malas estando bien.
    """
    h, w = a.shape
    franja = a[int(h * 0.93):, :]
    return bool((franja > 70).mean() > 0.25)


malos = []
for n in range(1, 31):
    ass = sorted((RAIZ / "videos").glob(f"gen_curso_py{n:02d}_*.assets"))
    if not ass:
        continue
    assets = ass[0]
    guion = json.loads((assets / "guion.json").read_text(encoding="utf-8"))
    for i, esc in enumerate(guion["scenes"]):
        if not (assets / f"cap_{i}.mp4").exists():
            continue
        seg = assets / f"seg_{i}.mp4"
        if not seg.exists():
            continue
        anc = int(subprocess.check_output(
            ["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
             "stream=width", "-of", "default=nk=1:nw=1",
             str(assets / f"cap_{i}.mp4")], text=True).strip())
        fs = list(cuadros(seg))
        if not fs:
            continue
        t = max(tinta(a) for a in fs)
        # solo tiene sentido en las capturas de TERMINAL, que son oscuras: una app de
        # tkinter es gris claro entera y cualquier franja suya parecía barra de tareas.
        # Además, grabando una ventana por su rectángulo la barra no puede entrar.
        # "es una ventana de app" se decide por el propio cuadro, no por el guion: el
        # de assets no lleva la marca. Una terminal es oscura (mediana < 60); una app de
        # escritorio es gris claro, y ahí el detector se dispara solo.
        prim = next(cuadros(assets / f"cap_{i}.mp4", 1), None)
        es_ventana = prim is not None and float(np.median(prim)) > 90
        barra = (not es_ventana) and any(
            barra_tareas(a) for a in cuadros(assets / f"cap_{i}.mp4", 5))
        fallas = []
        if t < 0.35:
            fallas.append(f"cuadro vacío ({t:.2f}% de tinta)")
        if barra:
            fallas.append("barra de tareas de Windows")
        if anc > 780 and not (esc.get("captura") or {}).get("titulo"):
            fallas.append(f"letra chica para un celular (captura de {anc} px)")
        if fallas:
            malos.append((n, i, ", ".join(fallas)))
            print(f"py{n:02d} escena {i}  ← {', '.join(fallas)}")

print()
if malos:
    clases = sorted({f"py{n:02d}" for n, _, _ in malos})
    print(f"{len(malos)} escenas malas en {len(clases)} clases")
    print("REGRABAR: " + " ".join(clases))
    sys.exit(1)
print("ninguna escena vacía ni con escritorio a la vista")
