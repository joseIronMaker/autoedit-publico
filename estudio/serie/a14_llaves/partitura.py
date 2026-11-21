"""a14: las llaves. La mesa de la serie con tres cosas de papel encima: un buzón (lo que entra de extraños), un
fichero (tus contactos) y una puerta (la salida). Una mano blanca, la tuya, le da a la bola un llavero; cada llave
abre una cosa. Con las tres a la vez se cierra un lazo rojo y el papelito de un extraño se lleva la tarjeta de
mamá por la puerta. Luego suben las barandillas, y al final se forman en fila con sus huecos en distintos sitios:
la última es tu mano, que aprueba cada paso hasta que le pone cinta al «sí».

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"la trifecta letal": .35, "primera": .25, "con una o dos": .55, "con las tres": .75, "tu agente lee": .9,
          "por eso existen": .35, "y lo más simple": .3, "ninguna barandilla": .45, "y hay una trampa": .7,
          "la seguridad no": .55, "se rompe cuando te": .35}
m = Mezcla("a14_llaves", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e


# ---------- inicios reales de la voz: Whisper estira la primera palabra sobre el silencio ----------
crudo = lee(m.dir / "_voz_larga.wav").mean(axis=1)
_v = int(.02 * SR)
_niv = 20 * np.log10(np.sqrt(np.convolve(crudo ** 2, np.ones(_v) / _v, "same")) + 1e-9)
_sil = _niv < -42
TR, _ini = [], None
for k in range(0, len(_sil), 240):
    if not _sil[k] and _ini is None:
        _ini = k
    if _sil[k] and _ini is not None:
        j = k
        while j < len(_sil) and _sil[j] and j - k < int(.1 * SR):
            j += 240
        if j - k >= int(.1 * SR):
            TR.append((_ini / SR, k / SR))
            _ini = None


def arr(f, desde=0):
    """Arranque real del tramo de voz que contiene la palabra."""
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - c))[0]


r3 = lambda x: round(x, 3)

# ---------- el guion de acciones ----------
E = {}
# 1. Confianza no, llaves sí
E["brincos"] = [.5, 1.15, 1.8]                   # la bola brinca por el corazón
E["tacha"] = e("confianza") - .12
E["suelta"] = e("confianza") - .05
E["cuelga"] = s("le das llaves") + .02
E["cae"] = s("llaves") - .02                       # el llavero sale de la mano blanca
E["aterriza"] = E["cae"] + .2                      # y cae en la palma de la bola
E["abanico"] = [r3(s("tres llaves") + k * .13) for k in range(3)]
E["juntas"] = s("juntas") + .05
E["sube"] = s("el investigador") - .2              # la cámara sube y enseña la mesa
E["nombre"] = s("simon")
E["trifecta"] = s("trifecta")
# 2. Las tres llaves, una por una
E["k1"] = s("acceso") + .02
E["cajon"] = E["k1"] + .12
E["mama"] = s("datos privados") + .2
E["k2"] = s("contacto con") - .05
E["tapa"] = E["k2"] + .14
E["sobres"] = [r3(s("contenido") - .05), r3(s("de extraños") + .12), r3(s("extraños") + .3)]
E["toss"] = [r3(E["k2"] - .8), r3(E["k2"] + .75)]   # el llavero pasa a la otra mano y regresa
E["k3"] = s("una forma") - .15
E["puerta"] = E["k3"] + .14
E["avion"] = s("mandar") - .05
# 3. Con una o dos no pasa nada; con las tres se cierra el lazo
E["quita"] = e("afuera") + .12
E["cierra"] = arr("con una o dos") - .1
E["sobre1"] = s("una o dos") + .12
E["agarra1"] = s("el riesgo") + .1
E["choca"] = s("manejable") + .1
E["devuelve"] = arr("con las tres") - .02
E["abre2"] = s("tres", T("con las").i) - .02
E["lazo"] = E["abre2"] + .25
E["sobre2"] = s("un simple texto") - .1
E["lee2"] = s("texto") + .05
E["agarra2"] = s("sacar") + .1
E["sale"] = s("tus datos", T("sacar").i) + .05
# 4. Tu agente ya las tiene
E["lee"] = s("lee tus") - .05
E["etqC"] = s("contactos")
E["recibe"] = [r3(s("recibe") - .05), r3(s("correos") + .1), r3(s("desconocidos") + .1)]
E["etqB"] = s("correos")
E["envia"] = s("enviar") - .05
E["etqP"] = s("mensajes")
E["tres"] = s("las tres", T("ahí están").i)
# 5. Las barandillas
E["barandas"] = s("existen") - .05
E["barandasF"] = s("barandillas") + .3
E["filtroE"] = s("filtros") - .08
E["sobreE"] = s("revisan") + .05
E["choqueE"] = s("entra") - .05
E["filtroS"] = e("entra") + .02
E["tarjetaS"] = s("lo que sale") - .15
E["choqueS"] = s("sale", T("lo que sale").i) + .02
E["calendario"] = s("permisos") - .02
E["ver"] = s("ver") - .05
E["palomita"] = s("calendario") + .1
E["goma"] = s("pero no borrarlo") - .05
E["candado"] = s("borrarlo") + .05
E["caja"] = s("caja cerrada") + .1
E["tinta"] = s("sale mal") - .12
E["sandbox"] = s("no salga") + .05
E["levanta"] = arr("y lo más simple") - .1
E["pago"] = s("pagar") - .05
E["mano"] = s("pregúntame") - .25
# 6. En fila
E["giro"] = s("ninguna barandilla") - .35
E["capas"] = [r3(s("ninguna barandilla") + .1), r3(s("ponen") - .05), r3(s("una tras otra") + .02), r3(s("otra", T("una tras").i) - .02)]
E["huecos"] = [r3(s("perfecta") - .12 + k * .13) for k in range(3)]
V, Y0 = 4.5, -1.1                                 # velocidad de los papelitos y de dónde salen
YC = [-.6, .6, 1.8, 3.0]                           # las cuatro capas, de la bola a la puerta
YPUERTA = 3.75
def choque(tl, i): return r3(tl + (YC[i] - Y0) / V)
L = {"a0": s("es perfecta") - .55, "a": s("una tras otra") - .5, "b": e("otra", T("una tras").i) - .45, "c": e("otra", T("una tras").i) + .15}
E["lanza"] = {k: r3(v) for k, v in L.items()}
E["pasa_a0"] = [choque(L["a0"], 0), r3(L["a0"] + (YPUERTA - Y0) / V)]
E["topa"] = {"a": choque(L["a"], 1), "b": choque(L["b"], 2), "c": choque(L["c"], 3)}
E["no"] = E["topa"]["c"] - .2
# 7. La trampa humana
E["trampa"] = arr("y hay una trampa")
E["anthropic"] = s("anthropic")
SI = [s("midió") + .4, s("experiencia") - .02, s("experiencia") + .45, s("la gente") + .08, s("deja") + .02, s("aprobar") + .08]
E["si"] = [r3(x) for x in SI]
E["doble"] = s("doble")
E["cinta"] = s("solo") - .02                          # la cinta cae sobre el «sí» al decir «solo»
# 8. Cierre
E["seguridad"] = arr("la seguridad no")
E["falla"] = s("el agente falla") - .2
E["topaF"] = choque(E["falla"], 1)
E["final"] = s("se rompe cuando te") + .05
E["pasaF"] = [choque(E["final"], i) for i in range(4)] + [r3(E["final"] + (YPUERTA - Y0) / V)]
E["cansas"] = s("cansas")
E["fin"] = e("revisarlo")
E["remate"] = E["fin"] + .35
(RAIZ / "remotion/src/serie/a14/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, float) else v) for k, v in E.items()}), encoding="utf-8")


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def ping(f, dur=.5, amp=1.0):
    t = np.arange(int(dur * SR)) / SR
    p = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (9 + 6 * k)) for k, a in ((1, 1), (2.76, .5), (5.4, .25)))
    return p * np.minimum(t / .002, 1) * amp


def llavero(n=6, dur=.32, base=2600):
    """Llaves de metal chocando: pings inarmónicos sueltos en un tercio de segundo."""
    y = np.zeros(int((dur + .5) * SR))
    for _ in range(n):
        i = int(rng.random() * dur * SR)
        p = ping(base * rng.uniform(.8, 1.7), .45, rng.uniform(.25, 1))
        y[i:i + len(p)] += p[: len(y) - i]
    t = tic(.02, 3000, 9000)
    y[: len(t)] += t * .6
    return y


def cerrojo():
    a = tic(.02, 1500, 6000)
    y = np.zeros(int(.25 * SR))
    y[: len(a)] += a
    b = suma(toc(310) * .8, tic(.025, 800, 3000) * .5)
    i = int(.09 * SR)
    y[i:i + len(b)] += b
    return y


def cajon(dur=.5):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = banda(ruido(n), 140, 900) * np.sin(np.pi * t) ** .7 * .6
    g = golpe(150, 80, .18, .4) * .5
    x[-len(g) // 3:] += g[: len(x[-len(g) // 3:])]
    return x


def bisagra(dur=.7):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 200 + 60 * np.sin(t * 9) + 80 * t
    s_ = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3 + np.sin(2 * np.pi * np.cumsum(f * 2.02) / SR) * .2
    e_ = np.sin(np.linspace(0, np.pi, n)) ** 1.5 * (.6 + .4 * np.sin(t * 37))
    return banda(s_ * e_, 300, 3000)


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def sello():
    return golpe(150, 70, .22, .9)


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def boton():
    y = toc(980) * .6
    t = tic(.015, 2500, 8000)
    y[: len(t)] += t
    return y


def cinta(dur=.38):
    """Cinta adhesiva arrancada: ruido a pedazos."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    craq = (np.sin(2 * np.pi * (60 + 140 * t / dur) * t) > .3).astype(float)
    return banda(ruido(n), 900, 8000) * craq * np.sin(np.pi * t / dur) ** .4 * .8


