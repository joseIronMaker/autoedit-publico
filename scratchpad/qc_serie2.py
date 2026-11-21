"""QC medible de la serie completa: lo que se puede verificar sin ojo humano.

    .venv/bin/python scratchpad/qc_serie2.py

Revisa, por video entregado: duración, escenas vacías, huecos dentro de una escena,
audio (silencio y volumen), subtítulos presentes, y el copy (CTA prohibido y formato).
Imprime una tabla y sale con código 1 si algo falla.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from autoedit.generate import _INK_MIN, _cuerpo_vacio          # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
GUIONES = RAIZ / "scratchpad" / "guiones_serie2"
DEST = Path("/mnt/c/Users/USUARIO/Downloads")
BAN = re.compile(r"\b(gu[áa]rda(lo|te)|s[íi]gueme|suscr[íi]b\w*|coment[ae]\b|dale like|comp[áa]rtelo)\b", re.I)
DUR_MIN, DUR_MAX = 28.0, 45.0


def dur(p: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout
    return float(out.strip() or 0)


def audio_stats(p: Path) -> tuple[float, float]:
    """(volumen medio dBFS, silencio total en segundos)."""
    r = subprocess.run(
        ["ffmpeg", "-i", str(p), "-af", "volumedetect,silencedetect=n=-45dB:d=1.2",
         "-f", "null", "-"], capture_output=True, text=True)
    err = r.stderr
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", err)
    sil = sum(float(x) for x in re.findall(r"silence_duration: ([\d.]+)", err))
    return (float(m.group(1)) if m else 0.0), sil


def main() -> None:
    fallos, avisos = [], []
    print(f"{'video':26s} {'dur':>6s} {'vol':>7s} {'silen':>6s} {'subs':>5s} "
          f"{'vacías':>6s} {'copy':>5s}")
    print("-" * 72)
    for gp in sorted(GUIONES.glob("ln*.json")):
        ln = gp.name[:4]
        g = json.loads(gp.read_text(encoding="utf-8"))
        slug = g["slug"]
        entregado = next(DEST.glob(f"leer{ln[2:]}_*.mp4"), None)
        if not entregado:
            fallos.append(f"{ln}: no está entregado en Descargas")
            continue
        d = dur(entregado)
        vol, sil = audio_stats(entregado)

        assets = RAIZ / "videos" / f"gen_{slug}.assets"
        arch = json.loads((assets / "guion.json").read_text(encoding="utf-8"))
        escenas = [s for s in arch["scenes"] if s.get("narration")]
        vacias = []
        for i, s in enumerate(escenas):
            seg = assets / f"seg_{i}.mp4"
            if not seg.exists() or s.get("visual_type") in ("host", "ml_demo"):
                continue
            if _cuerpo_vacio(seg, dur(seg)) < _INK_MIN:
                vacias.append(i + 1)

        subs = (RAIZ / "videos" / f"gen_{slug}.autoedit" / "subs_full.ass")
        n_subs = subs.read_text(encoding="utf-8").count("Dialogue:") if subs.exists() else 0

        copy_f = DEST / f"leer{ln[2:]}_copy_tiktok.txt"
        copy_txt = copy_f.read_text(encoding="utf-8") if copy_f.exists() else ""
        copy_ok = bool(copy_txt.strip()) and not BAN.search(copy_txt)

        print(f"{ln + ' ' + slug[3:22]:26s} {d:6.1f} {vol:7.1f} {sil:6.1f} "
              f"{n_subs:5d} {(','.join(map(str, vacias)) or '-'):>6s} "
              f"{'ok' if copy_ok else 'MAL':>5s}")

        if not DUR_MIN <= d <= DUR_MAX:
            fallos.append(f"{ln}: duración {d:.1f}s fuera de {DUR_MIN}-{DUR_MAX}s")
        if vacias:
            fallos.append(f"{ln}: escenas vacías {vacias}")
        if n_subs < 10:
            fallos.append(f"{ln}: solo {n_subs} líneas de subtítulo")
        if not copy_ok:
            fallos.append(f"{ln}: copy vacío o con CTA prohibido")
        if sil > 2.5:
            avisos.append(f"{ln}: {sil:.1f}s de silencio acumulado")
        if vol < -26 or vol > -12:
            avisos.append(f"{ln}: volumen medio {vol:.1f} dB (esperado -22 a -14)")

    print()
    for a in avisos:
        print(f"  · {a}")
    for f in fallos:
        print(f"  ✗ {f}")
    print(f"\n{'TODO OK' if not fallos else str(len(fallos)) + ' FALLOS'}")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
