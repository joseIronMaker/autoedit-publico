#!/usr/bin/env python3
"""Deja el estudio limpio: borra TODO el material producido de videos ya subidos.

José, 20-ago-2026: "borra todo lo relacionado a los videos, deja limpio todo
material que hayas producido y borra todo lo que ya subiste".

Lo UNICO que se salva:
  · los 76 clips Omni/Veo PAGADOS  -> se consolidan en videos/_clips_pagados/
  · los copys publicados            -> se archivan en scratchpad/copys_publicados/
  · branding/, guiones .json y el codigo del motor

Dry-run por defecto. Con --borrar ejecuta.
"""
import shutil, sys, os
from pathlib import Path

RAIZ = Path("/home/jose/tiktok")
DESC = Path("/mnt/c/Users/USUARIO/Downloads")
BORRAR = "--borrar" in sys.argv

CLIPS = RAIZ / "videos" / "_clips_pagados"
COPYS = RAIZ / "scratchpad" / "copys_publicados"

def peso(p: Path) -> int:
    if p.is_file():
        return p.stat().st_size
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file())

def humano(n: int) -> str:
    for u in ("B", "K", "M", "G"):
        if n < 1024:
            return f"{n:.0f}{u}"
        n /= 1024
    return f"{n:.1f}T"

# ---------- 1. rescatar clips pagados ----------
pagados = sorted(RAIZ.joinpath("videos").rglob("veo_*.mp4"))
pagados = [p for p in pagados if CLIPS not in p.parents]
print(f"RESCATE · {len(pagados)} clips Omni/Veo pagados ({humano(sum(peso(p) for p in pagados))})")
if BORRAR:
    CLIPS.mkdir(parents=True, exist_ok=True)
    for p in pagados:
        destino = CLIPS / f"{p.parent.name.replace('.assets','')}__{p.name}"
        if not destino.exists():
            shutil.copy2(p, destino)

# ---------- 2. archivar copys publicados ----------
copys = sorted(DESC.rglob("*_copy_tiktok.txt")) if DESC.exists() else []
print(f"RESCATE · {len(copys)} copys publicados archivados en scratchpad/copys_publicados/")
if BORRAR:
    COPYS.mkdir(parents=True, exist_ok=True)
    for c in copys:
        shutil.copy2(c, COPYS / f"{c.parent.name}_{c.name}")

# ---------- 3. lo que se borra ----------
objetivos: list[Path] = []
v = RAIZ / "videos"
objetivos += sorted(v.glob("*.mp4"))                 # finales + pre-render
objetivos += sorted(d for d in v.glob("*.assets") if d.is_dir())
objetivos += sorted(d for d in v.glob("*.autoedit") if d.is_dir())
objetivos += sorted(d for d in v.glob("*") if d.is_dir()
                    and not d.name.endswith((".assets", ".autoedit"))
                    and d != CLIPS)
# series/ (estado de colas ya cerradas) y PNGs de QC del scratchpad
objetivos += sorted(RAIZ.joinpath("scratchpad").glob("*.png"))
objetivos += sorted(RAIZ.joinpath("scratchpad").glob("*.jpg"))
objetivos += sorted(RAIZ.joinpath("scratchpad").glob("*.m4a"))
objetivos += sorted(RAIZ.joinpath("scratchpad").glob("*.wav"))
# Descargas: series ya subidas
if DESC.exists():
    objetivos += [DESC / n for n in ("agentes", "harneses", "serie1", "serie15", "serire_5")]
    objetivos += sorted(DESC.glob("pro01_*"))

objetivos = [p for p in objetivos if p.exists()]
total = 0
print(f"\nBORRA · {len(objetivos)} rutas")
for p in objetivos:
    t = peso(p)
    total += t
    if t > 20 * 1024 * 1024:
        print(f"   {humano(t):>6}  {p}")
print(f"   ... (resto menor a 20M)")
print(f"\nTOTAL A LIBERAR: {humano(total)}")

if not BORRAR:
    print("\n(dry-run; correr con --borrar)")
    sys.exit(0)

for p in objetivos:
    if p.is_dir():
        shutil.rmtree(p, ignore_errors=True)
    else:
        try:
            p.unlink()
        except OSError:
            pass
print("\nHECHO.")