def splat():
    return suma(banda(ruido(int(.16 * SR)), 200, 2400) * np.exp(-np.arange(int(.16 * SR)) / SR * 30), golpe(120, 70, .12, .2) * .3)


# ---------- 1. confianza no, llaves sí ----------
m.pon(0.0, soplo(1.4, 300, 2200, .7), .14)                       # la mano blanca ya viene entrando
m.pon(.05, trazo(1.3, 300, 520), .05)
for t in E["brincos"]:
    m.pon(t + .5, golpe(118, 58, .22, .25), .32)
    m.pon(t + .02, soplo(.25, 500, 2400, .4), .06)
m.pon(E["tacha"], trazo(.25, 900, 1600), .16)
m.pon(E["tacha"], tic(.03, 1800, 6000), .3)
m.pon(E["suelta"], soplo(.9, 900, 4000, .25), .12)              # el corazón de papel se va al suelo
m.pon(E["cuelga"], llavero(5, .25, 2900), .2)
m.pon(E["aterriza"], llavero(8, .28, 2500), .55)
m.pon(E["aterriza"], golpe(110, 60, .25, .3), .4)
for i, t in enumerate(E["abanico"]):
    m.pon(t, ping(2200 + i * 520, .6), .22)
m.pon(E["juntas"], llavero(7, .2, 2700), .45)
m.pon(E["sube"], soplo(1.8, 200, 1600, .55), .16)
m.pon(E["nombre"], trazo(.8, 380, 620), .07)
m.pon(E["trifecta"], campana((220, 330, 440), 1.6, (.6, .3, .15)), .2)
m.pon(E["trifecta"] - .05, golpe(60, 32, .8, .05), .45)
# ---------- 2. cada llave abre una cosa ----------
for k, lugar in (("k1", "cajon"), ("k2", "tapa"), ("k3", "puerta")):
    m.pon(E[k] - .35, soplo(.4, 400, 2600, .5), .1)              # el brazo se estira
    m.pon(E[k] - .05, llavero(3, .12, 3100), .22)
    m.pon(E[k], cerrojo(), .7)
