#!/usr/bin/env python3
"""Editor del formato «José grabado»: cara arriba + panel de animación abajo.

Formato: José graba su cara en la mitad superior (720x596 nativos de un 720x1280) y
deja el resto del cuadro en NEGRO a propósito, como lienzo. Es el inverso del composite
de host_layout (cara abajo, banda arriba).

  cara   720x596  -> 1080x894   (arriba)
  panel            1080x1026    (abajo, composicion Remotion "Panel")
                   1080x1920

Los subtitulos se queman en la franja de arriba del panel, justo bajo la costura: ahi
se leen sobre fondo controlado y la UI de TikTok no los tapa.

Uso:
    python editor_grabados.py <stem> [paneles|todo]

Lee el guion de scratchpad/guiones_grabados/<stem>.json:
    {"tema": "hielo",
     "recursos": {"mosaico": "videos/_clips_pagados/xxx.mp4", ...},
     "paneles": [{"t": 0.0, "spec": {"kind": "headline", ...}}, ...]}

Kinds del panel (autoedit/remotion/src/Panel.tsx): headline · define · flow · compare ·
bar · photo · plot · shot · clip · mascota · code · neural, y desde el 23-ago-2026
stat (cifra gigante que se construye) · reveal (antes/después con cortina, persiana o
flip) · timeline (línea de tiempo que se dibuja) · mosaico (varias fotos a la vez) ·
cita (frase con palabras resaltadas). Todo lo que se diseñe cabe en 528 px de alto:
arriba van los subtítulos y abajo TikTok pone el copy.

El FONDO de cada panel lo pone solo `autoedit.fondos.asigna_fondos` (clip pagado del
catálogo, foto o trama animada, alternando). Se desactiva con "fondos": false y el techo
de clips se mueve con "ratio_clip".

Las referencias "@nombre" en spec.image / spec.video se resuelven contra "recursos".
Todo lo que ya existe se REUSA (paneles renderizados, clips estirados, capturas): un
re-render no vuelve a gastar nada.
"""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, "/home/jose/tiktok")
from dotenv import load_dotenv

load_dotenv("/home/jose/tiktok/.env")

RAIZ = Path("/home/jose/tiktok")
GUIONES = RAIZ / "scratchpad" / "guiones_grabados"
CARA_H, PANEL_H, FPS = 894, 1026, 30


def sh(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def dur_video(p: Path) -> float:
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True).stdout.strip())


def ventana_util(stem: str) -> tuple[float, float]:
    """Tramo del video que de verdad tiene voz.

    Mandato de José (22-ago-2026): un video NUNCA arranca en silencio — en TikTok el
    primer segundo mudo es el que pierde al espectador. Se recorta desde justo antes
    de la primera palabra y, si la cola muda pasa de 0.8 s, también por el final.
    """
    wd = RAIZ / f"{stem}.autoedit"
    words = json.loads((wd / "transcript.json").read_text(encoding="utf-8"))["words"]
    total = dur_video(RAIZ / f"{stem}.mp4")
    ini = max(0.0, words[0]["start"] - 0.10)
    cola = total - words[-1]["end"]
    fin = min(total, words[-1]["end"] + 0.35) if cola > 0.8 else total
    return round(ini, 3), round(fin, 3)


def prepara_clip(src: Path, objetivo: float, out: Path) -> Path:
    """Estira un clip PAGADO a la duración del panel sin re-generarlo.

    Boomerang (ida + reversa) y luego setpts para clavar la duración. Un clip Omni/Veo
    cuesta dinero: jamás se genera otro solo porque el panel dure más que el clip.
    """
    if out.exists() and abs(dur_video(out) - objetivo) < 0.08:
        return out
    d = dur_video(src)
    if objetivo <= d:
        sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-t", f"{objetivo:.3f}",
            "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", str(out)])
        return out
    base = out.parent / f"_boom_{out.stem}.mp4"
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-filter_complex",
        "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]", "-map", "[v]",
        "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", str(base)])
    # nunca ACELERAR: si el boomerang ya es más largo que el panel, se recorta y ya
    factor = max(1.0, objetivo / dur_video(base))
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(base), "-filter_complex",
        f"[0:v]setpts={factor:.5f}*PTS,fps=30[v]", "-map", "[v]", "-t", f"{objetivo:.3f}",
        "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", str(out)])
    base.unlink(missing_ok=True)
    return out


