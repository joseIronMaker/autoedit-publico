"""Genera con Codex las placas que reemplazan las dos animaciones feas de s01.

Cero costo (plan ChatGPT de Jose). Metaforas de imprenta: encajan con el clip
letterpress que ya usa la tesis y NO necesitan texto renderizado (los modelos de
imagen escriben espanol mal y eso se ve horrible en pantalla).
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from autoedit.codex_client import codex_image  # noqa: E402
from autoedit.generate import _IMG_STYLE       # noqa: E402

ASSETS = RAIZ / "videos" / "gen_ia_citar_o_adivinar.assets"

PLACAS = {
    # escena 2 · "no guarda datos: elige la palabra siguiente, una tras otra"
    "scene_2_a": "An old wooden printer's type case seen from directly above, its dozens of "
                 "compartments filled with thousands of tiny metal letters, all loose and "
                 "unsorted into any word. Raking warm lamplight from the left, deep shadows "
                 "in the compartments, worn wood.",
    "scene_2_b": "Extreme macro close-up of a typesetter's fingers lifting ONE single small "
                 "metal letter out of a wooden compartment full of identical metal letters. "
                 "Very shallow depth of field, the chosen letter sharp, everything else "
                 "dissolving into warm blur.",
    "scene_2_c": "A metal composing stick held in one hand, holding a half-finished line of "
                 "set metal type that stops abruptly in the middle, leaving empty space at "
                 "the end of the line. The type case blurred behind. Side lamplight.",
    # escena 3 · "las dos suenan igual de seguras; la confianza mide lo comun, no la verdad"
    "scene_3_a": "Two identical sheets of printed paper lying side by side on a dark wooden "
                 "desk, lit by exactly the same lamp, indistinguishable from each other. A "
                 "small paper slip is clipped to the left sheet; the right sheet has nothing "
                 "clipped to it. Shot from straight above, symmetrical.",
    "scene_3_b": "Extreme macro of a vintage brass analogue meter, its needle pinned all the "
                 "way to the right against the stop. The dial face is completely blank: no "
                 "numbers, no markings, no letters at all. Scratched glass, warm amber "
                 "reflection, dark background.",
    "scene_3_c": "A hand sliding one printed sheet of paper across a dark wooden meeting "
                 "table toward someone sitting opposite, whose hands rest at the far edge of "
                 "the table. Morning light through blinds, dust in the air.",
}


def una(par):
    nombre, prompt = par
    destino = ASSETS / f"{nombre}.png"
    if destino.exists():
        return f"ya estaba: {nombre}"
    codex_image(f"{prompt} {_IMG_STYLE}", destino)
    return f"OK {nombre} ({destino.stat().st_size/1000:.0f} kB)"


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=6) as ex:
        for r in ex.map(una, PLACAS.items()):
            print(r, flush=True)
