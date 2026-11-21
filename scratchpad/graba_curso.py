"""Graba las terminales REALES de una clase y las mete en el video ya producido.

El curso enseña Claude Code y Python: mostrarlos con una tarjeta animada viola la regla de
realidad del canal. Este script lee el guion, y para cada escena que traiga `captura.cmd`
abre una terminal de Windows de verdad, corre ESE comando dentro de WSL, graba la ventana
y sustituye el segmento — reusando la locución que ya se pagó.

    .venv/bin/python scratchpad/graba_curso.py py01
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GUIONES = RAIZ / "scratchpad" / "guiones_curso"
DEMO = RAIZ / "scratchpad" / "_curso" / "demo"
DEMO_RUN = Path.home() / "curso"   # copia limpia y corta donde se graba
PY = RAIZ / ".venv" / "bin" / "python"


def dur_wav(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def _captura_floja(cap: Path) -> bool:
    """Último cuadro de una sesión de Claude: si la franja central (donde va la respuesta)
    casi no tiene texto, la sesión no contestó (529 Overloaded, timeout de red)."""
    import subprocess as sp
    import tempfile
    import numpy as np
    from PIL import Image
    with tempfile.TemporaryDirectory() as td:
        png = Path(td) / "f.png"
        sp.run(["ffmpeg", "-v", "error", "-sseof", "-0.5", "-i", str(cap), "-frames:v", "1", str(png)],
               check=False, timeout=120)
        if not png.exists():
            return False
        a = np.asarray(Image.open(png).convert("L"), dtype=np.int16)
    # medido el 3-sep: la franja 40-65% (donde cae la respuesta) tiene 6-8% de tinta en una
    # sesión que contestó y 0.8% en la del 529 (el error queda abajo, en 65-85%)
    h = a.shape[0]
    franja = a[int(h * 0.40):int(h * 0.65), :]
    return float((franja > 90).mean()) < 0.025


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("clase", help="p. ej. py01")
    ap.add_argument("--fps", type=int, default=5)
    ap.add_argument("--solo", default=None,
                    help="solo estas escenas, separadas por coma (p. ej. 0,2)")
    a = ap.parse_args()
    solo = None if a.solo is None else {int(x) for x in a.solo.split(",")}

    gpath = sorted(GUIONES.glob(f"{a.clase}_*.json"))[0]
    guion = json.loads(gpath.read_text(encoding="utf-8"))
    stem = f"gen_{guion['slug']}"
    assets = RAIZ / "videos" / f"{stem}.assets"
    if not assets.exists():
        sys.exit(f"no existe {assets}: primero se produce la clase")

    hechas = 0
    for i, esc in enumerate(guion["scenes"]):
        cap_cfg = esc.get("captura")
        if not cap_cfg or (solo is not None and i not in solo):
            continue
        voz = assets / f"scene_{i}.wav"
        if not voz.exists():
            print(f"  escena {i}: sin locución, la salto")
            continue
        # se graba con margen: la ventana tarda en abrir y el último cuadro debe traer la
        # salida ya completa. Lo que sobre se recorta al componer.
        # Claude Code tarda 20-60 s en contestar y la escena dura 12-20: grabando
        # "narración + 3.5" el cuadro se quedaba en "Mustering… (13s)" y NUNCA se veía
        # el código ni el resultado. Se graba largo y `_render_captura` lo comprime al
        # ritmo de la voz, que además se ve mejor: el agente trabaja rápido y la última
        # imagen —la respuesta— se queda fija hasta que termina la locución.
        largo = "claude " in cap_cfg["cmd"] or "PyInstaller" in cap_cfg["cmd"]
        seg_s = dur_wav(voz) * (2.8 if largo else 1.0) + (10 if largo else 3.5)
        # el demo se restaura antes de CADA escena: la escena de Claude reescribe los
        # archivos de verdad, y la de "míralo corriendo" salía con otro programa
        subprocess.run(["git", "checkout", "--", str(DEMO)], cwd=RAIZ, check=False)
        # …y se graba sobre una COPIA limpia con ruta corta (~/curso): dentro del repo,
        # Claude narraba "el archivo ya existía en git, forma parte de la clase py03 del
        # curso" en pantalla, y los tracebacks mostraban rutas largas del proyecto
        # partidas en dos líneas. Fuera del repo no hay nada que contar.
        shutil.rmtree(DEMO_RUN, ignore_errors=True)
        # solo los archivos de la LECCIÓN: con README, .gitignore, .db y los guiones de
        # captura a la vista, Claude narraba la plomería del curso ("el README ya dice…")
        shutil.copytree(DEMO, DEMO_RUN, ignore=shutil.ignore_patterns(
            "README*", ".gitignore*", "*.db", "*.json", "_cap_*.sh", "__pycache__", ".git", "curso-python", "build"))
        destino = assets / f"cap_{i}.mp4"
        print(f"→ escena {i}: grabando {seg_s:.1f}s de terminal real", flush=True)
        subprocess.run([str(PY), str(RAIZ / "scratchpad" / "graba_terminal.py"),
                        str(destino), "--cwd", str(DEMO_RUN), "--cmd", cap_cfg["cmd"],
                        "--seg", f"{seg_s:.1f}", "--fps", str(a.fps),
                        "--cols", str(cap_cfg.get("cols", 46)),
                        "--filas", str(cap_cfg.get("filas", 30))]
                       + (["--region"] if cap_cfg.get("region") else [])
                       + (["--titulo", cap_cfg["titulo"]] if cap_cfg.get("titulo") else []),
                       cwd=RAIZ, check=True)
        # Claude puede contestar 529 Overloaded y la captura queda con el error en pantalla
        # (clase 13, 3-sep): si el último cuadro de una escena de Claude trae poca tinta en
        # la zona de la respuesta, se espera y se graba otra vez (una sola vez)
        # la mañana del 3-sep la API devolvió 529 en cadena: hasta 3 reintentos, cada vez
        # esperando más, y la copia limpia se rehace para que Claude no vea su intento previo
        for intento in range(3):
            if not (largo and _captura_floja(destino)):
                break
            espera = 120 * (intento + 1)
            print(f"  aviso: captura de Claude sin respuesta (¿529?); reintento {intento + 1}/3 en {espera} s", flush=True)
            time.sleep(espera)
            subprocess.run(["git", "checkout", "--", str(DEMO)], cwd=RAIZ, check=False)
            shutil.rmtree(DEMO_RUN, ignore_errors=True)
            shutil.copytree(DEMO, DEMO_RUN, ignore=shutil.ignore_patterns(
                "README*", ".gitignore*", "*.db", "*.json", "_cap_*.sh", "__pycache__", ".git", "curso-python", "build"))
            subprocess.run([str(PY), str(RAIZ / "scratchpad" / "graba_terminal.py"),
                            str(destino), "--cwd", str(DEMO_RUN), "--cmd", cap_cfg["cmd"],
                            "--seg", f"{seg_s:.1f}", "--fps", str(a.fps),
                            "--cols", str(cap_cfg.get("cols", 46)),
                            "--filas", str(cap_cfg.get("filas", 30))], cwd=RAIZ, check=True)
        # sin ensamblar: unir el video entero después de CADA escena costaba minuto y
        # medio por escena; se hace una sola vez al final
        subprocess.run([str(PY), str(RAIZ / "scratchpad" / "rehacer_escena.py"),
                        stem, str(i), "--sin-ensamblar"], cwd=RAIZ, check=True)
        hechas += 1

    if hechas:
        subprocess.run([str(PY), str(RAIZ / "scratchpad" / "rehacer_escena.py"),
                        stem, "--solo-ensamblar"], cwd=RAIZ, check=True)
    print(f"✔ {a.clase}: {hechas} escenas con terminal real", flush=True)


if __name__ == "__main__":
    main()