def mata_chrome_huerfano() -> int:
    """Mata los Chrome que sobrevivieron a un render anterior.

    Regla del repo: si un render tarda 20-30 min NO es WSL2, son procesos huérfanos
    comiéndose los núcleos. Pasó de verdad el 24-ago-2026: al cortar un render a media
    tarea quedaron 11 Chrome vivos, el render siguiente se fue degradando y el panel 27
    de jose08 reventó el timeout de 30 min. Ese mismo panel, con la máquina limpia,
    tarda 50 segundos.
    """
    # Matar "todo lo que se llame chrome" es demasiado: se lleva por delante el Chrome
    # del servidor MCP y el puente a Windows. Un huérfano de verdad es el que perdió a su
    # padre y quedó reparentado a init (PPID 1); el Chrome de un render VIVO cuelga del
    # proceso node de Remotion, y el del MCP cuelga de su servidor.
    # OJO (2-sep-2026): en WSL2 el huérfano NO queda con PPID 1 — lo adopta el `/init`
    # de la sesión (PPID ≠ 1, comando "/init"). Un Chrome así estuvo 1 h al 39% de CPU
    # sin que este filtro lo viera, y dejó COLGADO al render siguiente: el npm de
    # Remotion murió, pero sus Chrome mantenían abierta la tubería y generate.py se
    # quedó esperando. Por eso se mira el COMANDO del padre, y se exceptúa el Chrome
    # del MCP por su bandera --remote-debugging-port.
    salida = subprocess.run(["ps", "-eo", "pid,ppid,etimes,comm,args"],
                            capture_output=True, text=True).stdout
    filas = [l.split(None, 4) for l in salida.splitlines()[1:]]
    cmd_de = {f[0]: (f[4] if len(f) > 4 else "") for f in filas if len(f) >= 4}
    muertos = 0
    for partes in filas:
        if len(partes) < 4:
            continue
        pid, ppid, edad, comm = partes[0], partes[1], partes[2], partes[3]
        args = partes[4] if len(partes) > 4 else ""
        padre_init = ppid == "1" or cmd_de.get(ppid, "").startswith("/init")
        # también los `node …/remotion render` y `sh -c remotion` huérfanos: uno de esos
        # (adoptado por /init) mantuvo abierta la tubería de autoedit-gen y lo dejó colgado
        # 15 min con su npm ya <defunct> (clase 5 del curso, 2-sep-2026)
        es_render = ("remotion" in args and "render" in args and "chrome-devtools" not in args)
        es_chrome = comm.startswith("chrome") and comm != "chrome.exe"
        if (es_chrome or es_render) and "--remote-debugging-port" not in args and int(edad) > 60:
            # traza: el 2-sep dos árboles de Chrome de 54 y 17 min bajo /init pasaron de
            # largo y no supe por qué; esto deja la decisión escrita en el log
            print(f"    huérfano? pid={pid} ppid={ppid} padre={cmd_de.get(ppid, '')[:20]!r} "
                  f"init={padre_init} edad={edad}s {comm}", flush=True)
        if ((es_chrome or es_render) and padre_init
                and "--remote-debugging-port" not in args and int(edad) > 60):
            try:
                os.kill(int(pid), signal.SIGKILL)
                muertos += 1
            except (ProcessLookupError, PermissionError):
                pass
    if muertos:
        print(f"  · {muertos} procesos de Chrome huérfanos eliminados", flush=True)
    return muertos


def fase_paneles(stem: str, guion: dict) -> list[Path]:
    from autoedit.remotion_scenes import render_panel, stage_asset

    mata_chrome_huerfano()

    src = RAIZ / f"{stem}.mp4"
    assets = RAIZ / f"{stem}.assets"
    assets.mkdir(exist_ok=True)
    recursos = {k: (RAIZ / v if not Path(v).is_absolute() else Path(v))
                for k, v in (guion.get("recursos") or {}).items()}
    faltan = [k for k, v in recursos.items() if not v.exists()]
    if faltan:
        sys.exit(f"faltan recursos: {faltan}")

    paneles = guion["paneles"]
    # Fondo automático: sin esto el 61% de los paneles vuelve a ser texto sobre el mismo
    # degradado (medido sobre los seis primeros videos). Se salta con "fondos": false en
    # el guion, o poniendo el fondo a mano en un panel concreto.
    if guion.get("fondos", True):
        from autoedit.fondos import asigna_fondos, diagnostico
        asigna_fondos(paneles, ratio_clip=float(guion.get("ratio_clip", 0.45)))
        print("  ·", diagnostico(paneles), flush=True)
    ini, fin = ventana_util(stem)
    # Los tiempos del guion están en la línea de tiempo ORIGINAL; el video se recorta,
    # así que los bordes se desplazan -ini y el último cierra en la nueva duración.
    bordes = [max(0.0, p["t"] - ini) for p in paneles] + [fin - ini]
    salidas = []
    for i, panel in enumerate(paneles):
        n = round(bordes[i + 1] * FPS) - round(bordes[i] * FPS)
        if n <= 0:
            sys.exit(f"panel {i:02d}: duración <= 0 (¿tiempos desordenados?)")
        out = assets / f"panel_{i:02d}.mp4"
        if out.exists() and abs(dur_video(out) * FPS - n) < 2:
            salidas.append(out)
            continue
        spec = json.loads(json.dumps(panel["spec"]))
        for clave in ("image", "video"):
            v = spec.get(clave)
            if isinstance(v, str) and v.startswith("@"):
                recurso = recursos[v[1:]]
                if clave == "video":
                    recurso = prepara_clip(recurso, n / FPS, assets / f"_clip_{i:02d}.mp4")
                spec[clave] = stage_asset(recurso)
        if isinstance(spec.get("images"), list):
            spec["images"] = [stage_asset(recursos[x[1:]]) if x.startswith("@") else x
                              for x in spec["images"]]
        # `reveal` lleva sus imágenes ANIDADAS en before/after, así que el barrido de
        # arriba no las veía y llegaban a Remotion como "@clave" sin resolver.
        for lado in ("before", "after"):
            cara = spec.get(lado)
            if isinstance(cara, dict) and isinstance(cara.get("image"), str):
                v = cara["image"]
                if v.startswith("@"):
                    cara["image"] = stage_asset(recursos[v[1:]])

        # El FONDO (autoedit/fondos.py) trae rutas relativas al repo: hay que copiarlas a
        # public/dyn como cualquier otro asset, o Remotion no las encuentra.
        fondo = spec.get("fondo")
        if isinstance(fondo, dict):
            for clave in ("video", "image"):
                v = fondo.get(clave)
                if isinstance(v, str) and not v.startswith("dyn/"):
                    ruta = recursos[v[1:]] if v.startswith("@") else RAIZ / v
                    if not ruta.exists():
                        sys.exit(f"panel {i:02d}: fondo inexistente {ruta}")
                    if clave == "video":
                        fondo.setdefault("clip_dur", round(dur_video(ruta), 2))
                    fondo[clave] = stage_asset(ruta)
        print(f"  → panel {i:02d} ({spec['kind']}, {n} frames = {n/FPS:.1f}s)…", flush=True)
        render_panel(spec, n, out, theme=guion.get("tema", "hielo"))
        salidas.append(out)
    return salidas


