"""a28: la fábrica oscura. Una fábrica de papel de noche, con naves de dientes de sierra y dos chimeneas, apaga sus
ventanas una por una mientras adentro las bolas con manos siguen trabajando. StrongDM: tres siluetas en una oficina
pegada a la fábrica escriben hojas de «qué debe pasar» y las meten por una ranura; un taxímetro en el techo baja la
bandera y marca la META de $1,000 por día por ingeniero. Un cartel promete «el fin de programar*»; la cámara se mete en
la letra chica y una lupa recorre cuatro casos: la torre del compilador de a22 (una franja la hizo otro compilador y
una mano humana escribe las pruebas), el navegador de Cursor (lento, piezas que se caen), Gas Town (una colmena que trabaja
movida desde un tablero de palancas, sellado EXPERIMENTAL) y un pasillo con candado donde veinte bolas rinden como
dos o tres. Una ventana se enciende: la junta (el mismo papel da vueltas, malentendidos, copias). Humo; al irse, el
enjambre ordenado de Yegge (25 bolas: veinte o treinta a la vez). La fábrica a oscuras: una persona pide, comprueba con lupa, y su ventana no se apaga.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"le dicen": .15, "suena a que": .2, "ahora lee": .4, "el compilador": .3, "cursor coordinó": .25,
          "steve yegge": .25, "cursor también": .25, "una colmena": .4, "es una empresa": .2, "pero tampoco": .25,
          "la pregunta": .5, "una fábrica puede": .4, "no puede apagar el": .3}
m = Mezcla("a28_fabrica", pausas=PAUSAS, cola=2.9).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

# ---------- inicios y finales reales de la voz: Whisper estira palabras sobre los silencios ----------
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
if _ini is not None:
    TR.append((_ini / SR, len(_sil) / SR))


def tramo(f, desde=0):
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs((r[0] + r[1]) / 2 - c) if r[0] - .1 <= c <= r[1] + .1 else 99 + abs(r[0] - c))


arr = lambda f, d=0: tramo(f, d)[0]
fin = lambda f, d=0: tramo(f, d)[1]

E = {}
BEAT = .49                                     # la cama va a ~122 BPM; el golpe de la música cae en 1.33 s
# ---------- 1. la ventana: una bola escribe, otra sella ----------
E["hojas"] = [r3(-.14 + k * BEAT) for k in range(16)]          # nace cada hoja (y vuela .36 s después)
E["ningun"] = s("ningún humano") - .06
E["escribe"] = s("escribe") - .05
E["revisa"] = s("revisa") - .06
# ---------- 2. la fábrica entera ----------
E["aFab"] = r3(arr("le dicen") - .22)
E["oscura"] = s("fábrica oscura") - .05
a, b = s("fábricas") - .08, e("apagadas") - .12
orden = [3, 12, 9, 0, 17, 6, 14, 1, 19, 10, 5, 15, 8, 2, 18, 11, 7, 13, 16, 4]   # 16 ventanas + 4 tragaluces; la 4 (la del principio) al final
E["apagon"] = [0.0] * 20
for k, i in enumerate(orden):
    u = k / (len(orden) - 1)
    E["apagon"][i] = r3(a + (b - a) * (u ** 1.15))
E["apagadas"] = s("apagadas") - .05
# ---------- 3. StrongDM ----------
E["aStrong"] = r3(arr("la empresa") - .35)
E["strong"] = s("strongdm") - .06
E["tres"] = s("tres personas") - .05
E["tresK"] = [r3(E["tres"] + k * .16) for k in range(3)]
E["escriben"] = s("escriben") - .05
E["quePasar"] = s("qué debe pasar") - .05
E["ranura"] = [r3(e("pasar") - .25), r3(s("hacen el resto") - .05)]
E["resto"] = s("los agentes", T("pasar").i) - .08
E["caja"] = r3(e("resto") + .05)
# ---------- 4. el taxímetro ----------
E["aMeta"] = r3(arr("su meta") - .3)
E["bandera"] = r3(e("meta") - .12)
E["mil"] = s("mil dólares") - .08
E["milF"] = r3(e("dólares") + .05)
E["diarios"] = s("diarios") - .05
E["tokens"] = s("tokens") - .05
E["ingeniero"] = s("por ingeniero") - .05
E["fichas"] = [r3(E["tokens"] - .1 + k * .085) for k in range(12)]
# ---------- 5. el cartel y la letra chica ----------
E["aCartel"] = r3(arr("suena a que") - .3)
E["acabo"] = s("acabó") - .05
E["asterisco"] = r3(e("programación") - .14)
E["ahora"] = r3(arr("ahora lee") - .04)
E["lee"] = s("lee la letra") - .05
E["letra"] = s("letra chica") - .05
# ---------- 6. caso 1: el compilador ----------
E["c1"] = r3(arr("el compilador") - .08)
E["dieciseis"] = s("dieciséis") - .05
E["otro"] = s("otro compilador") - .05
E["humano"] = s("un humano", T("otro compilador").i) - .1
E["pruebas"] = s("pruebas") - .1
E["palomas"] = [r3(E["pruebas"] + .28 + k * .13) for k in range(6)]
# ---------- 7. caso 2: el navegador ----------
E["c2"] = r3(arr("cursor coordinó") - .32)
E["cientos"] = s("cientos") - .05
E["navegador"] = s("navegador") - .05
E["lento"] = s("lento") - .05
E["sinFun"] = s("sin funcionar") - .12
E["caen"] = [r3(E["sinFun"] + k * .16) for k in range(5)]
# ---------- 8. caso 3: Gas Town ----------
E["c3"] = r3(arr("steve yegge") - .32)
E["gas"] = s("gas town") - .05
E["orq"] = s("orquestador") - .05
E["avisa"] = s("él mismo avisa") - .05
E["experimental"] = s("experimental") - .08
E["cualquiera"] = s("no es para cualquiera") - .05
E["celdasG"] = [r3(E["c3"] + .32 + k * (E["gas"] + .1 - E["c3"] - .32) / 12) for k in range(13)]   # la colmena se arma
# ---------- 9. caso 4: bloqueos ----------
E["c4"] = r3(arr("cursor también") - .32)
a, b = E["orq"] + .35, E["c4"] - .1
E["palancas"] = [r3(a + (b - a) * k / 15) for k in range(16)]                                    # el orquestador mueve palancas
E["bloqueos"] = s("bloqueos") - .05
E["veinte"] = s("veinte") - .05
E["dos"] = s("dos o tres") - .05
E["candado"] = [r3(E["bloqueos"] + .25 + k * 1.05) for k in range(3)]
# ---------- 10. la junta ----------
E["aJunta"] = r3(arr("una colmena") - .42)
E["enciende"] = r3(E["aJunta"] + .78)
E["magia"] = s("no es magia") - .05
E["empresa"] = s("es una empresa") - .05
E["problemas"] = s("problemas") - .05
E["juntas"] = s("juntas") - .05
E["malentendidos"] = s("malentendidos") - .05
E["repetido"] = s("trabajo repetido") - .05
# ---------- 11. humo y enjambre ----------
E["humo0"] = r3(arr("pero tampoco") - .12)
E["humo"] = s("humo") - .02
E["humoF"] = r3(min(e("humo"), s("yegge", T("humo").i) - .55))   # el soplido entra en el hueco entre «humo» y «Yegge», no encima
E["yegge"] = s("yegge", T("humo").i) - .05
E["veinte30"] = s("veinte o treinta") - .05
E["dia"] = s("todos los días") - .05
E["diaF"] = r3(e("días") + .5)
# ---------- 12. la fábrica a oscuras ----------
E["pregunta"] = r3(arr("la pregunta") - .12)
E["offM"] = r3(s("cambió") + .1)
E["quien"] = s("ya no es quién") - .05
E["tacha"] = s("código", T("ya no es").i) - .1
E["pedir"] = r3(arr("es quién sabe") - .08)
E["quePedir"] = s("qué pedir") - .05
E["desliza"] = r3(e("pedir") - .05)
E["comprobar"] = s("cómo comprobar") - .05
E["regresa"] = r3(s("comprobar") + .05)
E["bien"] = s("quedó bien") - .05
E["luces"] = r3(arr("una fábrica puede") - .1)
a, b = s("apagar las luces") - .02, e("luces", T("una fábrica puede").i) - .05
E["ultimas"] = [r3(a + (b - a) * k / 2) for k in range(3)]       # oficina, farol, taxímetro
E["no"] = r3(arr("no puede apagar el") - .02)
E["parpadeo"] = [r3(E["no"] + .12), r3(E["no"] + .3), r3(E["no"] + .44)]
E["criterio"] = s("criterio") - .06
E["paloma"] = r3(e("criterio") + .25)
E["fin"] = r3(m.dur)
(RAIZ / "remotion/src/serie/a28/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")
print({k: v for k, v in E.items() if not isinstance(v, list)})


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def sello():
    return suma(golpe(150, 70, .2, .9), tic(.02, 1500, 5000) * .6)


def clic():
    """Apagador de pared: dos clics de plástico pegados."""
    return suma(tic(.018, 1800, 6500) * 1.2, np.concatenate([np.zeros(int(.012 * SR)), toc(2400) * .35]), golpe(240, 120, .06, .2) * .3)


def zumbido(dur, f=55.0):
    """El zumbido de la fábrica: red eléctrica y motores, muy abajo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) * .5 + np.sin(2 * np.pi * f * 2 * t) * .25 + np.sin(2 * np.pi * f * 3 * t) * .08
    y *= .75 + .25 * np.sin(2 * np.pi * .7 * t)
    y += banda(ruido(n), 80, 400) * .12
    ev = np.minimum(np.minimum(t / .6, 1), np.minimum((dur - t) / .8, 1))
    return y * ev


