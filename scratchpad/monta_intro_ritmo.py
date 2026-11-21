"""Monta un grabado de pantalla con RITMO VARIABLE: la voz a su velocidad, lo demás vuela.

Un grabado en directo no tiene un solo ritmo. José explica durante minuto y medio y
después se queda callado mirando cómo su simulación hace el trabajo: dos, tres, seis
minutos seguidos sin una palabra. Cortar esos huecos deja saltos secos y tira justo lo
que el video promete enseñar (el robot moviéndose); dejarlos, mata el video.

Por eso cada TRAMO trae su propia velocidad:
  · `voz`    → imagen y audio a `--velocidad` (atempo no cambia el tono)
  · `rápido` → solo imagen, factor libre, audio en silencio: la simulación sigue viéndose,
               pero en segundos en vez de minutos
  · `voz@A:B` → la voz de un tramo con la IMAGEN de otro. Es el cold-open: se oye la
               primera frase mientras se ve el final (el brazo ya trabajando), porque la
               regla del canal es abrir con el resultado, no con la cara.

La VELOCIDAD DE LA VOZ no se elige de oído: se mide en palabras por minuto. El rango que
funcionó en los grabados de José es 194-201 ppm; el mismo ×1.4 que sirvió cuando hablaba
a 138 ppm lo dejaría en 243 y suena a ardilla. El script imprime las dos cifras.

    .venv/bin/python scratchpad/monta_intro_ritmo.py fuente.mp4 salida.mp4 \
        --transcript t.json --velocidad 1.15 \
        --tramo 0:3.40@410:424 --tramo 3.40:21.34 --tramo 21.34:44.96:16 \
        --musica autoedit/assets/bed_techno_build.m4a --music-gain 0.28
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

# la misma cadena de limpia_audio.py, sin el afftdn/anlmdn: aquí la fuente es un headset
# y el ruido continuo no llega a justificar los artefactos que deja la resta espectral
LIMPIEZA = ("highpass=f=85,"
            "equalizer=f=200:t=q:w=1.1:g=-2.5,"
            "equalizer=f=3000:t=q:w=1.6:g=2,"
            "equalizer=f=6500:t=q:w=1.4:g=1.5,"
            "deesser=i=0.4,"
            "acompressor=threshold=-20dB:ratio=3:attack=6:release=140:makeup=2")


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def carga_palabras(p: Path) -> list[dict]:
    """Acepta el transcript de autoedit y el que escribe faster-whisper a pelo."""
    d = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(d, dict) and "words" in d:
        return [{"word": w["word"], "start": w["start"], "end": w["end"]} for w in d["words"]]
    out = []
    for seg in d:
        for w in seg.get("words") or []:
            if w.get("s") is None:
                continue
            out.append({"word": w["w"], "start": w["s"], "end": w["e"]})
    return out


def parse_tramo(s: str, vel: float):
    """INI:FIN | INI:FIN:FACTOR | INI:FIN@VINI:VFIN"""
    vid = None
    if "@" in s:
        s, v = s.split("@", 1)
        vi, vf = (float(x) for x in v.split(":"))
        vid = (vi, vf)
    p = [float(x) for x in s.split(":")]
    ini, fin = p[0], p[1]
    factor = p[2] if len(p) > 2 else vel
    return {"ini": ini, "fin": fin, "factor": factor, "voz": len(p) <= 2, "vid": vid}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("fuente")
    ap.add_argument("salida")
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--tramo", action="append", required=True)
    ap.add_argument("--velocidad", type=float, default=1.15)
    ap.add_argument("--sub-base", type=int, default=880,
                    help="y (de 1920) donde se apoya el renglón de subtítulo")
    ap.add_argument("--sub-size", type=float, default=0.055)
    ap.add_argument("--musica")
    ap.add_argument("--music-gain", type=float, default=0.45)
    ap.add_argument("--sin-limpieza", action="store_true")
    a = ap.parse_args()

    from autoedit.config import load_config
    from autoedit.subtitles import build_ass

    src = Path(a.fuente)
    tramos = [parse_tramo(t, a.velocidad) for t in a.tramo]
    palabras = carga_palabras(Path(a.transcript))

    # ── mapa de tiempos: cada tramo ocupa un hueco en la línea de tiempo de salida
    t_out = 0.0
    for tr in tramos:
        tr["dur"] = (tr["fin"] - tr["ini"]) / tr["factor"]
        tr["out"] = t_out
        t_out += tr["dur"]
    voz_src = sum(tr["fin"] - tr["ini"] for tr in tramos if tr["voz"])
    dichas = [w for w in palabras
              if any(tr["voz"] and tr["ini"] <= w["start"] < tr["fin"] for tr in tramos)]
    print(f"→ {src.name}: {len(tramos)} tramos → {t_out:.1f}s ({t_out/60:.2f} min)", flush=True)
    print(f"   voz {voz_src:.1f}s de fuente a ×{a.velocidad} = {voz_src/a.velocidad:.1f}s"
          f" · {len(dichas)} palabras · {len(dichas)/(voz_src/a.velocidad)*60:.0f} ppm",
          flush=True)
    for tr in tramos:
        tipo = "voz " if tr["voz"] else f"×{tr['factor']:<4.0f}"
        extra = f"  imagen {tr['vid'][0]:.1f}-{tr['vid'][1]:.1f}" if tr["vid"] else ""
        print(f"   {tr['ini']:7.2f}–{tr['fin']:7.2f}  {tipo} → {tr['dur']:5.2f}s{extra}",
              flush=True)

    # ── subtítulos: la palabra viaja al hueco de SU tramo, con su factor
    ws = []
    for w in palabras:
        for tr in tramos:
            if tr["voz"] and tr["ini"] <= w["start"] < tr["fin"]:
                ws.append({**w,
                           "start": tr["out"] + (w["start"] - tr["ini"]) / tr["factor"],
                           "end": tr["out"] + (min(w["end"], tr["fin"]) - tr["ini"]) / tr["factor"]})
                break
    cfg = load_config(None)
    scfg = dict(cfg["subtitles"])
    # MarginV se mide desde ABAJO con Alignment 2: el renglón se apoya en `sub_base`, que
    # es la costura entre la ventana de arriba y la pantalla de abajo — la única franja
    # del cuadro sin información, y bien lejos de la UI de TikTok (330 px de abajo).
    scfg["margin_v_ratio"] = (1920 - a.sub_base) / 1920.0
    scfg["size_ratio"] = a.sub_size
    assets = Path(a.salida).parent
    ass = build_ass(ws, 1080, 1920, {**cfg, "subtitles": scfg}, assets / "subs_intro.ass")
    print(f"   {len(ws)} palabras de subtítulo sobre y={a.sub_base}", flush=True)

    # ── un archivo POR TRAMO y luego el demuxer concat.
    # Con un solo ffmpeg (split + concat en el filtro) la memoria explota: concat le pide
    # frames al primer tramo hasta el final y los otros 25 tienen que guardar en RAM todo
    # lo que producen mientras tanto. Aquí cada tramo se codifica solo, con su propio -ss,
    # y el fuente se abre 26 veces (son 8 minutos de video, cuesta segundos).
    salida = Path(a.salida)
    limp = "" if a.sin_limpieza else LIMPIEZA + ","
    trozos = []
    for i, tr in enumerate(tramos):
        vi, vf = tr["vid"] or (tr["ini"], tr["fin"])
        kv = (vf - vi) / tr["dur"]
        trozo = salida.with_name(f"{salida.stem}_t{i:02d}.mp4")
        entradas, fc = [], []
        if tr["voz"]:
            entradas += ["-ss", f"{tr['ini']:.3f}", "-t", f"{tr['fin'] - tr['ini']:.3f}",
                         "-i", str(src)]
            fc.append(f"[0:a]{limp}atempo={tr['factor']:.5f},"
                      f"aformat=sample_rates=48000:channel_layouts=stereo[a]")
        else:
            fc.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{tr['dur']:.3f}[a]")
        iv = len(entradas) // 4
        entradas += ["-ss", f"{vi:.3f}", "-t", f"{vf - vi:.3f}", "-i", str(src)]
        fc.append(f"[{iv}:v]setpts=(PTS-STARTPTS)/{kv:.6f},setsar=1[v]")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *entradas,
                        "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
                        "-t", f"{tr['dur']:.3f}", "-r", "30",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
                        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                        str(trozo)], check=True)
        trozos.append(trozo)
        print(f"   tramo {i:2d}/{len(tramos)} ✔", flush=True)

    lista = salida.with_suffix(".txt")
    lista.write_text("".join(f"file '{t.resolve()}'\n" for t in trozos), encoding="utf-8")
    cuerpo = salida.with_name(f"{salida.stem}_cuerpo.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", str(lista), "-c", "copy", str(cuerpo)], check=True)

    # ── pasada final: escala, subtítulos quemados, nivel y cama
    fc = [f"[0:v]scale=1080:1920:flags=lanczos,setsar=1,ass={ass.resolve()}[v]",
          "[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,"
          "aformat=sample_rates=48000:channel_layouts=stereo[voz]"]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(cuerpo)]
    if a.musica:
        if dur(Path(a.musica)) < t_out:
            cmd += ["-stream_loop", "-1"]
        cmd += ["-i", a.musica]
        # el hueco de 2 kHz es donde vive la inteligibilidad de la voz: bajarlo 4 dB en
        # la CAMA deja oír el bombo y el bajo sin pelearse con lo que José dice
        fc.append(f"[1:a]equalizer=f=2000:t=q:w=1.2:g=-4,volume={a.music_gain},"
                  f"afade=t=out:st={max(0, t_out-1.2):.2f}:d=1.2,"
                  f"aformat=sample_rates=48000:channel_layouts=stereo[cama]")
        # cama CONSTANTE, sin ducking (el ducking se oye como corte entre temas). El 0.45
        # está MEDIDO, no elegido de oído: las camas de Lyria salen a -14.7 LUFS, así que
        # 0.45 las deja en -21.6 — unos 7.5 dB por debajo de la voz normalizada a -14.
        # Al 0.28 quedaban 11.8 dB abajo y José seguía sin oírlas ("cuando hablo casi no
        # se escucha", 30-ago-2026). El limitador va al final porque sumar una cama a una
        # pista ya normalizada se pasa de 0 dBTP.
        fc.append("[voz][cama]amix=inputs=2:duration=first:dropout_transition=0:"
                  "normalize=0,alimiter=limit=0.78:level=disabled[a]")
    else:
        fc.append("[voz]anull[a]")
    cmd += ["-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
            "-t", f"{t_out:.3f}", "-r", "30",
            "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", str(salida)]
    subprocess.run(cmd, check=True)
    for t in trozos:
        t.unlink(missing_ok=True)
    lista.unlink(missing_ok=True)
    cuerpo.unlink(missing_ok=True)
    print(f"✔ {Path(a.salida).name}  {dur(Path(a.salida)):.1f}s", flush=True)


if __name__ == "__main__":
    main()