def fase_ensamblado(stem: str, paneles: list[Path]) -> Path:
    from autoedit.config import load_config
    from autoedit.subtitles import build_ass

    src = RAIZ / f"{stem}.mp4"
    wd = RAIZ / f"{stem}.autoedit"
    assets = RAIZ / f"{stem}.assets"
    salida = RAIZ / f"{stem}_final.mp4"
    cfg = load_config(None)
    ini, fin = ventana_util(stem)
    print(f"  · sin silencio: se usa {ini:.2f}s → {fin:.2f}s ({fin-ini:.2f}s)")

    lista = assets / "paneles.txt"
    lista.write_text("".join(f"file '{p.resolve()}'\n" for p in paneles), encoding="utf-8")
    tira = assets / "paneles.mp4"
    sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c", "copy", str(tira)])
    print(f"  · paneles concatenados: {dur_video(tira):.2f}s")

    words = json.loads((wd / "transcript.json").read_text(encoding="utf-8"))["words"]
    words = [{**w, "start": w["start"] - ini, "end": w["end"] - ini}
             for w in words if w["end"] > ini and w["start"] < fin]
    scfg = dict(cfg["subtitles"])
    scfg["margin_v_ratio"] = (CARA_H + 16) / 1920.0
    ass = build_ass(words, 1080, 1920, {**cfg, "subtitles": scfg}, assets / "subs.ass")
    # Alignment 8 = anclado ARRIBA: el bloque crece hacia el panel, nunca hacia la cara.
    import re
    ass.write_text(re.sub(r"(^Style: Cap,.*?),2,(60,60,)", r"\1,8,\2",
                          ass.read_text(encoding="utf-8"), flags=re.M), encoding="utf-8")
    print("  · subtítulos anclados bajo la cara")

    cama = RAIZ / "autoedit" / "assets" / "bed_electronico.m4a"
    gain = float((cfg.get("render") or {}).get("music_gain", 0.08))
    filtro = (
        f"[0:v]crop=720:596:0:0,scale=1080:{CARA_H}:flags=lanczos,setsar=1[cara];"
        f"[1:v]setsar=1[pan];[cara][pan]vstack=inputs=2[stack];"
        f"[stack]ass={ass.resolve()}[v];"
        f"[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo[voz];"
        f"[2:a]volume={gain},aformat=sample_rates=48000:channel_layouts=stereo[mus];"
        f"[voz][mus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]"
    )
    sh(["ffmpeg", "-y", "-loglevel", "error",
        "-ss", f"{ini:.3f}", "-t", f"{fin - ini:.3f}", "-i", str(src),
        "-i", str(tira), "-stream_loop", "-1", "-i", str(cama),
        "-filter_complex", filtro, "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
        "-r", "30", "-c:a", "aac", "-b:a", "192k", "-shortest", str(salida)])
    return salida


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    stem = sys.argv[1]
    hasta = sys.argv[2] if len(sys.argv) > 2 else "todo"
    guion = json.loads((GUIONES / f"{stem}.json").read_text(encoding="utf-8"))
    print(f"=== {stem}: {len(guion['paneles'])} paneles ===")
    paneles = fase_paneles(stem, guion)
    if hasta == "paneles":
        return
    print("=== ensamblado ===")
    out = fase_ensamblado(stem, paneles)
    print(f"\n✔ {out}  ({dur_video(out):.1f}s)")


if __name__ == "__main__":
    main()
