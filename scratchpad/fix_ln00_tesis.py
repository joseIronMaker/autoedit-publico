"""La tesis decía 'La IA no aprendió reglas' y ElevenLabs metió una pausa dentro de
'La IA' (voz de tesis: lenta y dramática); Whisper la oyó como 'ella' y el subtítulo
quedó 'ELLA NO APRENDIÓ'. Se quita el sujeto: la tarjeta kinetic ya dice 'no aprendió
reglas', así que la frase queda más corta y más citable."""
import json
import subprocess
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from autoedit.config import load_config
from autoedit.diagrams import THEMES
from autoedit.model_router import ModelRouter
from autoedit.remotion_scenes import render_remotion_scene
from autoedit import generate as G, host_layout

stem = "gen_ln_frase_rompio_ia"
IDX = 5
NUEVA = "No aprendió reglas. Aprendió escala."

assets = Path("videos") / f"{stem}.assets"
out_path = Path("videos") / f"{stem}.mp4"
cfg = load_config()
gcfg = dict(cfg["generate"])
tn = list(THEMES.keys())
gcfg["theme"] = tn[sum(map(ord, stem)) % len(tn)]
router = ModelRouter(cfg)

gj = assets / "guion.json"
guion = json.loads(gj.read_text())
scene = guion["scenes"][IDX]
scene["narration"] = NUEVA

ec = (cfg.get("tts") or {}).get("elevenlabs") or {}
curva = (ec.get("by_beat") or {}).get(str(scene.get("beat_type") or ""), {})
pcm = router.generate_tts(NUEVA, gcfg.get("tts_style", ""), overrides=curva or None)
pausa = float(scene.get("pause_after") or 0.35)
pcm += b"\x00" * (int(24000 * min(pausa, 1.5)) * 2)
voz = assets / f"scene_{IDX}.wav"
dur = G._wav_from_pcm(pcm, voz) + 0.3
print(f"nueva voz de la tesis: {dur:.1f}s", flush=True)

seg = assets / f"seg_{IDX}.mp4"
seg.unlink(missing_ok=True)
render_remotion_scene({"type": "kinetic", **scene["kinetic"]}, voz, dur, seg, gcfg)
print("seg_5 OK:", seg.exists(), flush=True)

gj.write_text(json.dumps(guion, ensure_ascii=False, indent=1))
segs = [assets / f"seg_{i}.mp4" for i in range(len(guion["scenes"]))]
assert all(s.exists() for s in segs)
G._assemble(segs, out_path, gcfg)
sfx = Path("autoedit/assets/sfx/whoosh.mp3")
host_layout.continuous_base_audio(
    out_path, segs, sfx_path=sfx if gcfg.get("sfx") else None,
    sfx_gain=float(gcfg.get("sfx_gain", 0.32)))
d = float(subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=nk=1:nw=1", str(out_path)]).strip())
print(f"RE-ENSAMBLADO {out_path} ({d:.1f}s)")
