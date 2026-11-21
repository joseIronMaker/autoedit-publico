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
SOSPECHA = re.compile(r"(\.JOSE|JOSE\\|J0SE|Users\\L|Users/L)", re.I)
FPS = 2

# Piezas que YA pasaron un barrido completo (post_*.log, 12-oct): al requemarlas con tapas
# pixeladas y subtítulos corregidos, la pantalla solo cambia dentro de las ventanas de las
# tapas (y en p12, en el tramo que cubre el visor 3D gris). Barrer de nuevo las 2 h de OCR
# no aporta nada: se barren solo esos tramos, con 3 s de margen.
BARRIDAS = {"p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10", "p11",
            "p12", "p13", "p14"}
EXTRA = {"p12": [(32.0, 55.5)]}


def ventanas_cambiadas(pid):
    if pid[:3] not in BARRIDAS:
        return None
    txt = (PIEZAS / f"{pid}_tapas.txt")
    v = [(float(a), float(b)) for a, b in
         re.findall(r"between\(t,([\d.]+),([\d.]+)\)", txt.read_text() if txt.exists() else "")]
    v = sorted([(max(0.0, a - 3), b + 3) for a, b in v + EXTRA.get(pid[:3], [])])
    junt = []
    for a, b in v:
        if junt and a <= junt[-1][1]:
            junt[-1] = (junt[-1][0], max(junt[-1][1], b))
        else:
            junt.append((a, b))
    return junt

def main():
    ocr = RapidOCR()
    for pid in sys.argv[1:]:
        mp4 = PIEZAS / f"{pid}.mp4"
        ventanas = ventanas_cambiadas(pid)
        if ventanas is None:
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf",
                                  f"fps={FPS},crop=1080:612:0:213", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                                 capture_output=True, check=True).stdout
        else:
            # solo los tramos que cambiaron respecto a la versión ya barrida entera
            raw = b"".join(subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.2f}", "-t", f"{b - a:.2f}",
                                           "-i", str(mp4), "-vf", f"fps={FPS},crop=1080:612:0:213",
                                           "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                                          capture_output=True, check=True).stdout for a, b in ventanas)
            print(f"{pid}: barrido parcial, {len(ventanas)} tramos cambiados", flush=True)
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
