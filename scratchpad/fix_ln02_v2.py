"""Video 2: (1) la paleta ambar ya existe en Remotion -> re-render de los beats para que
dejen de salir morados, (2) narraciones mas cortas (37.1s -> objetivo 28-34s) y (3) la
etiqueta roja de la grafica se encimaba con los nombres de las columnas."""
import json
import subprocess
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from autoedit.config import load_config
from autoedit.model_router import ModelRouter
from autoedit.remotion_scenes import render_remotion_scene
from autoedit import generate as G, host_layout, ml_demo

stem = "gen_ln_orden_lo_es_todo"
assets = Path("videos") / f"{stem}.assets"
out_path = Path("videos") / f"{stem}.mp4"
cfg = load_config()
gcfg = dict(cfg["generate"])
guion = json.loads((assets / "guion.json").read_text())
gcfg["theme"] = guion["theme"]
router = ModelRouter(cfg)

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
ax.set_xlabel('para el modelo son LA MISMA frase', color=RED, fontsize=22, fontweight='bold', labelpad=16)"""

NUEVAS = {
    2: "Se lo damos a un modelo que cuenta cuántas veces aparece cada palabra. "
       "Las dos frases producen el mismo vector. Para el modelo son la misma frase.",
    3: "El problema es de fábrica: una red normal recibe todo de golpe. "
       "No sabe qué palabra vino antes.",
}
guion["scenes"][2]["ml_demo"]["code"] = CODE

ec = (cfg.get("tts") or {}).get("elevenlabs") or {}


def voz_de(idx: int) -> float:
    """Regenera la voz si cambió la narración; devuelve la duración de escena."""
    sc = guion["scenes"][idx]
    voz = assets / f"scene_{idx}.wav"
    if idx in NUEVAS and NUEVAS[idx] != sc["narration"]:
        sc["narration"] = NUEVAS[idx]
        curva = (ec.get("by_beat") or {}).get(str(sc.get("beat_type") or ""), {})
        pcm = router.generate_tts(sc["narration"], gcfg.get("tts_style", ""),
                                  overrides=curva or None)
        pausa = float(sc.get("pause_after")
                      or {"hook": 0.45, "tesis": 0.35}.get(sc.get("beat_type"), 0.0))
        if pausa:
            pcm += b"\x00" * (int(24000 * min(pausa, 1.5)) * 2)
        return G._wav_from_pcm(pcm, voz) + 0.3
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(voz)]).strip()) + 0.3


for idx in (0, 2, 3, 4):
    sc = guion["scenes"][idx]
    dur = voz_de(idx)
    voz = assets / f"scene_{idx}.wav"
    seg = assets / f"seg_{idx}.mp4"
    seg.unlink(missing_ok=True)
    vt = sc["visual_type"]
    print(f"escena {idx}: {vt} ({dur:.1f}s)", flush=True)
    if vt == "ml_demo":
        ml_demo.render_ml_demo_scene(sc["ml_demo"], voz, dur, seg, gcfg)
    elif vt == "kinetic":
        render_remotion_scene({"type": "kinetic", **sc["kinetic"], "theme": gcfg["theme"]},
                              voz, dur, seg, gcfg)
    elif vt == "diagram":
        render_remotion_scene({**sc["diagram"], "theme": gcfg["theme"]}, voz, dur, seg, gcfg)
    else:
        raise SystemExit(f"no soportado: {vt}")
    assert seg.exists()

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