for t in E["toss"]:
    m.pon(t, soplo(.3, 800, 3600, .5), .12)
    m.pon(t + .3, llavero(5, .14, 2900), .4)
m.pon(E["cajon"], cajon(.55), .6)
m.pon(E["mama"], papel(.2), .4)
m.pon(E["mama"], ping(1568, .4), .08)
m.pon(E["tapa"], toc(380), .45)
for t in E["sobres"]:
    m.pon(t, papel(.26), .55)
    m.pon(t + .22, tic(.03, 1200, 4000), .3)
m.pon(E["puerta"], bisagra(.75), .25)
m.pon(E["puerta"] + .1, soplo(1.0, 1200, 7000, .3), .12)        # entra la luz de afuera
m.pon(E["avion"], soplo(.8, 900, 5200, .2), .3)
# ---------- 3. el lazo ----------
m.pon(E["quita"], llavero(4, .2, 3000), .3)
m.pon(E["cierra"], golpe(70, 36, .55, .5), .75)
m.pon(E["cierra"], toc(260), .3)
m.pon(E["sobre1"], papel(.3), .5)
m.pon(E["agarra1"], papel(.18), .35)
m.pon(E["choca"], golpe(140, 70, .3, .5), .5)
m.pon(E["choca"] + .15, tic(.03, 900, 3000), .2)
m.pon(E["devuelve"], llavero(6, .2, 2800), .45)
m.pon(E["abre2"], cerrojo(), .55)
m.pon(E["abre2"] + .06, bisagra(.6), .22)
m.pon(E["lazo"], trazo(1.0, 220, 880), .32)
m.pon(E["lazo"] + .95, campana((440, 660, 880), 1.2, (.5, .25, .12)), .14)
m.pon(E["sobre2"], papel(.3), .55)
m.pon(E["lee2"], soplo(.45, 600, 3600, .4), .22)
m.pon(E["agarra2"], papel(.16), .5)
m.pon(E["sale"], soplo(1.3, 500, 4800, .25), .4)
m.pon(E["sale"] + .3, campana((392, 466, 587), 1.4, (.4, .25, .1)), .12)
# ---------- 4. tu agente ----------
m.pon(E["lee"], cajon(.4), .35)
m.pon(E["lee"] + .4, papel(.18), .35)
m.pon(E["etqC"], tic(.03, 1200, 5000), .25)
for t in E["recibe"]:
    m.pon(t, papel(.24), .45)
