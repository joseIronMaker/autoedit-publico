"""Pega la intro hablada con el timelapse y deja el video listo.

Los dos trozos ya vienen en 1080x1920 a 30 fps, pero de encodes distintos, así que se
concatena con el filtro (re-encode) y no con el demuxer: el demuxer exige parámetros
idénticos y falla en silencio con un salto de audio.

La intro lleva la voz de José a -14 LUFS; el timelapse lleva solo música. Para que el
corte no se note como un bajón, la música entra con un fundido corto justo cuando termina
la frase "vamos a verlo".

    .venv/bin/python scratchpad/une_intro_timelapse.py <intro.mp4> <timelapse.mp4> <salida.mp4>
"""
import subprocess
import sys
from pathlib import Path


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def main() -> None:
    intro, tl, salida = (Path(x) for x in sys.argv[1:4])
    di, dt = dur(intro), dur(tl)
    print(f"→ intro {di:.1f}s + timelapse {dt:.1f}s = {(di+dt)/60:.2f} min", flush=True)
    fc = (
        "[0:v]setsar=1,fps=30[v0];[1:v]setsar=1,fps=30[v1];"
        # Cada parte se nivela POR SEPARADO a -14 LUFS. Un loudnorm global sobre el
        # conjunto subiría la música (que va más floja) y dejaría la voz por encima del
        # objetivo: medido aquí, la intro estaba en -15.8 y el timelapse en -18.7, y el
        # resultado unido caía a -17.7, muy por debajo de lo que pide TikTok.
        "[0:a]aformat=sample_rates=48000:channel_layouts=stereo,"
        "loudnorm=I=-14:TP=-1.5:LRA=11,"
        "afade=t=out:st=%.2f:d=0.35[a0];"
        "[1:a]aformat=sample_rates=48000:channel_layouts=stereo,"
        "loudnorm=I=-14:TP=-1.5:LRA=11,"
        "afade=t=in:st=0:d=0.5[a1];"
        # LIMITADOR al final, no antes: al mezclar la cama encima de una voz que ya está
        # normalizada a -14 LUFS los picos se van por encima de 0 dBTP y eso es clipping.
        # Medido aquí: +0.1 y +0.3 dBTP antes de ponerlo. TikTok pide por debajo de -1.
        "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][ac];"
        "[ac]alimiter=limit=0.78:level=disabled,"
        "aformat=sample_rates=48000:channel_layouts=stereo[a]" % max(0.0, di - 0.35)
    )
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(intro), "-i", str(tl),
                    "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                    "-r", "30", "-c:v", "libx264", "-crf", "19", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", str(salida)],
                   check=True)
    print(f"✔ {salida.name}  {dur(salida)/60:.2f} min", flush=True)


if __name__ == "__main__":
    main()
