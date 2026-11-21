#!/usr/bin/env python3
"""Barrido OCR de la pantalla de cada pieza YA QUEMADA: busca el usuario corporativo
(C:\\Users\\USUARIO) en cualquier ventana. La plantilla de píxeles de _j21 sirve para una
sola fuente; aquí hay tres apps distintas (Claude, FreeCAD, el Explorador), por eso OCR.
Muestrea a 2 fps y sólo lee los cuadros que cambiaron respecto al último leído.

    .venv/bin/python scratchpad/_j1010/ocr_barrido.py <id-pieza> [...]
"""
import re, subprocess, sys
from pathlib import Path
import numpy as np, cv2
from rapidocr_onnxruntime import RapidOCR

PIEZAS = Path(__file__).resolve().parent / "piezas"
SOSPECHA = re.compile(r"(\.JOSE|JOSE\\|Users\\L)", re.I)
FPS = 2

def main():
    ocr = RapidOCR()
    for pid in sys.argv[1:]:
        mp4 = PIEZAS / f"{pid}.mp4"
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf",
                              f"fps={FPS},crop=1080:612:0:213", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                             capture_output=True, check=True).stdout
        n = len(raw) // (1080 * 612 * 3)
        fr = np.frombuffer(raw, np.uint8)[: n * 1080 * 612 * 3].reshape(n, 612, 1080, 3)
        ultimo, leidos, hits = None, 0, []
        for i in range(n):
            peq = cv2.resize(cv2.cvtColor(fr[i], cv2.COLOR_BGR2GRAY), (270, 153)).astype(np.float32)
            if ultimo is not None and np.abs(peq - ultimo).mean() < 0.6:
                continue
            ultimo = peq; leidos += 1
            r, _ = ocr(cv2.resize(fr[i], None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC))
            for caja, txt, _c in (r or []):
                if SOSPECHA.search(txt.replace("O", "0").replace("o", "0")) or SOSPECHA.search(txt):
                    hits.append((i / FPS, txt))
                    cv2.imwrite(str(PIEZAS / f"_ocr_{pid}_{i / FPS:06.1f}.png"), fr[i])
        print(f"{pid}: {n} cuadros, {leidos} leídos, {len(hits)} sospechas", flush=True)
        for t, txt in hits:
            print(f"    {t:6.1f}s  «{txt}»", flush=True)

if __name__ == "__main__":
    main()
