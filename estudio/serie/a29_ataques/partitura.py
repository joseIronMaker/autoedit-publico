"""a29: ataques. Una maqueta de papel: un tablero en espiral de 32 casillas (la red simulada del AI Security
Institute del Reino Unido). La bola con manos lo recorre paso por paso hasta la meta. Diez intentos: en abril
llegan tres; con una versión más nueva, seis. A la derecha, sobre la misma mesa, un reloj de arena que se
duplica (uno, dos, cuatro, ocho) y una tendencia que los modelos más recientes rebasan. Los modelos abiertos
son una fila de bolas blancas en la misma pista, unos meses atrás, que llega a donde estaban las negras y se
multiplica. El freno: una balanza que queda pareja. La maqueta no tiene defensores; junto a ella, un edificio
real con guardias de papel y un signo de interrogación. Un calendario se tacha solo. La cámara sube al muro de
a23 (6,120 agujeros, 516 parches): la defensa encuentra rápido, pero la fila de espera es una mano humana que
tapa uno por uno. Cierra con la carrera entre agujeros y parches, empatada: la música resuelve, no un corte.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"el gobierno": .25, "en abril": .2, "un modelo la": .6, "una versión": .55, "ese instituto": .3,
          "y los modelos más": .25, "los modelos abiertos": .35, "haz la cuenta": .35, "lo que hoy": .2,
          "en meses lo": .2, "ahora el freno": .45, "que importa igual": .35, "esa prueba no": .4,
          "el propio instituto": .3, "nadie sabe": .2, "y quien te": .15, "y la defensa": .65,
          "lo que más retrasa": .3, "es que un humano": .25, "por eso la": .35, "ya los vimos": .2,
          "la pregunta es si": .45}
m = Mezcla("a29_ataques", pausas=PAUSAS, cola=3.0).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)
rnd = np.random.default_rng(29)

E = {}
# ---------- 1. el gancho: la bola recorre las 32 casillas hasta la meta ----------
t_meta = s("simulada") + .05
hops = [-.06 + .3 * k for k in range(7)]                                 # de cerca: paso por paso
hops += list(np.linspace(hops[-1] + .27, t_meta - .36, 32 - 7))         # luego más rápido
E["h0"] = [r3(x) for x in hops]                                         # salto k: casilla k -> k+1 (32 = meta)
E["experimento"] = [r3(s("experimento")), r3(e("experimento"))]
E["gob"] = s("el gobierno")
E["red"] = s("red simulada")
E["regresa"] = [r3(s("ataque") - .05), r3(s("ataque") + .62)]            # salta de la meta a la salida
E["ola"] = s("treinta y dos")
E["pasos"] = s("pasos")
E["divide"] = r3(e("pasos") + .02)

# ---------- 2. diez intentos, dos veces ----------
def carrera(t0, llegadas, paradas, semilla):
    """Diez bolas. Las que llegan saltan a la meta en `llegadas`; las otras se quedan en `paradas`."""
    g = np.random.default_rng(semilla)
    n_ok = len(llegadas)
    quien = sorted(g.choice(10, n_ok, replace=False).tolist())
    out, li, pi = [], 0, 0
    dt_med = np.mean([(a - t0) / 32.4 for a in llegadas])
    for j in range(10):
        ts = t0 + j * .07
        if j in quien:
            a = llegadas[li]; li += 1
            dt = (a - ts - .12) / 32
            out.append({"t0": r3(ts), "dt": r3(dt), "para": 32, "llega": r3(ts + 32 * dt)})
        else:
            p = paradas[pi]; pi += 1
            dt = dt_med * g.uniform(.92, 1.08)
            out.append({"t0": r3(ts), "dt": r3(dt), "para": p, "cae": r3(ts + p * dt + .18)})
    return out

R1 = E["divide"] + .32
E["abril"] = s("abril")
E["c1"] = carrera(R1, [s("modelo") + .2, s("completó") + .02, s("tres") - .1], [3, 7, 11, 16, 20, 24, 29], 4)
E["completo"] = s("completó")
E["tres"] = s("tres de cada diez")
R2 = e("veces") + .15
E["reset"] = r3(e("veces") - .15)
E["version"] = s("una versión")
lleg2 = list(np.linspace(s("llegó") - .3, s("seis") - .1, 6))
E["c2"] = carrera(R2, lleg2, [5, 13, 19, 26], 11)
E["seis"] = s("seis")

# ---------- 3. el reloj de arena que se duplica ----------
E["pan1"] = s("ese instituto") - .55
E["inst"] = s("ese instituto")
E["reloj"] = [r3(s("ese instituto") + .3), r3(s("duplicando") + .05), r3(s("cuatro") - .05), r3(s("siete") + .02)]
E["duracion"] = s("duración")
E["meses"] = s("cuatro punto siete")
E["recientes"] = s("modelos más recientes")
E["supera"] = s("superaron")
E["tendencia"] = s("tendencia")

# ---------- 4. los modelos abiertos, en la misma pista ----------
E["pan2"] = s("los modelos abiertos") - .55
E["abiertos"] = s("abiertos")
E["descargar"] = s("descargar")
E["atras"] = s("unos meses atrás")
E["cuenta"] = s("haz la cuenta")
E["hoy"] = s("lo que hoy")
E["pocos"] = s("unos pocos")
E["enmeses"] = s("en meses lo")
i_tener = T("tener").i
E["cualquiera"] = s("cualquiera", i_tener)
# la fila blanca avanza: cada bola salta de su casilla a la meta, casilla por casilla
a0, a1 = E["enmeses"] - .05, E["cualquiera"] + .05
E["avanza"] = [r3(a0 + k * .05) for k in range(5)]
E["avanza_dt"] = r3((a1 - a0 - .2) / 11)

# ---------- 5. el freno ----------
E["freno0"] = s("ahora el freno")
E["freno"] = s("freno")
E["pesa"] = r3(s("freno") + .2)
E["igual"] = s("igual")
E["sindef"] = s("esa prueba no")
E["defensores"] = s("defensores")
E["activos"] = s("activos")

# ---------- 6. lo real: un edificio con guardias ----------
E["pan3"] = s("el propio instituto") - .35
E["nosabe"] = s("no sabe cuándo")
E["como"] = s("ni cómo")
E["traslada"] = s("traslada")
E["reales"] = s("sistemas reales")
E["defendidos"] = s("defendidos")
E["nadie"] = s("nadie sabe")
E["fecha"] = s("una fecha")
E["adivinando"] = s("adivinando")

# ---------- 7. el muro de a23 ----------
E["tilt"] = s("y la defensa") - .62
E["defensa"] = s("defensa")
E["armas"] = s("mismas armas")
E["retrasa"] = s("lo que más retrasa")
E["noes"] = s("no es encontrar")
E["encontrar"] = s("encontrar la falla")
E["falla_e"] = e("encontrar la falla")
E["humano"] = s("es que un humano")
E["revise"] = s("revise")
E["arregle"] = s("arregle")
E["pregunta1"] = s("por eso la pregunta")
E["atacando"] = s("agentes atacando")
E["vimos"] = s("ya los vimos")
E["pregunta2"] = s("la pregunta es si")
E["parchar"] = s("parchar")
E["rapido"] = s("más rápido")
E["encuentran"] = s("encuentran")
E["fin"] = r3(e("encuentran") - .02)

# hallazgos de la defensa (anillo rojo en un agujero, y su tarjeta a la fila)
hall = []
tt = E["defensa"] + .15
while tt < E["encontrar"]:
    hall.append(tt); tt += .42
tt, paso = E["encontrar"], .2
while tt < E["humano"] + .2:
    hall.append(tt); tt += paso; paso = max(.085, paso * .9)
tt = E["humano"] + .35
while tt < E["pregunta2"] - .1:
    hall.append(tt); tt += .3 + rnd.uniform(-.05, .05)
# la carrera final: encontrar contra parchar, sin ganador
P0, F = E["pregunta2"] + .25, E["fin"]
rel_r = np.array([0, .12, .25, .37, .5, .62, .76, .88, 1.0])
rel_p = np.array([.06, .2, .34, .46, .57, .68, .79, .9, 1.0])
E["carrera_r"] = [r3(P0 + (F - P0) * x) for x in rel_r]
E["carrera_p"] = [r3(P0 + (F - P0) * x) for x in rel_p]
hall += E["carrera_r"]
E["hall"] = [r3(x) for x in hall]
# la mano humana: un parche cada 1.15 s (el mismo paso que al final de a23), más rápido en la carrera
par = list(np.arange(E["revise"] + .2, P0 - .3, 1.15))
E["parches"] = [r3(x) for x in par] + E["carrera_p"]
# los atacantes: abren agujeros nuevos en el borde del muro
E["ataques"] = [r3(E["atacando"] + .1 + k * .26) for k in range(6)]
E = {k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}
(RAIZ / "remotion/src/serie/a29/eventos.json").write_text(json.dumps(E), encoding="utf-8")
print({k: v for k, v in E.items() if not isinstance(v, list)})
print("hallazgos", len(E["hall"]), "parches", len(E["parches"]))


# ---------- foley: todo nace del mismo instante que el dibujo ----------
def paso(f=900, g=1.0):
    """Pie chiquito sobre una casilla de cartulina: un golpe seco de papel, casi sin tono."""
    a = golpe(150 + f * .04, 100, .06, .9) * .45
    b = tic(.016, 1300, 4800) * .5
    c_ = toc(f * .35) * .08
    out = np.zeros(max(len(a), len(b), len(c_)))
    out[: len(a)] += a
    out[: len(b)] += b
    out[: len(c_)] += c_
    return out * g


def vidrio(f=2800):
    """Un reloj de arena que se posa: vidrio y madera."""
    tt_ = np.arange(int(.5 * SR)) / SR
    s_ = (np.sin(2 * np.pi * f * tt_) + .45 * np.sin(2 * np.pi * f * 2.41 * tt_)) * np.exp(-tt_ * 14) * .35
    g_ = golpe(240, 160, .08, .6) * .5
    s_[: len(g_)] += g_
    return s_


def arena(dur):
    n = int(dur * SR)
    t_ = np.linspace(0, 1, n)
    return banda(ruido(n), 3500, 9000) * np.minimum(t_ / .1, 1) * np.minimum((1 - t_) / .2, 1) * .12


def derrape(dur=.5):
    """Todo frena: un roce que baja."""
    n = int(dur * SR)
    t_ = np.arange(n) / SR
    f = np.geomspace(900, 160, n)
    w = np.sin(2 * np.pi * np.cumsum(f) / SR) * .2 + banda(ruido(n), 500, 3000) * .5
    return w * np.sin(np.pi * t_ / dur) ** .6


def crujido(dur=.45, lo=900, hi=7000, dens=.99):
    n = int(dur * SR)
    t_ = np.linspace(0, 1, n)
    cr = (rng.random(n) > dens).astype(float) * rng.uniform(-1, 1, n)
    return (banda(cr, lo, hi) * 3.2 + banda(ruido(n), 1200, 5000) * .3) * np.sin(np.pi * t_ ** .5) ** .8


def hoja(dur=.6):
    n = int(dur * SR)
    t_ = np.linspace(0, 1, n)
    return banda(ruido(n), 1800, 9000) * np.sin(np.pi * t_) ** 1.5 * .4


def sello():
    g_ = golpe(70, 40, .45, .6)
    c_ = crujido(.12, 1500, 6000, .995)
    out = g_.copy()
    out[: len(c_)] += c_ * .4
    return out


def parche():
    """Cinta que se pega: un tirón corto y la palmada."""
    a = banda(ruido(int(.08 * SR)), 1500, 6000) * np.linspace(1, 0, int(.08 * SR)) * .35
    g_ = golpe(130, 80, .12, .5) * .5
    out = np.zeros(int(.2 * SR))
    out[: len(a)] += a
    out[int(.06 * SR):int(.06 * SR) + len(g_)] += g_
    return out


def chirrido(dur=1.0):
    """La balanza que se mece: un rechinido de bisagra."""
    n = int(dur * SR)
    t_ = np.arange(n) / SR
    f = 520 + 120 * np.sin(2 * np.pi * 1.1 * t_)
    w = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sin(2 * np.pi * 7 * t_) > .3)
    return banda(w, 400, 3000) * np.sin(np.pi * t_ / dur) ** 2 * .22


def pluma(dur=.35):
    """Plumón rojo sobre papel."""
    n = int(dur * SR)
    t_ = np.linspace(0, 1, n)
    return banda(ruido(n), 1500, 6000) * np.sin(np.pi * t_) ** .8 * .35


# 1. gancho: cada salto, un paso
for k, t in enumerate(E["h0"]):
    d = .2 if k < 7 else .12
    m.pon(max(t + d, 0), paso(820 + 14 * k, .85 if k < 7 else .55), .5, -.5 + k / 32)
    if k >= 7:
        m.pon(t + d, tic(.02, 2500, 7000), .1)
m.pon(t_meta, golpe(90, 50, .4, .4), .55)
m.pon(t_meta + .02, campana((1046.5, 1568), 1.0, (.5, .25)), .22)
m.pon(E["experimento"][0], hoja(.35), .18, .3)
m.pon(E["experimento"][1] - .05, pluma(.3), .3, .2)
m.pon(E["gob"], toc(560), .22)
m.pon(E["red"], hoja(.4), .16, -.3)
m.pon(E["regresa"][0], soplo(.7, 300, 2600, .4), .2)
m.pon(E["regresa"][1], golpe(110, 60, .25, .4), .45, -.5)
for k in range(32):
    m.pon(E["ola"] + k * .02, tic(.015, 3000, 8000), .08, -.6 + k / 26)
m.pon(E["divide"], soplo(.3, 800, 5000, .2), .16, -.5)
for k in range(4):
    m.pon(E["divide"] + .05 + k * .06, paso(700), .3, -.6 + k * .1)


# 2. las carreras: un paso por salto (se adelgaza la ganancia para que no sea ruido), meta y caídas
def suena_carrera(C, base):
    for j, b in enumerate(C):
        ultimo = b["para"]
        for k in range(ultimo):
            if k % 2 == 0 or k == ultimo - 1:
                m.pon(b["t0"] + k * b["dt"] + .05, paso(base + 40 * j), .16, -.7 + j * .14)
        if ultimo == 32:                                   # el último salto dura 0.2 s: suena al caer en la meta
            m.pon(b["llega"] + .2, golpe(120, 70, .22, .5), .5, .2)
            m.pon(b["llega"] + .2, tic(.03, 2000, 6000), .2, .2)
        else:
            m.pon(b["cae"], golpe(80, 46, .25, .15), .35, -.4 + j * .08)
            m.pon(b["cae"], soplo(.25, 200, 1200, .3), .08)


suena_carrera(E["c1"], 900)
m.pon(E["reset"], soplo(.6, 300, 3000, .4), .18)
suena_carrera(E["c2"], 1050)

# 3. el reloj de arena
m.pon(E["pan1"], soplo(1.2, 200, 1800, .5), .16)
nuevos = [1, 2, 4, 8]
for i, t in enumerate(E["reloj"]):
    for k in range(nuevos[i]):
        m.pon(t + k * .06, vidrio(2400 + 160 * k + 200 * i), .3 - .02 * i, -.3 + .2 * i)
m.pon(E["reloj"][0], arena(E["pan2"] - E["reloj"][0]), .5)
m.pon(E["duracion"] - .15, soplo(.45, 400, 2400, .4), .14)          # el reloj se voltea
m.pon(E["duracion"] + .3, vidrio(2100), .4)
m.pon(E["meses"], trazo(.8, 300, 600), .14)
m.pon(E["recientes"] - .1, trazo(1.1, 260, 520), .16)
for k in range(3):
    m.pon(E["supera"] + .1 + k * .14, paso(1300 + 120 * k), .35, .4)
m.pon(E["supera"] + .45, campana((1568, 2349), .9, (.4, .2)), .2, .4)

# 4. los modelos abiertos
m.pon(E["pan2"], soplo(1.1, 200, 1800, .5), .16)
m.pon(E["abiertos"], campana((783.99, 1174.7), .6, (.3, .15)), .14, -.3)
m.pon(E["atras"], trazo(.7, 280, 420), .14)
m.pon(E["pocos"], toc(700), .25, .3)
for j, ta in enumerate(E["avanza"]):
    for k in range(11):
        if k % 2 == 0:
            m.pon(ta + k * E["avanza_dt"] + .05, toc(1100 + 50 * j), .08, -.4 + .2 * j)
for k in range(26):
    m.pon(E["cualquiera"] + .05 + k * .028, paso(600 + 30 * (k % 5)), .22, rng.uniform(-.7, .7))
m.pon(E["cualquiera"], golpe(100, 55, .3, .2), .3)

# 5. el freno: la música se detiene, todo derrapa y una pesa cae en la balanza
m.pon(E["freno0"] - .05, derrape(.5), .3)
m.pon(E["freno0"] - .2, hoja(.6), .2)
m.pon(E["pesa"], golpe(52, 30, .6, .5), .8)
m.pon(E["pesa"], crujido(.15, 1200, 5000, .995), .14)
m.pon(E["pesa"] + .1, chirrido(1.3), .5, .2)
m.pon(E["igual"] + .15, golpe(90, 60, .5, .05), .3)
m.pon(E["sindef"] - .3, hoja(.6), .2)
for k in range(6):
    m.pon(E["defensores"] + .05 + k * .08, toc(500 - 25 * k), .16, -.6 + .24 * k)
m.pon(E["activos"] + .2, soplo(.6, 150, 900, .3), .2)

# 6. el edificio y el calendario
m.pon(E["pan3"], soplo(1.3, 200, 1800, .5), .16)
for k in range(int((E["tilt"] - E["pan3"]) / .21)):
    m.pon(E["pan3"] + .6 + k * .21, toc(320 + 30 * (k % 2)), .06, -.6)
m.pon(E["nosabe"], toc(600), .2)
m.pon(E["traslada"], trazo(1.0, 300, 680), .16)
m.pon(E["traslada"] + .9, sello(), .5)
m.pon(E["defendidos"], campana((392, 587.3), .8, (.3, .15)), .12, -.4)
m.pon(E["fecha"] - .2, hoja(.45), .25, .3)
m.pon(E["fecha"] + .05, golpe(140, 80, .12, .5), .3, .3)
m.pon(E["fecha"] + .3, pluma(.45), .35, .3)
m.pon(E["adivinando"], pluma(.22), .5, .3)
m.pon(E["adivinando"] + .26, pluma(.22), .5, .3)

# 7. el muro: la defensa encuentra, la fila espera, una mano tapa
m.pon(E["tilt"], soplo(1.0, 160, 1500, .55), .12)
for t in E["hall"]:
    m.pon(t, tic(.02, 3000, 8000), .18, rng.uniform(-.6, .1))
    m.pon(t + .01, golpe(200, 140, .05, .6), .12, -.3)
for t in E["parches"]:
    m.pon(t, parche(), .42, .5)
m.pon(E["noes"] + .1, pluma(.4), .3)
for t in E["ataques"]:
    m.pon(t, crujido(.16, 1500, 7000, .995), .12, -.4)
    m.pon(t, golpe(120, 70, .12, .4), .25, -.4)
m.pon(E["vimos"], sello(), .8)
# la carrera: cada ficha salta una casilla
for t in E["carrera_r"][:-1]:
    m.pon(t + .12, paso(1200), .4, -.3)
for t in E["carrera_p"][:-1]:
    m.pon(t + .12, paso(760), .4, .3)
m.pon(F + .12, golpe(64, 36, .8, .3), .75)
m.pon(F + .12, campana((196, 293.7, 392, 587.3), 2.8, (.7, .4, .25, .12)), .3)

# ---------- música: entra con el bajo en el primer salto, se FRENA con la voz, y el final de la pista
# (un corte con su cola, a los 112.08 s) cae justo en el empate ----------
DROP, FINAL = 16.08, 112.08
m.musica([("a29_ataques", DROP - .12, 0, E["freno"] + .05, .02, .14)])
# la cama quieta (la intro de la pista) acaba antes de que llegue su bajo, a los 16.08 s
m.musica([("a29_ataques", .2, E["pesa"] + .45, E["tilt"] + .4, 1.0, .5)], nivel=-19.5)
ini3 = FINAL - (F + .12 - E["tilt"])
m.musica([("a29_ataques", ini3, E["tilt"], m.dur, .35, 1.2)])
m.cierra()
