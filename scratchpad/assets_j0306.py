#!/usr/bin/env python3
"""Graficas de los videos grabados 3-6: salen de EJECUTAR el modelo, no de dibujarlo.
Reusa el preambulo de marca de ml_demo (paleta sobria) y guarda apaisado para el panel.
"""
import subprocess, sys
from pathlib import Path
sys.path.insert(0, "/home/jose/tiktok")
from autoedit.ml_demo import _PREAMBLE

EPI = '''
import matplotlib.pyplot as _plt
_plt.gcf().tight_layout(pad=1.0)
_plt.gcf().savefig(OUT, dpi=150, bbox_inches="tight", pad_inches=0.2)
'''

TRABAJOS = {
# ── jose04: gato vs perro. Un clasificador REAL aprende la frontera con las etiquetas.
"jose04.assets/plot_gatoperro": '''
from sklearn.ensemble import RandomForestClassifier
n = 140
gatos  = np.c_[rng.normal(3.8, 0.8, n), rng.normal(4.5, 0.9, n)]
perros = np.c_[rng.normal(7.2, 1.4, n), rng.normal(7.8, 1.6, n)]
X = np.vstack([gatos, perros]); y = np.r_[np.zeros(n), np.ones(n)]
clf = RandomForestClassifier(n_estimators=120, random_state=7).fit(X, y)
xx, yy = np.meshgrid(np.linspace(0, 12, 300), np.linspace(0, 12, 300))
Z = clf.predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
fig, ax = plt.subplots(figsize=(12, 6.2))
ax.contourf(xx, yy, Z, levels=[-.5,.5,1.5], colors=[CYAN, ORANGE], alpha=.18)
ax.scatter(gatos[:,0], gatos[:,1], s=34, c=CYAN, label="gato", edgecolors="none")
ax.scatter(perros[:,0], perros[:,1], s=34, c=ORANGE, label="perro", edgecolors="none")
ax.set_xlabel("peso (kg)"); ax.set_ylabel("altura (cm, escalada)")
ax.set_title("Con las etiquetas aprende la frontera")
ax.legend(loc="upper left"); ax.grid(alpha=.15)
''',
# ── jose05: el error bajando epoca a epoca. Es la loss_curve_ REAL de la red entrenada.
"jose05.assets/plot_error": '''
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
n = 900
hab = rng.integers(1, 6, n); ban = rng.integers(1, 4, n)
m2 = rng.normal(120, 45, n).clip(35, 400); loc = rng.random(n)
precio = 380*m2 + 90000*hab + 60000*ban + 700000*loc + rng.normal(0, 40000, n)
X = StandardScaler().fit_transform(np.c_[hab, ban, m2, loc])
y = (precio - precio.mean()) / precio.std()
red = MLPRegressor(hidden_layer_sizes=(24, 12), max_iter=260, random_state=7).fit(X, y)
fig, ax = plt.subplots(figsize=(12, 6.2))
ax.plot(red.loss_curve_, color=ORANGE, lw=4)
ax.set_xlabel("época (una vuelta completa a los datos)"); ax.set_ylabel("error")
ax.set_title("El error de verdad, época a época")
ax.grid(alpha=.18)
''',
# ── jose05: el gradiente indicando la bajada. Descenso ejecutado paso a paso.
"jose05.assets/plot_gradiente": '''
f  = lambda w: (w - 3.2)**2 + 1.4
df = lambda w: 2*(w - 3.2)
w = -2.6; lr = 0.16; pasos = [w]
for _ in range(14):
    w = w - lr*df(w); pasos.append(w)
ws = np.linspace(-3.5, 9.5, 400)
fig, ax = plt.subplots(figsize=(12, 6.2))
ax.plot(ws, f(ws), color=CYAN, lw=3.5)
ax.plot(pasos, [f(p) for p in pasos], "o-", color=ORANGE, lw=2.6, ms=11)
ax.annotate("aquí el error es mínimo", xy=(3.2, f(3.2)), xytext=(5.0, 14),
            color=TXT, fontsize=20,
            arrowprops=dict(arrowstyle="->", color=MAG, lw=2.4))
ax.set_xlabel("peso"); ax.set_ylabel("error")
ax.set_title("El gradiente dice hacia dónde bajar")
ax.grid(alpha=.18)
''',
# ── jose06: el calculo de la atencion, corrido. softmax(QKt/sqrt(d)) sobre una frase.
"jose06.assets/plot_atencion": '''
frase = ["mi","perro","es","muy","grande","y","vive","en","las","montañas"]
d, T = 16, len(frase)
Q = rng.normal(0, 1, (T, d)); K = Q.copy()
# atamos algunas palabras entre si para que el ejemplo sea legible: mismo vector base
for a, b in [(1,4),(1,6),(4,1),(6,1),(9,6)]:
    K[b] = 0.65*K[b] + 0.35*Q[a]
A = Q @ K.T / np.sqrt(d)
A = np.exp(A - A.max(axis=1, keepdims=True))
A = A / A.sum(axis=1, keepdims=True)
fig, ax = plt.subplots(figsize=(12, 6.6))
im = ax.imshow(A, cmap="magma", aspect="auto")
ax.set_xticks(range(T)); ax.set_xticklabels(frase, rotation=42, ha="right", fontsize=17)
ax.set_yticks(range(T)); ax.set_yticklabels(frase, fontsize=17)
ax.set_title("softmax(Q·Kᵀ/√d): cada palabra mira a todas")
fig.colorbar(im, ax=ax, shrink=.85)
''',
}

for destino, codigo in TRABAJOS.items():
    png = Path("/home/jose/tiktok") / f"{destino}.png"
    png.parent.mkdir(parents=True, exist_ok=True)
    script = png.parent / f"_run_{png.stem}.py"
    script.write_text(f"OUT = {str(png)!r}\n{_PREAMBLE}\n{codigo}\n{EPI}\n", encoding="utf-8")
    r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=300)
    script.unlink(missing_ok=True)
    print(png.name, "OK" if png.exists() else f"FALLO: {r.stderr[-350:]}")
