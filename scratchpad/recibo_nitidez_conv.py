"""RECIBO del video 'nitidez = primera capa' (formato FORENSE, ley del recibo).

Se corre ANTES de escribir el guion. Todo número que se narre sale de este stdout.
Corrido el 2026-08-09 en /home/jose/tiktok/.venv (WSL2, CPU, sin GPU).

    .venv/bin/python scratchpad/recibo_nitidez_conv.py > scratchpad/recibo_nitidez_conv.log

Contiene los tres bloques del guion y sus CONTROLES (toda cifra se mide también contra
algo que DEBERÍA fallarla; si el control la pasa, la cifra se tira, no se narra).
"""
import time

import numpy as np
import torch
import torch.nn as nn
from PIL import Image, ImageFilter
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split

CARA = "/home/jose/tiktok/branding/host_jose.png"

NITIDEZ = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], float)
IDENT = np.array([[0, 0, 0], [0, 1, 0], [0, 0, 0]], float)
CRUZ = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]], float) / 4      # promedio de los 4 vecinos

# 8 filtros clásicos escritos a mano (control "un siglo de visión por computadora")
CLASICOS = {
    "nitidez":    [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    "laplaciano": [[0, -1, 0], [-1, 4, -1], [0, -1, 0]],
    "sobel_x":    [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    "sobel_y":    [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    "prewitt_x":  [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
    "prewitt_y":  [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
    "emboss":     [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
    "desenfoque": [[1 / 9] * 3] * 3,
}


def conv(x, k):
    """La MISMA función para los dos kernels del video. 9 desplazamientos, nada más."""
    h, w = x.shape
    out = np.zeros((h - 2, w - 2))
    for i in range(3):
        for j in range(3):
            out += k[i, j] * x[i:i + h - 2, j:j + w - 2]
    return out


def bloque_3():
    print("=== BEAT 3 · LO CORRÍ: nitidez = identidad + medidor de bordes ===")
    resto = NITIDEZ - IDENT
    print("nitidez - identidad =", resto.tolist(), "| suma =", resto.sum())
    print("identidad + 4*(identidad - promedio de los 4 vecinos) =",
          (IDENT + 4 * (IDENT - CRUZ)).tolist(),
          "| ¿== nitidez?", np.allclose(IDENT + 4 * (IDENT - CRUZ), NITIDEZ))
    pil = np.array(ImageFilter.SHARPEN().filterargs[3], float).reshape(3, 3) / 16
    caja = (np.ones((3, 3)) - IDENT) / 8
    print("PIL ImageFilter.SHARPEN =", ImageFilter.SHARPEN().filterargs)
    print("¿SHARPEN de Pillow == identidad + (identidad - promedio de los 8 vecinos)?",
          np.allclose(pil, IDENT + (IDENT - caja)))

    a = np.asarray(Image.open(CARA).convert("L"), float)
    d = conv(a, NITIDEZ) - (a[1:-1, 1:-1] + 4 * (a[1:-1, 1:-1] - conv(a, CRUZ)))
    print("error máximo 'resta el borroso y suma la diferencia' sobre la cara:", np.abs(d).max())
    r = conv(a, resto)
    print("mapa de bordes -> zona plana (p10 de |r|):", round(float(np.percentile(np.abs(r), 10)), 3),
          "| borde (p99):", round(float(np.percentile(np.abs(r), 99)), 1))


def _entrena(seed, modo, epochs=60):
    X, y = load_digits(return_X_y=True)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.221, random_state=0, stratify=y)
    Xt = torch.tensor(Xtr, dtype=torch.float32).view(-1, 1, 8, 8) / 16
    Xv = torch.tensor(Xte, dtype=torch.float32).view(-1, 1, 8, 8) / 16
    yt, yv = torch.tensor(ytr), torch.tensor(yte)
    torch.manual_seed(seed)
    net = nn.Sequential(nn.Conv2d(1, 8, 3, bias=False), nn.ReLU(), nn.Flatten(), nn.Linear(288, 10))
    if modo == "mano":
        k = np.array(list(CLASICOS.values()), dtype=np.float32)
        with torch.no_grad():
            net[0].weight.copy_(torch.tensor(k).view(8, 1, 3, 3))
    if modo in ("mano", "azar"):
        net[0].weight.requires_grad_(False)
    opt = torch.optim.Adam([p for p in net.parameters() if p.requires_grad], lr=0.01)
    lo = nn.CrossEntropyLoss()
    t0 = time.time()
    for _ in range(epochs):
        opt.zero_grad()
        lo(net(Xt), yt).backward()
        opt.step()
    acc = (net(Xv).argmax(1) == yv).float().mean().item()
    return acc, time.time() - t0, net[0].weight.detach().numpy()[:, 0], len(yv)


def bloque_4():
    print("\n=== BEAT 4 · LA PRUEBA JUSTA: misma red, mismo código, solo cambian los 9 números ===")
    res = {m: [] for m in ("mano", "azar", "aprende")}
    tiempos, n_test, aprendidos = [], 0, []
    for s in range(5):
        for m in res:
            acc, dt, k, n_test = _entrena(s, m)
            res[m].append(acc)
            if m == "aprende":
                tiempos.append(dt)
                aprendidos.append(k)
        print(f"semilla {s}: a mano {res['mano'][-1]*100:.1f}% | al azar {res['azar'][-1]*100:.1f}%"
              f" | aprendidos {res['aprende'][-1]*100:.1f}%")
    for m, lab in (("mano", "8 filtros clásicos escritos a mano"),
                   ("azar", "8 kernels al azar, congelados"),
                   ("aprende", "8 kernels aprendidos")):
        e = 100 - 100 * np.mean(res[m])
        print(f"{lab}: acierto {100*np.mean(res[m]):.1f}% | error {e:.1f}% "
              f"= {e*n_test/100:.0f} de {n_test} dígitos de prueba")
    print("entrenamiento:", [round(t, 2) for t in tiempos], "s (CPU, sin GPU)")

    print("\n--- CONTROLES QUE MATARON CIFRAS (no se narran, se documentan) ---")
    K = np.concatenate(aprendidos)          # 40 kernels
    cs = sum(1 for f in K if f[1, 1] > 0 and (np.delete(f.flatten(), 4) < 0).all())
    print(f"centro positivo + 8 vecinos negativos: {cs}/40 aprendidos "
          "(al azar da ~0.2% -> la métrica NO discrimina; se tira)")
    def direccional(f):
        gr = max(abs(f[0].sum() - f[2].sum()), abs(f[:, 0].sum() - f[:, 2].sum()))
        return gr > abs(8 * f[1, 1] - (f.sum() - f[1, 1])) / 4
    rnd = [np.random.randn(3, 3) for _ in range(1000)]
    print(f"'filtro direccional': aprendidos {sum(map(direccional, K))}/40 "
          f"vs {sum(map(direccional, rnd))/10:.0f}% al azar -> NO discrimina; se tira")


if __name__ == "__main__":
    bloque_3()
    bloque_4()
