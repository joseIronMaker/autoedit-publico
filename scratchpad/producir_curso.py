"""Produce UNA clase del curso de Python y la deja lista para revisar.

    .venv/bin/python scratchpad/producir_curso.py py07

Generación (Rama A) → subtítulos y copys (Rama B) → entrega a Descargas → tira de QC.
Los guiones viven en scratchpad/guiones_curso y ya traen todo: la salida de terminal de
cada clase se capturó corriendo el código de verdad.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GUIONES = RAIZ / "scratchpad" / "guiones_curso"
DEST = Path("/mnt/c/Users/USUARIO/Downloads/curso_python")
PY = RAIZ / ".venv" / "bin"


def dur(p: Path) -> float:
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(p)]).strip())


def tira_qc(final: Path, salida: Path, n: int = 6) -> None:
    from PIL import Image
    d = dur(final)
    ims = []
    for i in range(n):
        t = d * (0.05 + 0.9 * i / (n - 1))
        tmp = salida.parent / f"_qc_{i}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(final),
                        "-frames:v", "1", "-y", str(tmp)], check=True)
        ims.append(Image.open(tmp).convert("RGB"))
    h = 500
    ims = [im.resize((int(im.width * h / im.height), h)) for im in ims]
    hoja = Image.new("RGB", (sum(i.width for i in ims) + 6 * (n - 1), h), (0, 0, 0))
    x = 0
    for im in ims:
        hoja.paste(im, (x, 0))
        x += im.width + 6
    hoja.save(salida)
    for i in range(n):
        (salida.parent / f"_qc_{i}.png").unlink(missing_ok=True)


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("uso: producir_curso.py <pyNN>")
    pref = sys.argv[1]
    cand = sorted(GUIONES.glob(f"{pref}_*.json"))
    if len(cand) != 1:
        sys.exit(f"esperaba 1 guion con prefijo '{pref}', encontré {[c.name for c in cand]}")
    gpath = cand[0]
    g = json.loads(gpath.read_text(encoding="utf-8"))
    stem = f"gen_{g['slug']}"
    num = re.match(r"py(\d+)", gpath.name).group(1)
    print(f"=== {gpath.name}  →  {stem}", flush=True)

    entorno = {**os.environ, "PYTHONUNBUFFERED": "1"}
    base = RAIZ / "videos" / f"{stem}.mp4"
    if not base.exists():
        subprocess.run([str(PY / "autoedit-gen"), g["tema"], "--guion", str(gpath),
                        "--dir", str(RAIZ / "videos")], cwd=RAIZ, check=True, env=entorno)
    else:
        print("(ya existía el mp4 base; salto la generación)", flush=True)

    final = RAIZ / "videos" / f"{stem}_final.mp4"
    if not final.exists():
        subprocess.run([str(PY / "autoedit"), str(base), "--auto"], cwd=RAIZ, check=True,
                       env=entorno)

    DEST.mkdir(parents=True, exist_ok=True)
    nombre = f"clase{num}_{g['slug'].replace('curso_py' + num + '_', '')}"
    shutil.copy2(final, DEST / f"{nombre}.mp4")
    copys = json.loads((RAIZ / "videos" / f"{stem}.autoedit" / "copys.json")
                       .read_text(encoding="utf-8"))
    (DEST / f"{nombre}_copy.txt").write_text(copys["tiktok"].strip() + "\n", encoding="utf-8")
    qc = RAIZ / "scratchpad" / "_curso" / f"qc_{pref}.png"
    qc.parent.mkdir(exist_ok=True)
    tira_qc(final, qc)
    print(f"✔ {nombre}.mp4  ({dur(final):.1f}s)   QC → {qc.name}", flush=True)


if __name__ == "__main__":
    main()
