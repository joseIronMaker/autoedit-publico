"""Epílogo. Imagen y sonido leen los mismos eventos: esta partitura deja t.json y la pieza lo importa.

Todos los cortes y números salen de tiktoken (o200k_base, el tokenizador de GPT-4o), aquí mismo:
ninguno está escrito a mano en la animación.
"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *
import tiktoken

ENC = tiktoken.get_encoding("o200k_base")
PAUSAS = {
    "te simplifiqué": .2, "no ve palabras": .1, "antes de leer": .4, "fiesta es": .45, "inolvidable son": .25,
    "a cada pedazo": .3, "y no los ve": .15, "en gpt-4o": .3, "lo que el modelo": .85, "y quién decidió": .35,
    "un programa leyó": .3, "se llama bpe": .5, "por eso lo común": .3, "y por eso por años": .35, "él ve cuatro": .35,
    "esto importa": .45, "así que ese": .35, "no aprendió": .3, "aprendió con pedacitos": .4,
}
m = Mezcla("c13_tokens", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
if "--tiempos" in sys.argv:
    for w in m.W:
        print(f"{w['w']}@{w['s']:.2f}", end=" ")
    print("\nDUR", m.dur)
    raise SystemExit

s = lambda f, o=0, d=0: round(T(f, d).s + o, 3)
e = lambda f, o=0, d=0: round(T(f, d).e + o, 3)
r3 = lambda x: round(float(x), 3)


def toks(txt):
    ids = ENC.encode(txt)
    return [[ENC.decode([i]), i] for i in ids]


def bpe(palabra):
    """Las fusiones reales de o200k_base, en su orden (rango = id = orden en que se aprendieron).
    Los dos bytes de la «ó» se juntan antes de mostrarse: la animación empieza en letras, no en bytes."""
    R = ENC._mergeable_ranks
    partes = [ch.encode() for ch in palabra]          # la «ó» ya entra como una letra (sus dos bytes se funden en el rango 531)
    pasos = []
    while True:
        mejor = None
        for i in range(len(partes) - 1):
            r = R.get(partes[i] + partes[i + 1])
            if r is not None and (mejor is None or r < mejor[0]):
                mejor = (r, i)
        if mejor is None:
            break
        r, i = mejor
        partes = partes[:i] + [partes[i] + partes[i + 1]] + partes[i + 2:]
        pasos.append([r, [p.decode("utf-8", "replace") for p in partes]])
    return [ch for ch in palabra], pasos


# ---------- los datos: medidos aquí, nunca escritos a mano ----------
FRASE = toks("la máquina aprendió a adivinar con nuestras palabras.")
FIESTA, INOL, OTO = toks(" fiesta"), toks(" inolvidable"), toks(" otorrinolaringólogo")
FERRO = toks(" ferrocarril")
PERRO = toks(" perro")
assert [p[0] for p in INOL] == [" inol", "vid", "able"] and len(OTO) == 5 and len(FIESTA) == 1 and PERRO[0][1] == 96439
assert [p[0] for p in FERRO] == [" fer", "roc", "arr", "il"]
PUENTE = toks("En la siguiente serie, la máquina empieza a actuar, y todo se mide en tokens: cuánto cabe en su mesa, cuánto cuesta cada paso.")
FINAL = toks("Aprendió con pedacitos que nosotros nunca vemos.")
# La lista del c11, ahora en pedazos: lo que sigue a « ad» en palabras reales (adivinar, adentro, adorar).
LISTA = [toks(" adivinar")[1], toks(" adentro")[1], toks(" adorar")[1]]
assert [p[0] for p in LISTA] == ["iv", "entro", "orar"]
BPE_P, BPE_O = bpe(" perro"), bpe(" otorrinolaringólogo")
assert BPE_P[1][-1][1] == [" perro"] and BPE_O[1][-1][1] == [p[0] for p in OTO]
VOCAB = ENC.n_vocab

# ---------- los tiempos con nombre ----------
i_la = T("la máquina").i
K = dict(
    voz0=0.0, la=s("la máquina"), pal=s("nuestras palabras"), fin1=e("nuestras palabras"),
    simp=s("te simplifiqué", -.12), negro=s("no ve", -.04), novepal=s("palabras", 0, T("no ve").i), antes=s("antes de leer", -.06), leer=s("leer"),
    corta=s("corta"), pedazos=s("pedazos"), pedazosE=e("pedazos"),
    fiesta=s("fiesta"), pedazo=s("un pedazo"), inolv=s("inolvidable"), son=s("son tres"), tres=s("tres"), inol=s("inol", 0, T("tres").i), vid=s("vid"), able=s("able"),
    oto=s("otorrinolaringólogo"), otoE=e("otorrinolaringólogo"), cinco=s("cinco"),
    cada=s("a cada pedazo"), token=s("token"), tokenE=e("token"), noLos=s("y no los ve"), letras=s("letras"), cadaT=s("cada token"), numero=s("número"), numeroE=e("número"), lista=s("una lista fija"), fija=s("fija"),
    gpt=s("gpt-4o"), openai=s("openai"), tiene=s("la lista tiene"), dosc=s("doscientas"), piezas=s("piezas"),
    perro=s("perro es"), noventa=s("noventa"), nueve=s("nueve"), nueveE=e("nueve"),
    modelo=s("lo que el modelo"), adivina=s("adivina", 0, T("lo que el modelo").i), real=s("en realidad"), sig=s("siguiente token"), sigE=e("siguiente token"), despues=s("después se traduce"), traduce=s("traduce"), texto=s("a texto"), textoE=e("a texto"),
    quien=s("y quién decidió"), cortar=s("dónde cortar"), cortarE=e("dónde cortar"), nadie=s("nadie"), mano=s("a mano"), manoE=e("a mano"),
    programa=s("un programa"), montanas=s("montañas"), textoM=e("de texto", 0, T("montañas").i), pegando=s("fue pegando"), juntos=e("juntos"),
    bpe=s("se llama bpe"), bpeW=s("bpe"), codif=s("codificación"), bytes=e("bytes"),
    comun=s("lo común"), entero=s("entero"), raro=s("lo raro"), rompe=s("se rompe"), rompeE=e("se rompe"),
    porAnos=s("y por eso por años"), costo=s("costó"), contar=s("contar letras"), contarE=e("contar letras"),
    cuantas=s("cuántas erres"), ferro=s("ferrocarril"), ferroE=e("ferrocarril"), el=s("él ve"), cuatro=s("cuatro pedazos"), cuatroE=e("cuatro pedazos"), lasLetras=s("las letras quedan"), escond=s("escondidas"), adentro=e("adentro"),
    importa=s("esto importa"), parece=e("parece"), sigSerie=s("en la siguiente serie"), actuar=s("actuar"), tokens=s("tokens", 0, T("se mide").i), cabe=s("cuánto cabe"), mesa=s("mesa"), cuesta=s("cuánto cuesta"), paso=e("paso"),
    asi=s("así que ese"), secreto=s("secreto"), secretoE=e("secreto"), noApr=s("no aprendió"), nuestras2=s("nuestras palabras", 0, T("no aprendió").i), nuestrasE=e("nuestras palabras", 0, T("no aprendió").i),
    apr=s("aprendió con pedacitos"), con2=s("con pedacitos"), pedacitos=s("pedacitos"), que=s("que nosotros"), nosotros=s("nosotros"), nunca=s("nunca vemos"), vemos=s("vemos"), fin=e("vemos"), dur=m.dur,
)

# 1. La bola cae en el cuadro 0 y lee palabra por palabra (todavía cree en palabras).
K["caida"] = {"t0": -.18, "h": 3.2, "rest": .44, "g": 30}
PAL1 = ["la", "máquina", "aprendió", "a", "adivinar", "con", "nuestras", "palabras"]
K["hops"] = [s(w, 0, i_la) for w in PAL1]
K["amago"] = [.78]
# 2. Rebobinado y el negro: las rayas de corte se dibujan en el orden de la tira.
K["rebob"] = K["simp"] + .05
K["rayas"] = [r3(K["novepal"] - .25 + k * .085) for k in range(len(FRASE) - 1)]
# 3. Las tijeras: once cortes que se aceleran.
a, b = K["corta"] + .02, K["pedazosE"] + .22
K["snips"] = [r3(a + (b - a) * (k / 10) ** .82) for k in range(11)]
K["bajan"] = K["antes"] + .12
# 4. Fiesta pasa entera; inolvidable, dos cortes; otorrinolaringólogo, cuatro de metralleta.
K["sInol"] = [r3(K["son"] + .02), r3(K["tres"] + .04)]
K["hInol"] = [K["inol"], K["vid"], K["able"]]
o0, o1 = K["oto"] + .12, K["otoE"] - .02
K["sOto"] = [r3(o0 + (o1 - o0) * k / 3) for k in range(4)]
# 6. Cada pedazo se voltea: es un número.
f0, f1 = K["cadaT"] - .05, K["numeroE"] + .05
K["flips"] = [r3(f0 + (f1 - f0) * k / 8) for k in range(9)]
K["vuelan"] = r3(K["lista"] + .05)
# 8. Perro: el cajón se abre.
K["abre"] = r3(K["nueveE"] - .02)
# 9. La lista del c11: el ganador vuelve a ser texto.
K["gana"] = r3(K["sigE"] - .1)
K["vuelve"] = r3(K["traduce"] - .05)
# 10. La pluma.
K["traza"] = [r3(K["nadie"] + .05 + k * .14) for k in range(4)]
K["tacha"] = r3(K["mano"] + .05)
# 11. BPE: las fusiones reales, repartidas en orden mientras «fue pegando… juntos».
ev = [(r, 0, st) for r, st in BPE_P[1]] + [(r, 1, st) for r, st in BPE_O[1]]
ev.sort(key=lambda x: x[0])
g0, g1 = K["pegando"] - .05, K["juntos"] + .45
K["fusiones"] = [[r3(g0 + (g1 - g0) * (k / (len(ev) - 1)) ** .9), w, st, r] for k, (r, w, st) in enumerate(ev)]
K["letrasP"], K["letrasO"] = BPE_P[0], BPE_O[0]
# 13. Ferrocarril: la bola salta caja por caja.
c0 = K["cuatro"]
K["cajasH"] = [r3(c0 - .3 + k * .26) for k in range(4)]
K["snF"] = [r3(K["ferroE"] + .12 + k * .13) for k in range(3)]
# 14. La mesa: cada pedazo cae cuando la voz dice su palabra.
iS = T("en la siguiente serie").i
caen, j = [], iS
for txt, tid in PUENTE:
    limpio = txt.strip()
    if limpio and limpio[0].isalnum():
        caen.append(r3(m.W[j]["s"] + .02)); j += 1
    else:
        caen.append(r3(m.W[j - 1]["e"] - .02))
K["caen"] = caen
# 15. El final: números que se voltean a texto con la voz, y las costuras que se cierran.
iA = T("aprendió con pedacitos").i
fl, j = [], iA
for k, (txt, tid) in enumerate(FINAL):
    if txt in ("end", "ió", "ac", "itos"):
        a_ = m.W[j - 1]
        n = {"end": 3, "ió": 3, "ac": 3, "itos": 3}[txt]
        q = {"end": 1, "ió": 2, "ac": 1, "itos": 2}[txt]
        fl.append(r3(a_["s"] + (a_["e"] - a_["s"]) * q / n))
    elif txt == ".":
        fl.append(r3(m.W[j - 1]["e"] + .1))
    else:
        fl.append(r3(m.W[j]["s"])); j += 1
K["flipsF"] = fl
K["cierra"] = r3(K["fin"] + .15)
K["cae"] = r3(K["fin"] + .55)
K["datos"] = dict(frase=FRASE, fiesta=FIESTA, inol=INOL, oto=OTO, ferro=FERRO, perro=PERRO, puente=PUENTE, final=FINAL, lista=LISTA, vocab=VOCAB)
(RAIZ / "remotion/src/serie/c13/t.json").write_text(json.dumps(K, ensure_ascii=False), encoding="utf-8")
print("tiempos escritos")


# ---------- foley: nace de los mismos tiempos que la imagen ----------
def tijera(brillo=1.0):
    """Dos hojas de acero que se cierran: chasquido, roce y un timbre corto."""
    t = np.arange(int(.2 * SR)) / SR
    timbre = (np.sin(2 * np.pi * 3170 * t) * .5 + np.sin(2 * np.pi * 4790 * t) * .3 + np.sin(2 * np.pi * 7020 * t) * .18) * np.exp(-t * 34)
    clic = banda(ruido(len(t)), 2400, 11000) * np.exp(-t * 240)
    roce = banda(ruido(len(t)), 1300, 5200) * np.exp(-t * 55) * .32
    cuerpo = np.sin(2 * np.pi * np.cumsum(180 + 160 * np.exp(-t * 60)) / SR) * np.exp(-t * 45) * .35
    return timbre * .22 * brillo + clic * .9 + roce + cuerpo


def papel(dur=.11):
    t = np.arange(int(dur * SR)) / SR
    e = np.minimum(t / .008, 1) * np.exp(-t * 34)
    return banda(ruido(len(t)), 600, 3800) * e


def rodar(dur, lo=90, hi=520):
    n = int(dur * SR)
    x = banda(ruido(n), lo, hi)
    e = np.sin(np.linspace(0, np.pi, n)) ** .7 * (1 + .35 * np.sin(np.linspace(0, dur * 2 * np.pi * 6, n)))
    return x * e * .8


cd = K["caida"]
# 1. la bola cae y lee
for k, tb in enumerate(rebotes(cd["t0"], cd["h"], cd["rest"], cd["g"])[:5]):
    if tb > 0:
        m.pon(tb, golpe(92, 44, .42, .22), .85 * cd["rest"] ** k)
m.pon(.1, soplo(.5, 900, 5200, .7), .14, .5)
m.pon(K["amago"][0], tijera(1.2), .5, .45)
m.pon(1.28, soplo(.55, 700, 4200, .3), .1, .5)
for k, h in enumerate(K["hops"]):
    m.pon(h, golpe(118, 62, .16, .35), .2, -.25 + .07 * k)
    m.pon(h, toc(480 + 40 * k), .1, -.25 + .07 * k)
m.pon(K["pal"] - .05, campana((523.25, 784.0), 1.4, (.7, .3)), .14)
m.pon(K["rebob"], soplo(.62, 300, 2600, .5), .3)
for j in range(14):
    m.pon(K["rebob"] + .05 + j * .04, tic(.02, 1600, 4200), .12)
m.pon(K["rebob"] + .62, golpe(96, 46, .36, .25), .5)
# 2. el negro
m.pon(K["negro"], golpe(52, 28, 1.3, .05), 1.1)
m.pon(K["negro"] + .2, soplo(K["antes"] - K["negro"] + .1, 60, 420, .35), .16)
for x in K["rayas"]:
    m.pon(x, tic(.03, 1500, 5200), .26)
    m.pon(x + .01, trazo(.18, 700, 1100), .05)
# 3. las tijeras bajan y cortan
m.pon(K["antes"], soplo(.5, 250, 2200, .4), .24, .3)
for j in range(10):
    m.pon(K["antes"] + .05 + j * .045, tic(.02, 1500, 4000), .1)
m.pon(K["bajan"] - .05, soplo(.45, 800, 6000, .75), .22, .35)
m.pon(K["bajan"] + .4, golpe(150, 90, .12, .8), .3, .35)
for k, sn in enumerate(K["snips"]):
    m.pon(sn - .01, tijera(1 - k * .03), .62, .3)
    m.pon(sn + .02, golpe(130, 70, .1, .2), .22)
m.pon(K["snips"][-1] + .05, soplo(.55, 300, 2400, .3), .18, -.3)
# 4. los tres ejemplos
for a in (K["fiesta"] - .85, K["sInol"][0] - .65, K["sOto"][0] - .65):
    m.pon(a, soplo(.35, 700, 5200, .7), .14, .35)
m.pon(K["fiesta"] - .6, soplo(.8, 220, 1800, .3), .16, .4)
m.pon(K["fiesta"] - .1, tic(.04, 2600, 7000), .26, .35)
m.pon(K["pedazo"] + .05, golpe(118, 60, .2, .3), .4)
m.pon(K["pedazo"] + .05, toc(620), .2)
m.pon(K["inolv"] - .5, soplo(.7, 220, 1800, .3), .16, .4)
for sn in K["sInol"]:
    m.pon(sn - .01, tijera(), .6, .3)
for k, h in enumerate(K["hInol"]):
    m.pon(h, golpe(118, 60, .2, .3), .38)
    m.pon(h, toc(523.25 * [1, 1.25, 1.5][k]), .22)
m.pon(K["oto"] - .55, soplo(.7, 220, 1800, .3), .16, .4)
for sn in K["sOto"]:
    m.pon(sn - .01, tijera(1.1), .58, .3)
for k in range(5):
    m.pon(K["cinco"] + k * .08, toc(523.25 * [1, 1.125, 1.25, 1.5, 1.68][k]), .2, -.4 + .2 * k)
    m.pon(K["cinco"] + k * .08, golpe(124, 64, .14, .3), .22)
for a in (K["inolv"] - .55, K["able"] + .55, K["sOto"][3] + .22):
    m.pon(a, soplo(.5, 400, 2600, .4), .13)
# 5-6. token y los números
m.pon(K["cada"] + .1, rodar(1.2), .32)
m.pon(K["cada"] - .15, soplo(.5, 800, 5200, .2), .14, .35)
m.pon(K["token"] - .05, campana((440, 659.3, 880), 1.8, (.8, .35, .15)), .2)
m.pon(K["token"] - .05, golpe(104, 52, .3, .3), .4)
m.pon(K["noLos"] + .05, golpe(96, 46, .3, .2), .3)
m.pon(K["letras"], golpe(100, 50, .3, .2), .26)
for k, f in enumerate(K["flips"]):
    m.pon(f, papel(), .3, -.4 + .1 * k)
    m.pon(f + .17, tic(.03, 2000, 6000), .24)
    m.pon(f + .3, toc(700 + 30 * k), .08)
# 7. la cajonera
m.pon(K["vuelan"] - .1, soplo(1.1, 200, 2200, .35), .12)
for i in range(9):
    llega = K["vuelan"] + i * .06 + .75
    m.pon(llega, golpe(170, 90, .12, .8), .15 * (1 - i * .07), .3)
m.pon(K["gpt"], toc(392), .16)
m.pon(K["dosc"] - .15, trazo(1.6, 110, 260), .2)
m.pon(K["dosc"] - .15, soplo(1.6, 120, 900, .6), .14)
# 8. el vuelo hasta 96,439
a, b = K["perro"] - .1, K["nueve"] + .05
m.pon(a, soplo(b - a + .2, 200, 3000, .55), .1)
tt, k = a, 0
while tt < b:
    u = (tt - a) / (b - a)
    m.pon(tt, tic(.018, 3500, 9000), .03 + .04 * np.sin(np.pi * u), rng.uniform(-.6, .6))
    tt += .1 - .075 * np.sin(np.pi * u) ** .6
m.pon(K["nueve"] + .2, golpe(150, 80, .2, .7), .3)
m.pon(K["abre"], soplo(.45, 180, 900, .3), .3)
m.pon(K["abre"] + .45, golpe(140, 70, .2, .9), .5)
m.pon(K["abre"] + .2, trazo(.5, 300, 700), .1)
for k, tb in enumerate(rebotes(K["abre"] + .55, 2.2, .42, 30)[:4]):
    m.pon(tb, golpe(92, 44, .36, .2), .45 * .42 ** k)
m.pon(K["abre"] + .5, trazo(1.0, 200, 520), .08)
# 9. la lista
m.pon(K["modelo"] - .1, soplo(.55, 300, 2600, .5), .24)
m.pon(K["modelo"] + .1, golpe(70, 36, .5, .2), .4)
for k, x in enumerate([K["adivina"] - .05, K["adivina"] + .3, K["real"] + .1]):
    m.pon(x, toc(660 - 60 * k), .2)
    m.pon(x, golpe(120, 62, .16, .3), .26)
    m.pon(K["real"] - .1 + k * .12, trazo(.7, 300 + 60 * k, 700 + 60 * k), .07)
m.pon(K["sig"] - .1, campana((523.25, 784.0), 1.2, (.7, .3)), .14)
m.pon(K["gana"], soplo(.6, 500, 3600, .3), .2)
m.pon(K["gana"] + .6, golpe(118, 60, .2, .4), .4)
m.pon(K["vuelve"], papel(), .5)
m.pon(K["vuelve"] + .17, toc(784), .2)
m.pon(K["texto"], golpe(70, 36, .4, .2), .3)
# 10. nadie, a mano
m.pon(K["quien"] - .3, soplo(.5, 300, 2200, .4), .2)
for j in range(16):
    m.pon(K["quien"] + .1 + j * .19, tic(.02, 3000, 9000), .07, np.sin(j) * .5)
for x in K["traza"]:
    m.pon(x, trazo(.13, 900, 1400) * .4 + banda(ruido(int(.13 * SR)), 2000, 6000) * .25, .3)
m.pon(K["tacha"], soplo(.24, 900, 5200, .25), .3)
m.pon(K["tacha"] + .06, golpe(76, 38, .3, .3), .36)
m.pon(K["tacha"] + .15, soplo(.5, 600, 4000, .3), .12, .4)
# 11-12. BPE
m.pon(K["programa"] - .2, lluvia(K["pegando"] - K["programa"] + .2, 70), .2)
m.pon(K["programa"] - .2, soplo(1.2, 100, 700, .6), .2)
m.pon(K["pegando"] - .55, soplo(.5, 400, 3000, .6), .2)
for k, (x, w, st, r) in enumerate(K["fusiones"]):
    m.pon(x, toc(880 + 40 * (k % 6)), .2, -.2 if w == 0 else .2)
    m.pon(x, golpe(160, 90, .1, .9), .22, -.2 if w == 0 else .2)
m.pon(K["fusiones"][-1][0] + .1, campana((659.3, 987.8), 1.3, (.6, .3)), .14)
m.pon(K["bpeW"] - .05, golpe(104, 52, .3, .3), .4)
m.pon(K["bpeW"] - .05, campana((440, 659.3, 880), 1.8, (.8, .35, .15)), .18)
m.pon(K["codif"], trazo(.8, 300, 600), .06)
m.pon(K["comun"], toc(523.25), .2)
m.pon(K["raro"], toc(392), .2)
m.pon(K["rompe"], golpe(110, 48, .3, .6), .55)
m.pon(K["rompe"], soplo(.3, 900, 5200, .2), .3)
for k in range(5):
    m.pon(K["rompe"] + k * .05, tic(.03, 1800, 6000), .2)
# 13. ferrocarril
m.pon(K["porAnos"] - .1, soplo(.6, 300, 2400, .3), .2)
m.pon(K["porAnos"], rodar(1.1), .34)
m.pon(K["costo"], golpe(100, 50, .26, .2), .26)
m.pon(K["contar"] + .2, golpe(100, 50, .26, .2), .2)
m.pon(K["porAnos"] + .85, golpe(96, 48, .3, .5), .45)
for k in range(4):
    m.pon(K["cuantas"] + .45 + k * .1, toc(1046.5), .15, -.3 + .2 * k)
for x in K["snF"]:
    m.pon(x, tic(.05, 1200, 6000), .5)
    m.pon(x, golpe(140, 70, .12, .7), .3)
for k in range(4):
    m.pon(K["snF"][2] + .5 + k * .06, golpe(84, 42, .36, .5), .4, -.3 + .2 * k)
for k, h in enumerate(K["cajasH"]):
    m.pon(h, toc(240 + 20 * k), .4)
    m.pon(h, golpe(110, 56, .26, .4), .36)
m.pon(K["lasLetras"] - .05, polvo(1.0), .22)
m.pon(K["lasLetras"] + .1, campana((587.3, 880, 1174.7), 2.0, (.6, .3, .15)), .14)
# 14. la mesa
m.pon(K["importa"] - .1, soplo(.9, 160, 1600, .4), .3)
m.pon(K["importa"] + .4, golpe(64, 34, .6, .2), .45)
for k, x in enumerate(K["caen"]):
    m.pon(x, golpe(150, 90, .1, .6), .14)
    m.pon(x, papel(.08), .12, rng.uniform(-.5, .5))
    m.pon(x + .02, tic(.02, 4000, 9000), .05)
m.pon(K["cabe"] - .05, toc(523.25), .18)
m.pon(K["cuesta"] - .05, toc(659.3), .18)
# 15. pedacitos que nunca vemos
m.pon(K["asi"] - .2, soplo(1.0, 200, 2400, .3), .1)
m.pon(K["asi"] + .1, trazo(1.4, 200, 600), .05)
for i in range(12):
    m.pon(K["asi"] + .15 + i * .07, papel(.09), .1, rng.uniform(-.5, .5))
m.pon(K["secreto"] + .3, golpe(84, 42, .4, .2), .3)
NOTAS = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.5, 1396.9, 1568.0]
for i, x in enumerate(K["flipsF"]):
    m.pon(x, papel(), .34)
    m.pon(x + .1, toc(NOTAS[i] * .5), .16)
m.pon(K["cierra"], polvo(1.1), .2)
m.pon(K["cae"] - .75, rodar(.75, 140, 900), .3)
m.pon(K["cae"], golpe(110, 56, .3, .3), .4)
m.pon(K["cae"] + .02, campana((349.23, 523.25, 698.46), 3.4, (.8, .4, .18)), .16)

# ---------- música: un tramo antes del negro y otro que cae justo en el primer corte ----------
# Medido: intro -20 dB con pulso hasta 23 s; la subida entra en 24 s; meseta hasta 103 s; se apaga sola en 109 s.
OFF_A = 1.5
OFF_B = round(24.0 - K["snips"][0], 2)
FIN_M = m.dur - .9
m.musica([("c13_tokens", OFF_A, 0, K["negro"], .02, .03)], nivel=-25)
m.musica([("c13_tokens", OFF_B + K["antes"] - .05, K["antes"] - .05, FIN_M, .35, 3.0)], nivel=-25.5)
print(f"duración {m.dur:.2f} s · música {OFF_A} / {OFF_B}")
m.cierra()
