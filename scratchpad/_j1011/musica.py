#!/usr/bin/env python3
"""Camas nuevas para los grabados: electrónica de TENDENCIA en TikTok, una por pieza.

José, 11-oct-2026: "pon músicas en tendencia electrónica de TikTok porque las que pones
están aburridas, pero de fondo la voz siempre se debe escuchar". El hard techno de
siempre (`bed_techno_build`) era UNA sola pista para todo el canal: por eso aburre.
Aquí cada estilo es una pista Lyria 3 Pro (~3 min con estructura propia, no un loop de
30 s) y cada pieza de la serie usa otra.

Los prompts no nombran artistas (Lyria los rechaza) y piden instrumental: una voz
cantada debajo de la de José se comería los subtítulos de oído. Se guardan en
`autoedit/assets/bed_tt_<estilo>.m4a` y se REUSAN: Lyria no se vuelve a gastar.

    .venv/bin/python scratchpad/_j1011/musica.py [estilo ...]      # sin args: todos
"""
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
ASSETS = RAIZ / "autoedit" / "assets"

_COMUN = (" Instrumental only, absolutely no vocals, no vocal chops, no spoken words. "
          "Mixed to sit under a voiceover: punchy low end and drums, the 1-4 kHz midrange "
          "kept clean. Full track with intro, groove sections and a drop, steady energy.")

ESTILOS = {
    "techhouse": "Viral TikTok tech house, 126 BPM, bouncy rolling bassline, crisp shuffled "
                 "hi-hats, tight clap, groovy club energy, playful percussion fills.",
    "afrohouse": "Afro house, 122 BPM, hypnotic tribal percussion, warm marimba and kalimba "
                 "plucks, deep rolling bass, organic shakers, uplifting sunset festival vibe.",
    "ukgarage": "Speed garage / UK garage 2-step, 134 BPM, swung shuffling hats, warped "
                "rubbery bass stabs, skippy drums, energetic modern TikTok club sound.",
    "dnb": "Liquid drum and bass, 174 BPM, fast rolling breakbeats, deep sub bass, bright "
           "airy pads, euphoric and driving, modern viral DnB energy.",
    "phonk": "Brazilian funk phonk montagem, 130 BPM, iconic cowbell melody, heavy distorted "
             "808 bass, punchy drums, hypnotic viral TikTok edit energy.",
    "melodictechno": "Melodic techno, 124 BPM, epic arpeggiated synth lead, dark cinematic "
                     "pads, driving kick and rolling bass, big festival build and release.",
}


def genera(estilo: str) -> Path:
    destino = ASSETS / f"bed_tt_{estilo}.m4a"
    if destino.exists():
        print(f"  {estilo}: ya existe, se reusa", flush=True)
        return destino
    from dotenv import load_dotenv
    load_dotenv(RAIZ / ".env")
    from autoedit.config import load_config
    from autoedit.model_router import ModelRouter
    router = ModelRouter(load_config())
    mp3 = router.generate_music(ESTILOS[estilo] + _COMUN)
    with tempfile.NamedTemporaryFile(suffix=".mp3") as t:
        Path(t.name).write_bytes(mp3)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", t.name, "-c:a", "aac",
                        "-b:a", "192k", "-ar", "48000", str(destino)], check=True)
    print(f"  {estilo}: generada → {destino.name}", flush=True)
    return destino


if __name__ == "__main__":
    for e in sys.argv[1:] or list(ESTILOS):
        try:
            genera(e)
        except Exception as ex:  # noqa: BLE001 — que un estilo no tumbe a los demás
            print(f"  {e}: FALLÓ ({ex})", flush=True)
