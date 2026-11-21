"""Capítulo 12. Imagen y sonido leen los mismos eventos: esta partitura deja t.json y la pieza lo importa."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {
    "ninguno existía": .3, "y cuando el abogado": .55, "pero eso no fue": .3, "para mentir": .3, "recuerda cómo": .55,
    "nada se consultó": .25, "a eso le llaman": .25, "yo le diría": .2, "porque por dentro": .25, "hay un mapa": .3,
    "por eso hoy": .35, "no lo arregla": .25, "mira de dónde": .5, "un número al azar": .25,
    # El repaso: cada imagen necesita tiempo para transformarse en la siguiente.
    "un error": .5, "una pendiente": .55, "una suma": .55, "un doblez": .6, "la culpa": .65, "un punto en": .2, "una palabra que": .4,
    "empezó adivinando": .5, "y hoy": .2, "nunca dejó": .45, "solo aprendió": .4,
}
m = Mezcla("c12_adivina", pausas=PAUSAS, cola=6.0).exporta_tiempos()
T = m.T
FIN = T("nuestras palabras").e

# ---------- la máquina teclea: tiempos de cada renglón ----------
GPT = T("chatgpt").s
durN = [1.42, .62, .46, .34, .3, .26]            # nombre de cada caso
durS = [.42, .3, .24, .2, .18, .16]              # fecha y número
sep = [.08, .06, .05, .04, .04]
lin, u = [], -.2
LETRAS_N = [18, 20, 23, 19, 20, 21]
tot = sum(durN[1:]) + sum(durS[1:]) + sum(sep[1:]) + .14
esc = (GPT + .02 - 1.86) / tot
for i in range(6):
    k = 1 if i == 0 else esc
    if i == 1:
        u = 1.86
    a, b = u, u + durN[i] * k
    c, d = b + (.08 if i == 0 else .05 * k), 0
    d = c + durS[i] * k
    lin.append([round(a, 3), round(b, 3), round(c, 3), round(d, 3)])
    u = d + (sep[i] * k if i < 5 else 0)
for i, (a, b, c, d) in enumerate(lin):
    n = LETRAS_N[i]
    if i == 0:
        for k in range(7):
            t = a + (b - a) * k / 7
            if t >= -.01:
                m.pon(max(t, 0), golpe(136, 78, .12, .6), .34)
                m.pon(max(t, 0), tic(.03, 1700, 6400), .4, -.25 + .08 * k)
        continue_ = True
    else:
        continue_ = False
    for j in range(0, n, 2):
        if continue_:
            break
        t = a + (b - a) * j / n
        m.pon(max(t, 0), tic(.03, 1700, 6400), .46 - i * .03, -.25 + .5 * j / n)
        if j % 4 == 0:
            m.pon(max(t, 0), golpe(150, 86, .08, .55), .16)
    for j in range(0, 24, 3):
        m.pon(c + (d - c) * j / 24, tic(.022, 3000, 8000), .18)
    m.pon(d, toc(760 - i * 40), .12)

# Subrayados: nombres, fechas, números.
for f, k in (("con nombres", 0), ("con fechas", 1), ("con citas", 2)):
    a = T(f).s + .22
    for i in range(6):
        m.pon(a + i * .06, trazo(.2, 500 + 120 * k, 900 + 160 * k), .1, -.3 + .12 * i)

# ---------- la bola salta hasta arriba y cae a través de los seis casos ----------
SALTO = T("ninguno existía").s - .5                     # se eleva durante la pausa
Y0, PISOS, SUELO, G = 236., [392, 582, 772, 962, 1152, 1342], 1520., 2500.
t, y, v, golpes, tramos_ = T("ninguno existía").s - .02, Y0, 0., [], []
for p in PISOS + [SUELO]:
    dt = (-v + np.sqrt(v * v + 2 * G * (p - y))) / G
    tramos_.append([round(t, 4), round(y, 2), round(v, 2)])
    t += dt
    v = (v + G * dt)
    y = p
    golpes.append(round(t, 4))
    v *= .74
ch = golpes[:6]
m.pon(SALTO, soplo(.5, 260, 1800, .75), .3)
for k, h in enumerate(ch):
    m.pon(h, golpe(112 - k * 9, 46, .34, .5), .62 + k * .05, -.2 + .08 * k)
    m.pon(h, cola(toc(420 - k * 34), .9, .22), .18)
    m.pon(h, polvo(.5), .3, .3 - .1 * k)
m.pon(golpes[6], golpe(66, 30, .8, .4), 1.05)
for k, tb in enumerate(rebotes(golpes[6] - .447, 3, .42, 30)[:4]):
    if k:
        m.pon(tb, golpe(82, 40, .3, .2), .6 * .42 ** k)

# ---------- ¿son reales? ----------
m.pon(T("preguntó").s + .05, toc(620), .26)
m.pon(T("preguntó").s + .05, soplo(.3, 700, 3400, .2), .1)
m.pon(T("dijo que sí").s, soplo(.45, 300, 1900, .6), .16)
m.pon(T("sí", T("dijo").i).s - .03, golpe(96, 50, .4, .3), .5)
m.pon(T("lo multaron").s - .34, polvo(.32), .18)
# El sello.
SELLO = T("multaron").s + .1
m.pon(SELLO - .16, soplo(.17, 400, 2600, .9), .34)
m.pon(SELLO, golpe(50, 40, .55, .9), 1.1)
m.pon(SELLO, tic(.06, 300, 1500), .8)

# ---------- el único corte a negro ----------
NEGRO = T("pero eso no fue").s
m.pon(NEGRO, golpe(52, 28, 1.3, .05), 1.15)
m.pon(T("una mentira").e - .06, soplo(.24, 900, 5200, .25), .3)
m.pon(T("mentira").e - .08, golpe(76, 38, .3, .3), .3)
BOLA_N = T("para mentir").s + .02
m.pon(BOLA_N + .383, golpe(92, 44, .34, .2), .55)
m.pon(T("mentir,").s + .22, soplo(.34, 300, 1500, .4), .13)
m.pon(T("mentir,").s + .54, golpe(100, 50, .26, .2), .46)
m.pon(T("la verdad").e + .05, campana((392, 587.3), 1.8, (.7, .3)), .15)
QUITA = T("la verdad").e + .28                          # la bandera se deshace en el silencio
m.pon(QUITA, polvo(.72), .3)
m.pon(QUITA + .1, soplo(.8, 240, 1100, .3), .13)

# ---------- la palabra más creíble, una tras otra ----------
REC = T("recuerda cómo").s
m.pon(REC - .3, soplo(.6, 300, 2400, .5), .28)
for j in range(9):
    m.pon(REC - .26 + j * .05, tic(.02, 2200, 6000), .16)
PAL = [T("la palabra más").s, T("palabra más").s, T("más creíble").s, T("creíble").s, T("una tras").s, T("tras otra").s, T("otra").s]
PAL[0] = PAL[1] - .2
for k, s in enumerate(PAL):
    for j in range(3):
        m.pon(s - .16 + j * .04, tic(.02, 2600, 7000), .1)
    m.pon(s, golpe(118, 60, .2, .4), .5)
    m.pon(s, toc(460 + 34 * k), .22)

# ---------- la cita ----------
for f in ("según", "el caso"):
    m.pon(T(f).s, golpe(120, 62, .18, .4), .36)
for j in range(12):
    m.pon(T("según").s + j * (T("caso").e - T("según").s) / 12, tic(.024, 2000, 6200), .22)
for f, g in (("viene algo", 0), ("un número que", 1)):
    a = T(f).s
    for i in range(3):
        m.pon(a + i * .09, toc(700 + 90 * i), .13)
    m.pon(a, trazo(.6, 280, 640), .08)
CAE1, CAE2 = T("suena a caso").e - .14, T("suena a cita").e - .14
for a in (CAE1, CAE2):
    m.pon(a, golpe(96, 50, .3, .4), .55)
    m.pon(a, toc(640), .2)
EN = T("todo encaja").s
for i, dt in enumerate((.1, .27, .44)):
    m.pon(EN + dt, toc(840 + 120 * i), .34)
    m.pon(EN + dt, tic(.03, 1600, 4800), .3)
m.pon(EN + .66, golpe(110, 56, .3, .5), .5)
NADA = T("nada se consultó").s
m.pon(NADA + .06, soplo(1.1, 180, 900, .25), .16)
for j in range(14):
    m.pon(NADA + .1 + j * .09, tic(.022, 900, 2600), .13 * (1 - j / 18))

# ---------- alucinación / completar ----------
AL = T("alucinación").s
m.pon(AL, polvo(.9), .3)
m.pon(AL + .1, trazo(.9, 900, 1300), .05)
TACHA = T("yo le diría").s + .1
m.pon(TACHA, soplo(.34, 800, 4600, .3), .24)
CO = T("completar").s
for j in range(7):
    m.pon(CO + j * .065, tic(.03, 1800, 6000), .36)
    m.pon(CO + j * .065, golpe(130, 76, .08, .5), .16)
m.pon(T("completar").e - .1, golpe(104, 54, .34, .3), .55)
m.pon(T("completar").e - .1, campana((698.46, 1046.5), 1.2, (.7, .3)), .2)

# ---------- el archivo vacío y el mapa ----------
AR = T("porque por dentro").s + .05
m.pon(AR, golpe(70, 34, .6, .3), .75)
m.pon(AR, soplo(.5, 160, 800, .25), .24)
CAJ = [T("archivo de hechos").s - .32 + i * .3 for i in range(4)]
for a in CAJ:
    m.pon(a, cola(golpe(146, 84, .16, .7), .7, .24), .55)
    m.pon(a + .11, toc(210), .34)
    m.pon(a + .15, soplo(.3, 300, 1100, .4), .08)
MAP = T("hay un mapa").s
m.pon(MAP - .1, trazo(1.5, 180, 720), .14)
m.pon(MAP, polvo(1.3), .12)
ETQ = [MAP + .75 + i * .22 for i in range(5)]
for a in ETQ:
    m.pon(a, golpe(138, 80, .13, .4), .25)
    m.pon(a, toc(880), .1)

m.pon(T("lo verdadero").s, golpe(104, 52, .3, .2), .4)
m.pon(T("suena verdadero").s - .1, golpe(112, 56, .3, .2), .4)
m.pon(T("muy cerca").s - .08, soplo(1.1, 200, 1500, .55), .16)
m.pon(T("cerca").s - .05, campana((392, 587.3), 1.4, (.7, .3)), .16)

# ---------- buscadores y documentos ----------
BUS, DOC = T("buscadores").s, T("documentos").s
m.pon(BUS - .06, golpe(120, 66, .22, .4), .4)
m.pon(BUS, trazo(.5, 340, 780), .12)
for i in range(3):
    m.pon(DOC - .06 + i * .13, golpe(124, 70, .18, .4), .34)
    m.pon(DOC + .02 + i * .13, trazo(.34, 360, 720), .08)
LEA = T("para que lea").s
LEC = [LEA + .1 + i * .52 for i in range(3)]
for a in LEC:
    m.pon(a, golpe(120, 62, .14, .3), .3)
    for j in range(6):
        m.pon(a + .06 + j * .05, tic(.02, 2600, 7000), .13)
AYU = T("ayuda mucho").s
RENG = [AYU - .24 + i * .19 for i in range(5)]
for k, a in enumerate(RENG):
    m.pon(a, golpe(120, 60, .2, .4), .46)
    for j in range(5):
        m.pon(a + j * .025, tic(.02, 2200, 6400), .16)
    m.pon(a + .1, trazo(.2, 500, 900), .1, .3)
HUE = T("no lo arregla").s + .1
for j in range(5):
    m.pon(HUE + j * .04, tic(.02, 1400, 3000), .14)
m.pon(HUE + .5, trazo(.8, 480, 150), .16)
m.pon(HUE + .5, soplo(.8, 200, 900, .4), .08)

# ---------- el repaso: una escala que sube, una nota por capítulo ----------
MI = T("mira de dónde").s
m.pon(MI, soplo(1.3, 180, 900, .8), .12)
ESC = [("un número al azar", 261.63), ("un error", 293.66), ("una pendiente", 349.23), ("una suma", 392.0), ("un doblez", 440.0), ("la culpa", 523.25), ("un punto en", 587.33), ("una palabra que", 698.46)]
for k, (f, n) in enumerate(ESC):
    a = T(f).s
    m.pon(a - .16, campana((n, n * 1.5, n * 2), 2.4, (.8, .32, .16)), .12 + k * .008)
    m.pon(a - .42, soplo(.3, 200, 1800 + 200 * k, .86), .07 + k * .005)
R = {k: T(f).s for k, f in zip("nepsdcuw", [e[0] for e in ESC])}
m.pon(R["n"] - .16, golpe(60, 30, .7, .5), .5)
m.pon(R["n"], lluvia(R["e"] - R["n"] - .3, 60), .17)
J0 = R["e"] - .42
m.pon(J0, polvo(.3), .16)
m.pon(R["e"] - .14, golpe(92, 42, .42, .26), .46)
m.pon(R["e"] + .3, trazo(.3, 300, 620), .07)
m.pon(R["p"] - .4, soplo(.7, 120, 700, .5), .12)
m.pon(R["s"] - .16, golpe(74, 36, .4, .3), .34)
for dt in (.34, .52, .74):
    m.pon(R["s"] + dt, golpe(96, 46, .3, .1), .26)
m.pon(R["d"] - .34, soplo(.5, 500, 3400, .7), .14)
m.pon(R["d"] + .46, golpe(100, 50, .26, .6), .24)
m.pon(R["c"], trazo(1.5, 150, 620), .07)
RED_G = [R["c"] + .1 + i * .34 for i in range(4)]
BOLA_M = R["u"] - .08                                     # la bola cae en el mapa
m.pon(BOLA_M, golpe(88, 40, .5, .25), .5)
HIL = [T("palabra que").s, T("que mira").s, T("mira a las").s, T("a las otras").s, T("las otras").s]
for k, a in enumerate(HIL):
    m.pon(a + .02, cola(toc(349.2 * [1, 1.125, 1.25, 1.5, 1.68][k]), .7, .3), .07)
m.pon(T("otras").s + .05, golpe(72, 40, .5, .1), .22)
ROTO = R["w"] + 2.36
m.pon(ROTO, soplo(.3, 900, 5200, .2), .26)
m.pon(ROTO, golpe(110, 48, .3, .6), .5)

# ---------- empezó adivinando ----------
EM = T("empezó adivinando").s
m.pon(EM - .5, lluvia(T("nunca dejó").s - EM + .6, 46), .15)
m.pon(EM - .5, polvo(.5), .2)
ND = T("nunca dejó").s
m.pon(ND - .1, golpe(58, 30, .8, .05), .46)
m.pon(ND, lluvia(T("nuestras palabras").s - ND, 30), .16)
NU = T("nuestras palabras").s
FIJA0, FIJA1 = NU - .1, FIN + .42                        # cada letra se queda quieta, del centro hacia afuera
for j in range(130):
    a = FIJA0 + (FIJA1 - FIJA0) * (j / 130) ** .8
    m.pon(a, tic(.022, 2400, 7600), .1 + rng.random() * .07, rng.uniform(-.5, .5))
JUN = FIN + 2.0                                          # lo que dijimos se junta en la bola
BOL = JUN + 1.02
m.pon(JUN, polvo(BOL - JUN - .05), .34)
m.pon(JUN + .1, trazo(BOL - JUN - .1, 240, 560), .07)
CAE = BOL + .16
for k, tb in enumerate(rebotes(CAE, 3.1, .46, 30)):
    m.pon(tb, golpe(92, 44, .42, .2), .5 * .46 ** k)
PRIMER = rebotes(CAE, 3.1, .46, 30)[0]
m.pon(PRIMER, campana((349.23, 523.25, 698.46), 3.4, (.8, .4, .18)), .15)

# ---------- la música: dos tramos, cortados por el negro ----------
# Pista electrónica en Fa mayor. Medido: intro -18 LUFS con pulso, sube en 24-26 s, meseta -9 hasta 85 s, desciende sola.
# Tramo 1: entra ya con pulso; la subida cae en «ChatGPT le dijo que sí» y el negro la corta en plena meseta.
# Tramo 2: el inicio del descenso (85.2 s) cae en «Nunca dejó de adivinar»; el repaso va sobre lo más fuerte de la pista.
OFF_A = 10.5
OFF_B = round(85.2 - (T("nunca dejó").s - .1), 2)
FIN_M = m.dur - .9                                       # silencio de verdad al final
m.musica([("c12_adivina", OFF_A, 0, NEGRO, .02, .02)], nivel=-23)
m.musica([("c12_adivina", OFF_B + REC - .3, REC - .3, FIN_M, .9, 3.4)], nivel=-27)
RJ = {
    "lin": lin, "salto": round(SALTO, 3), "tramos": tramos_, "golpes": golpes, "pisos": PISOS, "suelo": SUELO, "G": G, "Y0": Y0,
    "sello": round(SELLO, 3), "pal": [round(float(x), 3) for x in PAL], "cae1": round(CAE1, 3), "cae2": round(CAE2, 3), "caj": [round(float(x), 3) for x in CAJ],
    "etq": [round(float(x), 3) for x in ETQ], "lec": [round(float(x), 3) for x in LEC], "reng": [round(float(x), 3) for x in RENG], "hue": round(HUE, 3),
    "rg": [round(float(x), 3) for x in RED_G], "bolaM": round(BOLA_M, 3), "roto": round(ROTO, 3), "fija0": round(FIJA0, 3), "fija1": round(FIJA1, 3),
    "jun": round(JUN, 3), "bol": round(BOL, 3), "cae": round(CAE, 3), "quita": round(QUITA, 3),
}
destino = RAIZ / "remotion/src/serie/c12/t.json"
destino.write_text(json.dumps(RJ), encoding="utf-8")
print(f"voz termina en {FIN:.2f} s · duración {m.dur:.2f} s · música {OFF_A} / {OFF_B}")
m.cierra()