def pluma(dur=.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = (.55 + .45 * np.abs(np.sin(2 * np.pi * 5.5 * t + rng.random()))) * np.sin(np.pi * np.minimum(t / dur, 1)) ** .4
    return banda(ruido(n), 1800, 7500) * env * .6


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def metal():
    t = np.arange(int(.9 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) * a for f, d, a in ((640, 6, .5), (1510, 9, .35), (2380, 12, .2)))


def moneda(f=2600):
    t = np.arange(int(.35 * SR)) / SR
    return suma((np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.48 * t)) * np.exp(-t * 14) * .5, tic(.01, 3000, 9000) * .5)


def rodillo(dur, n):
    """Los dígitos del taxímetro que ruedan: clics que se apretan y luego se separan."""
    y = np.zeros(int(dur * SR) + 4000)
    for k in range(n):
        u = (k / n) ** .7
        i = int(dur * SR * u)
        x = tic(.012, 2200, 7000)
        y[i:i + len(x)] += x * (.7 + .3 * rng.random())
    return y


def chorro_humo(dur):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 120, 1600) * np.sin(np.pi * t) ** .7 * .9


def murmullo(dur):
    """Una junta sin palabras: tonos que suben y bajan como voces lejanas."""
    n = int(dur * SR)
    y = np.zeros(n)
    for k in range(int(dur * 7)):
        L = int(rng.uniform(.12, .3) * SR)
        i = int(rng.random() * (n - L - 10))
        tt = np.arange(L) / SR
        f = rng.uniform(170, 330) * (1 + .15 * np.sin(tt * 19))
        y[i:i + L] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2 * .3
    return banda(y, 150, 1400)