m.pon(E["etqB"], tic(.03, 1200, 5000), .25)
m.pon(E["envia"], soplo(.75, 900, 5600, .2), .3)
m.pon(E["etqP"], tic(.03, 1200, 5000), .25)
m.pon(E["tres"] - .25, trazo(.6, 300, 900), .22)
m.pon(E["tres"], llavero(8, .2, 2600), .5)
m.pon(E["tres"], golpe(64, 34, .6, .2), .55)
# ---------- 5. barandillas ----------
POSTES = 22
for k in range(POSTES):
    m.pon(E["barandas"] + k * (E["barandasF"] - E["barandas"]) / POSTES, toc(520 + 20 * (k % 5)), .14)
m.pon(E["barandasF"], golpe(90, 50, .3, .2), .3)
m.pon(E["filtroE"], pop(), .5)
m.pon(E["sobreE"], papel(.3), .45)
m.pon(E["choqueE"], golpe(160, 80, .2, .6), .45)
m.pon(E["choqueE"] + .12, sello(), .55)
m.pon(E["filtroS"], pop(), .45)
m.pon(E["tarjetaS"], soplo(.45, 900, 4200, .4), .25)
m.pon(E["choqueS"], golpe(160, 80, .2, .6), .45)
m.pon(E["choqueS"] + .12, sello(), .55)
m.pon(E["calendario"], pop(), .45)
m.pon(E["ver"], trazo(.5, 500, 760), .08)
m.pon(E["palomita"], trazo(.22, 700, 1300), .2)
m.pon(E["goma"], soplo(.4, 500, 2200, .7), .2)
m.pon(E["candado"], cerrojo(), .55)
m.pon(E["candado"] + .08, toc(330), .4)
m.pon(E["caja"], golpe(84, 42, .6, .3), .8)
m.pon(E["caja"], campana((2093, 3136, 4186), .7, (.4, .25, .12)), .1)
m.pon(E["caja"] - .3, soplo(.35, 300, 1800, .9), .2)
m.pon(E["tinta"], golpe(260, 140, .1, .2), .3)
for k in range(5):
    m.pon(E["tinta"] + .12 + k * .09, splat(), .4)
