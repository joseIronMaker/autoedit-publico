"""Demo REAL de IA predictiva: 2 modelos sklearn entrenados en vivo, graficados neón
(numpy + sklearn + matplotlib + seaborn). La salida (plot real) va al video 2.

Modelo 1: regresión — predice tus horas de Netflix (LinearRegression).
Modelo 2: clasificación — detecta fraude bancario (LogisticRegression + frontera).
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from sklearn.linear_model import LinearRegression, LogisticRegression

BG = "#0A0A0F"
CYAN = "#00E5FF"
ORANGE = "#FF7A3C"
MAG = "#FF2DAA"
GREEN = "#3CFF78"
RED = "#FF4D4D"
TXT = "#F5F5F7"
OUT = "/home/jose/tiktok/scratchpad/demo_assets/plot.png"

sns.set_theme(style="dark")
plt.rcParams.update({
    "figure.facecolor": BG, "axes.facecolor": BG, "savefig.facecolor": BG,
    "text.color": TXT, "axes.labelcolor": TXT, "xtick.color": TXT, "ytick.color": TXT,
    "axes.edgecolor": "#333344", "grid.color": "#1c1c2a", "font.size": 20,
    "axes.titlesize": 30, "axes.titleweight": "bold", "font.weight": "bold",
})

rng = np.random.default_rng(7)
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 13))

# ── Modelo 1: REGRESIÓN — predice tus horas de Netflix ──
weeks = np.arange(1, 11).reshape(-1, 1)
hours = (2.0 + 0.9 * weeks.ravel() + rng.normal(0, 0.8, 10)).clip(0)
reg = LinearRegression().fit(weeks, hours)
future = np.array([[11], [12]])
pred = reg.predict(future)
line_x = np.arange(1, 13).reshape(-1, 1)
ax1.plot(line_x, reg.predict(line_x), color=ORANGE, lw=4, zorder=2, label="modelo")
ax1.scatter(weeks, hours, s=170, color=CYAN, edgecolor="white", lw=1.5, zorder=3,
            label="tu historial")
ax1.scatter(future, pred, s=520, marker="*", color=MAG, edgecolor="white", lw=1.8,
            zorder=4, label="PREDICE")
for fx, fy in zip(future.ravel(), pred):
    ax1.annotate(f"{fy:.0f} h", (fx, fy), color=MAG, fontsize=22, fontweight="bold",
                 xytext=(fx - 0.4, fy + 1.2))
ax1.set_title("① Regresión → cuánto verás", color=CYAN, loc="left")
ax1.set_xlabel("semana"); ax1.set_ylabel("horas Netflix")
ax1.legend(facecolor="#14141f", edgecolor="#333344", loc="upper left", fontsize=17)
ax1.grid(alpha=0.3)

# ── Modelo 2: CLASIFICACIÓN — detecta fraude bancario ──
n = 90
legit = np.column_stack([rng.normal(45, 16, n), rng.normal(14, 4, n)])       # monto, hora
fraud = np.column_stack([rng.normal(120, 28, n // 2), rng.normal(3, 2.2, n // 2)])
X = np.vstack([legit, fraud])
y = np.r_[np.zeros(n), np.ones(n // 2)]
clf = LogisticRegression().fit(X, y)
xx, yy = np.meshgrid(np.linspace(0, 200, 300), np.linspace(-2, 26, 300))
Z = clf.predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
ax2.contourf(xx, yy, Z, levels=1, colors=[GREEN, RED], alpha=0.12)
ax2.contour(xx, yy, Z, levels=[0.5], colors=[MAG], linewidths=3)
ax2.scatter(*legit.T, s=70, color=GREEN, edgecolor="white", lw=0.6, label="normal")
ax2.scatter(*fraud.T, s=90, color=RED, marker="X", edgecolor="white", lw=0.8, label="FRAUDE")
ax2.set_title("② Clasificación → ¿fraude?", color=CYAN, loc="left")
ax2.set_xlabel("monto ($)"); ax2.set_ylabel("hora del día")
ax2.legend(facecolor="#14141f", edgecolor="#333344", loc="upper right", fontsize=17)
ax2.set_xlim(0, 200); ax2.set_ylim(-2, 26)

fig.suptitle("modelos que PREDICEN — sklearn", color=TXT, fontsize=34, fontweight="bold",
             y=0.995)
fig.tight_layout(rect=[0, 0, 1, 0.98])
import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)
fig.savefig(OUT, dpi=140, bbox_inches="tight", pad_inches=0.25)
print("plot real guardado:", OUT)
print(f"  regresión: predice semana 11 = {pred[0]:.1f} h, semana 12 = {pred[1]:.1f} h")
print(f"  clasificación: exactitud en train = {clf.score(X, y):.0%}")
