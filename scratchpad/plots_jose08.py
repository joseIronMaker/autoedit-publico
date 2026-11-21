"""Las graficas del video de inferencia: matematica REAL, no un dibujo.

El softmax y el efecto de la temperatura se calculan de verdad con numpy; cualquiera
puede reproducirlo. Reusa el preambulo de marca de autoedit/ml_demo.py (paleta sobria)
y guarda apaisado, porque estas graficas viven en el panel inferior (1080x1026).
"""
import subprocess, sys
from pathlib import Path
sys.path.insert(0, "/home/jose/tiktok")
from autoedit.ml_demo import _PREAMBLE

OUT = Path("/home/jose/tiktok/jose08.assets")
OUT.mkdir(exist_ok=True)

# El modelo no devuelve UNA palabra: devuelve un numero por cada token de su vocabulario.
# El softmax convierte esos numeros en probabilidades que suman 1. Esto es exactamente
# lo que Jose describe, calculado de verdad.
LISTA = '''
tokens = ["grande", "negro", "muy", "un", "mi", "bonito", "viejo", "café"]
logits = np.array([6.4, 5.1, 4.6, 3.9, 3.3, 2.8, 2.1, 1.4])
p = np.exp(logits - logits.max()); p = p / p.sum()
fig, ax = plt.subplots(figsize=(12, 5.6))
colores = [ORANGE if i == 0 else CYAN for i in range(len(tokens))]
b = ax.bar(tokens, p * 100, color=colores, width=.62)
for r, v in zip(b, p * 100):
    ax.text(r.get_x() + r.get_width()/2, v + 1.2, f"{v:.0f}%", ha="center",
            color=TXT, fontsize=17, fontweight="bold")
ax.set_ylabel("probabilidad")
ax.set_title('"mi perro es…" → esto es lo que devuelve el modelo')
ax.set_ylim(0, max(p*100) * 1.22)
ax.grid(alpha=.18, axis="y")
'''

# La temperatura divide los logits ANTES del softmax: baja = pico, alta = plano.
# Es una linea de codigo y explica toda la ultima parte del video.
TEMPERATURA = '''
tokens = ["grande", "negro", "muy", "un", "mi", "bonito", "viejo", "café"]
logits = np.array([6.4, 5.1, 4.6, 3.9, 3.3, 2.8, 2.1, 1.4])
def softmax(z, T):
    z = z / T; e = np.exp(z - z.max()); return e / e.sum()
fig, ax = plt.subplots(figsize=(12, 5.6))
x = np.arange(len(tokens))
for T, color, lw in ((0.3, ORANGE, 5), (1.0, CYAN, 5), (1.8, MAG, 5)):
    ax.plot(x, softmax(logits, T) * 100, "o-", color=color, lw=lw, ms=11,
            label=f"temperatura {T}")
ax.set_xticks(x); ax.set_xticklabels(tokens)
ax.set_ylabel("probabilidad")
ax.set_title("La misma lista, tres temperaturas")
ax.legend(frameon=False, fontsize=17)
ax.grid(alpha=.18)
'''

EPI = '''
import matplotlib.pyplot as _plt
_plt.gcf().tight_layout(pad=1.0)
_plt.gcf().savefig(OUT, dpi=150, bbox_inches="tight", pad_inches=0.2)
'''

for nombre, codigo in (("plot_lista", LISTA), ("plot_temperatura", TEMPERATURA)):
    png = OUT / f"{nombre}.png"
    script = OUT / f"_run_{nombre}.py"
    script.write_text(f"OUT = {str(png)!r}\n{_PREAMBLE}\n{codigo}\n{EPI}\n", encoding="utf-8")
    r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=240)
    script.unlink(missing_ok=True)
    print(nombre, "OK" if png.exists() else f"FALLO: {r.stderr[-500:]}")
