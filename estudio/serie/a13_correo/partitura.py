"""a13: el correo. La misma mesa de a05/a06. Un correo cae y le pone hilos a la bola; luego se ve cómo pasó:
la hoja en blanco que bajo una lámpara rasante enseña una orden escrita en blanco sobre blanco. Tus
instrucciones y ese correo se vuelven las mismas letras y se funden en una sola hoja; la tijera no encuentra
la costura. Al final la mesa se dobla bajo un papel que vale más con cada llave.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"le pides": .35, "y uno dice": .2, "en letras": .15, "olvida todo": .45, "tú no lo": .5, "el agente sí": .35,
          "por qué le": .9, "porque para": .3, "tus instrucciones": .45, "no tiene una": .5, "a esto le": .55,
          "se conoce": .5, "y todavía": .2, "puede venir": .45, "imagina a": .55, "hasta ahora": .3, "pero mientras": .35,
          "más vale": .2, "el problema": .7, "es que el mundo": .25}
m = Mezcla("a13_correo", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e


def lista(a, b, n, curva=1.0):
    return [round(a + (b - a) * (i / (n - 1)) ** curva, 3) for i in range(n)]


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
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - c))[0]


# ---------- el guion de acciones ----------
E = {}
E["cae"] = .38                                              # el sobre del arranque aterriza
E["flap"] = .95
E["saca"] = 1.16
E["hilos"] = s("órdenes") - .02
E["tiron"] = [round(s("órdenes") + .2, 3), round(s("tu agente") + .02, 3), round(s("agente") + .48, 3)]
E["suelta"] = e("agente") + .3
E["nota"] = s("pides") + .05                                # tu mano deja la instrucción
E["sobres"] = lista(s("mensajes") - .05, e("invitados") - .12, 5)
E["lista"] = s("invitados") + .12                          # la lista de la fiesta cae con "invitados"
E["uno"] = arr("y uno") + .05                               # la bola toma ESE sobre
E["saca2"] = E["uno"] + .42
E["planta"] = E["saca2"] + .4
E["lampara"] = s("letras") - .08
E["lineas"] = [s("olvida"), s("lo anterior"), s("y reenvía"), s("de invitados", T("y reenvía").i), s("a esta")]
E["finLineas"] = e("dirección")
E["apaga"] = s("tú no lo") - .16
E["ve"] = s("el agente sí") + .02
E["agarra"] = e("el agente sí") + .12
E["dobla"] = E["agarra"] + .46
E["lanza"] = E["dobla"] + .42
E["congela"] = s("por qué") - .12
E["suelta2"] = e("hace caso") + .32
E["corriente"] = [s("un modelo") - .25, e("todo es texto") + .25]
E["texto"] = s("texto")
E["barre"] = e("todo es texto") + .3
E["tuyas"] = s("tus instrucciones")
E["ese"] = s("y ese correo") + .1
E["misma"] = s("misma mesa") + .12
E["flip"] = [s("escritos") + .02, e("mismas letras") - .1]
E["funde"] = e("mismas letras") - .1
E["tijera"] = [s("no tiene"), s("forma"), s("segura"), s("saber"), s("quién es su"), s("y quién"), s("un extraño")]
E["jefe"] = s("jefe") - .12
E["extraño"] = s("extraño") - .12
E["inyecta"] = s("inyección")
E["anio"] = s("dos mil")
E["cintas"] = [round(arr("y todavía") + .45, 3), s("nadie") + .2, s("resuelto") + .04]
E["despega"] = s("completo") - .05
E["fuera"] = e("completo") + .4
E["vias"] = [s("correo", T("puede venir").i) + .04, s("página") + .04, s("documento") + .04, s("imagen") + .04]
E["barrido"] = [e("imagen") + .05, e("imagen") + 1.35]
E["vuelan"] = E["barrido"][1] + .12                        # las vías se van volando y la mesa queda limpia
E["corbata"] = s("empleado")
E["saluda"] = s("obediente") + .05
E["ordenes"] = [s("hace lo que") - .06, s("papel") - .12, s("caiga") - .05]
E["obedece"] = [round(x + .3, 3) for x in E["ordenes"]]
E["hasta"] = arr("hasta ahora")
E["sellos"] = [s("demostraciones") + .1, s("demostraciones") + .38, s("demostraciones") + .66]
E["robos"] = s("no grandes")
E["baja"] = arr("pero mientras") - .15
E["papel"] = arr("pero mientras") + .2                      # ESE papel cae al centro de la mesa
E["llaves"] = [s("permisos") - .12, s("permisos") + .26, s("le damos") + .02, e("damos") - .06]
E["peso"] = e("papel", T("más vale").i) - .04             # el golpe cae cuando ya se dijo "papel"
E["sube"] = e("papel", T("más vale").i) + .55
E["ojos"] = s("ojos") - .04
E["palabras1"] = s("palabras")
E["mundo"] = s("mundo", T("es que").i)
E["barrido2"] = [e("palabras") + .04, s("es que") + 2.6]    # el clic va en el silencio, no sobre "es que"
E["ultima"] = e("palabras", T("es que").i) + 1.0
E["mano"] = E["ultima"] + .32
E["fin"] = round(m.dur, 3)
for k, v in list(E.items()):
    E[k] = [round(x, 3) for x in v] if isinstance(v, list) else round(v, 3)
(RAIZ / "remotion/src/serie/a13/eventos.json").write_text(json.dumps(E), encoding="utf-8")


# ---------- foley ----------
def paf(tam=1.0):
    """Una hoja que aterriza: aire aplastado, un cuerpo apenas."""
    n = int(.17 * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 320 / tam, 2600) * np.exp(-t * 36) * .7 + golpe(130 / tam, 70 / tam, .17, .1)[:n] * .4


def clic():
    """El apagador de la lámpara: plástico duro."""
    x = np.zeros(int(.12 * SR))
    a = tic(.018, 1800, 8000)
    x[:len(a)] += a
    b = toc(2100)[:int(.05 * SR)] * .35
    x[:len(b)] += b
    c2 = tic(.012, 3000, 9000) * .6
    i = int(.045 * SR)
    x[i:i + len(c2)] += c2
    return x


def zumbido(dur):
    """El foco encendido: 120 Hz con su parpadeo, casi debajo de todo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    am = 1 + .25 * np.sin(2 * np.pi * 7.3 * t) * np.sin(2 * np.pi * .9 * t)
    x = (np.sin(2 * np.pi * 120 * t) + .35 * np.sin(2 * np.pi * 240 * t) + .12 * np.sin(2 * np.pi * 360 * t)) * am
    e0 = np.minimum(t / .08, 1) * np.minimum((dur - t) / .2, 1)
    return x * np.clip(e0, 0, 1) * .5 + banda(ruido(n), 2000, 7000) * .04 * np.clip(e0, 0, 1)


