"""Produce UN video de la serie 3 (visión por computadora) y lo deja listo para revisar.

    .venv/bin/python scratchpad/producir_serie3.py ver01

Hace generación (Rama A) → subtítulos y copys (Rama B) → entrega a Descargas → tira de QC.
Pensado para usarse tras compactar el contexto: todo lo que necesita está en el guion.
"""
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GUIONES = RAIZ / "scratchpad" / "guiones_serie3"
DEST = Path("/mnt/c/Users/USUARIO/Downloads")
PY = RAIZ / ".venv" / "bin"


def dur(p: Path) -> float:
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(p)]).strip())


def tira_qc(final: Path, salida: Path, n: int = 6) -> None:
    """Une n fotogramas repartidos en una sola imagen para revisar el video de un vistazo."""
    from PIL import Image

    d = dur(final)
    ims = []
    for i in range(n):
        t = d * (0.05 + 0.9 * i / (n - 1))
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
        sys.exit("uso: producir_serie3.py <prefijo, p.ej. ver01>")
    pref = sys.argv[1]
    # --reparar: usa el guion de scratchpad/guiones_reparados (guion archivado + arreglos,
    # con el cold-open congelado) para que un re-render no cambie nada más del video.
    carpeta = (RAIZ / "scratchpad" / "guiones_reparados3") if "--reparar" in sys.argv else GUIONES
    cand = sorted(carpeta.glob(f"{pref}_*.json"))   # exige el guion bajo: ver01 no matchea ver01s
    if len(cand) != 1:
        sys.exit(f"esperaba 1 guion con prefijo '{pref}', encontré {[c.name for c in cand]}")
    gpath = cand[0]
    g = json.loads(gpath.read_text(encoding="utf-8"))
    slug = g["slug"]
    num = re.match(r"ver(\d+)", gpath.name).group(1)
    stem = f"gen_{slug}"
    print(f"=== {gpath.name}  →  {stem}  (tema {g.get('theme')})", flush=True)

    # sin buffer: si el log va a un archivo, Python lo retiene y la tanda se ve "colgada"
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

    copys = json.loads((RAIZ / "videos" / f"{stem}.autoedit" / "copys.json")
                       .read_text(encoding="utf-8"))
    nombre = f"ver{num}_{slug.replace('ver_', '')}"
    # si el slug cambió (reestructurar la serie), el mp4 viejo con el MISMO número se
    # queda en Descargas y parecen duplicados. Se borra antes de escribir el nuevo.
    for viejo in DEST.glob(f"ver{num}_*.mp4"):
        if viejo.name != f"{nombre}.mp4":
            viejo.unlink()
            print(f"  (borro duplicado viejo: {viejo.name})", flush=True)
    shutil.copy2(final, DEST / f"{nombre}.mp4")
    # el copy escrito a mano MANDA: un re-render no lo puede pisar con el de Gemini
    manual = RAIZ / "scratchpad" / "copys_manuales_serie3" / f"ver{num}.txt"
    texto = manual.read_text(encoding="utf-8") if manual.exists() else copys["tiktok"]
    (DEST / f"ver{num}_copy_tiktok.txt").write_text(texto.strip() + "\n", encoding="utf-8")
    if manual.exists():
        print(f"  (copy a mano desde {manual.relative_to(RAIZ)})", flush=True)
    qc = RAIZ / "scratchpad" / f"qc_{slug}.png"
    tira_qc(final, qc)

    print(f"\n✔ {nombre}.mp4  ({dur(final):.1f}s)")
    print(f"  QC   → {qc}")
    print(f"  copy → revisar y reescribir a mano si hace falta:\n{copys['tiktok']}")


if __name__ == "__main__":
    main()
