import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

m = Mezcla("c01_error", pausas={"y aquí está": .45, "lo único que puede": .35, "si le quitas": .55, "porque lo único": .5}, cola=2.2).exporta_tiempos()
T = m.T

# La tormenta: digitos que se apagan cuando se juntan
m.pon(0, lluvia(T("sin saber nada").s, 60), .4)
m.pon(T("puros números").s + .2, polvo(T("pídele algo").s - T("puros números").s - .25), .34)
m.pon(T("pídele algo").s - .1, golpe(60, 120, .16, .05), .4)
m.pon(T("cuesta una casa").s - .35, trazo(T("su primera").s - T("cuesta una casa").s + .2, 260, 520), .12)
# Primera respuesta: la bola cae en la recta
for k, t in enumerate(rebotes(T("dos pesos").s - .46, 4, .42, 34)):
    m.pon(t, golpe(92, 42, .46 - min(k, 3) * .08, .26), .9 * .42 ** k)
m.pon(T("tres millones").s - .55, soplo(.8, 300, 3200, .3), .36, .4)
m.pon(T("tres millones").s, cola(toc(330)), .3, .2)
m.pon(T("hay una distancia").s - .05, trazo(.75, 300, 620), .16)
m.pon(T("llamamos error").e - .42, campana((440, 660), 1.4, (.7, .3)), .24)
for f in ("no sabe qué es una casa", "no sabe qué es un peso"):
    m.pon(T(f).s + .1, soplo(.3, 900, 4200, .2), .2)
# Negro: un latido
ini, fin = T("lo único que puede sentir").s, T("así que ajusta").s
m.pon(ini, golpe(58, 30, 1.1, .05), 1.1)
t = ini + .66
while t < fin - .3:
    m.pon(t, golpe(56, 34, .3, 0), .4)
    m.pon(t + .19, golpe(50, 32, .26, 0), .25)
    t += 1.0 / .75
# Saltos
for f in ("dos millones de error", "un millón", "cien mil"):
    a = T(f).s - .1
    m.pon(a, soplo(.5, 500, 3000, .5), .13)
    m.pon(a + .5, golpe(104, 52, .3, .24), .55)
    m.pon(a + .5, tic(.03, 1800, 5200), .3)
# Millones de veces: tics que se aceleran
a, b = T("una vez otra vez").s, T("hasta que un día").s
tt, paso = a, .3
while tt < b:
    m.pon(tt, tic(.024, 3000, 8000), .2 + rng.random() * .1, rng.uniform(-.3, .3))
    tt += paso; paso = max(.035, paso * .93)
m.pon(T("hasta que un día").s, trazo(T("le atina").s - T("hasta que un día").s, 300, 760), .13)
m.pon(T("le atina").s, campana(), .44)
m.pon(T("le atina").s, golpe(110, 56, .4, .24), .6)
m.pon(T("eso es entrenar").s + .25, golpe(70, 40, .36, .1), .4)
for f in ("chatgpt", "los autos", "esta voz"):
    m.pon(T(f).s, toc(520), .26)
    m.pon(T(f).s, soplo(.9, 500, 2400, .15), .08)
# Sin error: todo se apaga
m.pon(T("si le quitas").s, golpe(50, 28, .9, .04), .8)
m.pon(T("a equivocarse menos").s, campana((329.6, 493.9, 659.3), 2.4, (.8, .4, .2)), .28)
for k, t in enumerate(rebotes(T("a equivocarse menos").e - .25, 7, .44, 30)):
    m.pon(t, golpe(92, 44, .4, .22), .8 * .44 ** k)

corte = T("lo único que puede sentir").s
vuelve = T("así que ajusta").s
quita = T("si le quitas").s
m.musica([("c01_error", 6, 0, corte, .05, .03), ("c01_error", 30, vuelve, quita, .3, .35), ("c01_error", 74, T("porque lo único").s, m.dur, .9, 2.4)])
m.cierra()
