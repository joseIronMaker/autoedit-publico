#!/usr/bin/env python3
"""Graba las capturas del video del duelo y recompone sus escenas.

Es la versión genérica de graba_curso.py para los guiones de scratchpad/guiones_astra:
por cada escena con "captura" graba la pantalla real (terminal o ventana por título) y
luego deja que rehacer_escena la monte al ritmo de la voz ya generada.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

RAIZ = Path("/home/jose/tiktok")
PY_ = RAIZ / ".venv/bin/python"


def dur_wav(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def main() -> None:
    guion_p = Path(sys.argv[1])
    solo = {int(x) for x in sys.argv[2].split(",")} if len(sys.argv) > 2 else None
    guion = json.loads(guion_p.read_text(encoding="utf-8"))
    stem = f"gen_{guion['slug']}"
    assets = RAIZ / "videos" / f"{stem}.assets"
    if not assets.exists():
        sys.exit(f"no existe {assets}: primero se genera el video")
    hechas = 0
    for i, esc in enumerate(guion["scenes"]):
        cap = esc.get("captura")
        if not cap or (solo is not None and i not in solo):
            continue
        voz = assets / f"scene_{i}.wav"
        if not voz.exists():
            print(f"  escena {i}: sin locución, la salto", flush=True)
            continue
        # una sesión de codex tarda minutos y la escena dura segundos: se graba largo y
        # _render_captura lo comprime al ritmo de la voz (misma regla que el curso)
        largo = "codex" in cap["cmd"]
        seg_s = dur_wav(voz) * (3.2 if largo else 1.0) + (25 if largo else 4.0)
        destino = assets / f"cap_{i}.mp4"
        print(f"→ escena {i}: grabando {seg_s:.0f}s ({'codex en vivo' if largo else 'ventana'})", flush=True)
        cmd = [str(PY_), str(RAIZ / "scratchpad/graba_terminal.py"), str(destino),
               "--cwd", cap.get("cwd", str(RAIZ)), "--cmd", cap["cmd"],
               "--seg", f"{seg_s:.1f}", "--fps", "12",
               "--cols", str(cap.get("cols", 46)), "--filas", str(cap.get("filas", 30))]
        if cap.get("titulo"):
            cmd += ["--titulo", cap["titulo"]]
        subprocess.run(cmd, cwd=RAIZ, check=True)
        subprocess.run([str(PY_), str(RAIZ / "scratchpad/rehacer_escena.py"),
                        stem, str(i), "--sin-ensamblar"], cwd=RAIZ, check=True)
        hechas += 1
    if hechas:
        subprocess.run([str(PY_), str(RAIZ / "scratchpad/rehacer_escena.py"),
                        stem, "--solo-ensamblar"], cwd=RAIZ, check=True)
    print(f"✔ {hechas} escenas con pantalla real", flush=True)


if __name__ == "__main__":
    main()