m.pon(E["sandbox"], tic(.03, 1500, 6000), .25)
m.pon(E["levanta"], soplo(.6, 300, 2400, .3), .2)
m.pon(E["pago"] - .3, ping(1318, .4), .12)
m.pon(E["pago"], pop(), .5)
m.pon(E["mano"], soplo(.8, 300, 2000, .5), .12)
# ---------- 6. en fila ----------
m.pon(E["giro"], soplo(1.1, 200, 2000, .55), .2)
for t in E["capas"]:
    m.pon(t, pop(), .55)
    m.pon(t + .08, golpe(120, 60, .2, .2), .3)
for t in E["huecos"]:
    m.pon(t, suma(tic(.025, 1200, 5000), toc(700) * .5), .45)
for k in ("a0", "a", "b", "c"):
    m.pon(E["lanza"][k], papel(.22), .4)
for t in E["pasa_a0"]:
    m.pon(t, soplo(.25, 1500, 6000, .3), .2)
for k, t in E["topa"].items():
    m.pon(t, golpe(150, 75, .22, .55), .5)
m.pon(E["no"], boton(), .55)
# ---------- 7. la trampa humana ----------
m.pon(E["anthropic"], trazo(.5, 420, 640), .07)
for i, t in enumerate(E["si"]):
    m.pon(t - .2, papel(.16), .25)
    m.pon(t, boton(), .62 - i * .03)
    m.pon(t + .05, toc(200), .25)
m.pon(E["doble"], golpe(66, 34, .5, .1), .35)
m.pon(E["cinta"] - .25, cinta(.3), .5)
m.pon(E["cinta"], golpe(180, 90, .12, .5), .55)
m.pon(E["cinta"] + .15, bisagra(.5), .2)
for k in range(4):
    m.pon(E["cinta"] + .5 + k * .3, papel(.14), .2)
# ---------- 8. cierre ----------
m.pon(E["falla"], papel(.2), .35)
m.pon(E["topaF"], golpe(150, 75, .22, .55), .5)
m.pon(E["final"], papel(.22), .4)
for t in E["pasaF"][:-1]:
    m.pon(t, soplo(.22, 1500, 6000, .3), .22)
m.pon(E["pasaF"][-1], soplo(1.2, 600, 5000, .2), .3)
m.pon(E["remate"], cinta(.2), .25)
m.pon(E["remate"] + .05, campana((130.8, 196, 261.6), 2.6, (.8, .4, .2)), .32)

# ---------- música: se va con la trampa y regresa para cerrar ----------
corte = E["trampa"] - .05
vuelve = E["seguridad"] - .15
m.musica([("a14_llaves", 15.95, 0, corte, .02, .3), ("a14_llaves", 52.0, vuelve, m.dur, .5, 2.6)])
m.cierra()
print({k: v for k, v in E.items()})