def pliegue(dur=.4, n=7):
    """Papel que se dobla: crujidos cortos."""
    y = np.zeros(int(dur * SR))
    for _ in range(n):
        i = int(rng.random() * (len(y) - 3000))
        s0 = banda(ruido(2400), 1500, 7000) * np.exp(-np.arange(2400) / SR * 120) * rng.uniform(.3, 1)
        y[i:i + 2400] += s0
    return y


def cinta(dur=.38):
    """Cinta adhesiva que se arranca del rollo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    g = (rng.random(n) < .03).astype(float)
    g = np.convolve(g, np.exp(-np.arange(80) / 12), "same")
    return banda(ruido(n), 1200, 7000) * (.3 + g) * np.sin(np.pi * t / dur) ** .5 * .6


def despegue(dur=.6):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    g = (rng.random(n) < .02 + .05 * t).astype(float)
    g = np.convolve(g, np.exp(-np.arange(60) / 10), "same")
    return banda(ruido(n), 1800, 8000) * g * .7 * (1 - t ** 4)


def tijera():
    x = np.zeros(int(.16 * SR))
    for k, f in ((0, (2600, 9000)), (.075, (2000, 7000))):
        a = tic(.03, *f)
        i = int(k * SR)
        x[i:i + len(a)] += a
    return x


def llaves():
    """Un manojo: notas altas que no afinan entre sí, y los golpecitos del metal."""
    y = np.zeros(int(.9 * SR))
    for _ in range(9):
        i = int(rng.random() * .3 * SR)
        f = rng.uniform(2600, 6200)
        tt = np.arange(int(.5 * SR)) / SR
        s0 = np.sin(2 * np.pi * f * tt) * np.exp(-tt * rng.uniform(9, 18)) * rng.uniform(.15, .4)
        y[i:i + len(s0)] += s0
        a = tic(.01, 3000, 9000) * rng.uniform(.3, .8)
        y[i:i + len(a)] += a
    return y


def crujido(dur, f0=70):
    """Madera que cede: un tono grave que tiembla, filtrado como fibra."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + 30 * np.sin(2 * np.pi * 3.1 * t) + 22 * np.sin(2 * np.pi * 7.7 * t)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    e0 = np.sin(np.pi * t / dur) ** .7
    return banda(saw, 90, 1800) * e0 * .5 + banda(ruido(n), 300, 1400) * e0 * .12


