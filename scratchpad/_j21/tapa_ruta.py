#!/usr/bin/env python3
"""Tapa el usuario corporativo de Windows allí donde salga en la terminal grabada.

Una grabación de pantalla enseña cosas que José no eligió enseñar. En este video el
prompt de PowerShell dice `PS C:\\Users\\USUARIO\\nanogpt>` — su usuario de trabajo
con número de empleado — y aparece en casi cada comando.

No se puede tapar un rectángulo fijo: la terminal hace SCROLL, así que la misma cadena
está a una altura distinta en cada momento (y a veces dos veces en el mismo cuadro). Se
busca la cadena como PLANTILLA de píxeles: las columnas son fijas (el prompt siempre
empieza en x=0 y la fuente es monoespaciada), así que basta deslizarla verticalmente.
Las apariciones se agrupan en intervalos y cada uno se tapa con un drawbox del color del
fondo de la terminal, activo solo durante ese intervalo.

    .venv/bin/python scratchpad/_j20/tapa_ruta.py <id-pieza> [...]
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
PIEZAS = AQUI / "piezas"

PANT_Y, PANT_H = 288, 608          # la banda de pantalla dentro del cuadro de 1920
# La fuente de la terminal mide 7 px por carácter, medidos sobre el frame: el prompt
# `PS C:\Users\USUARIO\nanogpt>` pone el usuario en los caracteres 12 a 25.
X0, X1 = 54, 124                   # firma que se busca: «ers\L03337», única y estable
CAJA_X0, CAJA_X1 = 80, 186         # lo que se tapa: el usuario entero
ALTO = 14                          # alto de una línea de la terminal
# El muestreo tiene que ser MÁS FINO que el scroll: a 4 fps se colaban 7 cuadros de 714
# con la ruta a la vista, en los instantes entre dos muestras (la terminal escupe varias
# líneas de golpe y la posición cambia entre un muestreo y el siguiente).
FPS = 8
UMBRAL = 30.0                       # medido: 18 donde está la ruta, 47 donde no
FONDO = "0x0c0c0c"                 # negro de Windows Terminal


def plantilla(video: Path, t: float, y: float) -> np.ndarray:
    crudo = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{t}", "-i", str(video), "-frames:v", "1",
         "-vf", f"crop={X1 - X0}:{ALTO}:{X0}:{PANT_Y + y},format=gray",
         "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(crudo, dtype=np.uint8).astype(np.float32).reshape(ALTO, X1 - X0)


def busca(video: Path, plant: np.ndarray) -> list[tuple[float, int]]:
    """Devuelve (segundo, y) de cada aparición, muestreando a FPS."""
    crudo = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vf",
         f"crop={X1 - X0}:{PANT_H}:{X0}:{PANT_Y},format=gray", "-r", str(FPS),
         "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    ancho = X1 - X0
    n = len(crudo) // (ancho * PANT_H)
    cuadros = np.frombuffer(crudo, dtype=np.uint8).astype(np.float32)
    cuadros = cuadros[: n * ancho * PANT_H].reshape(n, PANT_H, ancho)

    # cuadro a cuadro: la ventana deslizante sobre TODOS los cuadros a la vez son
    # gigabytes de float (714 x 595 x 14 x 70) y la máquina se queda sin memoria
    hits = []
    for i in range(n):
        vistas = np.lib.stride_tricks.sliding_window_view(cuadros[i], (ALTO, ancho))
        coste = np.abs(vistas - plant).mean(axis=(-1, -2))[:, 0]
        for y in np.where(coste < UMBRAL)[0]:
            if y > 0 and coste[y - 1] <= coste[y]:
                continue            # una sola marca por línea: el mínimo local
            hits.append((i / FPS, int(y)))
    return hits


def agrupa(hits: list[tuple[float, int]]) -> list[tuple[float, float, int]]:
    """(t0, t1, y) por cada tramo en que la cadena se queda quieta en la misma línea."""
    tramos: list[list] = []
    for t, y in sorted(hits):
        for tr in tramos:
            if tr[2] == y and t - tr[1] <= 1.5 / FPS + 0.5:
                tr[1] = t
                break
        else:
            tramos.append([t, t, y])
    # margen holgado a los lados: más vale tapar un cuadro de negro de más que dejar
    # medio segundo de nombre de usuario a la vista
    return [(max(0.0, t0 - 0.5), t1 + 0.5, y) for t0, t1, y in tramos]


def main() -> None:
    for pid in sys.argv[1:]:
        video = PIEZAS / f"{pid}.mp4"
        ref = PIEZAS / "_plantilla_ruta.npy"
        if not ref.exists():
            print("falta la plantilla; créala con --plantilla <pieza> <t> <y>")
            sys.exit(1)
        plant = np.load(ref)
        hits = busca(video, plant)
        tramos = agrupa(hits)
        print(f"{pid}: {len(hits)} apariciones en {len(tramos)} tramos")
        if not tramos:
            continue
        cajas = ",".join(
            f"drawbox=x={CAJA_X0}:y={PANT_Y + y}:w={CAJA_X1 - CAJA_X0}:h={ALTO}:"
            f"color={FONDO}@1:t=fill:"
            f"enable='between(t,{t0:.2f},{t1:.2f})'"
            for t0, t1, y in tramos)
        destino = PIEZAS / f"{pid}_tapado.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", cajas,
                        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                        "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart",
                        str(destino)], check=True)
        destino.replace(video)
        print(f"  ✔ tapado y reemplazado ({len(tramos)} cajas)")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--plantilla":
        v = PIEZAS / f"{sys.argv[2]}.mp4"
        np.save(PIEZAS / "_plantilla_ruta.npy",
                plantilla(v, float(sys.argv[3]), float(sys.argv[4])))
        print("plantilla guardada")
    else:
        main()
