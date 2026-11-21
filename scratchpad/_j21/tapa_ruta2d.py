#!/usr/bin/env python3
"""Tapa el usuario corporativo de Windows, aparezca DONDE aparezca en la pantalla.

En la clase del 20-sep la ruta salía sólo en el prompt de PowerShell, siempre en x=0, y
bastaba deslizar la plantilla en vertical (`_j20/tapa_ruta.py`). En la del 21-sep sale
DENTRO del texto que escribe Claude Code («colocas kaggle.json en
C:\\Users\\USUARIO\\Kaggle\\»), o sea en una columna cualquiera, así que hay que
buscar en las dos dimensiones.

La fuerza bruta (1010 x 594 posiciones x 70x14 píxeles por cuadro) no cabe en el tiempo
disponible. Se calcula la suma de diferencias al cuadrado para TODAS las posiciones de
golpe:

    SSD(x,y) = Σ ventana² - 2·Σ(ventana·plantilla) + Σ plantilla²

el término cruzado con una convolución por FFT y el de la ventana con una imagen
integral. Es exacto, no una aproximación, y tarda milisegundos por cuadro.

    .venv/bin/python scratchpad/_j21/tapa_ruta2d.py --plantilla <pieza> <t> <x> <y>
    .venv/bin/python scratchpad/_j21/tapa_ruta2d.py <id-pieza> [...]
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

AQUI = Path(__file__).resolve().parent
PIEZAS = AQUI / "piezas"

PANT_Y, PANT_H, PANT_W = 288, 608, 1080
ALTO, ANCHO = 14, 70          # tamaño de la plantilla «USUARIO»
MARGEN_X, MARGEN_Y = 4, 2     # la caja va más ancha que la firma: cubre «.JOSE» también
CAJA_ANCHO = 128              # «USUARIO» mide 110 px; con 120 asomaba el borde de la E
FPS = 8
UMBRAL = 30.0                 # diferencia media por píxel; se calibra con --calibra
FONDO = "0x1e1e1e"            # gris de fondo del panel de VS Code


def cuadros(video: Path, fps: int = FPS) -> np.ndarray:
    crudo = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vf",
         f"crop={PANT_W}:{PANT_H}:0:{PANT_Y},format=gray", "-r", str(fps),
         "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    n = len(crudo) // (PANT_W * PANT_H)
    a = np.frombuffer(crudo, dtype=np.uint8).astype(np.float32)
    return a[: n * PANT_W * PANT_H].reshape(n, PANT_H, PANT_W)


def ssd(cuadro: np.ndarray, plant: np.ndarray) -> np.ndarray:
    """Diferencia media por píxel entre la plantilla y cada ventana del cuadro."""
    h, w = plant.shape
    cruz = fftconvolve(cuadro, plant[::-1, ::-1], mode="valid")
    # Σ ventana² por posición, con imagen integral (suma acumulada en dos ejes)
    cuad = np.pad(np.cumsum(np.cumsum(cuadro ** 2, axis=0), axis=1), ((1, 0), (1, 0)))
    suma = (cuad[h:, w:] - cuad[:-h, w:] - cuad[h:, :-w] + cuad[:-h, :-w])
    return (suma - 2 * cruz + (plant ** 2).sum()) / (h * w)


def busca(video: Path, plant: np.ndarray, fps: int = FPS) -> list[tuple[float, int, int]]:
    hits = []
    for i, c in enumerate(cuadros(video, fps)):
        d = ssd(c, plant)
        ys, xs = np.where(d < UMBRAL ** 2)
        vistos: set[tuple[int, int]] = set()
        for y, x in zip(ys, xs):
            clave = (y // ALTO, x // ANCHO)      # una marca por celda
            if clave in vistos:
                continue
            vistos.add(clave)
            hits.append((i / fps, int(x), int(y)))
    return hits


def agrupa(hits, fps: int = FPS):
    """(t0, t1, x, y) por tramo en que la cadena se queda quieta en el mismo sitio."""
    tramos: list[list] = []
    for t, x, y in sorted(hits):
        for tr in tramos:
            if abs(tr[2] - x) <= 3 and abs(tr[3] - y) <= 3 and t - tr[1] <= 1.5 / fps + 0.5:
                tr[1] = t
                break
        else:
            tramos.append([t, t, x, y])
    return [(max(0.0, a - 0.5), b + 0.5, x, y) for a, b, x, y in tramos]


def main() -> None:
    plant = np.load(PIEZAS / "_plantilla_ruta2d.npy")
    for pid in sys.argv[1:]:
        video = PIEZAS / f"{pid}.mp4"
        tramos = agrupa(busca(video, plant))
        print(f"{pid}: {len(tramos)} tramos con la ruta")
        for t0, t1, x, y in tramos:          # dónde, para poder mirarlo después
            print(f"    {t0:6.1f}-{t1:6.1f}s  x={x} y={y}")
        if not tramos:
            continue
        cajas = ",".join(
            f"drawbox=x={max(0, x - MARGEN_X)}:y={PANT_Y + max(0, y - MARGEN_Y)}:"
            f"w={CAJA_ANCHO}:h={ALTO + 2 * MARGEN_Y}:color={FONDO}@1:t=fill:"
            f"enable='between(t,{t0:.2f},{t1:.2f})'" for t0, t1, x, y in tramos)
        destino = PIEZAS / f"{pid}_tapado.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", cajas,
                        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                        "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart",
                        str(destino)], check=True)
        destino.replace(video)
        print(f"  ✔ tapado ({len(tramos)} cajas)")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--plantilla":
        _, _, pieza, t, x, y = sys.argv[:6]
        src = PIEZAS / f"{pieza}.mp4"
        if not src.exists():
            src = AQUI / "fuente.mp4"
        crudo = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", t, "-i", str(src), "-frames:v", "1", "-vf",
             f"crop={ANCHO}:{ALTO}:{x}:{PANT_Y + int(y)},format=gray", "-f", "rawvideo", "-"],
            capture_output=True, check=True).stdout
        np.save(PIEZAS / "_plantilla_ruta2d.npy",
                np.frombuffer(crudo, dtype=np.uint8).astype(np.float32).reshape(ALTO, ANCHO))
        print("plantilla 2D guardada")
    else:
        main()
