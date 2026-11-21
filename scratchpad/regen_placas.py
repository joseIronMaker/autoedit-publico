"""Regenera las PLACAS de una escena `image` con el estilo actual de config.yaml.

    .venv/bin/python scratchpad/regen_placas.py gen_ia_espanol_cuesta_mas 1 5

Existe porque el estilo de imagen vive en config.yaml (`generate.image_style`) y pisa al
del motor: cuando ese texto se corrige, las imágenes ya generadas se quedan con el look
viejo. Esto las rehace con Codex (costo 0) sin tocar voz, clips ni las demás escenas.
Después hay que correr rehacer_escena.py para volver a armar el segmento.
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(RAIZ / ".env")

from autoedit.codex_client import codex_image  # noqa: E402
from autoedit.config import load_config        # noqa: E402
from autoedit.generate import _IMG_STYLE       # noqa: E402


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit("uso: regen_placas.py <stem> <idx> [idx...]")
    stem = sys.argv[1]
    idxs = [int(a) for a in sys.argv[2:]]
    assets = RAIZ / "videos" / f"{stem}.assets"
    guion = json.loads((assets / "guion.json").read_text(encoding="utf-8"))
    cfg = load_config()
    estilo = cfg.get("generate", cfg).get("image_style") or _IMG_STYLE

    tareas = []
    for i in idxs:
        escena = guion["scenes"][i]
        prompts = [p for p in (escena.get("image_prompts") or []) if p]
        if not prompts:
            prompts = [escena.get("image_prompt", "")]
        for j, p in enumerate(prompts):
            destino = assets / (f"scene_{i}.png" if len(prompts) == 1
                                else f"scene_{i}_{j}.png")
            destino.unlink(missing_ok=True)
            tareas.append((f"{p}. {estilo}", destino))

    def una(t):
        prompt, destino = t
        codex_image(prompt, destino)
        return f"OK {destino.name} ({destino.stat().st_size / 1000:.0f} kB)"

    with ThreadPoolExecutor(max_workers=6) as ex:
        for r in ex.map(una, tareas):
            print(r, flush=True)


if __name__ == "__main__":
    main()
