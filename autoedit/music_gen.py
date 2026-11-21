"""Cama musical GENERADA por video (Gemini Lyria 3).

Sustituye a Kie/Suno: un clip instrumental (~30s) generado con el estilo del video,
encadenado consigo mismo con crossfades para que el loop de ``render.py``
(``-stream_loop -1``) nunca pegue un corte seco. La cama sigue siendo CONSTANTE
(regla del canal: sin sidechain/ducking).

Convención: se guarda como ``<stem>.assets/music.m4a`` — render.py la usa con
prioridad sobre la cama global de config (``render.music``).
"""
from __future__ import annotations

import subprocess
from pathlib import Path

# copias del clip encadenadas con crossfade → ~115s de cama fluida (cubre corto y largo);
# a partir de ahí el -stream_loop de render.py repite con un seam ya suavizado.
_COPIES = 4
_XFADE_S = 1.5


def build_music_bed(prompt: str, out_path: Path, router) -> Path:
    """Genera el clip con Lyria y lo deja como cama .m4a lista para render.py."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    clip_bytes = router.generate_music(prompt)
    raw = out_path.with_suffix(".clip.mp3")
    raw.write_bytes(clip_bytes)
    try:
        dur = float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(raw)], capture_output=True, text=True,
        ).stdout.strip() or 0)
        if dur >= 100:
            # lyria-3-pro: pista completa (~3 min) — solo transcodificar, sin encadenar
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
                 "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(out_path)],
                check=True, timeout=300,
            )
            return out_path
        # lyria-3-clip (~30s): encadenar copias con crossfade → cama fluida
        inputs: list[str] = []
        for _ in range(_COPIES):
            inputs += ["-i", str(raw)]
        # cadena de acrossfades: [0][1]→[x1]; [x1][2]→[x2]; …
        fc = []
        prev = "0:a"
        for i in range(1, _COPIES):
            nxt = f"x{i}"
            fc.append(f"[{prev}][{i}:a]acrossfade=d={_XFADE_S}:c1=tri:c2=tri[{nxt}]")
            prev = nxt
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", *inputs,
             "-filter_complex", ";".join(fc), "-map", f"[{prev}]",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(out_path)],
            check=True, timeout=300,
        )
    finally:
        raw.unlink(missing_ok=True)
    return out_path