def tictac(f):
    t = np.arange(int(.05 * SR)) / SR
    return suma(np.sin(2 * np.pi * f * t) * np.exp(-t * 120), tic(.012, 3000, 9000) * .7)


def tecleo(dur, dens=22):
    y = np.zeros(int(dur * SR) + 4000)
    for _ in range(int(dur * dens)):
        i = int(rng.random() * dur * SR)
        x = tic(.01, 2000, 6000)
        y[i:i + len(x)] += x * rng.uniform(.3, 1)
    return y


def lento(dur):
    """Un motor que no arranca: tono que baja y se arrastra."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 260 * np.exp(-t * .9) + 70
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** .5 * .4 + banda(ruido(n), 200, 900) * .08


def blip_t(f):
    t = np.arange(int(.12 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t * 22) * .5


def apagon(dur):
    """Un motor que se queda sin corriente: tono que cae a nada."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 40 + 260 * np.exp(-t * 4.5)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * (1 - t / dur) ** 1.5 * .5


def cristal():
    return campana((2637, 3520, 4186), .9, (.4, .25, .15))


# ---------- 1. la ventana ----------
m.pon(0.0, soplo(.5, 600, 4000, .2), .25)
for k, t0 in enumerate(E["hojas"]):
    if t0 > E["aFab"] + .6:
        break
    if t0 >= 0:
        m.pon(t0, pluma(.28), .22)
    m.pon(t0 + .26, papel(.22), .3, .2)
    m.pon(t0 + .62, sello(), .42 if k % 2 == 0 else .28, -.15)
