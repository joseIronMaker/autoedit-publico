"""Timelapse de una grabación de pantalla horizontal, con el ENCUADRE decidido por tramo.

Por qué partida y no a pantalla completa: la grabación es un escritorio con las dos
ventanas lado a lado (el chat de la IA y el CAD). Metida entera en vertical se vería
minúscula; recortando cada ventana y apilándolas, las dos llenan 1080 de ancho y se leen.

La VELOCIDAD tampoco es única: los tramos donde la IA solo piensa vuelan y los que
importan van despacio. Y el ENCUADRE cambia con el tramo, porque a mitad de la sesión la
ventana de arriba deja de ser la app de escritorio y pasa a ser la terminal, la de abajo
deja de ser el CAD y pasa a ser el simulador, y a veces el visor 3D se abre flotando en
otro sitio. Por eso los encuadres son LAYOUTS CON NOMBRE que se definen por CLI: cada
grabación tiene su propio escritorio y las constantes de la anterior salen estiradas.

El de arriba se recorta a propósito por la izquierda para dejar FUERA la barra lateral
del chat, que lista nombres de proyectos de clientes.

Cada recorte debe respetar la proporción del hueco donde cae (1.125 = 1080x960 en el
apilado, 1080 de ancho en el apaisado) o la imagen sale estirada.

    .venv/bin/python scratchpad/timelapse_pantalla.py <fuente.mp4> <salida.mp4> \
        --layout chat=700x622+250+300/960x853+960+120 \
        --layout code=570x507+6+430/988x878+588+2 \
        --layout viz=solo:940x910+730+88 \
        --zona 0:900:45:chat --zona 900:17555:900:code \
        --musica autoedit/assets/bed_techno_drop.m4a --music-gain 0.85
"""
import argparse
import re
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FPS = 30
GEO = re.compile(r"^(\d+)x(\d+)\+(\d+)\+(\d+)$")


def geo(s: str):
    m = GEO.match(s)
    if not m:
        raise SystemExit(f"geometría inválida: {s} (usa WxH+X+Y)")
    return tuple(int(v) for v in m.groups())      # w, h, x, y


