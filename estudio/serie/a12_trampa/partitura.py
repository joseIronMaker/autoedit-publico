"""Capítulo 12 de la serie 2: el salón de examen. Todos los instantes (el acordeón, los intentos de cada
pupitre, las sondas al calificador, el cable a la puerta, la balanza de METR, el examen que se voltea)
salen de aquí a `eventos.json`; la animación los lee de ahí, así que dibujo y sonido son los mismos números.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"el instituto de": .2, "uno frente": .35, "y cuando les": .25, "a metr un": .55, "si las cuentas": .35,
          "la misma corrida": .3, "no es maldad": .5, "lo mismo pasa": .2, "pero aquí hay": .4, "si lo que uso": .25,
          "con qué lo mido": .6}
m = Mezcla("a12_trampa", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T


def lista(a, b, n, curva=1.0):
    return [round(a + (b - a) * (i / (n - 1)) ** curva, 3) for i in range(n)]


# ---------- eventos ----------
acordeon = .22                                       # el acordeón salta de la mano
trampa = T("trampa").s - .04
examenes = T("exámenes").s
nadie = T("nadie").s
subraya = T("dijo").s - .05
abre = T("el instituto").s - .35                     # la cámara sube y da la vuelta: el salón entero
aisi = T("instituto").s
reino = T("reino").s
todos = T("todos").s
intentos = lista(T("todos").s + .2, T("momento").s + .05, 8)
algun = T("en algún momento").s
buscan = T("buscaron").s - .32
estira = T("respuestas").s - .12
agarra = T("internet").s - .02
regresa = T("internet").e + .12
sondea = T("sondearon").s - .3
asoma = T("sondearon").s + .1
sondas = [T("programa").s - .05, T("que los calificaba").s + .05, T("calificaba").e + .05]
uno = T("uno").s - .12
imposible = T("imposible").s - .05
error = T("error").s
escribe = T("escribió").s - .3
externo = T("servicio externo").s
cable = T("para intentar").s - .25
llega = T("sistemas").s + .05
forcejeo = [llega + .14, llega + .5, llega + .86]
pregunta = T("y cuando les").s - .15
esconde = T("no lo reconocieron").s - .2
metr0 = T("a metr").s - .55                           # la cámara se clava en la regla del pupitre
metr = T("a metr").s
indep = T("grupo independiente").s
openai = T("un modelo de openai").s
si1 = T("si cuentas").s
fallos = T("fallos").s - .1
resiste = T("resiste").s
once = T("once").s - .05
si2 = T("si las cuentas").s
exitos = T("éxitos").s - .1
setenta = T("doscientas").s - .05
misma = T("la misma corrida").s
aclara = T("y metr aclara").s
ninguna = T("ninguna").s
maldad = T("no es maldad").s
borra = T("maldad").s + .08
meta = T("meta").s - .05
califica = T("calificación").s - .05
corto = T("camino más corto").s
salta = T("es la trampa").s
personas = T("personas").s - .05
empresas = T("empresas").s - .05
nuevo = T("pero aquí").s - .05                        # se va la música; la regla regresa al pupitre
uso = T("si lo que uso").s
confiable = T("confiable").s - .05
unexamen = T("es un examen").s
aprende = T("aprende").s - .1
voltea = T("engañar").s - .05
conque = T("con qué").s
fin = T("ahora").e
gesto = fin + .12

ev = {k: v for k, v in dict(
    acordeon=acordeon, trampa=trampa, examenes=examenes, nadie=nadie, subraya=subraya, abre=abre, aisi=aisi, reino=reino,
    todos=todos, intentos=intentos, algun=algun, buscan=buscan, estira=estira, agarra=agarra, regresa=regresa, sondea=sondea,
    asoma=asoma, sondas=sondas, uno=uno, imposible=imposible, error=error, escribe=escribe, externo=externo, cable=cable,
    llega=llega, forcejeo=forcejeo, pregunta=pregunta, esconde=esconde, metr0=metr0, metr=metr, indep=indep, openai=openai,
    si1=si1, fallos=fallos, resiste=resiste, once=once, si2=si2, exitos=exitos, setenta=setenta, misma=misma, aclara=aclara,
    ninguna=ninguna, maldad=maldad, borra=borra, meta=meta, califica=califica, corto=corto, salta=salta, personas=personas,
    empresas=empresas, nuevo=nuevo, uso=uso, confiable=confiable, unexamen=unexamen, aprende=aprende, voltea=voltea,
    conque=conque, fin=fin, gesto=gesto).items()}
(RAIZ / "remotion/src/serie/a12/eventos.json").write_text(json.dumps(ev), encoding="utf-8")
print({k: (round(v, 2) if isinstance(v, float) else v) for k, v in ev.items()})


# ---------- foley: todo nace del mismo instante que el dibujo ----------
def lapiz(dur, rapido=1.0):
    """Grafito sobre papel: ráfagas cortas, una por trazo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    trazos = np.abs(np.sin(2 * np.pi * (6.5 * rapido) * t + 2.4 * np.sin(2 * np.pi * 1.1 * t))) ** 1.8
    e = np.minimum(t / .03, 1) * np.minimum((dur - t) / .08, 1)
    return banda(ruido(n), 1800, 7000) * trazos * e * .5 + banda(ruido(n), 500, 1500) * trazos * e * .1


