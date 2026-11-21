"""Capítulo 10. Imagen y sonido leen los MISMOS tiempos: esta partitura escribe t.json y la pieza lo importa.

Whisper estira las palabras sobre los silencios, así que los instantes que importan se corrigen contra la
voz real: `on()` busca dónde empieza a sonar de verdad y `off()` dónde se acaba.
"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

SOLO_TIEMPOS = "--tiempos" in sys.argv

m = Mezcla("c10_torre", pausas={
    "antes las redes": .25, "un transformer": .25, "primero cada": .15, "es este perro": .3, "entonces pasa": .2,
    "y eso es": .25, "no hay un": .3, "no hay otro": .25, "neuronas pesos": .6, "una torre": .3, "y de esa": .3, "una lista": .5,
}, cola=3.4).exporta_tiempos()
T = m.T

# ---------- la voz real ----------
_v = m.voz.mean(axis=1)
_w = int(.012 * SR)
_e = np.sqrt(np.convolve(_v ** 2, np.ones(_w) / _w, "same"))
_umbral = 10 ** (-40 / 20) * max(_e.max(), 1e-6) * 3


def on(s):
    """Primer instante con voz a partir de s."""
    i = int(s * SR)
    while i < len(_e) - 1 and _e[i] < _umbral:
        i += int(.005 * SR)
    return round(i / SR, 3)


def off(e):
    """Último instante con voz antes de e."""
    i = int(e * SR)
    while i > 0 and _e[min(i, len(_e) - 1)] < _umbral:
        i -= int(.005 * SR)
    return round(i / SR, 3)


S = lambda f, d=0: on(T(f, d).s)
E = lambda f, d=0: off(T(f, d).e)

t = dict(
    g1=.30, g2=.57, g3=.76,                                             # las tres sílabas de «ge-pe-té», medidas sobre la onda
    son=S("son tres"), tres=S("tres letras"), letras=S("letras"), ycasi=S("y casi"), sabe=S("sabe qué"), signif=S("significan"), signif_e=E("significan"),
    laG=S("la g es"), G=S("g es de"), gen=S("generativo"), gen_e=E("generativo"), prod=S("produce"), nuevas=S("nuevas"), nuevas_e=E("nuevas"),
    laP=S("la p es"), P=S("p es de"), pre=S("preentrenado"), pre_e=E("preentrenado"), ya=S("ya leyó"), much=S("muchísimo"), antesde=S("antes de hablar"), contigo=S("contigo"), contigo_e=E("contigo"),
    yla=S("y la t"), T=S("t la importante"), imp=S("importante"), imp_e=E("importante"), esde=S("es de transformer"), transf=S("de transformer", 0), transf_e=E("de transformer"),
    antes=S("antes las redes"), redes=S("las redes"), leian=S("leían"), tu=S("como tú"), tu_e=E("como tú"), una=S("una palabra tras"), otra_e=E("tras otra"), lento=S("lento"), lento_e=E("lento"), olv=S("olvidando"), olv_e=E("olvidando"),
    un=S("un transformer lee"), lee=S("lee la"), frase=S("la frase completa"), compl=S("completa"), compl_e=E("completa"), dun=S("de un jalón"), jalon=S("jalón"), jalon_e=E("jalón"),
    primero=S("primero cada"), cadap=S("cada palabra"), vuelve=S("se vuelve"), punto=S("un punto"), punto_e=E("un punto"),
    luego=S("luego pasa"), pasa=S("pasa por"), aten=S("la atención"), aten_e=E("la atención"),
    cada=S("cada una mira"), mira=S("mira a las"), demas_e=E("las demás"), yse=S("y se acomoda"), acom=S("acomoda"), acom_e=E("acomoda"),
    ysale=S("y sale transformada"), transfd=S("transformada"), transfd_e=E("transformada"),
    yano=S("ya no es"), perro1=S("perro a secas"), secas=S("secas"), secas_e=E("secas"),
    es=S("es este perro"), este=S("este perro"), perro2=S("perro en esta"), perro2_e=E("este perro"), enesta=S("en esta frase"), frase2=S("esta frase"), frase2_e=E("esta frase"),
    entonces=S("entonces pasa"), pasa2=S("pasa a la"), sig=S("siguiente capa"), capa=S("capa y"), capa_e=E("siguiente capa"), yotra=S("y a la"), otra2=S("la otra"), otra2_e=E("la otra"),
    decenas=S("decenas de capas"), capas=S("de capas"), capas_e=E("de capas"), ycada=S("y cada una"), afina=S("afina"), afina_e=E("afina"), anterior=S("la anterior"), anterior_e=E("la anterior"),
    como=S("como todo"), mismo=S("al mismo"), tiempo=S("tiempo se"), tiempo_e=E("mismo tiempo"), repartir=S("repartir"), repartir_e=E("repartir"), miles=S("miles de"), chips=S("de chips"), chips_e=E("de chips"),
    por=S("por eso pudo"), pudo=S("pudo crecer"), crecer=S("crecer"), tanto=S("tanto"), tanto_e=E("tanto"),
    yeso=S("y eso es"), pract=S("prácticamente"), todo=S("todo lo que"), hay=S("lo que hay"), hay_e=E("lo que hay"),
    no1=S("no hay un"), modulo=S("módulo de"), gram=S("gramática"), gram_e=E("gramática"), no2=S("no hay otro"), otro=S("otro de"), logica=S("lógica"), logica_e=E("lógica"),
    neu=S("neuronas pesos"), pesos=S("pesos y"), aten2=S("y atención"), aten2_e=E("y atención"), apil=S("apilados"), apil_e=E("apilados"),
    unat=S("una torre de"), misma=S("misma idea"), idea_e=E("misma idea"), repe=S("repetida"), repe_e=E("repetida"),
    ydeesa=S("y de esa"), arriba=S("por arriba"), arriba_e=E("por arriba"), sale2=S("sale una"), sola=S("sola cosa"), cosa=S("cosa una"), cosa_e=E("sola cosa"),
    lista=S("una lista"), qua=S("de qué"), pal=S("qué palabra"), pod=S("palabra podría"), seg=S("seguir"), fin=off(m.W[-1]["e"]), dur=m.dur,
)
t["pal"] = S("palabra podría")
t["pod"] = S("podría seguir")

# Los cinco saltos de la bola que lee: arrancan con «una palabra» y acaban con «olvidando».
a, b = t["una"] - .05, t["olv_e"] - .12
t["saltos"] = [[round(a + (b - a) * i / 5, 3), round((b - a) / 5 * .94, 3)] for i in range(5)]
# Los golpes grandes caen JUSTO DESPUÉS de la palabra: encima de ella la tapan (el c02 ya lo había medido).
t["golpeT"] = round(t["jalon_e"] + .03, 3)                               # la T cae entera sobre la frase
t["caeT"] = round(t["golpeT"] - .26, 3)
t["paraT"] = round(t["imp_e"] + .02, 3)                                  # la T acaba de ponerse de pie
# El arranque: las letras se golpean en cadena sobre «son tres letras» y dicen que no en «nadie».
t["casi"], t["nadie"] = S("casi nadie"), S("nadie sabe")
t["bajaG"], t["bajaT"], t["bajaP"] = round(t["tres"] + .62, 3), round(t["letras"] + .62, 3), round(t["letras"] + .78, 3)
t["asienta"] = round(t["sabe"] + .22, 3)
(RAIZ / "remotion/src/serie/c10/t.json").write_text(json.dumps(t), encoding="utf-8")
if SOLO_TIEMPOS:
    for f in Path(m.dir).glob("_*.wav"):
        f.unlink()
    print({k: v for k, v in t.items() if isinstance(v, (int, float))})
    print("DUR", m.dur)
    raise SystemExit


# ---------- foley propio de este capítulo ----------
def hoja_papel(dur=.1, g=1.0):
    """Una hoja que se sacude: ruido fino con un chasquido al principio."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    return (banda(ruido(n), 1400, 7000) * np.exp(-tt * 22) * .5 + banda(ruido(n), 300, 1400) * np.exp(-tt * 40) * .6) * g


