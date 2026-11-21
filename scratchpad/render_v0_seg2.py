"""Render SOLO seg_2 (showcase, imágenes ya limpias y reducidas) y re-ensambla V0."""
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
print("render seg_2, dur", round(dur, 2), flush=True)
render_remotion_scene(spec, voz, dur, seg2, gcfg)
print("seg_2 OK", seg2.exists(), flush=True)

segments = [assets / f"seg_{i}.mp4" for i in range(6)]
assert all(s.exists() for s in segments)
G._assemble(segments, out_path, gcfg)
sfx = Path("autoedit/assets/sfx/whoosh.mp3")
host_layout.continuous_base_audio(
    out_path, segments,
    sfx_path=sfx if gcfg.get("sfx") else None,
    sfx_gain=float(gcfg.get("sfx_gain", 0.32)))
print("RE-ENSAMBLADO OK", out_path.exists(), flush=True)
