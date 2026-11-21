"""Renderiza el MISMO diagrama flow con el motor actual (PIL) para comparar vs Remotion."""
import subprocess
from pathlib import Path
import sys

sys.path.insert(0, "/home/jose/tiktok")
from autoedit import diagrams as dg

W, H, FPS, DUR = 1080, 1920, 30, 5.0
spec = {
    "type": "flow",
    "title": "Cómo crea",
    "items": ["Aprende patrones", "Los combina", "Crea algo nuevo"],
    "theme": "violeta",
}
out = Path("/home/jose/tiktok/scratchpad/remotion-pilot/out/flow_pil.mp4")
frames_dir = out.parent / "pil_frames"
frames_dir.mkdir(exist_ok=True, parents=True)

dg._apply_theme("violeta")
ctx = dg._bg_context(W, H)
n = int(DUR * FPS)
for i in range(n):
    fr = dg._render_frame(spec, i / FPS, W, H, DUR, ctx)
    fr.convert("RGB").save(frames_dir / f"f_{i:05d}.png", compress_level=1)

subprocess.run(
    ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
     "-i", str(frames_dir / "f_%05d.png"), "-vf", "format=yuv420p",
     "-c:v", "libx264", "-crf", "18", "-preset", "medium",
     "-t", f"{DUR:.3f}", str(out)],
    check=True,
)
print("PIL flow ->", out)
