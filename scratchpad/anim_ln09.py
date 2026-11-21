def draw(L, D, t, W, H):
    izq, der = W * 0.08, W * 0.92
    ft, tl, tlh = fit(D, "UNA POR UNA, O TODAS", int(W * 0.84), int(H * 0.07),
                      int(H * 0.040), 34, True)
    for k, ln in enumerate(tl):
        L.text((W * 0.5 - D.textlength(ln, font=ft) / 2, H * 0.085 + k * tlh),
               ln, font=ft, fill=TEXT)

    n = 5
    paso = (der - izq) / (n - 1)
    rad = int(W * 0.048)
    fe = font(int(H * 0.030), True)

    def carril(y, etiqueta, color, encendido, avance):
        # etiqueta ARRIBA del carril, centrada: nunca debajo ni al lado de los puntos
        L.text((W * 0.5 - D.textlength(etiqueta, font=fe) / 2, y - rad - H * 0.055),
               etiqueta, font=fe, fill=(*color, 240))
        L.line([(izq, y), (der, y)], fill=(*MUTED, 90), width=5)
        for i in range(n):
            x = izq + paso * i
            on = encendido(i)
            if on > 0:
                L.ellipse([x - rad - 14, y - rad - 14, x + rad + 14, y + rad + 14],
                          fill=(*color, int(48 * on)))
            L.ellipse([x - rad, y - rad, x + rad, y + rad],
                      fill=(*CARD, 255), outline=(*color, int(70 + 185 * on)),
                      width=int(5 + 5 * on))
        # barra de progreso debajo, del mismo ancho que el carril
        by = y + rad + H * 0.032
        L.rounded_rectangle([izq, by, der, by + 18], radius=9, fill=(*MUTED, 70))
        if avance > 0:
            L.rounded_rectangle([izq, by, izq + (der - izq) * avance, by + 18],
                                radius=9, fill=(*color, 255))

    # arriba: un pulso que avanza de uno en uno (lento)
    y1 = H * 0.265
    p1 = smooth(t, 0.4, 6.2)
    pos = p1 * (n - 1)
    carril(y1, "UNA POR UNA", ACCENT,
           lambda i: max(0.0, 1 - abs(i - pos) * 1.4), p1)

    # abajo: todas de golpe y se quedan latiendo
    y2 = H * 0.555
    golpe = smooth(t, 1.2, 0.35)
    late = 0.75 + 0.25 * math.sin(t * 3.2)
    carril(y2, "TODAS A LA VEZ", ACCENT2,
           lambda i: golpe * late, golpe)