def clac(g=1.0):
    """Hoja que se asienta sobre otra: seco, con cuerpo de papel."""
    y = golpe(150, 70, .13, .5) * .5
    h = hoja_papel(.09)
    y[:len(h)] += h * .9
    return y * g


def cae_bloque(tt, peso=1.0, pan=0.0, f=66):
    """Un bloque enorme sobre la mesa: sub, cuerpo de madera, polvo."""
    m.pon(tt, golpe(f, 28, .95, .45), 1.1 * peso, pan)
    m.pon(tt, golpe(f * 2.6, 60, .22, .3), .55 * peso, pan)
    m.pon(tt, cola(toc(210), 1.3, .4), .3 * peso, pan)
    m.pon(tt + .01, hoja_papel(.3, .5) * np.linspace(1, 0, int(.3 * SR)), .3 * peso, pan)


def rozar(dur, f=.34):
    """Bloque que se arrastra sobre papel."""
    n = int(dur * SR)
    tt = np.linspace(0, 1, n)
    e = np.sin(tt * np.pi) ** .6
    return banda(ruido(n), 150, 1300) * e * (1 + .4 * np.sin(2 * np.pi * 19 * tt * dur))


def bisagra(dur=.5, f0=90, f1=230):
    n = int(dur * SR)
    fq = np.geomspace(f0, f1, n)
    e = np.sin(np.linspace(0, np.pi, n)) ** .8
    return np.sin(2 * np.pi * np.cumsum(fq) / SR) * e * .35 + banda(ruido(n), 200, 900) * e * .5


