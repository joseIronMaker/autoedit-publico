"""Reconstruye SOLO el showcase (seg_2) de V0 con imágenes limpias y re-ensambla,
reusando los segmentos host (seg_1, seg_5) para NO re-gastar D-ID."""
import json, subprocess
from pathlib import Path
from autoedit.config import load_config
from autoedit.diagrams import THEMES
from autoedit.remotion_scenes import render_remotion_scene, stage_asset
from autoedit import generate as G, host_layout

root = Path("videos"); stem = "gen_dl_por_que_ahora"
assets = root / f"{stem}.assets"; out_path = root / f"{stem}.mp4"

cfg = load_config(); gcfg = cfg["generate"]
tn = list(THEMES.keys()); gcfg["theme"] = tn[sum(map(ord, stem)) % len(tn)]
print("theme:", gcfg["theme"])

# 1) imágenes limpias (Codex $0; sin marca de agua ni portadas de terceros)
prompts = {
    0: ("a vast dense mosaic grid of thousands of tiny diverse photographs of animals, "
        "faces, streets, food and objects, representing the massive scale of internet "
        "training data, sharp, clean"),
    2: ("a sleek modern code editor floating on a dark screen showing abstract glowing "
        "lines of python deep-learning code and neural-network layers, clean, premium"),
}
from autoedit.codex_client import codex_image, codex_available
from autoedit.model_router import ModelRouter
router = ModelRouter(cfg)
for j, p in prompts.items():
    img = assets / f"showcase_2_{j}.png"
    full = f"{p}. {G._IMG_STYLE}"
    try:
        if not codex_available():
            raise RuntimeError("codex no disponible")
        codex_image(full, img)
        print("codex regen", img.name)
    except Exception as e:
        print(f"  codex falló ({e}); uso Gemini")
        img.write_bytes(router.generate_image(full))
        print("gemini regen", img.name)

# 2) reconstruir seg_2 (showcase) con las nuevas imágenes
guion = json.loads((assets / "guion.json").read_text())
scene = guion["scenes"][2]
items_out = [{"label": it.get("label", ""), "image": stage_asset(assets / f"showcase_2_{j}.png")}
             for j, it in enumerate(scene["showcase"]["items"][:4])]
spec = {"type": "showcase", "items": items_out}
voz = assets / "scene_2.wav"
dur = float(subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=nk=1:nw=1", str(voz)]).strip()) + 0.3
seg2 = assets / "seg_2.mp4"; seg2.unlink(missing_ok=True)
render_remotion_scene(spec, voz, dur, seg2, gcfg)
print("seg_2 reconstruido:", seg2.exists(), round(dur, 2), "s")

# 3) re-ensamblar los 6 segmentos (host seg_1/seg_5 REUSADOS)
segments = [assets / f"seg_{i}.mp4" for i in range(6)]
assert all(s.exists() for s in segments), [s.name for s in segments if not s.exists()]
G._assemble(segments, out_path, gcfg)

# 4) audio continuo + whoosh (hay host/kinetic)
sfx = Path("autoedit/assets/sfx/whoosh.mp3")
host_layout.continuous_base_audio(
    out_path, segments,
    sfx_path=sfx if gcfg.get("sfx") else None,
    sfx_gain=float(gcfg.get("sfx_gain", 0.32)))
print("RE-ENSAMBLADO:", out_path, out_path.exists())
