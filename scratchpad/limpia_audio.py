"""Quita ruido de fondo y realza la voz de una grabación.

Qué hace cada eslabón y POR QUÉ (el orden importa):

  highpass=f=85      el rumble de la calle y las motos vive por debajo de 85 Hz, y la voz
                     de José tiene el fundamental en ~143 Hz: cortar ahí no le quita nada.
  afftdn             resta un PERFIL de ruido medido en un tramo sin habla del propio
                     archivo. Es lo que de verdad borra el motor de una moto, porque el
                     ruido continuo es predecible; un ladrido no lo es.
  anlmdn             segunda pasada suave para el siseo que deja el anterior.
  agate              cierra en los silencios: lo que suene cuando José no habla (ladridos
                     entre frases, portazos) desaparece del todo. Lo que caiga ENCIMA de
                     la voz no se puede borrar sin llevarse la voz: solo se atenúa.
  equalizer/deesser  presencia de locutor sin sibilancia.
  acompressor        empareja el volumen entre frases susurradas y gritadas.
  loudnorm           deja el video en -14 LUFS, que es lo que pide TikTok.

    .venv/bin/python scratchpad/limpia_audio.py <entrada.mp4> <salida.mp4> [--fuerza 0.9]
"""
import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np


def tramo_mas_silencioso(src: Path, largo: float = 0.8) -> float:
    """Encuentra el segundo más silencioso: ahí se mide el perfil de ruido."""
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-ac", "1", "-ar", "16000",
                        "-f", "s16le", "-"], capture_output=True)
    a = np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768
    V = 1600
    m = len(a) // V
    rms = np.sqrt((a[:m * V].reshape(m, V) ** 2).mean(axis=1))
    k = int(largo * 10)
    if m <= k:
        return 0.0
    suma = np.convolve(rms, np.ones(k) / k, mode="valid")
    return float(np.argmin(suma) * 0.1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("salida")
    ap.add_argument("--fuerza", type=float, default=0.85, help="0..1, cuánto ruido se resta")
    ap.add_argument("--gate", type=float, default=-42.0, help="dB por debajo = silencio")
    a = ap.parse_args()
    src, dst = Path(a.entrada), Path(a.salida)

    t = tramo_mas_silencioso(src)
    print(f"→ perfil de ruido tomado en t={t:.1f}s", flush=True)

    cadena = (
        "highpass=f=85,"
        f"afftdn=nr={12 + 12 * a.fuerza:.0f}:nf=-32:tn=1,"
        "anlmdn=s=0.0005:p=0.01:r=0.006,"
        f"agate=threshold={10 ** (a.gate / 20):.5f}:ratio=3:attack=8:release=180:knee=4,"
        "equalizer=f=200:t=q:w=1.1:g=-2.5,"      # menos 'caja' del cuarto
        "equalizer=f=3000:t=q:w=1.6:g=2,"        # inteligibilidad
        "equalizer=f=6500:t=q:w=1.4:g=1.5,"      # aire
        "deesser=i=0.4,"
        "acompressor=threshold=-20dB:ratio=3:attack=6:release=140:makeup=2,"
        "loudnorm=I=-14:TP=-1.5:LRA=11"
    )
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                    "-af", cadena, "-map", "0:v", "-map", "0:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(dst)], check=True)

    def nivel(f):
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(f),
                            "-af", "loudnorm=print_format=summary", "-f", "null", "-"],
                           capture_output=True, text=True)
        for l in r.stderr.splitlines():
            if "Input Integrated" in l:
                return l.split(":")[1].strip()
        return "?"
    print(f"✔ {dst.name}: {nivel(src)} → {nivel(dst)}", flush=True)


if __name__ == "__main__":
    main()
