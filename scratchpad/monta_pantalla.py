"""Monta un grabado que YA trae la pantalla real abajo: solo escala y quema subtítulos.

A diferencia de `editor_grabados`, aquí NO se dibujan paneles: la mitad inferior es la
sesión real de ChatGPT que José grabó, y taparla con gráficos sería tapar justo lo que el
video enseña (regla de realidad).

Los subtítulos van JUSTO ENCIMA de la costura (y=894 de 1920), o sea sobre los hombros de
José: ahí no tapan su cara ni una sola línea de la pantalla. Es la única franja del cuadro
que no lleva información.

    .venv/bin/python scratchpad/monta_pantalla.py <stem>
"""
import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
def detecta_costura(src: Path, n_muestras: int = 8) -> int:
    """Dónde acaba la cara y empieza la pantalla, en el cuadro de 1920.

    La costura es la ÚNICA línea horizontal que está en todos los frames, porque es el
    borde del montaje y no del contenido. Por eso se toma el MÍNIMO del gradiente por fila
    entre varias muestras: una línea que solo aparece en algunos frames (el encabezado de
    un documento, el borde de una ventana) queda descartada por el consenso.

    Las heurísticas de un solo frame fallan: por brillo, el cuarto de José es tan claro
    como un plano en blanco; por saturación, la UI oscura de ChatGPT tiene tanto color
    como su camisa. Medido sobre jose13 y jose14, este método da 894 en los dos, con 0 y
    6 px de error.
    """
    import numpy as np
    from PIL import Image

    total = dur_video(src)
    perfiles = []
    for k in range(n_muestras):
        t = total * (k + 0.5) / n_muestras
        tmp = src.parent / f"_cs_{src.stem}_{k}.png"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.1f}",
                        "-i", str(src), "-frames:v", "1", str(tmp)], check=True)
        a = np.asarray(Image.open(tmp).convert("L"), dtype=float)
        perfiles.append(np.abs(np.diff(a.mean(axis=1))))
        tmp.unlink(missing_ok=True)
    consenso = np.array(perfiles).min(axis=0)
    n = len(consenso) + 1
    lo, hi = int(n * 0.25), int(n * 0.80)
    y = int(np.argmax(consenso[lo:hi])) + lo
    return int(round(y / n * 1920))



def sh(cmd):
    subprocess.run(cmd, check=True)


