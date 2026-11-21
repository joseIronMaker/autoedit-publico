"""top-p y top-k dibujados sobre la distribución REAL del video.

José los nombra al final ("hay diferentes parámetros: top-p, top-k") y hasta ahora eso era
una tarjeta con dos palabras. Los dos son un CORTE sobre la misma lista de probabilidades
que ya se calculó, así que se pueden enseñar de verdad en vez de anunciarlos.
"""
import subprocess, sys
from pathlib import Path
sys.path.insert(0, "/home/jose/tiktok")
from autoedit.ml_demo import _PREAMBLE

OUT = Path("/home/jose/tiktok/jose08.assets")

CODIGO = '''
tokens = ["grande", "negro", "muy", "un", "mi", "bonito", "viejo", "café"]
logits = np.array([6.4, 5.1, 4.6, 3.9, 3.3, 2.8, 2.1, 1.4])
p = np.exp(logits - logits.max()); p = p / p.sum()

K = 3                                   # top-k: se queda con los 3 primeros
acum = np.cumsum(p)
corte_p = int(np.searchsorted(acum, 0.90)) + 1   # top-p 0.90: los que suman el 90%

fig, ax = plt.subplots(figsize=(12, 5.4))
colores = [ORANGE if i < K else CYAN if i < corte_p else "#5A5A62" for i in range(len(tokens))]
b = ax.bar(tokens, p*100, color=colores, width=.62)
for r, v in zip(b, p*100):
    ax.text(r.get_x()+r.get_width()/2, v+1.4, f"{v:.0f}%", ha="center", color=TXT,
            fontsize=16, fontweight="bold")
ax.axvline(K-0.5, color=ORANGE, ls="--", lw=3)
ax.text(K-0.42, max(p*100)*0.86, "top-k = 3\\nsolo estos", color=ORANGE, fontsize=17,
        fontweight="bold", va="top")
ax.axvline(corte_p-0.5, color=CYAN, ls="--", lw=3)
ax.text(corte_p-0.42, max(p*100)*0.55, "top-p = 0.90\\nlos que suman 90%", color=CYAN,
        fontsize=17, fontweight="bold", va="top")
ax.set_ylabel("probabilidad")
ax.set_title("Las dos perillas cortan la MISMA lista")
ax.set_ylim(0, max(p*100)*1.24)
ax.grid(alpha=.18, axis="y")
'''

EPI = '''
import matplotlib.pyplot as _plt
_plt.gcf().tight_layout(pad=1.0)
_plt.gcf().savefig(OUT, dpi=150, bbox_inches="tight", pad_inches=0.2)
'''

png = OUT / "plot_topk.png"
s = OUT / "_run_topk.py"
s.write_text(f"OUT = {str(png)!r}\n{_PREAMBLE}\n{CODIGO}\n{EPI}\n", encoding="utf-8")
r = subprocess.run([sys.executable, str(s)], capture_output=True, text=True, timeout=240)
s.unlink(missing_ok=True)
print("plot_topk", "OK" if png.exists() else f"FALLO: {r.stderr[-500:]}")
