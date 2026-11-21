"""Borra el material pesado de las series ya terminadas. Por defecto NO borra: enseña.

    .venv/bin/python scratchpad/limpiar_series.py          # en seco (solo lista)
    .venv/bin/python scratchpad/limpiar_series.py --borrar # borra de verdad

Qué se va: los mp4 finales y crudos, los segmentos, las placas, las voces y la cama
musical de cada video de una serie ya entregada, más la carpeta subir/ (duplicados).

Qué se queda, y por qué:
  - `*.assets/veo_*.mp4`: los ~76 clips de Omni/Veo YA SE PAGARON y `kinetic_video` los
    reusa por ruta local. Pesan 85 MB entre todos; regenerarlos cuesta dinero.
  - los guiones (`scratchpad/guiones_*`), las mediciones y los copys: son texto.
  - los stems de PROTEGIDOS: lo que está en producción o pendiente de subir.

OJO: borrar aquí NO le devuelve espacio a C:. El disco de Linux es un archivo
(`ext4.vhdx`, ~106 GB) que crece y no se encoge solo; hay que compactarlo desde Windows.
"""
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
VIDEOS = RAIZ / "videos"

# stems que NO se tocan: en producción, o producidos y todavía sin subir
PROTEGIDOS = {
    "gen_pro_cinco_piezas",        # pro02, pendiente de subir
    "gen_pro_cinco_nombres",       # pro04, produciéndose ahora
    "gen_ag_que_escribio_de_verdad",  # ag01 rehecho, renderizando ahora
}


def stems():
    """Todos los stems de video generados que hay en videos/."""
    out = set()
    for p in VIDEOS.glob("gen_*"):
        n = p.name
        for suf in (".assets", ".autoedit", "_final.mp4", ".mp4"):
            if n.endswith(suf):
                out.add(n[: -len(suf)])
                break
    return sorted(out)


def objetivos(stem):
    """Rutas a borrar de un stem. Los veo_*.mp4 pagados quedan fuera de la lista."""
    yield VIDEOS / f"{stem}.mp4"
    yield VIDEOS / f"{stem}_final.mp4"
    yield VIDEOS / f"{stem}.autoedit"
    ass = VIDEOS / f"{stem}.assets"
    if ass.is_dir():
        for hijo in ass.iterdir():
            if hijo.name.startswith("veo_") and hijo.suffix == ".mp4":
                continue
            yield hijo


def peso(p):
    if p.is_file():
        return p.stat().st_size
    if p.is_dir():
        return sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
    return 0


def main():
    borrar = "--borrar" in sys.argv
    total = 0
    for stem in stems():
        if stem in PROTEGIDOS:
            print(f"  PROTEGIDO  {stem}")
            continue
        libera = 0
        for p in objetivos(stem):
            if not p.exists():
                continue
            libera += peso(p)
            if borrar:
                shutil.rmtree(p) if p.is_dir() else p.unlink()
        if libera:
            total += libera
            print(f"  {'borrado ' if borrar else 'se iría '} {libera / 2**20:8.1f} MB  {stem}")

    sub = RAIZ / "subir"
    if sub.is_dir():
        p = peso(sub)
        total += p
        print(f"  {'borrado ' if borrar else 'se iría '} {p / 2**20:8.1f} MB  subir/ (duplicados)")
        if borrar:
            shutil.rmtree(sub)

    quedan = sum(f.stat().st_size for f in VIDEOS.glob("*.assets/veo_*.mp4"))
    n = len(list(VIDEOS.glob("*.assets/veo_*.mp4")))
    print(f"\n{'LIBERADO' if borrar else 'SE LIBERARÍA'}: {total / 2**30:.2f} GB")
    print(f"conservados: {n} clips pagados ({quedan / 2**20:.0f} MB)")
    if not borrar:
        print("\nen seco. para borrar de verdad: --borrar")


if __name__ == "__main__":
    main()