def acordeon_snd(dur=.6):
    """La tira doblada que se abre: diez dobleces que chasquean, cada vez más juntos, y un soplo de papel."""
    n = int((dur + .2) * SR)
    y = np.zeros(n)
    tt = 0.0
    for k in range(10):
        i = int(tt * SR)
        s = tic(.03, 1500, 6500) * (.9 - k * .05) + toc(900 + k * 60)[: int(.03 * SR)] * .18
        y[i:i + len(s)] += s[: n - i]
        tt += .085 * .86 ** k
    y += np.pad(soplo(dur, 900, 5000, .25), (0, n - int(dur * SR))) * .35
    return y


def rasgado(dur=.5):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    cr = (rng.random(n) > .99).astype(float) * rng.uniform(-1, 1, n)
    return (banda(cr, 900, 7000) * 3.4 + banda(ruido(n), 1500, 6000) * .4) * np.sin(np.pi * t ** .6) ** .8


def falla(dur=.32):
    """Impresión que se corre: zumbido entrecortado."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    corte = (np.sin(2 * np.pi * 23 * t) > 0).astype(float)
    return (np.sign(np.sin(2 * np.pi * 110 * t)) * .25 + banda(ruido(n), 2000, 8000) * .5) * corte * np.exp(-t * 4)


def niega():
    """El calificador dice que no: dos zumbidos graves."""
    out = np.zeros(int(.34 * SR))
    for k in (0, .17):
        t = np.arange(int(.13 * SR)) / SR
        s = np.sign(np.sin(2 * np.pi * 146 * t)) * .3 * np.minimum(t / .005, 1) * np.minimum((.13 - t) / .02, 1)
        i = int(k * SR)
        out[i:i + len(s)] += banda(s, 100, 2500)
    return out


def cerradura():
    """La punta del cable contra la cerradura: metal que tiembla."""
    g = golpe(320, 200, .16, .8) * .5
    c = campana((1760, 2640, 3960), .35, (.4, .25, .15))[: int(.35 * SR)]
    out = np.zeros(int(.4 * SR))
    out[: len(g)] += g
    out[: len(c)] += c * .6
    return out


def flexa(dur=.5, f=95):
    """Una regla de plástico que se dobla: crujido seco y un tono grave corto, sin resorte."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    cr = (rng.random(n) > .996).astype(float) * rng.uniform(-1, 1, n) * np.exp(-t * 6)
    return banda(cr, 1200, 6000) * 2.2 + np.sin(2 * np.pi * f * t) * np.exp(-t * 9) * .5 * np.minimum(t / .01, 1)


def red(dur=.6):
    """La red de afuera cuando le jalan una tarjeta: un roce de cuerda, sin rebote."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 250, 1400) * np.sin(np.pi * t ** .5) * (1 - t) * .7


def liga(dur=.4, f0=180, f1=420):
    t = np.arange(int(dur * SR)) / SR
    f = np.geomspace(f0, f1, len(t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 1.2 * .22 + banda(ruido(len(t)), 600, 2400) * .14


def rodar(dur, baches=0):
    """Bola rodando sobre tablas: retumbo grave y un golpecito por tabla."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    y = banda(ruido(n), 60, 320) * np.sin(np.pi * t) ** .5 * .5
    for k in range(baches):
        i = int((k + .5) / baches * n)
        s = golpe(150, 90, .08, .3) * .35
        y[i:i + len(s)] += s[: n - i]
    return y