m.pon(E["ningun"], golpe(62, 32, .7, .3), .8)
m.pon(E["escribe"], soplo(.35, 900, 5000, .3), .25)
m.pon(E["revisa"], soplo(.35, 900, 5000, .3), .25)
m.pon(E["revisa"] + .02, golpe(120, 55, .3, .8), .55)
# ---------- 2. la fábrica ----------
m.pon(E["aFab"], soplo(1.4, 200, 2600, .3), .55)
m.pon(E["oscura"], golpe(48, 26, 1.2, .1), .55)
m.pon(E["oscura"], zumbido(E["aStrong"] - E["oscura"] + 1.0), .12)
for k, t0 in enumerate(sorted(E["apagon"])):
    m.pon(t0, clic(), .5, ((k * 7) % 9 - 4) * .18)
m.pon(sorted(E["apagon"])[-1] + .03, golpe(55, 30, .9, .1), .4)
# ---------- 3. StrongDM ----------
m.pon(E["aStrong"], soplo(.8, 300, 3000, .4), .35)
for k, t0 in enumerate(E["tresK"]):
    m.pon(t0, toc(620 + 120 * k), .35, (-.4, 0, .4)[k])
m.pon(E["escriben"], pluma(1.4), .35)
m.pon(E["escriben"] + .4, pluma(1.0), .25, .3)
for t0 in E["ranura"]:                    # la orden recorre las ventanas a oscuras
    for j in range(8):
        m.pon(t0 + .2 + j * .11, toc(1400 - 60 * j) * .6, .12, .5 - j / 8)
for t0 in E["ranura"]:
    m.pon(t0 - .25, papel(.3), .4)
    m.pon(t0, suma(tic(.02, 1500, 5000), golpe(300, 160, .06, .4) * .4), .45, -.3)
m.pon(E["resto"], tecleo(1.6), .35, -.3)
m.pon(E["caja"], golpe(130, 60, .25, .5), .45, -.4)
# ---------- 4. el taxímetro ----------
m.pon(E["aMeta"], soplo(.6, 400, 3500, .4), .3)
m.pon(E["bandera"], suma(golpe(110, 50, .3, .6), metal() * .25), .7)
m.pon(E["mil"], rodillo(E["milF"] - E["mil"], 26), .45)
m.pon(E["milF"], campana((1568, 2093), 1.0, (.5, .3)), .3)
for k, t0 in enumerate(E["fichas"]):
    m.pon(t0, moneda(2400 + 140 * (k % 5)), .16, ((k % 3) - 1) * .3)