def dur_video(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("stem")
    ap.add_argument("--velocidad", type=float, default=1.0,
                    help="acelera imagen y voz; atempo no cambia el tono")
    ap.add_argument("--musica", help="cama de fondo bajo la voz")
    ap.add_argument("--music-gain", type=float, default=0.12)
    ap.add_argument("--music-offset", type=float, default=0.0,
                    help="desde qué segundo de la cama empezar (para encadenar tramos)")
    ap.add_argument("--tapa", action="append", default=[],
                    metavar="X:Y:W:H:T0:T1", help="bloque de privacidad")
    a = ap.parse_args()
    stem = a.stem

    from autoedit.config import load_config
    from autoedit.subtitles import build_ass

    src = RAIZ / f"{stem}.mp4"
    CARA_H = detecta_costura(src)
    print(f"  · costura detectada en y={CARA_H} de 1920", flush=True)
    wd = RAIZ / f"{stem}.autoedit"
    assets = RAIZ / f"{stem}.assets"
    assets.mkdir(exist_ok=True)
    cfg = load_config(None)

    words = json.loads((wd / "transcript.json").read_text(encoding="utf-8"))["words"]
    total = dur_video(src)
    # arranca en la primera palabra: un video NUNCA empieza en silencio
    ini_t = max(0.0, words[0]["start"] - 0.10)
    cola = total - words[-1]["end"]
    fin_t = min(total, words[-1]["end"] + 0.35) if cola > 0.8 else total
    F = a.velocidad
    print(f"→ {stem}: {total/60:.1f} min · se usa {ini_t:.2f}s → {fin_t:.2f}s"
          + (f" · velocidad ×{F}" if abs(F - 1.0) > 1e-3 else ""), flush=True)

    # los tiempos del subtítulo se dividen por el mismo factor que la imagen, o se desfasan
    ws = [{**w, "start": (w["start"] - ini_t) / F, "end": (w["end"] - ini_t) / F}
          for w in words if w["end"] > ini_t and w["start"] < fin_t]
    scfg = dict(cfg["subtitles"])
    # MarginV se mide desde ABAJO con Alignment 2: se deja todo el alto de la pantalla más
    # un respiro, así el renglón inferior queda pegado por encima de la costura.
    scfg["margin_v_ratio"] = (1920 - CARA_H + 14) / 1920.0
    ass = build_ass(ws, 1080, 1920, {**cfg, "subtitles": scfg}, assets / "subs.ass")
    print(f"  · {len(ws)} palabras de subtítulo, ancladas sobre la costura", flush=True)

    # TAPAS de privacidad: una grabación de pantalla enseña cosas que José no eligió
    # enseñar (rutas con su usuario corporativo, nombres de proyectos de clientes).
    tapas = ""
    for t in a.tapa:
        x, y, w, h, t0, t1 = (float(v) for v in t.split(":"))
        tapas += (f"drawbox=x={x:.0f}:y={y:.0f}:w={w:.0f}:h={h:.0f}:"
                  f"color=0x181818@1:t=fill:enable='between(t,{t0:.2f},{t1:.2f})',")
    if tapas:
        print(f"  · {len(a.tapa)} tapa(s) de privacidad", flush=True)

    salida = RAIZ / f"{stem}_final.mp4"
    vel_v = f"setpts=PTS/{F}," if abs(F - 1.0) > 1e-3 else ""
    vel_a = f"atempo={F}," if abs(F - 1.0) > 1e-3 else ""
    filtro = (
        f"[0:v]scale=1080:1920:flags=lanczos,{tapas}{vel_v}setsar=1[v0];"
        f"[v0]ass={ass.resolve()}[v];"
        f"[0:a]{vel_a}loudnorm=I=-14:TP=-1.5:LRA=11,"
        f"aformat=sample_rates=48000:channel_layouts=stereo[voz]"
    )
    entradas = ["-ss", f"{ini_t:.3f}", "-t", f"{fin_t - ini_t:.3f}", "-i", str(src)]
    salida_dur = (fin_t - ini_t) / F
    if a.musica:
        # La cama del canal dura 9.6 s: sin `-stream_loop` la musica se acaba al decimo
        # segundo y el resto del video queda con la voz seca. Se repite SOLO si no
        # alcanza, y `amix=duration=first` + el `-t` de salida la cortan: con
        # filter_complex, `-stream_loop -1` sin un corte duro escribe audio para siempre.
        if dur_video(Path(a.musica)) - a.music_offset < salida_dur:
            entradas += ["-stream_loop", "-1"]
        entradas += (["-ss", f"{a.music_offset:.3f}"] if a.music_offset else []) + \
                    ["-i", a.musica]
        # La voz manda y la cama va CONSTANTE, sin ducking: el ducking sube la música en
        # las pausas y la baja de golpe al volver la voz, y se oye como corte entre temas.
        filtro += (f";[1:a]volume={a.music_gain},"
                   f"aformat=sample_rates=48000:channel_layouts=stereo[cama];"
                   f"[voz][cama]amix=inputs=2:duration=first:dropout_transition=0:"
                   f"normalize=0[a]")
        print(f"  · cama al {a.music_gain:.0%}"
              + (f" desde el segundo {a.music_offset:.1f}" if a.music_offset else ""),
              flush=True)
    else:
        filtro += ";[voz]anull[a]"
    sh(["ffmpeg", "-y", "-loglevel", "error", *entradas,
        "-filter_complex", filtro, "-map", "[v]", "-map", "[a]",
        "-t", f"{salida_dur + 0.5:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
        "-r", "30", "-c:a", "aac", "-b:a", "192k", str(salida)])
    print(f"✔ {salida.name}  {dur_video(salida)/60:.2f} min", flush=True)


if __name__ == "__main__":
    main()
