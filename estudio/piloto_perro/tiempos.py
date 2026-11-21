"""Convierte frases del guion en tiempos con nombre (t.json). Animación y sonido leen lo mismo."""
import json, re, sys, unicodedata
from pathlib import Path
aqui = Path(__file__).parent
FACTOR = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0     # velocidad aplicada a la voz
W = json.loads((aqui / "palabras.json").read_text(encoding="utf-8"))
def n(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))
N = [n(w["w"]) for w in W]
def busca(frase, desde=0):
    q = [n(x) for x in frase.split()]
    for i in range(desde, len(N) - len(q) + 1):
        if N[i:i + len(q)] == q:
            return i, i + len(q) - 1
    raise SystemExit(f"NO ESTÁ: {frase}")
F = dict(h_sabe="no sabe", h_perro="un perro", acaricia="nunca ha acariciado", leido="ni siquiera", palabra1="esa palabra",
  antes="antes de entrar", convierte="se convierte", punto="un punto", lugar="un lugar", mapa1="en un mapa", vive="perro vive",
  gato="gato muy cerca", platano="plátano", alla="hasta allá", nadie="nadie dibujó", formo="se formó", leyendo="leyendo miles",
  lecomer="le di de comer", cabeperro="ahí cabe perro", cabegato="ahí cabe gato", huecos="y dos palabras", acercando="se van acercando",
  poquito="un poquito", y2013="en dos mil trece", raro="algo raro", distancias="las distancias", significaban="significaban cosas",
  camino="el camino", hombre="de hombre", mujer="a mujer", casi="casi el mismo", rey="de rey", reina="reina", explico="nadie le explicó",
  dijo="nadie le dijo", saco="lo sacó", hablamos="cómo hablamos", llamamos="a cada uno", embedding="embedding", negro="y por eso también",
  esto="aprendió esto", n_hombre="hombre es a", n_prog="programador", n_mujer="lo que mujer", n_ama="ama de casa", inventado="no es un ejemplo",
  salio="salió de", publicaron="lo publicaron", tesis1="el mapa no sabe", tesis2="sabe lo que decimos", dim2="este que ves", miles="el de chatgpt",
  frase="y cada punto", truco="pero la idea", escribes="por eso cuando", nolee="no te lee", ubica="te ubica", ladra="te puede contar", cola="que mueve",
  puerta="que te espera", aunasi="y aun así")
# Pausas que se INSERTAN en la voz: dan tiempo a que la idea caiga. La lista la lee sonido.py.
PAUSAS = {"y por eso también": 1.15, "este que ves": .55}
cortes = []
W0 = [dict(w) for w in W]                  # el corte se mide en la toma original, sin pausas previas
for frase, dur in PAUSAS.items():
    i, _ = busca(frase)
    cuando = (W0[i - 1]["e"] + W0[i]["s"]) / 2
    cortes.append({"voz_s": round(cuando / FACTOR, 3), "dur": dur})
    for w in W[i:]:
        w["s"] = round(w["s"] + dur * FACTOR, 3); w["e"] = round(w["e"] + dur * FACTOR, 3)
(aqui / "cortes.json").write_text(json.dumps(cortes), encoding="utf-8")
T = {}
pos = 0
for k, f in F.items():
    i, j = busca(f, pos if k not in ("platano",) else pos)
    pos = i
    T[k] = round(W[i]["s"] / FACTOR, 3)
    T[k + "_fin"] = round(W[j]["e"] / FACTOR, 3)
T["fin"] = round(W[-1]["e"] / FACTOR, 3)
# Cierre: se repite la apertura ("no sabe qué es un perro") con el mismo audio del arranque.
T["eco_voz_ini"], T["eco_voz_fin"] = round(T["h_sabe"] - .03, 3), round(T["h_perro_fin"] + .14, 3)
T["eco"] = round(T["fin"] + .3, 3)
T["eco_fin"] = round(T["eco"] + T["eco_voz_fin"] - T["eco_voz_ini"], 3)
dst = aqui.parent / "remotion/src/perro"
(dst / "t.json").write_text(json.dumps(T, ensure_ascii=False, indent=0), encoding="utf-8")
(dst / "palabras.json").write_text(json.dumps([{**w, "s": round(w["s"] / FACTOR, 3), "e": round(w["e"] / FACTOR, 3)} for w in W], ensure_ascii=False), encoding="utf-8")
print("fin", T["fin"], "| negro", T["negro"], "| dim2", T["dim2"], "| palabras", len(W), "| ppm", round(len(W) / T["fin"] * 60, 1))