def parse_layout(s: str):
    """NOMBRE=arriba/abajo   ·   NOMBRE=solo:recorte"""
    if "=" not in s:
        raise SystemExit(f"layout sin '=': {s}")
    nombre, cuerpo = s.split("=", 1)
    if cuerpo.startswith("solo:"):
        return nombre, ("solo", geo(cuerpo[5:]))
    if "/" not in cuerpo:
        raise SystemExit(f"layout apilado sin '/': {s}")
    arriba, abajo = cuerpo.split("/", 1)
    return nombre, ("apilado", geo(arriba), geo(abajo))


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("fuente")
    ap.add_argument("salida")
    ap.add_argument("--layout", action="append", required=True,
                    help="NOMBRE=WxH+X+Y/WxH+X+Y (arriba/abajo) o NOMBRE=solo:WxH+X+Y")
    ap.add_argument("--zona", action="append", required=True, help="INI:FIN:FACTOR:LAYOUT")
    ap.add_argument("--musica")
    ap.add_argument("--music-gain", type=float, default=0.55)
    a = ap.parse_args()

    layouts = dict(parse_layout(s) for s in a.layout)
    zonas = []
    for z in a.zona:
        p = z.split(":")
        if len(p) != 4:
            raise SystemExit(f"zona inválida: {z} (usa INI:FIN:FACTOR:LAYOUT)")
        if p[3] not in layouts:
            raise SystemExit(f"layout desconocido: {p[3]} (definidos: {', '.join(layouts)})")
        zonas.append((float(p[0]), float(p[1]), float(p[2]), p[3]))
    # el orden de las ramas es el CRONOLÓGICO: se concatenan en ese orden
    orden = list(dict.fromkeys(z[3] for z in sorted(zonas)))

    salida_prev = 0.0
    print(f"→ {Path(a.fuente).name}: {dur(Path(a.fuente))/60:.1f} min", flush=True)
    for ini, fin, k, lay in zonas:
        d = (fin - ini) / k
        salida_prev += d
        print(f"   {ini/60:6.1f}–{fin/60:6.1f} min  ×{k:<4.0f} → {d:5.1f}s  [{lay}]",
              flush=True)
    print(f"   TOTAL {salida_prev:.1f}s", flush=True)

    def sel(grupo):
        # UN solo select con expresión por tramos: así el fuente se decodifica una vez.
        # Con un `trim` por zona se decodificaría el h264 entero una vez por zona.
        return "+".join(f"(between(t,{i:.3f},{f:.3f})*not(mod(n,{int(k)})))"
                        for i, f, k, _ in grupo)

    ramas, partes = [], []
    for lay in orden:
        grupo = [z for z in zonas if z[3] == lay]
        e, et = sel(grupo), f"[g{lay}]"
        modo = layouts[lay]
        if modo[0] == "apilado":
            (w1, h1, x1, y1), (w2, h2, x2, y2) = modo[1], modo[2]
            ramas.append(
                f"[0:v]select='{e}',setpts=N/{FPS}/TB,split=2[t{lay}][d{lay}];"
                f"[t{lay}]crop={w1}:{h1}:{x1}:{y1},scale=1080:960:flags=lanczos,"
                f"setsar=1[top{lay}];"
                f"[d{lay}]crop={w2}:{h2}:{x2}:{y2},scale=1080:960:flags=lanczos,"
                f"setsar=1[bot{lay}];"
                f"[top{lay}][bot{lay}]vstack=inputs=2" + et)
        else:
            # Un 16:9 dentro de un 9:16 deja dos tercios en negro. En vez de barras se
            # pone una copia AMPLIADA y desenfocada del mismo frame de fondo: es lo que
            # hace que se lea como una decisión y no como un video mal encajado. Aquí el
            # blur SÍ se puede (es ffmpeg, no el raster por software de Chrome en WSL2).
            w, h, x, y = modo[1]
            ramas.append(
                f"[0:v]select='{e}',setpts=N/{FPS}/TB,crop={w}:{h}:{x}:{y},"
                f"split=2[ff{lay}][fb{lay}];"
                f"[fb{lay}]scale=1080:1920:force_original_aspect_ratio=increase,"
                f"crop=1080:1920,gblur=sigma=42,eq=brightness=-0.22:saturation=0.55[bg{lay}];"
                f"[ff{lay}]scale=1080:-2:flags=lanczos[fg{lay}];"
                f"[bg{lay}][fg{lay}]overlay=0:(H-h)/2:format=auto,setsar=1" + et)
        partes.append(et)
    fc = ";".join(ramas)

    # UNA salida por layout, no un `concat` en el filtro. Con concat, ffmpeg le pide
    # frames a la primera rama hasta el final del video y las otras tres tienen que
    # GUARDAR en RAM todo lo que producen mientras tanto: 21 s de 1080x1920 son 2 GB por
    # rama y la máquina se queda sin memoria a media sesión ("Cannot allocate memory",
    # medido el 30-ago-2026 con las 4 zonas de robot.mp4). Escribiendo un archivo por
    # rama, cada frame sale a disco en cuanto está, y los trozos se pegan después con el
    # demuxer concat sin recodificar.
    salida = Path(a.salida)
    trozos = [salida.with_name(f"{salida.stem}_p{i}{salida.suffix}")
              for i in range(len(partes))]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", a.fuente,
           "-filter_complex", fc]
    for et, trozo in zip(partes, trozos):
        cmd += ["-map", et, "-an", "-r", str(FPS), "-c:v", "libx264", "-crf", "18",
                "-preset", "medium", "-pix_fmt", "yuv420p", str(trozo)]
    subprocess.run(cmd, check=True)

    lista = salida.with_suffix(".txt")
    lista.write_text("".join(f"file '{t.resolve()}'\n" for t in trozos), encoding="utf-8")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
           "-i", str(lista)]
    fc = ""
    if a.musica:
        # Solo se repite la música si NO alcanza. Con `-stream_loop -1` la entrada nunca
        # termina y `-shortest` no la corta cuando la salida sale de un `filter_complex`:
        # ffmpeg se queda escribiendo audio para siempre. Pasó el 26-ago-2026 — el video
        # llevaba 40 min terminado y el archivo seguía creciendo a 1.7 MB/min, la tasa
        # exacta de un aac de 192 kbps. Además va `-t`, que sí corta seguro.
        if dur(Path(a.musica)) < salida_prev:
            cmd += ["-stream_loop", "-1"]
        cmd += ["-i", a.musica]
        fc = (f"[1:a]volume={a.music_gain},"
              f"afade=t=out:st={max(0.0, salida_prev-1.6):.2f}:d=1.6[a]")
        cmd += ["-filter_complex", fc, "-map", "0:v", "-map", "[a]",
                "-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-map", "0:v", "-an"]
    cmd += ["-t", f"{salida_prev:.3f}", "-c:v", "copy", str(salida)]
    subprocess.run(cmd, check=True)
    for t in trozos:
        t.unlink(missing_ok=True)
    lista.unlink(missing_ok=True)
    print(f"✔ {salida.name}  {dur(salida):.1f}s", flush=True)


if __name__ == "__main__":
    main()
