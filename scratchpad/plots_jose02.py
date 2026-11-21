"""Las dos graficas del video de IA predictiva: sale de EJECUTAR sklearn de verdad.
Reusa el preambulo de marca de autoedit/ml_demo.py (paleta sobria) pero guarda en
apaisado, porque aqui la grafica vive en el panel inferior (1080x1026), no a pantalla
completa 9:16.
"""
import subprocess, sys
from pathlib import Path
sys.path.insert(0, "/home/jose/tiktok")
from autoedit.ml_demo import _PREAMBLE

OUT = Path("/home/jose/tiktok/jose02.assets")
OUT.mkdir(exist_ok=True)

SEGMENTA = '''
# El modelo NO sabe que existen "gatitos" o "programacion": solo ve dos numeros por video
# y descubre los grupos por su cuenta. Eso es segmentar.
n = 55
gatos = np.c_[rng.normal(27, 4.5, n), rng.normal(3.1, 0.6, n)]
prog  = np.c_[rng.normal(8.5, 2.8, n), rng.normal(1.05, 0.35, n)]
risa  = np.c_[rng.normal(19, 3.6, n), rng.normal(2.3, 0.5, n)]
X = np.vstack([gatos, prog, risa])
km = KMeans(n_clusters=3, n_init=10, random_state=7).fit(X)
fig, ax = plt.subplots(figsize=(12, 6.2))
ax.scatter(X[:,0], X[:,1], c=[_CYCLE[i] for i in km.labels_], s=52, alpha=.85, edgecolors="none")
ax.scatter(km.cluster_centers_[:,0], km.cluster_centers_[:,1], marker="X", s=340,
           c=TXT, zorder=5, linewidths=0)
ax.set_xlabel("segundos que te quedas"); ax.set_ylabel("veces que lo repites")
ax.set_title("Nadie le dijo las categorías: las agrupa solo")
ax.grid(alpha=.18)
'''

PREDICE = '''
# Con esos grupos ya puede PREDECIR: dada la permanencia, que probabilidad hay de que
# te guste el siguiente. Regresion logistica, el clasificador mas clasico que hay.
seg = rng.uniform(0, 34, 320)
y = (rng.random(320) < 1/(1+np.exp(-(seg-16)/3.4))).astype(int)
lr = LogisticRegression().fit(seg.reshape(-1,1), y)
xs = np.linspace(0, 34, 250)
p = lr.predict_proba(xs.reshape(-1,1))[:,1]
fig, ax = plt.subplots(figsize=(12, 6.2))
ax.scatter(seg, y + rng.normal(0, .022, 320), s=22, c=CYAN, alpha=.45, edgecolors="none")
ax.plot(xs, p, color=ORANGE, lw=5)
ax.axvline(16, color=MAG, ls="--", lw=2.5, alpha=.8)
ax.set_xlabel("segundos que te quedaste"); ax.set_ylabel("probabilidad de que te guste")
ax.set_title("Y con eso decide cuál te pone después")
ax.grid(alpha=.18)
'''

EPI = '''
import matplotlib.pyplot as _plt
_plt.gcf().tight_layout(pad=1.0)
_plt.gcf().savefig(OUT, dpi=150, bbox_inches="tight", pad_inches=0.2)
'''

for nombre, codigo in (("plot_segmenta", SEGMENTA), ("plot_predice", PREDICE)):
    png = OUT / f"{nombre}.png"
    script = OUT / f"_run_{nombre}.py"
    script.write_text(f"OUT = {str(png)!r}\n{_PREAMBLE}\n{codigo}\n{EPI}\n", encoding="utf-8")
    r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=180)
    script.unlink(missing_ok=True)
    print(nombre, "OK" if png.exists() else f"FALLO: {r.stderr[-400:]}")
