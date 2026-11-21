#!/usr/bin/env python3
"""p12: el visor 3D tarda 23.5 s en cargar (32.0-55.5 s de la pieza) y la pantalla se
queda GRIS mientras José dice «la PCB la ruteó… respetó las pistas de potencia y de
control». Ese tramo se cubre con la placa ruteada que el mismo video mostró segundos
antes (cuadro 22 s): tres tomas con movimiento propio — la placa entera, la potencia
(izquierda, pistas gruesas) y el control (derecha, ESP32) — con disolvencias. Se reescribe
el `_crudo.mp4` (copia en `_crudo.orig.mp4`) y luego se requema.

    .venv/bin/python scratchpad/_j1011/tapa_gris.py
"""
import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np

PIEZAS = Path(__file__).resolve().parent / "piezas"
PID = "p12_una_hora_ruteando"
T0, T1, CUADRO = 32.0, 55.5, 22.0
W, H, Y0, FPS, XF = 1080, 612, 213, 30, 9
# (x, y, ancho) al inicio y al final de cada toma; alto = ancho·H/W
TOMAS = [((110, 52, 860), (175, 80, 760)),      # placa entera, acercándose
         ((180, 52, 560), (180, 235, 560)),     # potencia: baja por las pistas gruesas
         ((500, 270, 420), (500, 60, 420))]     # control: de la ESP32 sube a la fuente


def main():
    crudo = PIEZAS / f"{PID}_crudo.mp4"
    orig = PIEZAS / f"{PID}_crudo.orig.mp4"
    if not orig.exists():
        shutil.copy2(crudo, orig)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(CUADRO), "-i", str(orig), "-frames:v", "1",
                          "-vf", f"crop={W}:{H}:0:{Y0}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         capture_output=True, check=True).stdout
    still = np.frombuffer(raw, np.uint8).reshape(H, W, 3)
    n = round((T1 - T0) * FPS)
    por = n / len(TOMAS)
    inserto = PIEZAS / f"_{PID}_inserto.mp4"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "14",
                            "-pix_fmt", "yuv420p", str(inserto)], stdin=subprocess.PIPE)

    def toma(k, u):
        (x0, y0, w0), (x1, y1, w1) = TOMAS[k]
        e = u * u * (3 - 2 * u)                      # suave al entrar y al salir
        x, y, w = x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, w0 + (w1 - w0) * e
        h = w * H / W
        m = cv2.getAffineTransform(np.float32([[x, y], [x + w, y], [x, y + h]]),
                                   np.float32([[0, 0], [W, 0], [0, H]]))
        return cv2.warpAffine(still, m, (W, H), flags=cv2.INTER_LANCZOS4)

    for i in range(n):
        k = min(len(TOMAS) - 1, int(i / por))
        u = (i - k * por) / por
        fr = toma(k, u)
        if k + 1 < len(TOMAS) and i > (k + 1) * por - XF:          # disolvencia a la siguiente
            a = (i - ((k + 1) * por - XF)) / XF
            fr = cv2.addWeighted(fr, 1 - a, toma(k + 1, 0.0), a, 0)
        enc.stdin.write(fr.tobytes())
    enc.stdin.close()
    enc.wait()
    fc = (f"[1:v]format=yuva420p,fade=t=in:st={T0}:d=0.25:alpha=1,"
          f"fade=t=out:st={T1 - 0.25}:d=0.25:alpha=1[i];"
          f"[0:v][i]overlay=0:{Y0}:enable='between(t,{T0},{T1})':eof_action=pass[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-stats", "-y", "-i", str(orig), "-itsoffset", str(T0),
                    "-i", str(inserto), "-filter_complex", fc, "-map", "[v]", "-map", "0:a",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
                    "-c:a", "copy", "-movflags", "+faststart", str(crudo)], check=True)
    print(f"✔ {crudo.name}: {T0}-{T1}s cubierto con la placa ruteada ({len(TOMAS)} tomas)")


if __name__ == "__main__":
    main()
