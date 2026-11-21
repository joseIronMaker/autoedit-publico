"""Corrige palabras que Whisper oyó mal y quedaron QUEMADAS en los subtítulos.

Whisper no conoce el vocabulario del canal: "backpropagation" salió "bad propagation",
"token" salió "toque" y "Alexa" salió "Aletza". Son términos que el video ESTÁ
enseñando, así que el error se lee justo cuando más importa.

Toca únicamente el campo `word` de transcript.json (los tiempos no se mueven), así que
después basta re-ensamblar: `editor_grabados.py <stem> todo` reusa los paneles ya
renderizados y solo rehace subs.ass + el mux.

    .venv/bin/python scratchpad/corrige_transcripciones.py            # muestra
    .venv/bin/python scratchpad/corrige_transcripciones.py --aplicar  # escribe
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# stem -> [(lo que transcribió, lo que dijo)] sobre palabras SUELTAS, sin distinguir
# mayúsculas. Solo errores de oído: nunca se reescribe lo que José realmente dijo.
ARREGLOS = {
    "jose03": [
        ("Joe", "Yo,"), ("abra", "habla"), ("prontado.", "prompteado."),
    ],
    "jose04": [
        ("perecir", "predecir"), ("razos.", "rasgos."), ("non", "no"),
        ("-linealidad", "linealidad"), ("-linealidad.", "linealidad."),
        ("utilizaban?", "utilizaban?"),
    ],
    "jose05": [
        ("bad", "back"), ("propagation?", "propagation?"),
        ("fundación", "función"), ("prenden", "aprenden"),
    ],
    "jose07": [
        ("Lengual", "Language"), ("salvajes", "salvaje"), ("fight", "fine"),
        ("fin.", "fino."), ("módulos", "modelos"), ("reforzming", "reinforcement"),
        ("Cloud,", "Claude,"), ("Cloud", "Claude"), ("Química", "Kimi"),
        ("Monshoot,", "Moonshot,"), ("Ditsik,", "DeepSeek,"), ("Ditsik", "DeepSeek"),
    ],
    "jose06": [
        ("Aletza", "Alexa"), ("tradutores,", "traductores,"), ("tradutores", "traductores"),
        ("toque", "token"), ("paralelisable", "paralelizable"),
    ],
    # brazo robotico: Whisper no conoce ni MoveIt ni FreeCAD, que son LAS dos
    # herramientas que el video ensena
    "robot_intro": [
        ("Fricat,", "FreeCAD,"), ("Fricat", "FreeCAD"),
        ("ensembles", "ensambles"), ("ensembles.", "ensambles."),
        ("Mubit", "MoveIt"), ("Mubit,", "MoveIt,"),
        ("repos,", "reposo,"), ("repos", "reposo"),
    ],
}

# pares que hay que unir: Whisper partió una palabra en dos
UNIONES = {
    "jose05": [(["back", "propagation?"], "backpropagation.")],
    # "Gemini" salió como dos nombres propios inventados
    "jose07": [(["Jamie", "Knight"], "Gemini")],
    "robot_intro": [
        (["Moped", "It"], "MoveIt"),
        (["Diseño", "Cat"], "diseño CAD"),
        (["tras", "la", "rada"], "trasladado"),
    ],
}


def aplica(stem: str, arreglos, escribir: bool) -> int:
    p = RAIZ / f"{stem}.autoedit" / "transcript.json"
    # los grabados viejos se borran al entregar: la tabla es historica, no una lista de
    # trabajo pendiente
    if not p.exists():
        return 0
    d = json.loads(p.read_text(encoding="utf-8"))
    palabras = d["words"]
    n = 0
    for w in palabras:
        for mal, bien in arreglos:
            if w["word"].strip().lower() == mal.lower():
                crudo = w["word"].strip()
                letras = [c for c in crudo if c.isalpha()]
                # la mayuscula se decide por la primera LETRA, no por el primer caracter:
                # "-linealidad" empieza con guion y salia capitalizada a media frase
                # ...pero una marca que YA trae mayusculas internas (FreeCAD, MoveIt,
                # ROS2) no se capitaliza: `.capitalize()` la dejaba en 'Freecad'
                propia = any(c.isupper() for c in bien[1:])
                nuevo = (bien if propia or not letras or not letras[0].isupper()
                         else bien.capitalize())
                if nuevo != w["word"]:
                    print(f"  {stem}  {w['start']:7.2f}s  {w['word']!r} → {nuevo!r}")
                    w["word"] = nuevo
                    n += 1
    for seq, junto in UNIONES.get(stem, []):
        i = 0
        while i < len(palabras) - len(seq) + 1:
            ventana = [x["word"].strip().lower() for x in palabras[i:i + len(seq)]]
            if ventana == [s.lower() for s in seq]:
                print(f"  {stem}  {palabras[i]['start']:7.2f}s  {' '.join(ventana)!r} → {junto!r}")
                palabras[i]["word"] = junto
                palabras[i]["end"] = palabras[i + len(seq) - 1]["end"]
                del palabras[i + 1:i + len(seq)]
                n += 1
            i += 1
    if escribir and n:
        p.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    return n


def main() -> None:
    escribir = "--aplicar" in sys.argv
    total = 0
    for stem in dict.fromkeys([*ARREGLOS, *UNIONES]):
        total += aplica(stem, ARREGLOS.get(stem, []), escribir)
    print(f"\n{total} correcciones" + ("  (escritas)" if escribir else "  (simulación: usa --aplicar)"))


if __name__ == "__main__":
    main()
