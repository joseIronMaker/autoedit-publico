#!/usr/bin/env python3
"""Tapas de privacidad AUTOMÁTICAS a partir del OCR del corte sin subtítulos.

En esta sesión la ruta `C:/Users/USUARIO/...` sale en tres sitios que cambian de
lugar según la ventana al frente: la pestaña `file:///C:/Users/...` del navegador, la
barra de direcciones con el PDF de la ESP32 y el árbol de carpetas de EasyEDA Pro (más
el «Licensed to: <cuenta>» de su barra de título). Con 14 piezas no se pueden medir a
mano como en `_j1010/tapas.py`, así que aquí el OCR da la caja Y el momento:

  · se leen a 2 fps los cuadros de la pantalla que cambiaron (igual que ocr_barrido.py);
  · cada texto sospechoso da una caja que vale desde medio segundo antes de leerla hasta
    el siguiente cuadro leído (entre dos lecturas la pantalla no cambió);
  · las cajas del mismo sitio se unen si se repiten a menos de PUENTE s — el OCR no lee
    la misma pestaña en todos los cuadros, y un hueco de su lectura es una fuga;
  · cada caja se pinta con el color MEDIANO de su borde, para que se lea como un campo
    vacío y no como un parche.

Escribe `piezas/<id>_tapas.txt` (drawbox en tiempo de SALIDA). Luego `corta.py requemar`.

    .venv/bin/python scratchpad/_j1011/tapas_ocr.py <id-pieza> [...]
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR

PIEZAS = Path(__file__).resolve().parent / "piezas"
Y0, H = 213, 612
FPS = 2
ESCALA = 2.5
PUENTE = 8.0
SOSPECHA = re.compile(r"(\.JOSE|JOSE\\|J0SE|Users\\L|Users/L|"
                      r"[1%]rs/|f[il]{1,2}k?e?:?/{2,}|Licensed)", re.I)


def iou(a, b):
    x0, y0 = max(a[0], b[0]), max(a[1], b[1])
    x1, y1 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x1 - x0) * max(0, y1 - y0)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua else 0.0


def color_borde(fr, x0, y0, x1, y1):
    h, w = fr.shape[:2]
    ax0, ay0, ax1, ay1 = max(0, x0 - 3), max(0, y0 - 3), min(w, x1 + 3), min(h, y1 + 3)
    zona = fr[ay0:ay1, ax0:ax1].reshape(-1, 3).astype(np.float32)
    mask = np.ones((ay1 - ay0, ax1 - ax0), bool)
    mask[3:-3, 3:-3] = False
    b, g, r = np.median(zona[mask.reshape(-1)], axis=0)
    return f"0x{int(r):02X}{int(g):02X}{int(b):02X}"


def lee(mp4: Path, ocr) -> list[dict]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf",
                          f"fps={FPS},crop=1080:{H}:0:{Y0}", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
    n = len(raw) // (1080 * H * 3)
    fr = np.frombuffer(raw, np.uint8)[: n * 1080 * H * 3].reshape(n, H, 1080, 3)
    leidos, hits, ultimo = [], [], None
    for i in range(n):
        peq = cv2.resize(cv2.cvtColor(fr[i], cv2.COLOR_BGR2GRAY), (270, 153)).astype(np.float32)
        if ultimo is not None and np.abs(peq - ultimo).mean() < 0.6:
            continue
        ultimo = peq
        leidos.append(i / FPS)
        r, _ = ocr(cv2.resize(fr[i], None, fx=ESCALA, fy=ESCALA, interpolation=cv2.INTER_CUBIC))
        for caja, txt, _c in (r or []):
            if not (SOSPECHA.search(txt) or SOSPECHA.search(txt.replace("O", "0").replace("o", "0"))):
                continue
            xs = [p[0] / ESCALA for p in caja]
            ys = [p[1] / ESCALA for p in caja]
            x0, y0 = int(min(xs)) - 4, int(min(ys)) - 3
            x1, y1 = int(max(xs)) + 4, int(max(ys)) + 3
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(1080, x1), min(H, y1)
            hits.append({"t": i / FPS, "caja": [x0, y0, x1, y1], "txt": txt,
                         "color": color_borde(fr[i], x0, y0, x1, y1)})
    # cada lectura vale hasta el siguiente cuadro leído
    sig = {t: (leidos[k + 1] if k + 1 < len(leidos) else n / FPS) for k, t in enumerate(leidos)}
    for h in hits:
        h["t0"], h["t1"] = max(0.0, h["t"] - 0.5), sig[h["t"]] + 0.25
    return hits


def agrupa(hits: list[dict]) -> list[dict]:
    grupos: list[dict] = []
    for h in sorted(hits, key=lambda h: h["t0"]):
        for g in grupos:
            if iou(g["caja"], h["caja"]) > 0.3 and h["t0"] - g["t1"] < PUENTE:
                g["caja"] = [min(g["caja"][0], h["caja"][0]), min(g["caja"][1], h["caja"][1]),
                             max(g["caja"][2], h["caja"][2]), max(g["caja"][3], h["caja"][3])]
                g["t1"] = max(g["t1"], h["t1"])
                break
        else:
            grupos.append(dict(h))
    return grupos


def main():
    ocr = RapidOCR()
    for pid in sys.argv[1:]:
        crudo = PIEZAS / f"{pid}_crudo.mp4"
        hits = lee(crudo, ocr)
        grupos = agrupa(hits)
        cajas = []
        for g in grupos:
            x0, y0, x1, y1 = g["caja"]
            cajas.append(f"drawbox=x={x0}:y={y0 + Y0}:w={x1 - x0}:h={y1 - y0}:"
                         f"color={g['color']}@1:t=fill:enable='between(t,{g['t0']:.2f},{g['t1']:.2f})'")
        (PIEZAS / f"{pid}_tapas.txt").write_text(",".join(cajas))
        (PIEZAS / f"{pid}_tapas.json").write_text(json.dumps(grupos, ensure_ascii=False, indent=1))
        print(f"{pid}: {len(hits)} lecturas sospechosas → {len(cajas)} tapas", flush=True)
        for g in grupos:
            print(f"    {g['t0']:7.1f}-{g['t1']:7.1f}s  {g['caja']}  «{g['txt'][:50]}»", flush=True)


if __name__ == "__main__":
    main()
