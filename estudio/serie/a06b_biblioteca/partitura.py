"""a06b: la biblioteca. Aquí vive el tiempo de la pieza: cada acción se calcula una vez y sale a `t.json`,
que la animación lee. Dibujo y sonido son los mismos números.

Un solo mundo: la mesa del capítulo 5 frente a una biblioteca que no se acaba. La bola va, busca y trae
tres páginas; luego la biblioteca se hunde y su piso se vuelve el mapa de significados. Al final la
biblioteca vuelve a levantarse: la imagen del principio, ya entendida.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

m = Mezcla("a06b_biblioteca", pausas={
    "así que hace": .55, "trae tres": .25, "a eso le": .25, "el truco": .35, "imagina un mapa": .5,
    "por eso encuentra": .2, "le pides": .3, "y te puede": .25, "parecido no": .3, "yo cuando": .4, "lo hace ir": .15,
}, cola=3.0).exporta_tiempos()
T = m.T

# ---------- inicios reales de la voz (el alineador estira palabras sobre el silencio) ----------
crudo = lee(m.dir / "_voz_larga.wav").mean(axis=1)
v = int(.02 * SR)
nivel = 20 * np.log10(np.sqrt(np.convolve(crudo ** 2, np.ones(v) / v, "same")) + 1e-9)
sil = nivel < -42
TR, ini = [], None
for k in range(0, len(sil), 240):
    if not sil[k] and ini is None:
        ini = k
    if sil[k] and ini is not None:
        j = k
        while j < len(sil) and sil[j] and j - k < int(.1 * SR):
            j += 240
        if j - k >= int(.1 * SR):
            TR.append((ini / SR, k / SR))
            ini = None
if ini is not None:
    TR.append((ini / SR, len(sil) / SR))


def arr(f, desde=0):
    """Inicio real de una frase: el arranque de voz más cercano al centro de su primera palabra."""
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - c))[0]


def fin(f, desde=0):
    x = T(f, desde).e
    return min(TR, key=lambda r: abs(r[1] - x))[1]


s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e

# ---------- el guion de acciones ----------
A = {}
A["bam"] = .3                                            # la carpeta de documentos cae sobre la mesa
A["preg"] = s("no se sabe") + .05
A["falta"] = arr("y no le hace")
A["flick"] = s("falta") + .05                            # la manda lejos de un manotazo
A["aprendio"] = arr("lo que aprendió")
A["fijo"] = s("fijo") + .02
A["entrenaron"] = s("entrenaron")
A["noconoce"] = arr("no conoce")
A["menu"] = s("menú")
A["familia"] = s("familia")
A["ayer"] = s("ayer")
A["mesa"] = arr("y en su mesa")
A["cabe"] = s("cabe")
A["biblio"] = s("biblioteca")
A["revela"] = s("biblioteca") + .1                       # aquí entra el pulso de la música
A["asi"] = arr("así que hace")
A["va"] = s("va")
A["busca"] = s("busca")
A["trae"] = arr("trae tres")
A["paginas"] = s("páginas")
A["pag"] = [s("páginas") + .02, s("páginas") + .2, s("páginas") + .38]
A["contesta"] = s("contesta")
A["leyendo"] = s("leyéndolas")
A["primero"] = arr("primero recupera")
A["recupera"] = s("recupera")
A["despues"] = arr("después escribe")
A["escribe"] = s("escribe")
A["eso"] = arr("a eso le")
A["rag"] = s("rag")
A["gen"] = s("generación")
A["aum"] = s("aumentada")
A["rec"] = s("recuperación")
A["bautizo"] = arr("así lo bautizó")
A["facebook"] = s("facebook")
A["veinte"] = s("veinte")
A["truco"] = arr("el truco")
A["como"] = s("cómo busca")
A["nobusca"] = arr("no busca palabras")
A["iguales"] = s("iguales")
A["signif"] = arr("busca significados")
A["parecidos"] = s("parecidos")
A["imagina"] = arr("imagina un mapa")
A["mapa"] = s("mapa")
A["lugar"] = s("lugar")
A["parecidas"] = s("parecidas")
A["cerca"] = s("cerca")
A["pastel"] = arr("pastel junto")
A["postre"] = s("postre")
A["pedazo"] = arr("cada pedazo")
A["documentos2"] = s("documentos", T("cada pedazo").i)
A["recibe"] = s("recibe")
A["pregunta"] = arr("tu pregunta")
A["tambien"] = s("también", T("tu pregunta").i)
A["trae2"] = arr("y trae lo que")
A["mascerca"] = s("más cerca")
A["lugares"] = arr("esos lugares")
A["vectores"] = s("vectores")
A["guardan"] = s("guardan")
A["base"] = s("base de datos")
A["vectorial"] = s("vectorial")
A["encuentra"] = arr("por eso encuentra")
A["pastel2"] = s("pastel", T("encuentra").i)
A["aunque"] = s("aunque")
A["postre2"] = s("postre", T("aunque").i)
A["tambien2"] = arr("y por eso también")
A["equivoca"] = s("equivoca")
A["equivocaF"] = fin("equivoca")
A["pides"] = arr("le pides")
A["sin"] = s("sin mariscos")
A["porque"] = s("porque tu mamá")
A["mama"] = s("mamá", T("porque tu mamá").i)
A["puede"] = arr("y te puede")
A["traer"] = s("traer")
A["marisq"] = s("marisquería")
A["enmapa"] = arr("en el mapa")
A["cerquisima"] = s("cerquísima")
A["parecido"] = arr("parecido no")
A["correcto"] = s("correcto")
A["yo"] = arr("yo cuando")
A["contestaAsi"] = s("contesta así")
A["veo"] = s("veo")
A["trajo"] = s("trajo")
A["saber"] = arr("porque rag no")
A["mas"] = s("saber más")
A["ir"] = arr("lo hace ir")
A["buscar"] = s("buscar", T("lo hace ir").i)
A["decirte"] = arr("y decirte")
A["donde"] = s("dónde lo sacó")
A["saco"] = s("sacó")
A["sacoF"] = fin("sacó")
A["fin"] = m.dur
A["cola"] = [A["sacoF"] + .1, A["sacoF"] + .38, A["sacoF"] + .66]    # los tres toques: 1, 2, 3

# Los libros que no caben: cada vez más seguidos, como granizo.
n, A["libros"] = 34, []
for i in range(n):
    u = i / (n - 1)
    A["libros"].append(round(A["cabe"] - .05 + (A["revela"] + .25 - A["cabe"]) * u ** .8, 3))
# Los pedazos de tus documentos caen al mapa.
A["pedazos"] = [round(A["recibe"] - .1 + i * .085, 3) for i in range(14)]
# Las ideas del mapa: brotan en racha.
A["ideas"] = [round(A["mapa"] + .05 + i * .045, 3) for i in range(40)]

(Path(m.dir).parents[1] / "remotion/src/serie/a06b/t.json").write_text(json.dumps({k: (round(x, 3) if isinstance(x, float) else x) for k, x in A.items()}), encoding="utf-8")


# ---------- foley propio ----------
def pega(f=170):
    """Papel que se estampa contra la mesa."""
    g = golpe(f, f * .55, .16, .9)
    x = banda(ruido(int(.05 * SR)), 900, 5200) * np.exp(-np.arange(int(.05 * SR)) / SR * 90)
    g[: len(x)] += x * .8
    return g


def libro(f=110):
    """Un libro cerrado que cae plano: golpe sordo de cartón."""
    g = golpe(f, f * .5, .22, .55)
    x = banda(ruido(int(.08 * SR)), 300, 2400) * np.exp(-np.arange(int(.08 * SR)) / SR * 60)
    g[: len(x)] += x * .6
    return g


def clic():
    g = golpe(180, 90, .09, .9)
    x = tic(.02, 2000, 6000) * .9
    g[: len(x)] += x
    return g


def roce(dur, lo=600, hi=4200):
    """Algo que se desliza sobre madera."""
    n_ = int(dur * SR)
    t = np.linspace(0, 1, n_)
    return banda(ruido(n_), lo, hi) * np.sin(np.pi * t) ** .5 * (1 - t) ** .6


def trinquete(dur):
    n_ = int(dur * SR)
    y = np.zeros(n_)
    x, p = 0., .09
    while x < dur - .02:
        s_ = tic(.018, 1500, 5200)
        i = int(x * SR)
        y[i:i + len(s_)] += s_[: n_ - i]
        x += p
        p = max(p * .93, .022)
    return y


def lapiz(dur, r=11):
    n_ = int(dur * SR)
    t = np.arange(n_) / SR
    env = (.5 + .5 * np.sin(2 * np.pi * r * t + 2 * np.sin(2 * np.pi * 3.1 * t))) ** 2
    return banda(ruido(n_), 2400, 9000) * env


def rasgado(dur=.34):
    n_ = int(dur * SR)
    t = np.linspace(0, 1, n_)
    tirones = .35 + .65 * (rng.random(n_ // 300 + 2)[np.minimum((np.arange(n_) / 300).astype(int), n_ // 300 + 1)] > .35)
    return banda(ruido(n_), 1200, 7000) * tirones * np.sin(np.pi * t ** .6) ** .8 + banda(ruido(n_), 300, 1400) * np.exp(-t * 6) * .4


def hundir(dur):
    """Los libreros que bajan al piso: un retumbo grave que rueda."""
    n_ = int(dur * SR)
    t = np.linspace(0, 1, n_)
    r = 1 + .5 * np.sin(2 * np.pi * 9 * t * dur)
    return banda(ruido(n_), 40, 320) * r * np.sin(np.pi * t) ** .6


def pinza():
    """Tenaza de cangrejo: dos chasquidos secos."""
    y = np.zeros(int(.2 * SR))
    for k, f in ((0, 2600), (.08, 3100)):
        s_ = toc(f) * .8
        i = int(k * SR)
        y[i:i + len(s_)] += s_[: len(y) - i]
    return y


# ---------- gancho ----------
m.pon(0, soplo(.32, 200, 1800, .95), .34)
m.pon(A["bam"], golpe(60, 30, .8, .45), 1.0)
m.pon(A["bam"], lluvia(.7, 34), .18)
m.pon(A["bam"] + .02, rasgado(.3), .12)
m.pon(A["preg"], tic(.03, 1800, 5000), .3)
m.pon(A["falta"] + .1, toc(300), .3)
m.pon(A["flick"], roce(.5), .4)
m.pon(A["flick"] + .55, golpe(70, 36, .4, .2), .3)
m.pon(A["aprendio"], soplo(.5, 300, 1700, .4), .2)
m.pon(A["aprendio"] + .3, trinquete(A["fijo"] - A["aprendio"] - .3), .3)
m.pon(A["fijo"], clic(), .72)
m.pon(A["fijo"], golpe(74, 36, .6, .3), .6)
for k, f in ((A["menu"], 620), (A["familia"], 700), (A["ayer"], 780)):
    m.pon(k, toc(f), .32)
    m.pon(k, trazo(.3, 500, 800), .12)
# ---------- no cabe ----------
m.pon(A["mesa"], soplo(.8, 250, 2200, .6), .22)
for i, x in enumerate(A["libros"]):
    m.pon(x, libro(100 + (i % 6) * 18), .18 + .26 * (1 - i / len(A["libros"])), .5 * np.sin(i * 2.1))
m.pon(A["revela"] - .3, soplo(1.4, 200, 3000, .25), .5)
m.pon(A["revela"], golpe(48, 26, 1.3, .1), .7)
m.pon(A["revela"] + .05, campana((98, 147, 196), 2.4, (.6, .3, .15)), .22)
# ---------- va, busca, trae ----------
for k, x in enumerate(A["libros"][:12]):
    m.pon(A["asi"] + .2 + k * .06, soplo(.25, 600, 3600, .6), .05, .4 * np.sin(k))
m.pon(A["va"] - .05, toc(260), .4)
m.pon(A["va"] + .52, golpe(90, 44, .3, .3), .5)
m.pon(A["va"] + .92, golpe(90, 44, .2, .2), .25)
m.pon(A["busca"] - .05, roce(.45, 800, 4800), .3)
m.pon(A["busca"] + .35, soplo(.4, 500, 3600, .6), .2)
m.pon(A["trae"] - .05, toc(300), .4)
for i, x in enumerate(A["pag"]):
    m.pon(x, pega(160 + i * 30), .6, (-.4, 0, .4)[i])
m.pon(A["leyendo"], lapiz(A["primero"] - A["leyendo"] - .1), .1)
m.pon(A["recupera"], golpe(84, 42, .3, .3), .45)
m.pon(A["escribe"], golpe(96, 48, .3, .3), .45)
# ---------- RAG ----------
for k, x in enumerate((A["rag"] - .05, A["rag"] + .12, A["rag"] + .29)):
    m.pon(x, golpe(120 - k * 12, 60, .3, .6), .6)
for k in ("gen", "aum", "rec"):
    m.pon(A[k], tic(.03, 2000, 6000), .3)
    m.pon(A[k], trazo(.35, 400, 800), .1)
m.pon(A["facebook"] - .15, soplo(.2, 400, 3000, .9), .25)
m.pon(A["facebook"], golpe(84, 40, .4, .7), .75)
m.pon(A["facebook"], clic(), .3)
# ---------- cómo busca ----------
m.pon(A["truco"] - .1, toc(280), .3)
m.pon(A["truco"] + .77, golpe(90, 44, .3, .3), .45)
m.pon(A["iguales"], trazo(.25, 900, 700), .2)
m.pon(A["iguales"] + .05, tic(.03, 1500, 4500), .3)
m.pon(A["parecidos"], campana((659, 988), 1.0, (.5, .25)), .18)
# ---------- el mapa ----------
m.pon(A["imagina"] - .2, hundir(1.8), .9)
m.pon(A["imagina"] + .3, soplo(1.4, 300, 2600, .5), .3)
for i, x in enumerate(A["ideas"]):
    m.pon(x, toc(900 + (i * 137) % 1400), .05 + .07 * (i % 3 == 0), .6 * np.sin(i * 1.7))
m.pon(A["parecidas"], trazo(.8, 300, 600), .12)
m.pon(A["pastel"], toc(660), .3)
m.pon(A["postre"], toc(880), .3)
m.pon(A["pedazo"] - .2, soplo(.5, 300, 2600, .7), .3)
m.pon(A["pedazo"] + .25, rasgado(.5), .4)
for i, x in enumerate(A["pedazos"]):
    m.pon(x, pega(220 + (i % 4) * 30), .14, .5 * np.sin(i * 2.3))
m.pon(A["pregunta"] - .15, soplo(.3, 400, 3000, .8), .25)
m.pon(A["tambien"], golpe(110, 56, .3, .5), .55)
m.pon(A["trae2"], trazo(.9, 300, 900), .2)
m.pon(A["mascerca"] + .1, soplo(.6, 500, 3600, .4), .22)
for k in range(3):
    m.pon(A["mascerca"] + .12 + k * .1, tic(.03, 2000, 6000), .26)
for k in range(4):
    m.pon(A["vectores"] - .05 + k * .1, trazo(.18, 600, 1200), .14)
m.pon(A["guardan"], golpe(70, 34, .5, .2), .4)
m.pon(A["base"] - .1, roce(.4, 300, 2000), .3)
m.pon(A["vectorial"] + .2, clic(), .35)
m.pon(A["pastel2"], campana((784, 1175), 1.2, (.5, .22)), .22)
# ---------- se equivoca ----------
m.pon(A["equivoca"], golpe(52, 28, 1.0, .1), .7)
m.pon(A["pides"] + .2, lapiz(A["porque"] - A["pides"] - .1, 13), .13)
m.pon(A["mama"], pega(130), .6)
m.pon(A["puede"] - .1, soplo(.4, 400, 3000, .8), .3)
m.pon(A["traer"] + .05, golpe(110, 56, .3, .5), .45)
m.pon(A["traer"] + .1, soplo(.4, 500, 3600, .5), .2)
for k in range(3):
    m.pon(A["traer"] + .44 + k * .05, pega(170 + k * 25), .4)
m.pon(A["marisq"] + .16, pinza(), .45)
m.pon(A["marisq"] + .64, golpe(130, 70, .12, .5), .25)
m.pon(A["marisq"] + .9, pinza(), .3)
m.pon(A["enmapa"], soplo(.6, 300, 2400, .5), .2)
m.pon(A["cerquisima"], tic(.03, 1800, 5000), .3)
m.pon(A["cerquisima"] + .12, tic(.03, 1800, 5000), .3)
m.pon(A["correcto"], golpe(62, 30, .6, .2), .55)
m.pon(A["correcto"] + .3, pinza(), .2)
# ---------- reviso las páginas ----------
m.pon(A["yo"] - .12, toc(300), .3)
m.pon(A["yo"] + .58, golpe(84, 42, .3, .3), .45)
m.pon(A["veo"], soplo(.5, 500, 3000, .5), .2)
m.pon(A["trajo"] + .35, roce(.5), .35)
m.pon(A["mas"], clic(), .5)
m.pon(A["ir"] + .05, toc(280), .35)
m.pon(A["ir"] + .5, golpe(90, 44, .2, .2), .3)
m.pon(A["buscar"] + .05, toc(300), .25)
m.pon(A["buscar"] + .6, golpe(90, 44, .25, .25), .35)
m.pon(A["decirte"] - .05, pega(150), .5)
m.pon(A["decirte"] + .3, toc(320), .25)
m.pon(A["decirte"] + .66, golpe(96, 48, .2, .2), .25)
for k, x in enumerate(A["cola"]):
    m.pon(x, toc(660 + k * 120), .34)
    m.pon(x, tic(.03, 2000, 6000), .2)
m.pon(A["cola"][-1] + .2, campana((261.6, 392, 523), 2.2, (.6, .32, .16)), .2)

# El foley se aparta de la voz: bajo cada palabra baja a la mitad y en las pausas pega completo.
_v = np.abs(m.voz[:, 0])
_k = int(.03 * SR)
_e = np.sqrt(np.convolve(_v ** 2, np.ones(_k) / _k, "same"))
_act = np.clip((20 * np.log10(_e + 1e-9) + 42) / 14, 0, 1)
_act = np.convolve(_act, np.ones(int(.14 * SR)) / int(.14 * SR), "same")
_g = np.ones(m.N)
_n = min(m.N, len(_act))
_g[:_n] = 1 - .55 * _act[:_n]
m.fx *= _g[:, None]

# Música: el pulso entra cuando aparece la biblioteca; se cae a un colchón quieto cuando se equivoca,
# y vuelve con el cierre para apagarse con la pieza.
m.musica([
    ("a06b_biblioteca", 24 - A["revela"], 0, A["equivocaF"] + .05, .05, .06),
    ("a06b_biblioteca", 3, A["pides"] - .2, A["yo"] + .1, .6, .3),
    ("a06b_biblioteca", 108.6 - (m.dur - A["yo"]), A["yo"], m.dur, .5, 2.6),
])
m.cierra()
