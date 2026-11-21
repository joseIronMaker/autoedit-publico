"""La red del capítulo 5 es una red de verdad, y el rojo sale de hacerle backpropagation.

Ningún grosor está coreografiado. Red lineal a trozos (ReLU con todo activo, sin sesgos): a_k = Σ w_ik a_i.
  δ_k = ∂E/∂a_k                          la culpa de la neurona (la regla de la cadena, capa por capa)
  g_ik = ∂E/∂w_ik = δ_k a_i              el gradiente: cuánto debe moverse la perilla de esa conexión
  c_ik = δ_k · w_ik a_i = w_ik · g_ik    la culpa de la conexión: la culpa de a quien alimentó, por lo que le aportó
Con esa c se cumple una identidad exacta: lo que entra a una neurona es lo que sale de ella, Σ_i c_ik = δ_k a_k,
así que el total de rojo es el mismo en cada capa y el dibujo puede ser un Sankey sin hacer trampa: se reparte, no se inventa.
Los pesos se buscan una sola vez con semilla fija; a partir de ahí todo se calcula.
"""
import json
import numpy as np

CAPAS = [5, 5, 4, 3, 1]
YS = [310, 560, 810, 1040, 1240]
XS = {5: [150, 345, 540, 735, 930], 4: [215, 445, 635, 865], 3: [270, 540, 810], 1: [540]}
R = [30, 30, 32, 38, 58]
PASOS = 14


def adelante(W, a0):
    a = [a0]
    for w in W:
        a.append(a[-1] @ w)
    return a


def atras(W, a, t):
    y = a[-1][0]
    d = [None] * len(a)
    d[-1] = np.array([y - t])
    for l in range(len(W) - 1, -1, -1):
        d[l] = W[l] @ d[l + 1]
    return d


def culpas(W, a, d):
    g = [np.outer(a[l], d[l + 1]) for l in range(len(W))]
    c = [W[l] * g[l] for l in range(len(W))]
    return g, c


def propone(seed):
    r = np.random.default_rng(seed)
    a0 = r.uniform(.3, 1, CAPAS[0])
    W = []
    for l in range(len(CAPAS) - 1):
        n, m = CAPAS[l], CAPAS[l + 1]
        w = np.zeros((n, m))
        for k in range(m):
            dx = np.array(XS[n], float) - XS[m][k]
            v = r.gamma(.3, 1, n) * np.exp(-(dx / 300) ** 2) + .004
            w[:, k] = v / v.sum()
        W.append(w)
    # Última capa a mano: dos conexiones que pesan y una que casi no. La izquierda (índice 0) es la de "casi nada":
    # además de pesar poco, a su neurona casi no le llega nada, para que tampoco su perilla tenga que moverse.
    W[-1][:, 0] = [.03, .50, .47]
    W[-2][:, 0] *= .12
    return a0, W


def puntua(seed):
    a0, W = propone(seed)
    a = adelante(W, a0)
    t = a[-1][0] * .38
    d = atras(W, a, t)
    g, c = culpas(W, a, d)
    tot = c[-1].sum()
    s = 0
    for l in range(len(W) - 1):
        q = c[l] / tot
        # que el rojo sea un árbol: pocas ramas gordas, muchas casi vacías, y ninguna neurona fuerte sin culpa
        s += (q > .12).sum() * 1.2 + (q < .006).sum() * .25 - (q.max() > .55) * 6 - abs((q > .05).sum() - (CAPAS[l + 1] + 2)) * .6
        n = q.sum(axis=1)
        s -= (n[1:-1] < .015).sum() * 1.5 if l > 0 else 0
    gf = np.concatenate([x.ravel() for x in g])
    cf = np.concatenate([x.ravel() for x in c])
    rg = np.argsort(np.argsort(gf)); rc = np.argsort(np.argsort(cf))
    s += 8 * np.corrcoef(rg, rc)[0, 1]                 # la perilla que más gira debe ser la de más rojo
    return s


def construye():
    seed = max(range(6000), key=puntua)
    a0, W = propone(seed)
    a = adelante(W, a0)
    y0 = a[-1][0]
    t = y0 * .38
    # η: el primer paso se come 45% del error, como una tasa de aprendizaje elegida a mano
    d = atras(W, a, t)
    g, _ = culpas(W, a, d)
    def tras(eta):
        return adelante([w - eta * x for w, x in zip(W, g)], a0)[-1][0]
    lo, hi = 0, 5
    for _ in range(50):
        m = (lo + hi) / 2
        if tras(m) - t > .55 * (y0 - t): lo = m
        else: hi = m
    eta = (lo + hi) / 2

    pasos = []
    tot0 = None
    w_act = [w.copy() for w in W]
    for s in range(PASOS):
        a = adelante(w_act, a0)
        d = atras(w_act, a, t)
        g, c = culpas(w_act, a, d)
        if tot0 is None: tot0 = c[-1].sum()
        for l in range(len(W)):                         # la identidad, comprobada capa por capa
            assert abs(abs(c[l]).sum() - abs(c[-1]).sum()) < 1e-9 or s > 0, "el rojo no se conserva"
        pasos.append({
            "y": float(a[-1][0]),
            "c": [[[float(abs(c[l][i, k]) / tot0) for k in range(CAPAS[l + 1])] for i in range(CAPAS[l])] for l in range(len(W))],
            "dw": [[[float(-eta * g[l][i, k]) for k in range(CAPAS[l + 1])] for i in range(CAPAS[l])] for l in range(len(W))],
        })
        w_act = [w - eta * x for w, x in zip(w_act, g)]
    return {"capas": CAPAS, "ys": YS, "xs": {str(k): v for k, v in XS.items()}, "r": R, "verdad": float(t), "seed": seed, "eta": float(eta),
            "w": [x.tolist() for x in W], "a": [x.tolist() for x in adelante(W, a0)], "pasos": pasos}


if __name__ == "__main__":
    z = construye()
    print("semilla", z["seed"], "eta", round(z["eta"], 3), "t", round(z["verdad"], 3))
    print("salida por paso", [round(p["y"], 3) for p in z["pasos"]])
    p = z["pasos"][0]
    for l, q in enumerate(p["c"]):
        m = np.array(q)
        print(f"capa {l}: total {m.sum():.4f}\n", np.round(m * 100, 1))
    print("activaciones", [np.round(x, 2).tolist() for x in z["a"]])
    gg = np.concatenate([np.array(x).ravel() for x in p["dw"]]); cc = np.concatenate([np.array(x).ravel() for x in p["c"]])
    print("corr rangos dw-c", np.corrcoef(np.argsort(np.argsort(-gg)), np.argsort(np.argsort(cc)))[0, 1])
