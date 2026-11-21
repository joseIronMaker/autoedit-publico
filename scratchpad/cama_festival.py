"""Cama musical con ESTRUCTURA para un grabado: build bajo la voz, drop en el timelapse.

Una sola pista repetida no evoca nada — es un loop. Lo que hace que se sienta un festival
es que la energía CAMBIE en el punto donde cambia el video: mientras José explica va el
build (acordes que suben, sin golpe), y en el segundo exacto en que arranca el timelapse
entra el drop. La emoción la pone el contraste, no el volumen.

Lyria devuelve clips de ~30 s, así que cada sección se arma encadenando copias con
acrossfade (nunca un corte seco) y las dos secciones se encadenan entre sí.

El ESTILO se elige por CLI: cada video puede pedir otro género (José pide por DJ, no
por descripción: "estilo Novah WE1" = hard techno). Las pistas ya generadas se guardan
en assets como `bed_<estilo>_build/_drop.m4a` y se reusan: Lyria no se vuelve a gastar.

    .venv/bin/python scratchpad/cama_festival.py <salida.m4a> --build 95 --drop 130 \
        --estilo techno
"""
import argparse
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
XFADE = 2.0

ESTILOS = {
    # el de siempre: euforia de main stage melódico
    "festival": (
        "Uplifting festival EDM build-up, Tomorrowland main stage energy, 128 BPM, "
        "euphoric major-key supersaw chords rising, filtered noise riser, four-on-the-"
        "floor kick, emotional anthemic melody, wide reverb, instrumental, no vocals",
        "Big room festival EDM drop, Tomorrowland main stage anthem, 128 BPM, huge "
        "supersaw lead melody, punchy kick and clap, driving bassline, euphoric "
        "uplifting energy, festival crowd feeling, instrumental, no vocals"),
    # lo que toca Novah (Tomorrowland 2026, WE1): hard techno con acid e industrial
    "techno": (
        "Hard techno build-up, dark industrial warehouse energy, 150 BPM, rolling "
        "four-on-the-floor kick, hypnotic acid 303 line kept low, metallic percussion, "
        "tension rising under a voice, driving but restrained, instrumental, no vocals",
        "Hard techno drop, festival main stage hard techno, 150 BPM, pounding distorted "
        "kick, screaming acid 303 lead, industrial percussion, relentless hypnotic "
        "groove, euphoric rave energy, instrumental, no vocals"),
}


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def cadena(clip: Path, objetivo: float, destino: Path) -> Path:
    """Encadena copias del clip con acrossfade hasta pasar de `objetivo` segundos."""
    d = dur(clip)
    n = max(1, int((objetivo + XFADE) // (d - XFADE)) + 1)
    if n == 1:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(clip),
                        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(destino)],
                       check=True)
        return destino
    entradas, fc, prev = [], [], "0:a"
    for i in range(n):
        entradas += ["-i", str(clip)]
    for i in range(1, n):
        fc.append(f"[{prev}][{i}:a]acrossfade=d={XFADE}:c1=tri:c2=tri[x{i}]")
        prev = f"x{i}"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *entradas,
                    "-filter_complex", ";".join(fc), "-map", f"[{prev}]",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(destino)],
                   check=True)
    print(f"   {destino.name}: {n} copias de {d:.1f}s → {dur(destino):.1f}s", flush=True)
    return destino


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("salida")
    ap.add_argument("--build", type=float, required=True, help="segundos bajo la voz")
    ap.add_argument("--drop", type=float, required=True, help="segundos de timelapse")
    ap.add_argument("--estilo", default="techno", choices=sorted(ESTILOS),
                    help="género de la cama; el nombre viaja al archivo de assets")
    ap.add_argument("--tmp", default=None)
    ap.add_argument("--regenerar", action="store_true",
                    help="pide pistas nuevas a Lyria en vez de reusar las de assets")
    a = ap.parse_args()

    from dotenv import load_dotenv
    load_dotenv(RAIZ / ".env")
    from autoedit.config import load_config
    from autoedit.model_router import ModelRouter

    tmp = Path(a.tmp or RAIZ / "scratchpad" / "_cama")
    tmp.mkdir(parents=True, exist_ok=True)
    router = None

    piezas = []
    build_prompt, drop_prompt = ESTILOS[a.estilo]
    for nombre, prompt, largo in (("build", build_prompt, a.build),
                                  ("drop", drop_prompt, a.drop)):
        # las dos secciones YA generadas viven en assets: reusarlas mantiene el mismo
        # sonido entre videos y no vuelve a gastar Lyria (mandato de optimizar recursos)
        guardada = RAIZ / "autoedit" / "assets" / f"bed_{a.estilo}_{nombre}.m4a"
        crudo = guardada
        if a.regenerar or not guardada.exists():
            print(f"→ Lyria: {a.estilo}/{nombre}…", flush=True)
            if router is None:
                router = ModelRouter(load_config())
            mp3 = tmp / f"{a.estilo}_{nombre}.mp3"
            mp3.write_bytes(router.generate_music(prompt))
            # el clip crudo se GUARDA en assets: es lo que evita volver a pagar Lyria
            # cuando otro video pida la misma cama
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3),
                            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                            str(guardada)], check=True)
        print(f"   clip {nombre}: {dur(crudo):.1f}s", flush=True)
        piezas.append(cadena(crudo, largo, tmp / f"{nombre}_larga.m4a"))

    # el empalme entre build y drop es el ÚNICO punto donde la música tiene que cambiar
    # de verdad: acrossfade corto para que el drop entre, no para que se disuelva
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-i", str(piezas[0]), "-i", str(piezas[1]),
                    "-filter_complex", f"[0:a][1:a]acrossfade=d=1.2:c1=tri:c2=tri[a]",
                    "-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    str(a.salida)], check=True)
    print(f"✔ {Path(a.salida).name}  {dur(Path(a.salida)):.1f}s", flush=True)


if __name__ == "__main__":
    main()
