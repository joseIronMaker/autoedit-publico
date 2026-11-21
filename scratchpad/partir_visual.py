"""Parte EN DOS el visual de una escena, sin tocar la locución.

Por qué: una escena de recibo (screenshot real) de 19 s con zoom lento se siente quieta
y rompe la regla de los 3 segundos, pero volver a grabar la voz para partirla en dos
escenas sería re-gastar ElevenLabs. Esto conserva el `scene_<i>.wav` completo y cambia
la IMAGEN a la mitad: la primera parte se recorta del `seg_<i>.mp4` que ya existe y la
segunda son placas nuevas (`image_prompts_extra` del guion, generadas con Codex).

    .venv/bin/python scratchpad/partir_visual.py gen_ia_fine_tuning_no_era 1 9.53
"""
import argparse
import subprocess
import sys
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(RAIZ / ".env")

import json                                     # noqa: E402
from autoedit import generate as gen            # noqa: E402
from autoedit.config import load_config         # noqa: E402

CRUCE = 0.6   # disolvencia entre las dos mitades


def dur_wav(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stem")
    ap.add_argument("idx", type=int)
    ap.add_argument("corte", type=float, help="segundo en que cambia la imagen")
    ap.add_argument("--dir", type=Path, default=RAIZ / "videos")
    a = ap.parse_args()

    assets = a.dir / f"{a.stem}.assets"
    guion = json.loads((assets / "guion.json").read_text(encoding="utf-8"))
    escena = guion["scenes"][a.idx]
    prompts = [p for p in (escena.get("image_prompts_extra") or []) if p]
    if not prompts:
        sys.exit("la escena no trae 'image_prompts_extra' en el guion")

    voz = assets / f"scene_{a.idx}.wav"
    seg = assets / f"seg_{a.idx}.mp4"
    if not (voz.exists() and seg.exists()):
        sys.exit("faltan scene_N.wav o seg_N.mp4")
    cola = 1.0 if a.idx == len(guion["scenes"]) - 1 else 0.18
    total = dur_wav(voz) + cola
    tA = a.corte
    tB = total - tA + CRUCE
    print(f"escena {a.idx}: {total:.2f}s → recibo {tA:.2f}s + {len(prompts)} placas {tB:.2f}s")

    cfg = load_config()
    gcfg = cfg.get("generate", cfg)
    estilo = gcfg.get("image_style") or gen._IMG_STYLE

    # 1) las placas nuevas (Codex, en paralelo, $0)
    from concurrent.futures import ThreadPoolExecutor
    from autoedit.model_router import ModelRouter

    router = ModelRouter(cfg)
    faltan, imgs = [], []
    for j, p in enumerate(prompts):
        destino = assets / f"scene_{a.idx}x_{j}.png"
        imgs.append(destino)
        if not destino.exists():
            faltan.append((f"{p}. {estilo}", destino))
    if faltan:
        print(f"generando {len(faltan)} placa(s) con codex…", flush=True)
        with ThreadPoolExecutor(max_workers=len(faltan)) as ex:
            list(ex.map(lambda t: gen._gen_image(t[0], t[1], router, None), faltan))

    tmp = assets / "_partir"
    tmp.mkdir(exist_ok=True)
    mudo = tmp / "mudo.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
                    "-i", "anullsrc=r=24000:cl=mono", "-t", f"{tB:.3f}", str(mudo)],
                   check=True)

    # 2) segunda mitad: placas con Ken Burns (audio mudo, se descarta)
    parte_b = tmp / "b.mp4"
    gen._render_scene_plates(imgs, mudo, tB, a.idx + 1, parte_b, gcfg)

    # 3) primera mitad: se RECORTA del segmento que ya existe (nada que re-renderizar)
    parte_a = tmp / "a.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(seg),
                    "-t", f"{tA:.3f}", "-an", "-c:v", "libx264", "-crf", "18",
                    "-preset", "medium", str(parte_a)], check=True)

    # 4) disolvencia entre las dos + la locución ORIGINAL completa
    nuevo = tmp / "seg.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(parte_a), "-i", str(parte_b),
         "-i", str(voz),
         "-filter_complex",
         f"[0:v][1:v]xfade=transition=fade:duration={CRUCE}:offset={tA - CRUCE:.3f},"
         f"format=yuv420p[v]",
         "-map", "[v]", "-map", "2:a", "-af", "apad=pad_dur=1.6",
         "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-t", f"{total:.3f}", str(nuevo)], check=True)

    nuevo.replace(seg)
    (assets / f"seg_{a.idx}.sha1").unlink(missing_ok=True)
    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()
    d = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                 "format=duration", "-of", "csv=p=0", str(seg)]).strip()
    print(f"✔ {seg} · {float(d):.2f}s (antes {total:.2f}s de recibo quieto)")


if __name__ == "__main__":
    main()
