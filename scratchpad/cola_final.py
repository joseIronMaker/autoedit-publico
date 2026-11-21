"""Alarga el final de un video ya renderizado: congela el último fotograma ~0.7 s y
funde el audio, para que la voz y la música no se corten en seco.

No vuelve a sintetizar nada — trabaja sobre el mp4 terminado. Nació de que la última
escena no traía cola y el video acababa a 0.2 s de la última sílaba (José, 4-ago-2026).

    .venv/bin/python scratchpad/cola_final.py
"""
import subprocess
import sys
from pathlib import Path

DEST = Path("/mnt/c/Users/USUARIO/Downloads")
COLA = 0.75


def dur(p: Path) -> float:
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(p)]).strip())


def alarga(p: Path) -> None:
    d = dur(p)
    tmp = p.with_suffix(".cola.mp4")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(p),
         "-vf", f"tpad=stop_mode=clone:stop_duration={COLA}",
         "-af", f"apad=pad_dur={COLA},afade=t=out:st={d - 0.35:.3f}:d={COLA + 0.35:.3f}",
         "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", str(tmp)],
        check=True, timeout=600)
    tmp.replace(p)
    print(f"  {p.name}: {d:.1f}s → {dur(p):.1f}s")


for f in sorted(DEST.glob("ver0*.mp4")):
    alarga(f)
print("listo")