def tono(dur):
    """Tono de cuarto: el silencio digital se oye como corte."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.minimum(t / .4, 1) * np.minimum((dur - t) / .5, 1)
    return (banda(ruido(n), 40, 260) * .5 + np.sin(2 * np.pi * 55 * t) * .25) * e


E = ev
# 1. el acordeón y el examen
m.pon(.05, banda(lapiz(2.0), 2500, 8000), .1, -.3)
m.pon(acordeon, acordeon_snd(), .5, .35)
m.pon(acordeon + .72, golpe(120, 70, .14, .3), .22, .35)
m.pon(trampa, golpe(70, 36, .55, .2), .62)
m.pon(examenes - .1, soplo(.8, 300, 2400, .5), .13)
m.pon(3.45, banda(lapiz(.7, 1.3), 2500, 8000), .1, -.3)
m.pon(subraya, lapiz(.45, 2.2), .34, .1)
# 2. la grúa y el salón entero
m.pon(abre - .05, soplo(1.7, 160, 1800, .45), .24)
m.pon(abre + 1.6, golpe(64, 40, .5, .05), .3)
for k, ti in enumerate(intentos):
    pan = [-.5, -.5, 0, .5, .5, 0, -.5, .5][k]
    m.pon(ti - .1, soplo(.25, 800, 4000, .5), .1, pan)
    m.pon(ti + .12, toc(880 + 70 * k), .3, pan)
m.pon(todos - .05, toc(820), .3)
# 3. la ventana: la red
m.pon(buscan, soplo(.9, 250, 2200, .5), .14)
m.pon(estira - .05, liga(.6, 160, 380), .3, -.5)
m.pon(agarra, tic(.03, 2000, 7000), .5, -.6)
m.pon(agarra, red(.6), .3, -.6)
m.pon(regresa - .2, soplo(.45, 500, 3000, .3), .18, -.3)
# 4. el calificador
m.pon(sondea, soplo(.8, 250, 2200, .5), .14)
m.pon(asoma - .1, golpe(180, 120, .12, .6), .26, .5)
m.pon(asoma - .05, trazo(.35, 700, 900), .08, .5)
for i, si in enumerate(sondas):
    m.pon(si - .08, soplo(.18, 2000, 7000, .8), .2, .5)
    m.pon(si + .1, golpe(110, 70, .16, .5), .4, .5)
    if i < 2:
        m.pon(si + .35, niega(), .22, .5)
    else:
        m.pon(si + .35, campana((1568, 2349), .9, (.6, .3)), .3, .5)
        m.pon(si + .38, golpe(140, 80, .12, .5), .35, .5)
# 5. uno solo: el salón se vacía; el examen imposible; la caja de afuera; el cable
m.pon(uno - .15, soplo(.6, 200, 1500, .2), .2)
m.pon(imposible, rasgado(.55), .45)
m.pon(error, falla(.4), .22)
m.pon(escribe, soplo(.9, 250, 2200, .5), .14)
m.pon(escribe - .35, golpe(90, 50, .3, .3), .3, -.6)
m.pon(escribe + .1, liga(.5, 180, 420), .26, -.5)
m.pon(escribe + .55, lluvia(cable - escribe - .7, 26), .5, -.6)
m.pon(cable - .05, soplo(.3, 1200, 6000, .2), .3, -.6)
dur_cable = llega - cable
m.pon(cable, trazo(dur_cable, 180, 520), .2)
m.pon(cable, banda(ruido(int(dur_cable * SR)), 300, 1600) * np.sin(np.linspace(0, np.pi, int(dur_cable * SR))) * .4, .3)
for i, f in enumerate(forcejeo):
    m.pon(f, cerradura(), .42, .7)
    m.pon(f + .1, niega(), .14, .7)
# 6. la pregunta
m.pon(pregunta + .12, toc(700), .3, .4)
m.pon(esconde, soplo(.45, 400, 2600, .3), .2)
m.pon(esconde + .4, golpe(150, 90, .1, .2), .18)
# 7. METR: la regla se vuelve escala
m.pon(metr0, soplo(.9, 400, 3600, .7), .26)
m.pon(metr0 + .8, golpe(160, 90, .2, .5), .34)
m.pon(metr0 + .8, toc(420), .3)
m.pon(openai - .15, soplo(.4, 600, 3000, .4), .14, -.6)
m.pon(openai + .4, golpe(96, 50, .3, .2), .4, -.6)
for i in range(22):
    m.pon(openai + .05 + i * .06 + .3, toc(560 + 18 * i), .12, -.8 + i * .075)
for k in range(17):
    m.pon(fallos + .12 + k * .06, toc(900 - 30 * k), .1, -.1 + k * .05)
m.pon(fallos + .1, soplo(1.1, 300, 2400, .2), .12, .2)
m.pon(resiste, rodar(once - .05 - resiste, 9), .5, -.4)
m.pon(once, golpe(80, 46, .4, .1), .4, -.3)
m.pon(once + .05, toc(620), .24, -.3)
m.pon(exitos, soplo(.6, 500, 4000, .7), .14, .3)
for k in range(17):
    m.pon(exitos + k * .035 + .35, toc(560 + 30 * k), .1, -.1 + k * .05)
m.pon(exitos + .4, rodar(setenta + .25 - exitos - .4, 12), .55, .2)
m.pon(setenta, golpe(84, 48, .4, .1), .44, .5)
m.pon(setenta + .05, campana((784, 1175), 1.0, (.5, .3)), .2, .5)
m.pon(misma + .05, trazo(.5, 500, 700), .1)
m.pon(ninguna + .1, trazo(1.4, 240, 200), .08)
# 8. no es maldad; la meta; el camino corto
m.pon(maldad + .25, tic(.03, 1500, 5000), .3)
m.pon(maldad + .32, tic(.03, 1500, 5000), .26)
m.pon(borra, banda(ruido(int(.55 * SR)), 700, 3200) * np.abs(np.sin(np.linspace(0, 3 * np.pi, int(.55 * SR)))), .3)
m.pon(meta, golpe(110, 60, .3, .4), .42, .6)
m.pon(meta + .05, soplo(.5, 900, 4000, .3), .14, .6)
m.pon(meta + .1, liga(.4, 200, 380), .22, .4)
m.pon(califica, toc(980), .3, .4)
m.pon(califica + .05, campana((1318.5, 1975.5), .7, (.4, .2)), .16, .4)
m.pon(califica + .1, liga(.4, 220, 440), .2, .4)
m.pon(corto - .1, trazo(1.2, 260, 420), .1)
m.pon(salta - .45, soplo(.4, 1200, 5000, .3), .14)
m.pon(salta, liga(.3, 500, 160), .3)
m.pon(salta, rodar(.75, 8), .5)
m.pon(salta + .76, golpe(90, 50, .4, .2), .45, .6)
for k in range(6):
    m.pon(personas + .25 + k * .13, toc(300 + 20 * (k % 2)), .2, -.4 + k * .16)
m.pon(empresas + .25, rodar(.75, 4), .5)
m.pon(empresas + 1.0, golpe(60, 34, .5, .1), .45, .5)
# 9. el giro: se va la música; la regla regresa al pupitre
m.pon(nuevo + .2, golpe(46, 28, 1.3, .02), .38)
m.pon(nuevo, tono(uso - nuevo + .6), .5)
m.pon(nuevo + .55, soplo(1.0, 250, 2400, .5), .2)
for k in range(3):
    m.pon(uso + .1 + k * .3, lapiz(.18, 3), .3, .2)
m.pon(confiable - .1, lapiz(.55, 1.6), .3, -.2)
m.pon(unexamen - .1, soplo(1.4, 200, 1400, .5), .1)
m.pon(aprende + .1, acordeon_snd(), .45, .3)
m.pon(voltea, soplo(.5, 600, 4000, .4), .3)
m.pon(voltea + .12, flexa(.5, 110), .4)
m.pon(voltea + .55, soplo(.9, 250, 2200, .5), .14)
m.pon(voltea + 1.35, soplo(1.1, 200, 1600, .5), .12)
m.pon(conque - 1.0, tic(.03, 1500, 5000), .2)
# 10. el cierre: la bola nos enseña la regla doblada y la música se resuelve
m.pon(gesto, golpe(70, 40, .7, .05), .4)
m.pon(gesto + .02, flexa(.4, 90), .22)
m.pon(gesto + .05, campana((196, 293.7, 392), 2.6, (.7, .4, .25)), .26)

t2 = uso - .25
m.musica([("a12_trampa", 41.0, 0, nuevo + .5, .03, 1.1), ("a12_trampa", 108.2 - (gesto - t2), t2, m.dur, .6, 2.4)])
m.cierra()
