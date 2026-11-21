"""Geometría del capítulo 4, calculada una vez: los puntos, los dobleces del caso difícil y el aprendizaje.

Nada de esto es decorado:
- En A, los negros quedan dentro del casco de los rojos: de verdad ninguna recta los separa.
- En B, el recorte sale de plegar 5 veces y pasar UNA recta: las etiquetas se leen de esa misma recta.
- `aprende` es descenso de gradiente real sobre dos dobleces y una recta (q ← q − 2·relu(n·q − o)·n).

.venv/bin/python estudio/serie/c04_capas/geometria.py
"""
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment

SAL = Path(__file__).resolve().parents[2] / "remotion/src/serie/c04/geometria.json"
r = np.random.default_rng(404)


def poisson(n, dmin, dentro, azar):
    P = []
    for _ in range(200000):
        p = azar()
        if dentro(p) and all(np.hypot(*(p - q)) > dmin for q in P):
            P.append(p)
            if len(P) == n:
                break
    assert len(P) == n, (len(P), n)
    return np.array(P)


# ---------- A: negros en medio, rojos alrededor ----------
cuad = lambda: r.uniform(-.95, .95, 2)
disco = lambda p: np.hypot(*p) < .33
anillo = lambda p: np.hypot(*p) > .68
neg = poisson(28, .088, disco, cuad)
roj = poisson(62, .14, anillo, cuad)
A = np.vstack([neg, roj])
yA = np.array([1] * len(neg) + [0] * len(roj))

mez = r.uniform(-.93, .93, (len(A), 2))                                 # dónde cae cada punto en la lluvia
lluvia = r.random(len(A)) ** .8                                         # cuándo cae, como fracción del tramo: imagen y sonido leen lo mismo


# ---------- B: cinco dobleces cualquiera y una recta ----------
def pliega(P, ejes):
    for e in ejes:
        c, n = np.array(e["c"]), np.array(e["n"])
        P = P - 2 * np.maximum((P - c) @ n, 0)[:, None] * n[None]
    return P


def busca(seed, k=5):
    g = np.linspace(-1, 1, 220)
    X, Y = np.meshgrid(g, g[::-1])
    P = np.stack([X.ravel(), Y.ravel()], 1)
    q = np.random.default_rng(seed)
    ejes = []
    for _ in range(k):
        for _ in range(60):
            a = q.uniform(0, 2 * np.pi)
            n = np.array([np.cos(a), np.sin(a)])
            c = P[q.integers(len(P))]
            f = (((P - c) @ n) > 0).mean()
            if .25 < f < .5:
                break
        P = P - 2 * np.maximum((P - c) @ n, 0)[:, None] * n[None]
        ejes.append({"c": c.round(6).tolist(), "n": n.round(6).tolist()})
    for _ in range(100):
        a = q.uniform(0, 2 * np.pi)
        n = np.array([np.cos(a), np.sin(a)])
        c = P[q.integers(len(P))]
        f = (((P - c) @ n) > 0).mean()
        if .35 < f < .6:
            break
    n = n / np.hypot(*n)
    return ejes, c.round(6).tolist(), n.round(6).tolist()


SEMILLA = 275
ejes, cl, nl = busca(SEMILLA)
s = lambda P: (pliega(P, ejes) - np.array(cl)) @ np.array(nl)
cn = lambda p: abs(s(p[None])[0]) > .035
yb = lambda p: s(p[None])[0] > 0
negB = poisson(28, .085, lambda p: cn(p) and yb(p), cuad)
rojB = poisson(62, .085, lambda p: cn(p) and not yb(p), cuad)
# Cada punto viaja al lugar más cercano de su mismo color.
fi, co = linear_sum_assignment(np.linalg.norm(neg[:, None] - negB[None], axis=2))
B = np.empty_like(A)
B[fi] = negB[co]
fi, co = linear_sum_assignment(np.linalg.norm(roj[:, None] - rojB[None], axis=2))
B[len(neg) + fi] = rojB[co]


# ---------- aprendizaje: descenso de gradiente de verdad ----------
def fwd(th, P):
    a1, o1, a2, o2, b, w = th
    for a, o in ((a1, o1), (a2, o2)):
        n = np.array([np.cos(a), np.sin(a)])
        P = P - 2 * np.maximum(P @ n - o, 0)[:, None] * n[None]
    return P @ np.array([np.cos(b), np.sin(b)]) - w


y = 1 - 2 * yA                                                           # negros -1, rojos +1 (fuera)


def perdida(th):
    return np.logaddexp(0, -y * 7 * fwd(th, A)).mean()


def errores(th):
    return int(((fwd(th, A) > 0) != (y > 0)).sum())


th = np.array([.62, .3, 2.25, -.2, 3.75, .05])
m1, m2 = np.zeros(6), np.zeros(6)
ruta = []
for i in range(1, 1601):
    g = np.array([(perdida(th + 1e-4 * e) - perdida(th - 1e-4 * e)) / 2e-4 for e in np.eye(6)])
    m1 = .9 * m1 + .1 * g
    m2 = .999 * m2 + .001 * g * g
    if i % 4 == 1:
        ruta.append({"p": th.round(5).tolist(), "e": errores(th)})
    th = th - .006 * (m1 / (1 - .9 ** i)) / (np.sqrt(m2 / (1 - .999 ** i)) + 1e-8)
    if errores(th) == 0 and i > 700 and perdida(th) < .1:
        break
ruta.append({"p": th.round(5).tolist(), "e": errores(th)})
print("pasos", i, "error", [q["e"] for q in ruta[::12]], ruta[-1])

SAL.write_text(json.dumps({"A": [[round(float(a), 4), round(float(b), 4), int(c)] for (a, b), c in zip(A, yA)],
                           "mezcla": mez.round(4).tolist(), "lluvia": lluvia.round(4).tolist(), "B": B.round(4).tolist(), "ejesB": ejes, "lineaB": {"c": cl, "n": nl}, "aprende": ruta}), encoding="utf-8")
print(SAL, SAL.stat().st_size)