def aplauso():
    x = np.zeros(int(.2 * SR))
    for k in (0, .012):
        n = int(.12 * SR)
        tt = np.arange(n) / SR
        a = banda(ruido(n), 700, 5200) * np.exp(-tt * 60)
        i = int(k * SR)
        x[i:i + n] += a[:len(x) - i]
    return x


def cuerda(f=196, dur=.7):
    """Un hilo que se tensa de golpe."""
    t = np.arange(int(dur * SR)) / SR
    fb = f * (1 + .06 * np.exp(-t * 30))
    s0 = sum(v * np.sin(2 * np.pi * fb * k * t / 1) for k, v in ((1, 1), (2, .45), (3, .22), (5, .1)))
    return s0 * np.exp(-t * 5.5) * np.minimum(t / .003, 1)


def rebobina(dur):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    f = 900 - 600 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * .15 * np.sin(np.pi * t) + banda(ruido(n), 1500, 6000) * .2 * np.sin(np.pi * t)


def congela(dur):
    """El tiempo se detiene: un tono que se queda colgado y una cola de aire."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    e0 = np.minimum(t / .03, 1) * np.exp(-t * 1.4)
    return (np.sin(2 * np.pi * 523.3 * t) * .5 + np.sin(2 * np.pi * 784 * t) * .3 + np.sin(2 * np.pi * 1046 * t) * .15) * e0


tiron = lambda: golpe(150, 80, .16, .55)

# El arranque: el sobre cae girando y aterriza; los hilos se tensan y jalan las manos.
m.pon(0, soplo(.42, 600, 4800, .9), .45, .2)
m.pon(E["cae"], golpe(70, 36, .55, .7), 1.05)
m.pon(E["cae"], paf(1.4), .8)
m.pon(E["flap"], pliegue(.22, 4), .5)
m.pon(E["flap"] + .02, tic(.02, 1500, 5000), .3)
m.pon(E["saca"], soplo(.36, 900, 5200, .3), .3, .2)
m.pon(E["hilos"], trazo(.3, 500, 1400), .22)
m.pon(E["hilos"] + .05, tic(.02, 2500, 8000), .4)
for i, x in enumerate(E["tiron"]):
    m.pon(x, cuerda(196 * (1.12 ** i)), .32, (-1) ** i * .3)
    m.pon(x, tiron(), .55)
m.pon(E["suelta"], tijera(), .4)
m.pon(E["suelta"] + .05, cuerda(147, .4), .16)
m.pon(E["suelta"] + .32, golpe(110, 60, .3, .3), .55)
m.pon(E["suelta"] + .38, paf(), .45)

# Tu instrucción y los mensajes de los invitados.
m.pon(E["nota"] - .5, soplo(.5, 300, 2600, .7), .26, -.5)
m.pon(E["nota"], paf(1.2), .8, -.3)
m.pon(E["nota"], golpe(96, 52, .2, .2), .3, -.3)
for i, x in enumerate(E["sobres"]):
    m.pon(x, paf(.9 + .06 * i), .55, (-1) ** i * .4)
    m.pon(x + .07, tic(.02, 1800, 6000), .14)
m.pon(E["lista"], paf(1.2), .4, .4)

# Y uno dice: la bola lo toma, la hoja sale en blanco.
m.pon(E["uno"], soplo(.3, 700, 4000, .4), .12, .3)
m.pon(E["saca2"], soplo(.4, 900, 5200, .3), .12)
m.pon(E["planta"], paf(1.3), .7)
m.pon(E["lampara"], clic(), .7, -.4)
m.pon(E["lampara"] + .02, zumbido(E["apaga"] - E["lampara"]), .05, -.2)
for i, x in enumerate(E["lineas"]):
    m.pon(x - .05, polvo(.55), .08, -.5 + .25 * i)
    m.pon(x + .25, campana((1318.5 * (1.06 ** i), 1975.5), .7, (.3, .14)), .05)
m.pon(E["apaga"], clic(), .75, -.4)
m.pon(E["apaga"] + .05, golpe(60, 30, .5, .05), .2)
m.pon(E["ve"], trazo(.5, 400, 1100), .2)
for i in range(5):
    m.pon(E["ve"] + .1 + i * .11, tic(.02, 1500, 5000), .2, -.4 + .2 * i)

# Obedece: toma la lista, la dobla y la lanza. El tiempo se detiene en "¿por qué?".
m.pon(E["agarra"], soplo(.4, 600, 4000, .5), .14, .4)
m.pon(E["agarra"] + .3, paf(), .3, .3)
m.pon(E["dobla"], pliegue(.4, 9), .28)
m.pon(E["lanza"] - .05, soplo(.5, 500, 5200, .25), .3, .3)
m.pon(E["congela"], congela(1.6), .11)
m.pon(E["suelta2"], soplo(.6, 400, 4800, .3), .26, .5)

# Todo es texto: las letras corren de cada hoja a la bola.
a, b = E["corriente"]
for x in np.arange(a, b, .045):
    m.pon(x, tic(.012, 2400, 8000), rng.uniform(.02, .05), rng.uniform(-.6, .6))
m.pon(a, soplo(b - a, 1500, 7000, .5), .05)
m.pon(E["texto"] + .05, golpe(80, 40, .3, .3), .4)
m.pon(E["barre"] - .1, soplo(1.0, 240, 2600, .4), .22)
for x in lista(E["barre"] + .05, E["barre"] + .7, 12):
    m.pon(x, paf(), .14, .4)

# Las dos notas: llegan, caen a la misma mesa y se vuelven las mismas letras.
m.pon(E["tuyas"] - .3, soplo(.4, 400, 3000, .6), .25, -.5)
m.pon(E["tuyas"] + .1, paf(1.1), .6, -.2)
m.pon(E["ese"] - .2, soplo(.4, 500, 3600, .6), .25, .5)
m.pon(E["ese"] + .2, paf(1.1), .6, .2)
m.pon(E["misma"], golpe(64, 32, .6, .5), .95)
m.pon(E["misma"], paf(1.5), .55)
a, b = E["flip"]
for x in lista(a, b, 70, .9):
    m.pon(x, tic(.012, 1700, 6500), rng.uniform(.07, .13), rng.uniform(-.5, .5))
m.pon(E["funde"], soplo(.5, 300, 2600, .5), .3)
m.pon(E["funde"] + .45, golpe(90, 50, .3, .2), .45)
for i, x in enumerate(E["tijera"]):
    m.pon(x + .05, tijera(), .2, .5)
    m.pon(x - .1, soplo(.2, 1500, 6000, .5), .06, .5)
m.pon(E["jefe"], toc(740), .3, -.3)
m.pon(E["extraño"], toc(620), .3, .3)

# Inyección de prompt: las líneas del extraño se meten en el texto.
m.pon(E["inyecta"] - .35, soplo(.4, 600, 5200, .9), .4, .5)
m.pon(E["inyecta"], golpe(60, 30, .7, .6), .9)
m.pon(E["inyecta"] + .04, campana((220, 330, 440), 1.6, (.6, .3, .2)), .16)
m.pon(E["anio"], golpe(84, 42, .4, .9), .95)
m.pon(E["anio"], tic(.04, 1200, 3600), .5)
for x in E["cintas"]:
    m.pon(x - .22, cinta(.22), .12, .3)
    m.pon(x, golpe(150, 90, .1, .4), .32)
m.pon(e("completo") + .02, despegue(.5), .22, .4)
m.pon(E["fuera"], soplo(.6, 400, 2600, .4), .18, .6)

# Puede venir en un correo, una página, un documento, una imagen.
for i, x in enumerate(E["vias"]):
    m.pon(x - .25, soplo(.3, 600, 4200, .9), .2, (-1) ** i * .4)
    m.pon(x, paf(1.1 + .1 * i), .8, (-1) ** i * .4)
    m.pon(x, golpe(110 - 8 * i, 60, .2, .3), .35, (-1) ** i * .4)
a, b = E["barrido"]
m.pon(a, clic(), .5, -.4)
m.pon(a + .02, zumbido(b - a), .05)
m.pon(a + .3, polvo(b - a - .2), .22)
m.pon(b, clic(), .45, .4)
m.pon(E["vuelan"] - .05, soplo(.8, 300, 4200, .35), .45, .2)
for i in range(4):
    m.pon(E["vuelan"] + .12 + .07 * i, soplo(.25, 900, 5200, .3), .14, (-1) ** i * .6)

# El empleado obediente.
m.pon(E["corbata"], polvo(.45), .3)
m.pon(E["corbata"] + .35, campana((1760, 2637), .5, (.5, .25)), .14)
m.pon(E["saluda"], tic(.03, 1400, 4000), .4)
m.pon(E["saluda"], golpe(220, 140, .1, .4), .3)
for i, x in enumerate(E["ordenes"]):
    m.pon(x - .3, soplo(.32, 800, 4800, .9), .06)
    m.pon(x, paf(), .38, (-1) ** i * .25)
o = E["obedece"]
m.pon(o[0], golpe(180, 90, .2, .3), .3)                     # salta
m.pon(o[0] + .58, golpe(110, 60, .25, .3), .5)
m.pon(o[1], soplo(.55, 500, 3200, .5), .16)                  # gira
m.pon(o[1] + .02, trazo(.5, 300, 900), .1)
for k in range(3):                                         # aplaude
    m.pon(o[2] + k * .2, aplauso(), .36, .1 * (k - 1))

# Demostraciones: tres sellos.
for i, x in enumerate(E["sellos"]):
    m.pon(x - .12, soplo(.14, 600, 3000, .9), .08)
    m.pon(x, golpe(80, 40, .3, .2), .42, (-1) ** i * .3)
    m.pon(x, tic(.04, 1100, 3400), .1)

# Las llaves cuelgan; la mesa cede bajo ese papel.
m.pon(E["baja"], soplo(1.1, 200, 2200, .5), .14)
m.pon(E["papel"], paf(1.3), .7)
m.pon(E["papel"], golpe(80, 40, .3, .2), .3)
for i, x in enumerate(E["llaves"]):
    m.pon(x, llaves(), .55, -.3)
    m.pon(x + .06, crujido(.35 + .1 * i, 64 - 4 * i), .3 + .08 * i)
    m.pon(x + .06, golpe(58 - 3 * i, 30, .5, .1), .35 + .1 * i)
m.pon(E["peso"], golpe(46, 24, 1.3, .6), 1.05)
m.pon(E["peso"], crujido(.9, 48), .5)
m.pon(E["peso"] + .02, banda(ruido(int(.4 * SR)), 300, 3000) * np.exp(-np.arange(int(.4 * SR)) / SR * 11), .22)
m.pon(E["peso"] + .1, lluvia(.6, 30), .12)
m.pon(E["sube"], soplo(1.4, 200, 1800, .45), .12)
m.pon(E["sube"] + .1, crujido(.6, 90), .14)

# Ojos al mundo: el mundo está lleno de palabras.
m.pon(E["ojos"], trazo(.8, 300, 1300), .12)
for i in range(7):
    m.pon(E["ojos"] + .08 * i, tic(.015, 2000, 8000), .16, -.6 + .2 * i)
m.pon(E["palabras1"] - .2, soplo(1.4, 200, 1600, .7), .1)
a, b = E["barrido2"]
m.pon(a, clic(), .35, -.5)
m.pon(a + .02, zumbido(b - a), .03)
m.pon(a + .2, polvo(b - a - .4), .06)
m.pon(b, clic(), .25, .5)
m.pon(E["ultima"] - 1.3, soplo(1.4, 700, 2600, .7), .07)
m.pon(E["ultima"], paf(), .42)
m.pon(E["mano"], toc(440), .12)
m.pon(E["mano"] + .1, campana((130.8, 196, 261.6, 392), 3.0, (.7, .45, .28, .16)), .3)

# El foley se aparta de la voz: bajo cada palabra baja y en las pausas pega completo.
_va = np.abs(m.voz[:, 0])
_k = int(.03 * SR)
_en = np.sqrt(np.convolve(_va ** 2, np.ones(_k) / _k, "same"))
_act = np.clip((20 * np.log10(_en + 1e-9) + 42) / 14, 0, 1)
_act = np.convolve(_act, np.ones(int(.14 * SR)) / int(.14 * SR), "same")
_g = np.ones(m.N)
_n = min(m.N, len(_act))
_g[:_n] = 1 - .45 * _act[:_n]
m.fx *= _g[:, None]

# Música: la pista tiene compases de 2 s con el tiempo fuerte en x.1. El primero (16.1) cae con el sobre.
P = "a13_correo"
K1 = 16.1 - E["cae"]
r1 = E["apaga"]                                             # "tú no lo ves": se calla
K2 = 34.1 - E["ve"]                                        # vuelve con "el agente sí", en tiempo fuerte
a2 = E["ve"] - .06
b2 = s("a esto le") - .05                                  # se calla para que el término pegue solo
a3 = s("prompt") - .1
K3 = 56.1 - (a3 + .1)
m.musica([(P, K1, 0, r1 + .1, .02, .14)], nivel=-22.2)
m.musica([(P, K2 + a2, a2, b2 + .3, .06, .35)], nivel=-24.5)
m.musica([(P, K3 + a3, a3, m.dur, .12, 3.2)], nivel=-26.5)
m.cierra()