def latigo(dur=.34):
    """Giro seco de cámara."""
    return soplo(dur, 320, 3600, .55)


def zumbido(dur, f=52):
    """Miles de chips trabajando: un tono grave con grano."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = np.minimum(tt / .25, 1) * np.minimum((dur - tt) / .25, 1)
    return (np.sin(2 * np.pi * f * tt) * .6 + np.sin(2 * np.pi * f * 2.003 * tt) * .3 + banda(ruido(n), 2600, 8000) * .08) * e


def sube(dur, f0=70, f1=520):
    """Algo que crece sin parar."""
    n = int(dur * SR)
    fq = np.geomspace(f0, f1, n)
    e = np.linspace(.15, 1, n) ** 1.4 * np.minimum((n - np.arange(n)) / (.05 * SR), 1)
    return np.sin(2 * np.pi * np.cumsum(fq) / SR) * e * .5 + banda(ruido(n), 500, 4200) * e * .3


def aire_noche(dur):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = (.6 + .4 * np.sin(2 * np.pi * .13 * tt + .4)) * np.minimum(tt / .9, 1) * np.minimum((dur - tt) / .5, 1)
    return banda(ruido(n), 90, 700) * e


# ---------- las letras ----------
for s, f, p in ((t["g1"], 66, -.25), (t["g2"], 72, .1), (t["g3"], 58, -.08)):
    m.pon(s - .2, soplo(.2, 260, 2400, .9), .16, p)
    cae_bloque(s, .92 if s == t["g3"] else .8, p, f)
m.pon(t["ycasi"] + .05, rozar(t["signif"] + .25 - t["ycasi"]), .07)
# La G: se levanta y escupe hojas.
m.pon(t["laG"] - .16, latigo(), .3, -.3)
m.pon(t["G"] + .1, bisagra(.62, 80, 210), .3, -.2)
m.pon(t["G"] + .72, golpe(92, 44, .3, .3), .36, -.4)
for i in range(3):
    m.pon(t["gen_e"] - .25 + i * .2, hoja_papel(.14, 1), .09, -.3 + i * .3)
for i in range(15):
    s = t["prod"] - .2 + i * .09 + rng.random() * .05
    m.pon(s, hoja_papel(.12, 1), .07 + rng.random() * .05, rng.uniform(-.8, .8))
m.pon(t["prod"] - .22, soplo(1.5, 400, 4200, .4), .08)
# La P: se abre y se lo traga todo.
m.pon(t["laP"] - .16, latigo(), .3, .3)
m.pon(t["P"] + .05, bisagra(.56, 80, 230), .3, -.2)
m.pon(t["P"] + .62, golpe(88, 42, .3, .3), .34, -.4)
d_ = t["antesde"] + .15 - t["ya"]
for i in range(130):
    m.pon(t["ya"] - .35 + d_ * (i / 130) ** .72 + .5, hoja_papel(.05, 1), .022 + rng.random() * .03, rng.uniform(-.9, .9))
m.pon(t["ya"] - .2, soplo(d_ + .75, 180, 2600, .78), .14)
m.pon(t["contigo"] - .4, trazo(.5, 300, 520), .1)
m.pon(t["contigo"] + .2, toc(620), .3); m.pon(t["contigo"] + .34, toc(620), .12)
# La T: se pone de pie, y lleva nombre.
m.pon(t["yla"] - .14, latigo(), .3, 0)
d_ = t["paraT"] - (t["imp"] - .3)
m.pon(t["imp"] - .3, bisagra(d_, 44, 120), .42)
m.pon(t["imp"] - .3, sube(d_ + .02, 60, 200), .12)
cae_bloque(t["paraT"], 1.15, 0, 52)
for i in range(30):
    m.pon(t["transf"] + .2 + i * .04, tic(.02, 2200, 5600), .1, rng.uniform(-.2, .2))
m.pon(t["transf"] + .1, campana((392, 587.3, 880), 1.8, (.7, .4, .2)), .22)

# ---------- la lectura vieja ----------
for k in range(6):
    m.pon(t["redes"] + (k * np.pi) / 5.5, toc(300), .24 * np.exp(-k * .45), -.7)
for i, (s, du) in enumerate(t["saltos"]):
    m.pon(s + du, toc(300 + i * 18), .42, -.5 + i * .25)
    m.pon(s + du, golpe(120, 62, .14, .2), .28, -.5 + i * .25)
    if i < 4:
        d2 = .75
        m.pon(s + du + .42, banda(ruido(int(d2 * SR)), 2600, 9000) * np.linspace(.9, 0, int(d2 * SR)) ** 2, .06, -.5 + i * .25)
# Se recupera entera, y cae la T.
m.pon(t["lee"] - .1, polvo(t["compl"] + .1 - t["lee"] + .1), .5)
d_ = t["golpeT"] - t["frase"]
m.pon(t["frase"], np.sin(2 * np.pi * 42 * np.arange(int(d_ * SR)) / SR) * np.linspace(0, 1, int(d_ * SR)) ** 2.2, .34)
m.pon(t["caeT"] - .02, soplo(.3, 160, 2200, .92), .22)
s = t["golpeT"]
m.pon(s, golpe(58, 22, 1.7, .6), 1.45)
m.pon(s, banda(ruido(int(.26 * SR)), 900, 7000) * np.exp(-np.arange(int(.26 * SR)) / SR * 18), .66)
m.pon(s, cola(toc(180), 1.9, .44), .4)
m.pon(s + .62, soplo(.54, 400, 3000, .3), .3)

# ---------- la torre ----------
m.pon(t["vuelve"], trazo(t["punto"] + .2 - t["vuelve"], 240, 600), .1)
for k in range(5):
    m.pon(t["punto"] + .14 + k * .05, toc(380 + k * 60), .3, -.5 + k * .25)
m.pon(t["pasa"] - .1, hoja_papel(.28, .8), .34)
m.pon(t["aten"] + .18, clac(), .46)
m.pon(t["cada"] - .1, trazo(.9, 300, 760), .13)
m.pon(t["mira"], trazo(.8, 420, 900), .1, .3)
for i in range(18):
    m.pon(t["cada"] + .2 + i * .09, tic(.02, 2600, 7000), .07, rng.uniform(-.5, .5))
for k in range(5):
    m.pon(t["yse"] + .12 + k * .03, toc(330 + 40 * k), .24, -.5 + k * .25)
m.pon(t["acom"] + .3, golpe(84, 40, .3, .1), .34)
m.pon(t["ysale"] + .05, soplo(1.3, 300, 2400, .6), .2)
m.pon(t["transfd"] + .1, campana((329.6, 493.9), 1.4, (.6, .3)), .14)
m.pon(t["yano"] - .25, soplo(1.0, 160, 900, .6), .1)
# A secas: seco, sin nada.
m.pon(t["perro1"] + .1, golpe(160, 90, .12, .2), .22)
# Este perro: los hilos se tensan y la bola se llena.
s = t["este"]
m.pon(s - .2, soplo(.32, 300, 3000, .9), .34)
m.pon(s + .1, golpe(64, 30, .9, .3), .55)
m.pon(s + .1, campana((440, 659.3, 880), 2.0, (.8, .4, .2)), .2)
for i in range(26):
    m.pon(s + .08 + i * .018, toc(rng.uniform(900, 1900)), .08, rng.uniform(-.7, .7))
m.pon(t["enesta"] - .05, trazo(t["frase2_e"] + .2 - t["enesta"], 360, 720), .13)
m.pon(t["entonces"] - .25, latigo(.42), .4)
for s, fq in ((t["pasa2"] - .1, 0), (t["yotra"] - .1, 1)):
    m.pon(s, hoja_papel(.2, .8), .3)
m.pon(t["capa"] + .05, clac(), .46); m.pon(t["otra2_e"] - .05, clac(), .46)
m.pon(t["capa"] + .1, trazo(.36, 420, 900), .1); m.pon(t["otra2_e"], trazo(.3, 460, 980), .1)
# Decenas de capas: se apilan como una baraja.
a_ = t["decenas"] - .1
for i in range(32):
    s = a_ + i / 31 * 1.5
    m.pon(s, clac(.7 + rng.random() * .3), max(.2 - i * .004, .08), rng.uniform(-.3, .3))
m.pon(a_, soplo(2.3, 220, 2600, .6), .08)
m.pon(t["capas"], sube(t["anterior"] + .2 - t["capas"], 90, 640), .07)
for i in range(30):
    m.pon(t["capas"] + i * .1, toc(500 + i * 26), .05, rng.uniform(-.3, .3))
m.pon(t["afina"] + .1, campana((659.3, 987.8), 1.5, (.5, .25)), .12)

# Todo a la vez: un solo pulso, tres veces.
for s in (t["como"] + .02, t["mismo"], t["mismo"] + .17, t["tiempo"]):
    m.pon(s, golpe(72, 36, .4, .2), .36); m.pon(s, cola(toc(300), .8, .3), .1)
    for i in range(10):
        m.pon(s, toc(rng.uniform(700, 1700)), .05, rng.uniform(-.8, .8))
# Se reparte: lluvia de fichas que aterrizan.
vuela = t["repartir"] - .5
m.pon(vuela - .02, soplo(.5, 300, 4200, .7), .2)
d_ = .92
m.pon(vuela + .2, lluvia(d_, 240) * np.linspace(.6, 1.2, int(d_ * SR)), .17)
s = t["miles"]
m.pon(s - .1, latigo(.5), .13)
m.pon(s, golpe(50, 26, 1.3, .1), .36)
fin_z = t["yeso"]
m.pon(s, zumbido(fin_z - s, 49), .17)
for b in (s, t["chips"] + .03, t["chips"] + .36, t["por"] + .02, t["pudo"], t["crecer"], t["tanto"]):
    m.pon(b, tic(.03, 3000, 9000), .12); m.pon(b, golpe(76, 38, .3, .1), .3)
# Crece sin parar y se corta en seco.
d_ = t["yeso"] - t["pudo"] + .15
m.pon(t["pudo"] - .15, banda(ruido(int(d_ * SR)), 180, 1500) * np.linspace(.1, 1, int(d_ * SR)) ** 1.6 * np.minimum((int(d_ * SR) - np.arange(int(d_ * SR))) / (.05 * SR), 1), .12)
for i in range(46):
    s = t["pudo"] - .2 + (i / 46) ** .85 * 1.45
    m.pon(s, clac(.8), .1, rng.uniform(-.3, .3))

# ---------- el corte ----------
c_ = t["yeso"]
m.pon(c_ - .02, golpe(44, 22, 2.0, .05), .85)
m.pon(c_ + .1, aire_noche(t["neu"] - c_ - .1), .12)
for i, (ini, fija, tacha, cae, cierra, p) in enumerate(((t["no1"] - .05, t["modulo"] + .1, t["gram"] + .06, t["gram_e"] + .02, t["gram_e"] + .3, 1), (t["no2"] - .12, t["otro"] + .1, t["logica"] + .02, t["logica_e"] + .02, t["logica_e"] + .3, -1))):
    m.pon(ini, rozar(fija - ini + .15), .16, p * .6)
    m.pon(fija, golpe(120, 52, .3, .4), .55, p * .2)
    m.pon(tacha, trazo(.22, 700, 1300), .22)
    m.pon(tacha, tic(.05, 900, 3000), .3)
    m.pon(cae, soplo(.8, 180, 1100, .3), .18, p * .4)
    m.pon(cierra - .02, clac(), .8); m.pon(cierra - .02, golpe(60, 30, .4, .1), .4)
    m.pon(cae + .92, golpe(70, 30, .5, .1), .2, p * .7)

# ---------- la marea de luz ----------
s = t["neu"] - .3
m.pon(s, soplo(.8, 200, 3200, .8), .2)
m.pon(t["neu"] + .32, golpe(58, 30, 1.0, .2), .3)
m.pon(t["neu"] + .2, bisagra(.56, 90, 220), .22)
for k in range(5):
    m.pon(t["neu"] + .42 + k * .05, toc(360 + 50 * k), .3, -.5 + k * .25)
    m.pon(t["pesos"] + .16 + k * .05, tic(.02, 1400, 4400), .3, -.5 + k * .25)
    m.pon(t["pesos"] + .18 + k * .05, toc(900), .12, -.5 + k * .25)
m.pon(t["aten2"], trazo(.6, 360, 840), .16)
s = t["apil"] - .02
m.pon(s + .24, clac(1.2), .34); m.pon(s + .24, golpe(64, 32, .6, .1), .34)
for k in range(6):
    m.pon(t["apil"] + k * .085 + .2, clac(.9), .2, rng.uniform(-.2, .2))
m.pon(t["unat"] - .2, soplo(1.6, 200, 1500, .5), .16)
# La onda baja por la pila como por una baraja: hoja tras hoja, misma que la anterior.
for s0, du, g, pan_ in ((t["unat"] - .15, 1.5, .05, -.3), (t["repe"] - .08, .95, .1, .25), (t["repe"] + .5, .95, .085, -.25)):
    for i in range(38):
        m.pon(s0 + du * i / 38, clac(.6), g, pan_ * (1 - 2 * i / 38))

# ---------- sale por arriba ----------
d_ = t["sale2"] - t["ydeesa"] - .15
m.pon(t["ydeesa"] - .32, soplo(.5, 180, 1600, .7), .16)
m.pon(t["ydeesa"] + .15, soplo(d_, 200, 3000, .94), .2)
n_ = 44
for i in range(n_):                                                     # cada hoja que pasa frente a la cámara
    m.pon(t["ydeesa"] + .15 + d_ * ((i + 1) / n_) ** (1 / 1.5), hoja_papel(.03, 1), .05, rng.uniform(-.3, .3))
s = t["sale2"] - .06
m.pon(s, golpe(90, 40, .5, .3), .7); m.pon(s, cola(toc(520), 1.4, .4), .3)
m.pon(t["lista"] - .14, soplo(.36, 500, 3600, .6), .22)
d_ = .5
m.pon(t["lista"] - .02, banda(ruido(int(d_ * SR)), 900, 6000) * np.sin(np.linspace(0, np.pi, int(d_ * SR))) ** .7, .3)
m.pon(t["lista"] + .44, golpe(100, 46, .3, .3), .46, -.4); m.pon(t["lista"] + .46, golpe(100, 46, .3, .3), .46, .4)
for s in (t["qua"], t["pal"], t["pod"]):
    m.pon(s + .02, toc(640), .3); m.pon(s + .04, trazo(.4, 340, 620), .09)
# La bola cae en el hueco y sus rebotes se apagan con todo lo demás.
sl = t["seg"] - .1
m.pon(sl, soplo(.34, 500, 3000, .7), .18)
for k, s in enumerate(rebotes(sl + .36, 5, .42, 60)):
    m.pon(s, golpe(104, 48, .34, .22), .8 * .46 ** k)
m.pon(sl + .36 + np.sqrt(2 * 5 / 60), campana((329.6, 493.9, 659.3), 3.0, (.8, .4, .2)), .24)
# La tinta baja por la torre y cierra la letra.
ink = t["seg"] + .62
d_ = 1.35
m.pon(ink, soplo(d_ + .1, 120, 900, .8), .12)
m.pon(ink + d_ + .02, golpe(52, 26, 1.4, .2), .6)

# ---------- el arranque: chocan, vuelan y dicen que no ----------
# Va al último a propósito: rng es compartido y así el resto de la mezcla conserva el mismo ruido.
def toque(tt, f, g=1.0, pan=0.0):
    """Madera contra madera: corto y agudo para no pisar la palabra que cae encima."""
    m.pon(tt, cola(toc(f), .5, .25), .3 * g, pan)
    m.pon(tt, golpe(150, 74, .13, .3), .2 * g, pan)


toque(t["son"], 300, 1, -.05)                                          # la T golpea a la P
toque(t["tres"], 350, 1, .05)                                          # la P golpea a la G
m.pon(t["tres"] + .03, soplo(.58, 300, 2600, .5), .08, -.15)            # la G vuela y gira
m.pon(t["letras"] + .03, soplo(.6, 200, 1900, .5), .09, .1)             # la T da la vuelta
m.pon(t["letras"] + .05, bisagra(.7, 160, 420), .07, .2)                # la P gira como moneda
cae_bloque(t["bajaG"], .34, -.2, 88)
cae_bloque(t["bajaT"], .46, .05, 72)
m.pon(t["bajaP"], golpe(120, 58, .22, .3), .22, .1)
for i in range(3):
    m.pon(t["ycasi"] + .02 + i * .12, bisagra(.3, 110, 240), .07, -.2 + i * .2)
d_ = t["sabe"] - t["nadie"] + .1
m.pon(t["nadie"], rozar(d_), .05)
m.pon(t["asienta"], golpe(92, 44, .3, .26), .3)

# ---------- música ----------
corte = t["yeso"]
vuelve = t["neu"] - .3
m.musica([("c10_torre", 5, 0, corte, .02, .02),
          ("c10_torre", 62, vuelve, m.dur, .7, 2.7)], nivel=-26.5)
m.cierra()
