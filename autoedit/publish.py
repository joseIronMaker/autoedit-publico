"""Publica un video aprobado a Descargas de Windows, listo para subir.

Estructura (elegida por José): Descargas/videos/NN_titulo/ con el .mp4 + copy.md
(título, descripción, hashtags, gancho y los copys por plataforma de la Rama B).

Uso:
    from autoedit.publish import publish_to_downloads
    publish_to_downloads("videos/gen_..._final.mp4", 2, "IA Predictiva: el cerebro...")
"""
from __future__ import annotations

import json
import re
import shutil
import unicodedata
from pathlib import Path


def _slug(s: str, maxlen: int = 40) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return s[:maxlen].strip("_")


def _downloads_dir() -> Path:
    """Carpeta Descargas del usuario real de Windows (WSL)."""
    users = Path("/mnt/c/Users")
    if users.exists():
        cands = [d / "Downloads" for d in users.iterdir()
                 if (d / "Downloads").is_dir() and d.name not in
                 ("Default", "Default User", "Public", "All Users")]
        if cands:
            return cands[0]
    return Path.home() / "Downloads"


def _build_copy_md(numero: int, titulo: str, workdir: Path | None,
                   descripcion: str = "", hook: str = "") -> str:
    lines = [f"# {numero:02d} · {titulo}", ""]
    if hook:
        lines += [f"**Hook:** {hook}", ""]
    if descripcion:
        lines += [descripcion, ""]
    # copys por plataforma de la Rama B (si existen)
    if workdir:
        cj = workdir / "copys.json"
        cm = workdir / "copys.md"
        if cj.exists():
            try:
                data = json.loads(cj.read_text(encoding="utf-8"))
                for plat in ("tiktok", "instagram", "facebook"):
                    blk = data.get(plat) or {}
                    if not blk:
                        continue
                    lines.append(f"## {plat.capitalize()}")
                    if blk.get("caption") or blk.get("copy"):
                        lines.append(blk.get("caption") or blk.get("copy"))
                    tags = blk.get("hashtags") or blk.get("tags")
                    if tags:
                        lines.append(" ".join(tags) if isinstance(tags, list) else str(tags))
                    lines.append("")
            except Exception:  # noqa: BLE001
                pass
        elif cm.exists():
            lines.append(cm.read_text(encoding="utf-8"))
    return "\n".join(lines).rstrip() + "\n"


# LA PUERTA DE ENTREGA NO SE PUEDE SALTAR (8-sep-2026). Tres videos llegaron a estar
# "listos" con un final corrupto, con la pantalla de José dentro y con 40% del metraje
# congelado, y en los tres casos los logs decían OK. `scratchpad/verifica_entrega.py`
# revisa lo que se puede medir; publicar sin pasarlo es cómo se cuela un video roto.
# Para saltárselo a propósito (un video viejo, una prueba): AUTOEDIT_SIN_VERIFICAR=1.
def _exige_verificacion(final_mp4: Path) -> None:
    import os
    import subprocess

    if os.environ.get("AUTOEDIT_SIN_VERIFICAR"):
        print("  aviso: verificación de entrega SALTADA por AUTOEDIT_SIN_VERIFICAR")
        return
    raiz = Path(__file__).resolve().parent.parent
    verif = raiz / "scratchpad" / "verifica_entrega.py"
    if not verif.exists():
        return
    stem = final_mp4.stem[:-6] if final_mp4.stem.endswith("_final") else final_mp4.stem
    r = subprocess.run([str(raiz / ".venv/bin/python"), str(verif), stem],
                       cwd=raiz, capture_output=True, text=True)
    print(r.stdout, end="")
    if r.returncode != 0:
        raise RuntimeError(
            f"{stem} NO pasa la verificación de entrega (arriba está el motivo). "
            f"Arréglalo y vuelve a publicar; si de verdad quieres saltártelo, "
            f"AUTOEDIT_SIN_VERIFICAR=1.")


def publish_to_downloads(final_mp4: str | Path, numero: int, titulo: str,
                         descripcion: str = "", hook: str = "",
                         downloads: str | Path | None = None) -> Path:
    """Copia el video final + copy.md a Descargas/videos/NN_titulo/. Devuelve la carpeta."""
    final_mp4 = Path(final_mp4)
    if not final_mp4.exists():
        raise FileNotFoundError(f"No existe el video: {final_mp4}")
    _exige_verificacion(final_mp4)
    base = Path(downloads) if downloads else _downloads_dir()
    folder = base / "videos" / f"{numero:02d}_{_slug(titulo)}"
    folder.mkdir(parents=True, exist_ok=True)
    # el .autoedit del video (para los copys de la Rama B)
    workdir = final_mp4.parent / f"{final_mp4.stem.replace('_final', '')}.autoedit"
    workdir = workdir if workdir.exists() else None
    dest_mp4 = folder / f"{numero:02d}_{_slug(titulo)}.mp4"
    shutil.copy2(final_mp4, dest_mp4)
    (folder / "copy.md").write_text(
        _build_copy_md(numero, titulo, workdir, descripcion, hook), encoding="utf-8")
    return folder


if __name__ == "__main__":  # python -m autoedit.publish <final.mp4> <numero> <titulo>
    import sys
    print(publish_to_downloads(sys.argv[1], int(sys.argv[2]), sys.argv[3]))
