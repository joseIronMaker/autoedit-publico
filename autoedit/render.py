from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .subtitles import build_ass


def video_dimensions(video: Path) -> tuple[int, int]:
    """Dimensiones reales de reproducción (respeta el metadato de rotación de móviles)."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,side_data_list", "-of", "json", str(video)],
        capture_output=True, text=True, check=True, timeout=60,
    ).stdout
    stream = json.loads(out)["streams"][0]
    w, h = int(stream["width"]), int(stream["height"])
    rotation = 0
    for sd in stream.get("side_data_list") or []:
        if "rotation" in sd:
            rotation = abs(int(sd["rotation"])) % 360
    if rotation in (90, 270):  # ffmpeg autorota al decodificar: el lienzo real va girado
        w, h = h, w
    return w, h


def keep_segments(edl: dict, cfg: dict) -> list[tuple[float, float]]:
    """Complemento de los cortes: los tramos del video que se conservan."""
    min_seg = cfg["edit"]["min_segment"]
    pos, keeps = 0.0, []
    active = [c for c in edl["cuts"] if not c.get("disabled")]
    for c in sorted(active, key=lambda c: c["start"]):
        if c["start"] - pos >= min_seg:
            keeps.append((pos, c["start"]))
        pos = max(pos, c["end"])
    if edl["duration"] - pos >= min_seg:
        keeps.append((pos, edl["duration"]))
    return keeps


def clip_keeps(keeps: list[tuple[float, float]], start: float, end: float,
               min_seg: float) -> list[tuple[float, float]]:
    """Intersección de los tramos conservados con el rango de un clip."""
    out = []
    for s, e in keeps:
        s2, e2 = max(s, start), min(e, end)
        if e2 - s2 >= min_seg:
            out.append((s2, e2))
    return out


def remap_words(words: list[dict], keeps: list[tuple[float, float]], emphasis: set[int]) -> list[dict]:
    """Traslada los timestamps de las palabras conservadas a la línea de tiempo del video cortado."""
    remapped = []
    offset = 0.0
    for seg_start, seg_end in keeps:
        first_of_seg = True
        for i, w in enumerate(words):
            mid = (w["start"] + w["end"]) / 2
            if seg_start <= mid < seg_end:
                remapped.append({
                    "word": w["word"],
                    "start": offset + max(0.0, w["start"] - seg_start),
                    "end": offset + min(seg_end - seg_start, w["end"] - seg_start),
                    "emphasis": i in emphasis,
                    # frontera de corte: la 1ª palabra de cada tramo abre grupo nuevo de
                    # subtítulos (palabras de lados opuestos de un corte JAMÁS se agrupan —
                    # producía grupos tipo "NEURONAS, APRUEBA TU" cruzando la edición)
                    "cut_start": first_of_seg,
                })
                first_of_seg = False
        offset += seg_end - seg_start
    return remapped


def render_cutlist(video: Path, workdir: Path, cfg: dict, words: list[dict],
                   emphasis: set[int], keeps: list[tuple[float, float]],
                   out_path: Path, tag: str = "full") -> Path:
    """Renderiza un conjunto de tramos conservados con subtítulos y zooms de corte."""
    rcfg, zcfg = cfg["render"], cfg.get("zoom", {})
    width, height = video_dimensions(video)

    ass_name = f"subs_{tag}.ass"
    build_ass(remap_words(words, keeps, emphasis), width, height, cfg, workdir / ass_name)

    # zoom sutil alternado por tramo (efecto jump-cut de CapCut)
    z = float(zcfg.get("factor", 1.0)) if zcfg.get("enabled") else 1.0
    zoom_filter = (
        f"crop=iw/{z}:ih/{z}:(iw-iw/{z})/2:(ih-ih/{z})/2,scale={width}:{height},"
        if z > 1.0 else ""
    )

    # capa de acabado cinematográfico (grano temporal + viñeta) — cohesión de marca
    fontsdir = (Path(__file__).resolve().parent / "assets").as_posix()
    finish = []
    if rcfg.get("finish"):
        if rcfg.get("grain"):
            finish.append(f"noise=alls={int(rcfg['grain'])}:allf=t+u")
        if rcfg.get("vignette"):
            finish.append("vignette=angle=PI/5")
    finish_chain = ("," + ",".join(finish)) if finish else ""

    parts, pairs = [], []
    # micro-fundido en cada extremo de tramo: el concat de audio es un EMPALME DURO y si la
    # onda no cruza por cero en el corte se oye un chasquido ("audio cortado en los cambios",
    # feedback de José). 20 ms es inaudible para la voz y NO altera la duración del tramo,
    # así que el audio sigue calzado frame a frame con el video (acrossfade sí lo desfasaría).
    _FADE = 0.02
    for i, (s, e) in enumerate(keeps):
        vf = zoom_filter if i % 2 == 1 else ""
        parts.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS,{vf}setsar=1[v{i}];")
        fd = min(_FADE, max(0.002, (e - s) / 4))
        parts.append(
            f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d={fd:.3f},afade=t=out:st={max(0.0, (e - s) - fd):.3f}:d={fd:.3f}"
            f"[a{i}];")
        pairs.append(f"[v{i}][a{i}]")
    parts.append(f"{''.join(pairs)}concat=n={len(keeps)}:v=1:a=1[vc][ac];")
    parts.append(f"[vc]ass={ass_name}:fontsdir={fontsdir}{finish_chain}[vout];")

    # cama musical CONSTANTE — mezclada antes de loudnorm. Prioridad: cama GENERADA
    # para este video (Lyria → <stem>.assets/music.m4a) sobre la cama global de config.
    music_path = None
    own_bed = video.parent / f"{video.stem}.assets" / "music.m4a"
    if own_bed.exists():
        music_path = own_bed
    elif rcfg.get("music"):
        mp = Path(rcfg["music"])
        if not mp.is_absolute():
            mp = Path(__file__).resolve().parent.parent / rcfg["music"]
        music_path = mp if mp.exists() else None
    if music_path:
        g = float(rcfg.get("music_gain", 0.16))
        # FUNDIDO FINAL: sin esto la cama se corta en seco en el último fotograma y se
        # oye como si el video se hubiera trabado (José, 3-ago-2026: "checa el audio se
        # corta"). Medido: energía del último medio segundo casi igual a la media.
        # la duración de salida es la suma de los tramos conservados: los cortes ya
        # están descontados en `keeps`.
        _dur = sum(e - s for s, e in keeps)
        _fade = min(1.6, max(0.7, _dur * 0.05))
        # cama CONSTANTE muy suave (sin sidechain/ducking): el ducking agresivo hacía que la
        # música subiera en cada pausa y bajara de golpe al volver la voz → "pumping" que se
        # oía como corte entre temas. Constante = ambiente parejo, la voz manda por nivel.
        parts.append(
            "[ac]aresample=48000,aformat=channel_layouts=stereo[vmix];"
            f"[1:a]aresample=48000,aformat=channel_layouts=stereo,volume={g},"
            f"afade=t=out:st={max(0.0, _dur - _fade):.3f}:d={_fade:.3f}[bed];"
            "[vmix][bed]amix=inputs=2:duration=first:normalize=0[amx];"
            f"[amx]loudnorm={rcfg['loudnorm']}[aout]"
        )
    else:
        parts.append(f"[ac]loudnorm={rcfg['loudnorm']}[aout]")
    filters = workdir / f"filters_{tag}.txt"
    filters.write_text("\n".join(parts), encoding="utf-8")

    music_in = ["-stream_loop", "-1", "-i", str(music_path.resolve())] if music_path else []
    kept = sum(e - s for s, e in keeps)
    print(f"→ Renderizando {out_path.name}: {len(keeps)} tramos, {kept:.1f}s…")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video.resolve()), *music_in,
         "-filter_complex_script", filters.name,
         "-map", "[vout]", "-map", "[aout]",
         "-c:v", "libx264", "-crf", str(rcfg["crf"]), "-preset", rcfg["preset"],
         "-c:a", "aac", "-b:a", rcfg["audio_bitrate"],
         "-movflags", "+faststart", str(out_path.resolve())],
        # el tope FIJO de 900s se quedó corto al pasar el motor a videos de 60-90s (antes
        # 28-34s): x264 preset slow en 1080×1920 sobre CPU de WSL2 anda ~20-25× tiempo real.
        # Escalarlo con la duración evita que un render bueno muera a los 15 minutos.
        # `kept` es el NÚMERO de tramos, no segundos: 17 tramos → 900 s, y en carga 100
        # el final de 86 s tardó más de 15 min y quedó truncado en Descargas
        cwd=workdir, check=True, timeout=max(3600, int(kept * 120)),
    )
    print(f"✔ {out_path}")
    return out_path


def render(video: Path, workdir: Path, cfg: dict) -> tuple[Path, list[Path]]:
    """Renderiza el video completo y, si existe clips.json, cada clip por separado."""
    transcript = json.loads((workdir / "transcript.json").read_text(encoding="utf-8"))
    edl = json.loads((workdir / "edl.json").read_text(encoding="utf-8"))
    words = transcript["words"]
    emphasis = set(edl.get("emphasis_indices", []))

    keeps = keep_segments(edl, cfg)
    if not keeps:
        raise RuntimeError(
            "el EDL corta el video completo (o los tramos quedan demasiado cortos); "
            "desactiva algún corte en edl.json y re-renderiza"
        )

    final = render_cutlist(video, workdir, cfg, words, emphasis, keeps,
                           video.parent / f"{video.stem}_final.mp4")

    clip_paths: list[Path] = []
    clips_file = workdir / "clips.json"
    if clips_file.exists():
        clips = json.loads(clips_file.read_text(encoding="utf-8"))["clips"]
        min_seg = cfg["edit"]["min_segment"]
        for k, c in enumerate(clips, 1):
            ck = clip_keeps(keeps, c["start"], c["end"], min_seg)
            if not ck:
                continue
            clip_paths.append(render_cutlist(
                video, workdir, cfg, words, emphasis, ck,
                video.parent / f"{video.stem}_clip{k}_final.mp4", tag=f"clip{k}",
            ))
    return final, clip_paths
