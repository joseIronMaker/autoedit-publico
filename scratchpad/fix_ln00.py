"""Re-renderiza con Remotion las 2 escenas que degradaron a PIL en el primer video de
la serie de lenguaje (cold-open con video de fondo y showcase). Reusa voz, clip Veo,
imágenes de codex y los segmentos host: cero gasto de API."""
import json
import subprocess
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from autoedit.config import load_config
from autoedit.diagrams import THEMES
from autoedit.remotion_scenes import render_remotion_scene, stage_asset
from autoedit import generate as G, host_layout

stem = "gen_ln_frase_rompio_ia"
assets = Path("videos") / f"{stem}.assets"
out_path = Path("videos") / f"{stem}.mp4"
cfg = load_config()
gcfg = dict(cfg["generate"])
tn = list(THEMES.keys())
gcfg["theme"] = tn[sum(map(ord, stem)) % len(tn)]
print("tema:", gcfg["theme"])

guion = json.loads((assets / "guion.json").read_text())


def dur_of(p: Path) -> float:
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(p)]).strip())


def rebuild(idx: int) -> None:
    scene = guion["scenes"][idx]
    voz = assets / f"scene_{idx}.wav"
    dur = dur_of(voz) + 0.3
    vt = scene["visual_type"]
    if vt == "kinetic_video":
        kv = scene["kinetic_video"]
        clip = assets / f"veo_{idx}.mp4"
        assert clip.exists(), f"falta {clip}"
        spec = {"type": "kinetic_video", "words": kv.get("words") or [],
                "variant": kv.get("variant", "dark"), "video": stage_asset(clip)}
    elif vt == "showcase":
        items = []
        for j, it in enumerate(scene["showcase"]["items"][:4]):
            img = assets / f"showcase_{idx}_{j}.png"
            assert img.exists(), f"falta {img}"
            items.append({"label": it.get("label", ""), "image": stage_asset(img)})
        spec = {"type": "showcase", "items": items}
    else:
        raise SystemExit(f"no soportado: {vt}")
    seg = assets / f"seg_{idx}.mp4"
    seg.unlink(missing_ok=True)
    print(f"escena {idx}: render {vt} ({dur:.1f}s)", flush=True)
    render_remotion_scene(spec, voz, dur, seg, gcfg)
    print(f"escena {idx}: OK {seg.exists()}", flush=True)


for i in (0, 3):
    rebuild(i)

segs = [assets / f"seg_{i}.mp4" for i in range(len(guion["scenes"]))]
faltan = [s.name for s in segs if not s.exists()]
assert not faltan, faltan
G._assemble(segs, out_path, gcfg)
sfx = Path("autoedit/assets/sfx/whoosh.mp3")
host_layout.continuous_base_audio(
    out_path, segs, sfx_path=sfx if gcfg.get("sfx") else None,
    sfx_gain=float(gcfg.get("sfx_gain", 0.32)))
print(f"RE-ENSAMBLADO {out_path} ({dur_of(out_path):.1f}s)")
