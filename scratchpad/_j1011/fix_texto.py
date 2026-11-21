#!/usr/bin/env python3
"""Errores de Whisper que salieron al RELEER el texto de las 14 piezas (12-oct-2026) y que
no van al diccionario global de corta.py porque dependen de la frase («vas a ser
resistivo» → «va a ser», «facturar» → «fabricar» solo en p13). Cambia las palabras en
`<id>_palabras.json` respetando los tiempos: misma cantidad → 1:1; si cambia, la última
palabra nueva se queda con el resto del tramo. Es idempotente. Luego, `corta.py requemar`.

    .venv/bin/python scratchpad/_j1011/fix_texto.py <id-pieza> [...]
"""
import json
import sys
from pathlib import Path

PIEZAS = Path(__file__).resolve().parent / "piezas"
PUNT = " ,.¿?¡!:;"

TODAS = [("micro controlador", "microcontrolador"), ("Desculpen", "Disculpen"),
         ("Wifi", "Wi-Fi"), ("Octubre", "octubre"), ("PINES", "pines"),
         ("referentemente", "preferentemente")]
FIXES = {
    "p02": [("esta microcontrolador", "este microcontrolador"),
            ("no te enfoque bien", "no enfoqué bien")],
    "p03": [("corriente de alterna", "corriente alterna")],
    "p04": [("el diseño de mi electrónico", "el diseño electrónico")],
    "p05": [("nos recomiendo", "nos recomienda"),
            ("ya está siendo la IA", "ya está haciendo la IA")],
    "p07": [("déjenmela ver", "déjenme ver"), ("vamos a ser más pequeño", "vamos a hacer más pequeño"),
            ("Sería de todos modos", "Salir de todos modos"), ("lo va a ser por medio", "lo va a hacer por medio")],
    "p08": [("se me preferente a dos capas", "de preferencia a dos capas"),
            ("para que puede entender que le", "para que pueda entender qué le")],
    "p09": [("vas a ser resistivo", "va a ser resistivo"), ("vas a ser algo", "va a ser algo"),
            ("o vas a ser inductivo", "o va a ser inductivo"), ("conectado a la C", "conectado al ADC"),
            ("cuál va a hacer el diseño", "cuál va a ser el diseño"), ("Pero sí no puede", "Pero si no puede")],
    "p10": [("sumen sus diseños", "suben sus diseños"), ("devuelvo vacío", "devuelve vacío"),
            ("que está siendo la IA", "qué está haciendo la IA"), ("en Grandote", "en grandote")],
    "p11": [("empezó a ser computer use", "empezó a usar computer use"), ("oyes no", "oye, no")],
    "p12": [("la Vista 3D", "la vista 3D")],
    "p13": [("lo mando a facturar", "lo mando a fabricar"), ("dar facturación", "dar fabricación"),
            ("No incremento mucho", "No incrementó mucho"), ("rondándolos por 20 pesos", "rondando los 20 pesos")],
    "p14": [("nos detalle", "nos detalla"), ("estos herramientas", "estas herramientas"),
            ("llegó para quedar si no saben ir a ningún lado",
             "llegó para quedarse y no se va a ir a ningún lado")],
}


def limpia(p):
    return p.strip(PUNT).lower()


def aplica(pal, viejo, nuevo):
    v, n = viejo.split(), nuevo.split()
    cv = [limpia(x) for x in v]
    # la frase vieja puede venir ya fusionada en una palabra («3 MIL 800»)
    hechos, i = 0, 0
    while i < len(pal):
        k = len(v)
        if [limpia(x["word"]) for x in pal[i:i + k]] != cv:
            if limpia(pal[i]["word"]) == limpia(viejo) and len(v) > 1:
                k = 1
            else:
                i += 1
                continue
        tramo = pal[i:i + k]
        pre = tramo[0]["word"].strip()[: len(tramo[0]["word"].strip()) - len(tramo[0]["word"].strip().lstrip("¿¡"))]
        suf = tramo[-1]["word"].strip()[len(tramo[-1]["word"].strip().rstrip(",.?!:;")):]
        nuevas = []
        if len(n) <= k:
            for j in range(len(n) - 1):
                nuevas.append(dict(tramo[j], word=n[j]))
            nuevas.append({"word": n[-1], "start": tramo[len(n) - 1]["start"], "end": tramo[-1]["end"]})
        else:
            for j in range(k - 1):
                nuevas.append(dict(tramo[j], word=n[j]))
            nuevas.append(dict(tramo[-1], word=" ".join(n[k - 1:])))
        if pre and not nuevas[0]["word"].startswith(pre):
            nuevas[0]["word"] = pre + nuevas[0]["word"]
        if suf and not nuevas[-1]["word"].endswith(suf):
            nuevas[-1]["word"] += suf
        pal[i:i + k] = nuevas
        hechos += 1
        i += len(nuevas)
    return hechos


def main():
    for pid in sys.argv[1:]:
        f = next(PIEZAS.glob(f"{pid}*_palabras.json"))
        pal = json.loads(f.read_text(encoding="utf-8"))
        total = []
        for viejo, nuevo in TODAS + FIXES.get(pid[:3], []):
            if (h := aplica(pal, viejo, nuevo)):
                total.append(f"{viejo} → {nuevo} ×{h}")
        f.write_text(json.dumps(pal, ensure_ascii=False), encoding="utf-8")
        print(f"{pid[:3]}: " + ("; ".join(total) or "nada"), flush=True)


if __name__ == "__main__":
    main()
