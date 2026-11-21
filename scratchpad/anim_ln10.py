def draw(L, D, t, W, H):
    izq, der = W * 0.06, W * 0.94
    cx, cy = W * 0.5, H * 0.575
    r = int(W * 0.130)

    ft, tl, tlh = fit(D, "DE PREGUNTA A RESPUESTA", int(W * 0.84), int(H * 0.07),
                      int(H * 0.040), 34, True)
    ty = H * 0.085
    for k, ln in enumerate(tl):
        L.text((cx - D.textlength(ln, font=ft) / 2, ty + k * tlh), ln, font=ft, fill=TEXT)

    palabras = ["GUÍA", "CLAVE", "RESUMEN"]
    xs = [W * 0.20, W * 0.50, W * 0.80]
    wy = H * 0.205
    gana = 1
    aparece = [smooth(t, 0.15 + i * 0.22, 0.5) for i in range(3)]
    elegido = smooth(t, 2.0, 0.7)
    late = 1.0 + 0.035 * math.sin(t * 2.4)

    # haces de ida: salen del círculo hacia cada palabra
    for i in range(3):
        av = smooth(t, 1.1 + i * 0.15, 0.55)
        if av <= 0:
            continue
        x0, y0 = cx, cy - r
        x1, y1 = xs[i], wy + H * 0.035
        ex, ey = x0 + (x1 - x0) * av, y0 + (y1 - y0) * av
        col = ACCENT if i == gana else MUTED
        alpha = int(90 + 90 * av) if i != gana else int(120 + 120 * av)
        L.line([(x0, y0), (ex, ey)], fill=(*col, alpha), width=6 if i != gana else 9)

    # chorro de vuelta desde la palabra elegida
    if elegido > 0:
        x1, y1 = xs[gana], wy + H * 0.045
        ex = x1 + (cx - x1) * elegido
        ey = y1 + (cy - r - y1) * elegido
        for grosor, a in ((34, 60), (22, 120), (12, 235)):
            L.line([(x1, y1), (ex, ey)], fill=(*ACCENT2, a), width=int(grosor * late))

    # círculo de la pregunta
    rr = int(r * (1 + 0.10 * elegido) * late)
    for k in range(3):
        L.ellipse([cx - rr - k * 16, cy - rr - k * 16, cx + rr + k * 16, cy + rr + k * 16],
                  fill=(*ACCENT, 26 - k * 7))
    L.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(*CARD, 255), outline=ACCENT, width=7)
    fq = font(int(H * 0.034), True)
    L.text((cx - D.textlength("PREGUNTA", font=fq) / 2, cy - fq.size * 0.62),
           "PREGUNTA", font=fq, fill=TEXT)

    # palabras del arco (sin caja: solo el texto) + su llave
    for i, p in enumerate(palabras):
        if aparece[i] <= 0:
            continue
        base = int(H * 0.042) if i != gana else int(H * 0.042 + H * 0.026 * elegido)
        f, li, lh = fit(D, p, int(W * 0.26), int(H * 0.09), base, 34, True)
        anch = D.textlength(li[0], font=f)
        x = min(max(xs[i], izq + anch / 2), der - anch / 2)
        y = wy - (1 - aparece[i]) * H * 0.05
        col = TEXT if (i == gana or elegido < 0.4) else MUTED
        L.text((x - anch / 2, y), li[0], font=f, fill=(*col, int(255 * aparece[i])))
        # llave dibujada debajo (aro + vástago), nunca un rectángulo con texto
        ky = y + f.size * 1.45
        kr = int(H * 0.013)
        kc = ACCENT2 if i == gana else MUTED
        L.ellipse([x - kr, ky - kr, x + kr, ky + kr], outline=(*kc, int(230 * aparece[i])), width=5)
        L.line([(x + kr, ky), (x + kr * 3.4, ky)], fill=(*kc, int(230 * aparece[i])), width=5)
        L.line([(x + kr * 2.6, ky), (x + kr * 2.6, ky + kr)], fill=(*kc, int(230 * aparece[i])), width=5)

    fl = font(int(H * 0.028), True)
    L.text((cx - D.textlength("lo que pregunto", font=fl) / 2, cy + rr + H * 0.020),
           "lo que pregunto", font=fl, fill=(*ACCENT, int(235 * smooth(t, 0.9, 0.5))))
    L.text((izq, wy + H * 0.125), "lo que ofrece", font=fl,
           fill=(*MUTED, int(235 * smooth(t, 1.5, 0.5))))
    if elegido > 0.3:
        L.text((der - D.textlength("lo que me llevo", font=fl), cy - r - H * 0.055),
               "lo que me llevo", font=fl, fill=(*ACCENT2, int(235 * elegido)))
