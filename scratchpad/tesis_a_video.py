"""Convierte la escena de TESIS de los 19 guiones de `kinetic` (texto sobre negro) a
`kinetic_video` (la misma tipografía SOBRE un clip de Omni en movimiento).

Feedback de José (28-jul, mirando la tesis de ln03): "en este tipo de momentos de solo
texto agrega videos de omi, para hacerlo más vistoso". La tesis es la frase quotable del
video y era justo el plano más muerto: texto blanco sobre negro, sin nada moviéndose.

Los prompts son CONCEPTUALES a propósito (luz, partículas, materia): la regla de realidad
prohíbe representar cosas, productos o personas REALES con video generado.
"""
import json
from pathlib import Path

PROMPTS = {
 "ln01": "an immense dark void slowly filling with countless tiny points of light that keep multiplying and spreading outward until they overwhelm the frame, cinematic, slow push in, deep blacks",
 "ln02": "cinematic macro shot of solid letter-shaped blocks tumbling in the air in total disorder, then snapping one by one into a single straight line, dramatic side light, dark background",
 "ln03": "drifting points of light scattered in a dark volume slowly gathering into three distinct glowing clusters separated by empty space, slow camera drift, cinematic, deep blacks",
 "ln04": "a single luminous thread being dragged slowly across a dark surface, leaving a fading trail behind it that dims the further back it goes, cinematic macro, slow motion",
 "ln05": "a pulse of light travelling BACKWARDS along a long chain of connected glowing nodes, each node flaring as the pulse passes it in reverse, cinematic, dark background",
 "ln06": "a bright spark travelling down a very long chain of nodes and growing dimmer at every step until it fades out entirely before reaching the end, cinematic, deep blacks",
 "ln07": "cinematic macro of a row of gates opening and closing in sequence, some glowing particles allowed through while others are pushed aside and dissolve, dramatic light, dark background",
 "ln08": "split composition: one slow lonely dot crawling along a single line while beside it hundreds of dots race simultaneously along many parallel lines, cinematic, dark",
 "ln09": "a wide beam of light sweeping across a dark field of scattered dim objects and locking onto just three of them, which flare bright while everything else stays dark, cinematic",
 "ln10": "three separate streams of glowing particles flowing from different directions and converging into a single bright point at the exact same instant, cinematic, dark background",
 "ln11": "two long glowing arrows floating in a dark void slowly rotating until they point in exactly the same direction, the angle between them closing, cinematic macro",
 "ln12": "a smooth glowing wave being layered on top of an evenly spaced row of identical objects, giving each one a slightly different height, cinematic, dark background",
 "ln13": "many small thin beams of light sweeping a dark scene from many different angles at once, together revealing a shape that no single beam could show, cinematic",
 "ln14": "cinematic macro of dust being blown off an old yellowed technical blueprint, and underneath the paper circuit traces suddenly ignite with light, dramatic, dark",
 "ln15": "cinematic macro of a dense page of printed text where one single word slowly lifts up off the paper and floats, glowing, while the rest of the page stays flat and dark",
 "ln16": "a tall structure already built standing in a dark space, and a single small glowing piece being carefully set on top of it, cinematic, dramatic low light",
 "ln17": "a tiny glowing seed of light in a vast dark space swelling and growing enormously until it dwarfs everything around it, cinematic, slow push out, deep blacks",
 "ln18": "an unexpected silent bloom of light erupting outward in a dark empty space, expanding in slow motion far beyond its own boundary, cinematic, deep blacks",
 "ln19": "cinematic macro of dense lines of code on a dark screen dissolving away into nothing, leaving a single empty blinking cursor waiting, shallow depth of field",
}

raiz = Path("scratchpad/guiones_serie2")
n = 0
for p in sorted(raiz.glob("ln*.json")):
    clave = p.name[:4]
    g = json.loads(p.read_text(encoding="utf-8"))
    for s in g["scenes"]:
        if s.get("beat_type") == "tesis" and s.get("visual_type") == "kinetic":
            s["visual_type"] = "kinetic_video"
            s["kinetic_video"] = {"words": s.pop("kinetic")["words"],
                                  "veo_prompt": PROMPTS[clave], "seconds": 4}
            n += 1
            break
    p.write_text(json.dumps(g, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{n} tesis convertidas a kinetic_video")
