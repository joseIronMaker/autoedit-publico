#!/usr/bin/env python3
"""Puerta de entrega de las piezas REPARADAS (piezas_v2) de «PCB con IA».

El cuerpo de cada pieza ya pasó verifica.py + barrido OCR en su versión original; lo que
cambió es el ARRANQUE (gancho.py), así que aquí se mide lo que ese cambio puede romper:
  · el mp4 lee entero (final sin `moov` = fallo mudo que solo revienta en TikTok);
  · dura gancho + (pieza − recorte inicial), ±0.4 s;
  · el cuadro 0 (la portada) no es negro y la mitad de arriba trae la placa (luma);
  · el audio no quedó mudo ni saturado alrededor de la unión;
  · el copy nuevo no empieza por «PCB con IA, parte» y termina en pregunta.
Deja además una tira de los primeros 8 s en piezas_v2/_tira_<id>.png para mirarla.

    .venv/bin/python scratchpad/_j1011/verifica_v2.py [id ...]
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
V2 = AQUI / "piezas_v2"


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)


def luma(p: Path, t: float, crop: str) -> float:
    r = subprocess.run(["ffmpeg", "-v", "info", "-ss", f"{t}", "-i", str(p), "-frames:v", "1",
                        "-vf", f"crop={crop},scale=64:64,format=gray,signalstats,"
                               "metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = re.search(r"YAVG=([\d.]+)", r)
    return float(m.group(1)) if m else -1


def volumen(p: Path, a: float, d: float) -> float:
    r = subprocess.run(["ffmpeg", "-v", "info", "-ss", f"{a}", "-t", f"{d}", "-i", str(p),
                        "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"mean_volume: (-?[\d.]+) dB", r)
    return float(m.group(1)) if m else -99


def revisa(pid: str) -> list[str]:
    mp4, meta = V2 / f"{pid}.mp4", V2 / f"_{pid}.json"
    if not mp4.exists() or not meta.exists():
        return [f"FALLO {pid}: no existe la pieza o su .json"]
    f = []
    d = dur(mp4)
    err = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, d - 3):.2f}", "-i", str(mp4),
                          "-f", "null", "-"], capture_output=True, text=True).stderr.strip()
    if err:
        f.append(f"FALLO {pid}: no lee hasta el final ({err[:120]})")
    m = json.loads(meta.read_text())
    original = dur(AQUI / "piezas" / f"{pid}.mp4")
    esperado = (m["b"] - m["a"]) + original - m["t0"]
    if abs(d - esperado) > 0.4:
        f.append(f"FALLO {pid}: dura {d:.1f}s y debía {esperado:.1f}s")
    arriba, abajo = luma(mp4, 0, "1080:824:0:0"), luma(mp4, 0, "1080:1096:0:824")
    if arriba < 25 or abajo < 25:
        f.append(f"FALLO {pid}: portada oscura (arriba {arriba:.0f}, abajo {abajo:.0f})")
    g = m["b"] - m["a"]
    for nombre, a in (("gancho", 0.2), ("unión", max(0, g - 1)), ("pieza", g + 2)):
        v = volumen(mp4, a, 2.0)
        if v < -40 or v > -6:
            f.append(f"FALLO {pid}: audio raro en {nombre} ({v:.1f} dB medio)")
    copy = (AQUI / "copys_v2" / f"{pid[:3]}_copy_tiktok.txt").read_text(encoding="utf-8").strip()
    if copy.startswith("PCB con IA, parte"):
        f.append(f"FALLO {pid}: el copy sigue abriendo con «PCB con IA, parte»")
    if not copy.endswith("?"):
        f.append(f"FALLO {pid}: el copy no termina en la pregunta A-o-B")
    if re.search(r"\b(sígueme|guárdalo|comenta|dale like)\b", copy, re.I):
        f.append(f"FALLO {pid}: CTA directo en el copy")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4), "-vf",
                    "select='lt(t,8)*not(mod(n,20))',scale=180:320,tile=12x1", "-frames:v", "1",
                    str(V2 / f"_tira_{pid}.png")])
    print(f"{'OK ' if not f else 'MAL'} {pid}: {d:.1f}s · gancho {g:.1f}s · recorte {m['t0']:.2f}s · "
          f"portada luma {arriba:.0f}/{abajo:.0f}", flush=True)
    return f


def main() -> None:
    ids = sys.argv[1:] or sorted(p.stem for p in V2.glob("p[01][0-9]_*.mp4"))
    fallos = [x for pid in ids for x in revisa(pid)]
    for x in fallos:
        print(x)
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
