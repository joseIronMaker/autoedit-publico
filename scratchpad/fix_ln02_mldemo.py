"""El ml_demo del video 2 cayó a big_text: el token_pattern con regex se corrompió al
pasar por JSON (\\b -> \\\\b) y CountVectorizer se quedó sin vocabulario. Se cambia por
analyzer=str.split (sin regex, imposible de romper al escapar) y se re-renderiza la
escena reusando la voz ya generada."""
import json
import subprocess
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from autoedit.config import load_config
from autoedit.diagrams import THEMES
from autoedit import generate as G, host_layout, ml_demo

stem = "gen_ln_orden_lo_es_todo"
IDX = 2
assets = Path("videos") / f"{stem}.assets"
out_path = Path("videos") / f"{stem}.mp4"
cfg = load_config()
gcfg = dict(cfg["generate"])
guion = json.loads((assets / "guion.json").read_text())
gcfg["theme"] = guion.get("theme") or list(THEMES)[0]

CODE = """import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
a = 'no es bueno es buenisimo'
b = 'no es buenisimo es bueno'
cv = CountVectorizer(analyzer=str.split).fit([a, b])
X = cv.transform([a, b]).toarray()
vocab = cv.get_feature_names_out()
fig, ax = plt.subplots(figsize=(7.5, 4.4))
ax.imshow(X, cmap='cividis', aspect='auto', vmin=0, vmax=2)
ax.set_xticks(range(len(vocab)))
ax.set_xticklabels(vocab, fontsize=19)
ax.set_yticks([0, 1])
ax.set_yticklabels(['frase A', 'frase B'], fontsize=19)
for i in range(X.shape[0]):
    for j in range(X.shape[1]):
        ax.text(j, i, str(X[i, j]), ha='center', va='center', color=TXT, fontsize=27, fontweight='bold')
ax.set_title('vector IDENTICO' if (X[0] == X[1]).all() else 'vectores distintos')
fig.text(0.5, 0.02, 'para el modelo son LA MISMA frase', ha='center', color=RED, fontsize=22, fontweight='bold')"""

scene = guion["scenes"][IDX]
scene["visual_type"] = "ml_demo"
scene["ml_demo"] = {
    "code": CODE,
    "display_code": ["cv.transform(['no es bueno es buenisimo'])",
                     "cv.transform(['no es buenisimo es bueno'])",
                     "(A == B).all()  ->  True"],
    "caption": "bolsa_de_palabras.py",
}
scene.pop("big_text", None)

voz = assets / f"scene_{IDX}.wav"
dur = float(subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=nk=1:nw=1", str(voz)]).strip()) + 0.3
seg = assets / f"seg_{IDX}.mp4"
seg.unlink(missing_ok=True)
ml_demo.render_ml_demo_scene(scene["ml_demo"], voz, dur, seg, gcfg)
print("seg_2 OK:", seg.exists())

(assets / "guion.json").write_text(json.dumps(guion, ensure_ascii=False, indent=1))
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