m.pon(E["ingeniero"], toc(880), .25)
# ---------- 5. cartel y letra chica ----------
m.pon(E["aCartel"], soplo(1.3, 200, 3000, .5), .5)
m.pon(E["acabo"], golpe(70, 36, .5, .3), .4)
m.pon(E["asterisco"], suma(pop(), toc(1200) * .5), .55)
m.pon(E["ahora"], soplo(1.0, 300, 6000, .7), .6)
m.pon(E["ahora"] + .02, golpe(44, 24, 1.4, .05), .5)
m.pon(E["lee"] + .1, cristal(), .2)
m.pon(E["letra"] + .2, papel(.4), .3)
# ---------- 6. el compilador ----------
m.pon(E["c1"], soplo(.4, 600, 4000, .4), .3)
for k in range(16):
    m.pon(E["dieciseis"] + k * .035, pop(), .12, ((k % 4) - 1.5) * .35)
m.pon(E["otro"], suma(golpe(150, 80, .2, .5), toc(700) * .4), .5)
m.pon(E["otro"] + .25, trazo(.5, 400, 300), .2)
m.pon(E["humano"], soplo(.5, 300, 2400, .5), .35)
m.pon(E["pruebas"], pluma(.8), .4)
for k, t0 in enumerate(E["palomas"]):
    m.pon(t0, suma(tic(.03, 1800, 6000), toc(1300 + 90 * k) * .4), .3)
# ---------- 7. el navegador ----------
m.pon(E["c2"], soplo(.5, 300, 5000, .4), .45)
m.pon(E["cientos"], lluvia(E["lento"] - E["cientos"], 90), .28)
m.pon(E["lento"], lento(1.6), .45)
for k, t0 in enumerate(E["caen"]):
    m.pon(t0, suma(golpe(140 - 12 * k, 60, .25, .6), papel(.2) * .6), .45, ((k % 3) - 1) * .4)
# ---------- 8. Gas Town ----------
m.pon(E["c3"], soplo(.5, 300, 5000, .4), .45)
m.pon(E["gas"], campana((392, 587.3), .9, (.4, .2)), .18)
for k, t0 in enumerate(E["celdasG"]):     # trece celdas de la colmena, mismo reparto que la animación
    m.pon(t0, pop(), .16, -.5 + k / 12)
m.pon(E["orq"], soplo(.4, 900, 5000, .3), .3)
m.pon(E["orq"] + .2, trazo(.6, 180, 520), .25)          # el tablero se enciende
for k, t0 in enumerate(E["palancas"]):
    m.pon(t0, suma(tic(.015, 1800, 6000), toc(700 + 90 * (k % 5)) * .4), .2, ((k * 5) % 7 - 3) * .2)
m.pon(E["experimental"], sello(), .8)
m.pon(E["experimental"] + .02, golpe(80, 40, .5, .3), .45)
for k in range(4):                                       # «no es para cualquiera»: el tablero se alborota
    m.pon(E["cualquiera"] + .1 + k * .14, suma(blip_t(1180 if k % 2 else 880)), .22)
# ---------- 9. bloqueos ----------
m.pon(E["c4"], soplo(.5, 300, 5000, .4), .45)
m.pon(E["c4"] + .3, lluvia(4.2, 30) * .7, .45)
for t0 in E["candado"]:
    m.pon(t0, suma(metal() * .3, tic(.02, 1500, 5000)), .4)
    m.pon(t0 + .5, golpe(130, 70, .15, .4), .25)
# ---------- 10. la junta ----------
m.pon(E["aJunta"], soplo(1.1, 200, 3000, .5), .55)
m.pon(E["enciende"], clic(), .7)
m.pon(E["magia"], polvo(.6) * 1.5, .4)
m.pon(E["empresa"], murmullo(E["humo"] - E["empresa"]), .45)
t0 = E["juntas"]
while t0 < E["humo0"] + .3:
    m.pon(t0, tictac(2100), .16)
    t0 += .125
