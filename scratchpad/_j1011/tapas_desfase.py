#!/usr/bin/env python3
"""¿Alguna tapa se ve como PARCHE? Una tapa vale desde que el OCR leyó el texto hasta el
siguiente cuadro leído (+0.25 s); en los tramos acelerados una captura de EasyEDA destella
0.3 s y la tapa se queda pintada sobre el chat (p07, s. 108.5: barra blanca encima de
«Ejecutando habilidad»). El criterio es el que ve el ojo: el color de relleno contra el
color mediano del anillo de 3 px que la rodea, cuadro a cuadro (3 fps, en streaming).
Si difieren más de UMBRAL durante más de MAX_S s, la tapa se imprime.

    .venv/bin/python scratchpad/_j1011/tapas_desfase.py <id-pieza> [...]
"""
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

PIEZAS = Path(__file__).resolve().parent / "piezas"
FPS, MAX_S, UMBRAL = 3, 0.4, 45


def anillo(fr, x, y, w, h):
    y0, y1, x0, x1 = max(0, y - 3), min(fr.shape[0], y + h + 3), max(0, x - 3), min(fr.shape[1], x + w + 3)
    z = fr[y0:y1, x0:x1].astype(np.float32)
    m = np.ones(z.shape[:2], bool)
    m[(y - y0):(y - y0) + h, (x - x0):(x - x0) + w] = False
    return np.median(z[m], axis=0)


def main():
    for pid in sys.argv[1:]:
        txt = (PIEZAS / f"{pid}_tapas.txt").read_text().strip()
        cajas = [dict(x=int(m[0]), y=int(m[1]), w=int(m[2]), h=int(m[3]),
                      bgr=np.array([int(m[4][4:6], 16), int(m[4][2:4], 16), int(m[4][0:2], 16)], np.float32),
                      t0=float(m[5]), t1=float(m[6]), malo=[])
                 for m in re.findall(r"x=(\d+):y=(\d+):w=(\d+):h=(\d+):color=0x([0-9A-F]{6})@1"
                                     r":t=fill:enable='between\(t,([\d.]+),([\d.]+)\)'", txt)]
        if not cajas:
            print(f"{pid}: sin tapas"); continue
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(PIEZAS / f"{pid}_crudo.mp4"),
                              "-vf", f"fps={FPS}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                             stdout=subprocess.PIPE)
        k, tam = 0, 1080 * 1920 * 3
        while True:
            b = p.stdout.read(tam)
            if len(b) < tam:
                break
            t = k / FPS
            act = [c for c in cajas if c["t0"] <= t <= c["t1"]]
            if act:
                fr = np.frombuffer(b, np.uint8).reshape(1920, 1080, 3)
                for c in act:
                    if np.linalg.norm(anillo(fr, c["x"], c["y"], c["w"], c["h"]) - c["bgr"]) > UMBRAL:
                        c["malo"].append(t)
            k += 1
        p.wait()
        malas = [c for c in cajas if len(c["malo"]) / FPS > MAX_S]
        for c in malas:
            print(f"  {pid}  caja {c['x']},{c['y']} {c['w']}x{c['h']}  {c['t0']:.2f}-{c['t1']:.2f}  "
                  f"parche {len(c['malo']) / FPS:.1f}s ({c['malo'][0]:.1f}…{c['malo'][-1]:.1f})", flush=True)
        print(f"{pid}: {len(cajas)} tapas, {len(malas)} se ven como parche", flush=True)


if __name__ == "__main__":
    main()
