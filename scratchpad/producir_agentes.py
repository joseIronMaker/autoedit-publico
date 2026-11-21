"""Produce UN video de la SERIE 2 (agentes) y lo deja listo para revisar.

    .venv/bin/python scratchpad/producir_agentes.py s02

Rama A (guion → voz/imágenes/escenas) → Rama B (subtítulos + copys) → entrega a
Descargas/serie1 → tira de QC. El guion se escribe a mano en scratchpad/guiones_serie1/.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GUIONES = RAIZ / "scratchpad" / "guiones_agentes"
DEST = Path("/mnt/c/Users/USUARIO/Downloads/agentes")
PY = RAIZ / ".venv" / "bin"


def dur(p: Path) -> float:
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(p)]).strip())


def tira_qc(final: Path, salida: Path, n: int = 8) -> None:
    from PIL import Image

    d = dur(final)
    ims = []
    for i in range(n):
        t = d * (0.04 + 0.92 * i / (n - 1))
        tmp = salida.parent / f"_qc_{i}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(final),
                        "-frames:v", "1", "-y", str(tmp)], check=True)
        ims.append(Image.open(tmp).convert("RGB"))
    h = 560
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
        sys.exit("uso: producir_agentes.py <prefijo, p.ej. s02>")
    pref = sys.argv[1]
    cand = sorted(GUIONES.glob(f"{pref}_*.json"))
    if len(cand) != 1:
        sys.exit(f"esperaba 1 guion con prefijo '{pref}', encontré {[c.name for c in cand]}")
    gpath = cand[0]
    g = json.loads(gpath.read_text(encoding="utf-8"))
    slug = g["slug"]
    num = re.match(r"ag(\d+)", gpath.name).group(1)
    stem = f"gen_{slug}"
    print(f"=== {gpath.name}  →  {stem}", flush=True)

    entorno = {**os.environ, "PYTHONUNBUFFERED": "1"}
    base = RAIZ / "videos" / f"{stem}.mp4"
    if not base.exists():
        subprocess.run([str(PY / "autoedit-gen"), g["tema"], "--guion", str(gpath),
                        "--dir", str(RAIZ / "videos")], cwd=RAIZ, check=True, env=entorno)
    else:
        print("(ya existía el mp4 base; salto la generación)", flush=True)

    final = RAIZ / "videos" / f"{stem}_final.mp4"
    subprocess.run([str(PY / "autoedit"), str(base), "--auto"], cwd=RAIZ, check=True,
                   env=entorno)

    DEST.mkdir(parents=True, exist_ok=True)
    nombre = gpath.stem
    shutil.copy2(final, DEST / f"{nombre}.mp4")
    copys = json.loads((RAIZ / "videos" / f"{stem}.autoedit" / "copys.json")
                       .read_text(encoding="utf-8"))
    manual = RAIZ / "scratchpad" / "copys_manuales_agentes" / f"ag{num}.txt"
    texto = manual.read_text(encoding="utf-8") if manual.exists() else copys["tiktok"]
    (DEST / f"ag{num}_copy_tiktok.txt").write_text(texto.strip() + "\n", encoding="utf-8")
    qc = RAIZ / "scratchpad" / f"qc_{slug}.png"
    tira_qc(final, qc)

    print(f"\n✔ {nombre}.mp4  ({dur(final):.1f}s)")
    print(f"  QC   → {qc}")
    print(f"  copy → {copys['tiktok']}")


if __name__ == "__main__":
    main()