m.pon(E["malentendidos"], pop(), .35, -.4)
m.pon(E["malentendidos"] + .2, pop(), .35, .4)
m.pon(E["repetido"], suma(papel(.3), papel(.3)), .45)
for k in range(5):
    m.pon(E["repetido"] + .12 * k, sello(), .2, (k - 2) * .3)
# ---------- 11. humo y enjambre ----------
m.pon(E["humo0"], chorro_humo(E["humo"] - E["humo0"]), .32)
m.pon(E["humoF"], soplo(.5, 300, 6000, .2), .35)
m.pon(E["humo"] + .2, tecleo(E["pregunta"] - E["humo"], 60), .25)
m.pon(E["dia"], campana((523.3, 784, 1046.5), 1.6, (.4, .25, .15)), .2)
# ---------- 12. la fábrica a oscuras ----------
m.pon(E["pregunta"], soplo(1.3, 200, 2600, .3), .5)
m.pon(E["offM"], clic(), .6)
m.pon(E["offM"], zumbido(E["fin"] - E["offM"] - .5), .1)
m.pon(E["tacha"], suma(soplo(.25, 900, 6000, .3), tic(.03, 900, 3000)), .45)
m.pon(E["pedir"], clic(), .55)
m.pon(E["pedir"] + .1, pluma(.9), .3)
m.pon(E["desliza"], papel(.3), .4)
m.pon(E["desliza"] + .25, suma(tic(.02, 1500, 5000), golpe(300, 160, .06, .4) * .4), .4)
m.pon(E["regresa"], golpe(130, 60, .2, .4), .4)
m.pon(E["bien"], cristal(), .2)
for k, t0 in enumerate(E["ultimas"]):
    m.pon(t0, clic(), .7, (.3, -.4, .4)[k])
m.pon(E["ultimas"][-1] + .05, golpe(40, 22, 1.6, .05), .55)
m.pon(E["ultimas"][-1] + .02, apagon(.9), .5)            # la música se va con la luz: la fábrica se queda sin corriente
for k, t0 in enumerate(E["parpadeo"]):
    m.pon(t0, clic(), .45 if k < 2 else .6)
m.pon(E["criterio"], sello(), .7)
m.pon(E["criterio"] + .02, golpe(55, 28, 1.0, .1), .45)
m.pon(E["paloma"], trazo(.4, 500, 900), .25)
m.pon(E["paloma"] + .3, campana((130.8, 196, 261.6, 392), 3.2, (.8, .45, .3, .15)), .36)

# ---------- música: entra en la subida, se corta en seco con «ahora lee la letra chica» y regresa con el primer caso ----------
OFF = 14.14
FIN_M = E["ultimas"][-1] + .12
m.musica([("a28_fabrica", OFF, 0.0, E["ahora"], .0, .03), ("a28_fabrica", OFF + E["c1"] - .25, E["c1"] - .25, FIN_M, .45, .3)], nivel=-26.0)

# ---------- el foley va debajo de la voz ----------
vz = np.abs(m.voz[:m.N].mean(axis=1))
L = min(len(vz), m.N)


def media(x, n):
    c = np.cumsum(np.concatenate([[0.0], x]))
    y = (c[n:] - c[:-n]) / n
    return np.concatenate([np.full(n // 2, y[0]), y, np.full(len(x) - len(y) - n // 2, y[-1])])


env = media(vz, int(.06 * SR))
env = np.clip(env / (np.percentile(env[env > 1e-4], 85) + 1e-9), 0, 1)
env = media(np.maximum(env, media(env, int(.3 * SR))), int(.12 * SR))
g = np.ones(m.N)
g[:L] = 1 - .37 * np.clip(env[:L] * 1.6, 0, 1)
m.fx *= (.5 * g)[:, None]
m.cierra()
