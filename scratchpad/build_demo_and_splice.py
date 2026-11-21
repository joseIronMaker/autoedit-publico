"""Construye la escena ml_demo (con autoedit.ml_demo, el nuevo feature del plugin) y la
empalma en el video 2 ya generado — reusa las 7 escenas (no re-gasta voz), solo añade el
demo. Luego re-ensambla + fix de audio; la Rama B (autoedit --auto) pone subtítulos/copys.
"""
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path("/home/jose/tiktok")
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from autoedit.model_router import ModelRouter          # noqa: E402
from autoedit.generate import _wav_from_pcm, _assemble  # noqa: E402
from autoedit import ml_demo, host_layout               # noqa: E402

A = ROOT / "videos/gen_ia_predictiva_cerebro.assets"
BASE = ROOT / "videos/gen_ia_predictiva_cerebro.mp4"

NARRACION = ("Y esto no es un dibujo. En Python, con scikit-learn, entreno dos modelos "
             "reales: uno predice cuántas horas verás Netflix, y otro caza un fraude en tu "
             "banco. Mira: la máquina calcula tu futuro.")

# código REAL que ejecuta el pipeline (bajo el preámbulo neón de ml_demo)
CODE = r'''
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 13))
# 1) REGRESIÓN: predice tus horas de Netflix
sem = np.arange(1, 11).reshape(-1, 1)
hrs = (2 + 0.9 * sem.ravel() + rng.normal(0, 0.8, 10)).clip(0)
reg = LinearRegression().fit(sem, hrs)
fut = np.array([[11], [12]]); pred = reg.predict(fut)
xs = np.arange(1, 13).reshape(-1, 1)
ax1.plot(xs, reg.predict(xs), color=ORANGE, lw=4, label="modelo")
ax1.scatter(sem, hrs, s=170, color=CYAN, edgecolor="white", lw=1.5, label="tu historial")
ax1.scatter(fut, pred, s=520, marker="*", color=MAG, edgecolor="white", lw=1.8, label="PREDICE")
ax1.set_title("① Regresion -> cuanto veras", color=CYAN, loc="left")
ax1.set_xlabel("semana"); ax1.set_ylabel("horas Netflix")
ax1.legend(facecolor="#14141f", edgecolor="#333344", loc="upper left", fontsize=17); ax1.grid(alpha=0.3)
# 2) CLASIFICACIÓN: detecta fraude
n = 90
leg = np.column_stack([rng.normal(45, 16, n), rng.normal(14, 4, n)])
fr = np.column_stack([rng.normal(120, 28, n//2), rng.normal(3, 2.2, n//2)])
X = np.vstack([leg, fr]); y = np.r_[np.zeros(n), np.ones(n//2)]
clf = LogisticRegression().fit(X, y)
xx, yy = np.meshgrid(np.linspace(0, 200, 300), np.linspace(-2, 26, 300))
Z = clf.predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
ax2.contourf(xx, yy, Z, levels=1, colors=[GREEN, RED], alpha=0.12)
ax2.contour(xx, yy, Z, levels=[0.5], colors=[MAG], linewidths=3)
ax2.scatter(*leg.T, s=70, color=GREEN, edgecolor="white", lw=0.6, label="normal")
ax2.scatter(*fr.T, s=90, color=RED, marker="X", edgecolor="white", lw=0.8, label="FRAUDE")
ax2.set_title("② Clasificacion -> fraude?", color=CYAN, loc="left")
ax2.set_xlabel("monto ($)"); ax2.set_ylabel("hora"); ax2.legend(loc="upper right", fontsize=17,
    facecolor="#14141f", edgecolor="#333344")
ax2.set_xlim(0, 200); ax2.set_ylim(-2, 26)
plt.tight_layout()
'''

DISPLAY = [
    "import numpy as np",
    "from sklearn.linear_model import LinearRegression, LogisticRegression",
    "",
    "# 1) predice cuantas horas veras Netflix",
    "reg = LinearRegression().fit(semanas, horas)",
    "reg.predict([[11], [12]])        # -> 11.7 h, 12.6 h",
    "",
    "# 2) detecta un fraude en tu banco",
    "clf = LogisticRegression().fit(X, fraude)",
    "clf.predict(movimiento)          # -> FRAUDE",
]


def main():
    cfg = yaml.safe_load((ROOT / "config.yaml").read_text(encoding="utf-8"))
    gcfg = cfg["generate"]
    gcfg.update(width=1080, height=1920, fps=30, transitions=True, theme="sunset")

    # 1) voz del demo (voz clonada) — REUSA si ya existe (no re-gasta ElevenLabs)
    voz = A / "scene_demo.wav"
    if voz.exists():
        import wave
        with wave.open(str(voz)) as w:
            dur = w.getnframes() / w.getframerate() + 0.3
        print(f"→ reusando demo.wav (dur={dur:.2f}s)")
    else:
        print("→ TTS del demo (voz clonada)")
        router = ModelRouter(cfg)
        dur = _wav_from_pcm(router.generate_tts(NARRACION, gcfg.get("tts_style", "")), voz) + 0.3
        print(f"   demo.wav dur={dur:.2f}s")

    # 2) escena ml_demo (código real → gráfica real) con el nuevo módulo del plugin
    seg_demo = A / "seg_demo.mp4"
    ml_demo.render_ml_demo_scene(
        {"code": CODE, "display_code": DISPLAY, "caption": "predice.py"},
        voz, dur, seg_demo, gcfg, on_step=lambda s, d: print(f"   {d}"))
    print("   seg_demo listo")

    # 3) empalmar: demo tras la red neuronal (seg_3), antes de las barras (seg_4)
    segs = [A / "seg_0.mp4", A / "seg_1.mp4", A / "seg_2.mp4", A / "seg_3.mp4",
            seg_demo, A / "seg_4.mp4", A / "seg_5.mp4", A / "seg_6.mp4"]
    print("→ re-ensamblando con punch")
    _assemble(segs, BASE, gcfg)
    print("→ audio continuo (hay escenas host)")
    host_layout.continuous_base_audio(BASE, segs)
    print("LISTO base con demo. Ahora: autoedit", BASE, "--auto")


if __name__ == "__main__":
    main()
