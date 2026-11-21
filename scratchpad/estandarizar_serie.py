"""Lleva los 19 guiones al estándar aprobado por José el 28-jul:
ningún plano de texto sobre negro salvo (ya convertida) la tesis.

- Los cold-opens que eran `kinetic` pasan a `kinetic_video`: la misma tipografía sobre un
  clip de Omni en movimiento.
- Las escenas intermedias que eran `kinetic` pasan a `custom`: animación a medida escrita
  por Codex a partir de una descripción.

Prompts CONCEPTUALES a propósito (luz, materia, mecanismos): la regla de realidad prohíbe
representar cosas/productos/personas reales con video generado.
"""
import json
from pathlib import Path

HOOKS = {
 "ln02": "cinematic macro of two identical rows of carved wooden letter blocks on a dark table, the second row slowly rearranging itself into a different order while the first row stays perfectly still, dramatic side light, shallow depth of field",
 "ln04": "cinematic slow motion of a single ball frozen dead still in mid air inside a dark empty space, no motion trail, no floor, nothing to tell where it came from, hard spotlight from above",
 "ln05": "cinematic macro of a long line of dominoes on a dark surface: the very LAST domino topples, and then a wave of light races backwards along the whole line all the way to the first one, slow motion",
 "ln06": "cinematic macro of a long paper ribbon unrolling across a dark surface toward the camera, the far beginning of the ribbon fading and dissolving into blackness while the near end stays sharp and lit",
 "ln07": "cinematic slow motion of a cluster of small glowing objects suspended in a dark void, most of them dimming and sinking away downward while only three stay bright and rise, dramatic rim light",
 "ln08": "cinematic macro of an intricate brass mechanism turning smoothly in a dark room, then slowing, stuttering and coming to a complete stop while dust settles on it, dramatic low light",
 "ln10": "cinematic orbit around a dark space where a dozen points of light each shoot thin bright beams to every other point at the same time, weaving a dense glowing web, slow motion",
 "ln11": "cinematic macro of two translucent glowing grids sliding toward each other through a dark void and passing through one another, every intersection flaring bright as they cross",
 "ln12": "cinematic macro of carved letter blocks floating weightless in a dark void, slowly rotating and drifting apart with no line and no order between them, shallow depth of field",
 "ln13": "cinematic shot of dozens of narrow light beams sweeping a dark scene from many different angles all at once, crossing each other, together revealing a shape no single beam could show",
 "ln14": "cinematic macro of a heavy metal letterpress block being lifted out of a tray of type by tweezers and turned slowly to face the camera, dramatic low key light, deep black background",
 "ln15": "cinematic macro of a printed page on a dark desk with one single word physically punched out of it, leaving a clean rectangular hole, the little paper cutout tumbling away in slow motion",
 "ln16": "cinematic shot of a tall structure of stacked glowing blocks already built and standing in a dark space, and one single new block being lowered gently onto the very top, dramatic light",
 "ln17": "cinematic slow motion of a small glowing geometric solid in a dark void scaling up enormously while keeping exactly the same shape, the camera pulling back fast to keep it in frame",
 "ln18": "cinematic macro of bare dark soil under a hard spotlight where several completely different green shoots suddenly push up through the surface at the same moment, slow motion",
 "ln19": "cinematic macro of a printed page on a dark desk being turned back to an earlier page, the camera pushing slowly in on the reopened page, warm raking side light",
}

MEDIOS = {
 "ln01": "Dos barras horizontales GRANDES, una encima de otra, que ocupan casi todo el ancho. La de arriba dice 'REGLAS A MANO' y se va ENCOGIENDO hasta quedar mínima. La de abajo dice 'ESCALA' y crece hasta llenar el ancho. Las dos se mueven al mismo tiempo, con números grandes que suben y bajan en su extremo. Un título arriba. Solo esos dos elementos, enormes y separados; nada más en pantalla.",
 "ln08": "Comparación en DOS MITADES separadas por una línea vertical. Izquierda: un solo punto de luz avanza LENTO por un camino largo en zigzag, un paso a la vez, y se ve cuánto le falta. Derecha: una cuadrícula de muchos puntos que se encienden TODOS A LA VEZ, de golpe, y terminan de inmediato. Cada mitad con su etiqueta grande arriba. Se repite en bucle para que se vea la diferencia de velocidad.",
 "ln09": "Arriba: una fila de palabras conectadas en cadena donde la luz pasa de una a la siguiente, en orden, lentamente. Abajo: la MISMA fila, pero todas las palabras se encienden simultáneamente de golpe. Las dos filas ocupan todo el ancho, con etiquetas grandes. La de abajo termina mucho antes que la de arriba, y eso se ve.",
 "ln11": "Tres barras horizontales grandes con porcentajes bien visibles (70%, 20%, 10%) que se llenan. Debajo, tres bloques de color de tamaño proporcional a esos porcentajes se deslizan y se FUNDEN en un solo bloque final más grande, cuyo color es la mezcla de los tres. Todo enorme y bien separado.",
 "ln12": "Una fila de cinco casillas grandes y bien separadas, numeradas del 1 al 5, que ocupan todo el ancho. Sobre cada casilla cae una onda distinta, con distinta frecuencia y color, y se queda ondulando ahí. Al final las cinco ondulan a la vez, cada una con su ritmo propio, sin tocarse nunca.",
 "ln13": "Cuatro recuadros grandes en dos filas de dos, cada uno con un color distinto y una etiqueta corta, que miran la misma frase corta de arriba y cada uno subraya una palabra DIFERENTE de ella. Al final los cuatro recuadros se deslizan hacia el centro y se funden en uno solo, grande. Bien separados hasta el momento de fundirse.",
 "ln17": "Una curva GRANDE que sube suave y plana de izquierda a derecha ocupando todo el ancho, y de pronto, pasado cierto punto marcado con una línea vertical, se dispara hacia arriba de golpe. En el tramo plano hay puntos apagados; después del salto los puntos se encienden brillantes. Eje horizontal etiquetado 'TAMAÑO', sin números.",
 "ln18": "Un tronco central grueso y luminoso que sube por el centro. De él brotan, una tras otra y con rebote, cuatro ramas gruesas hacia los lados, cada una terminando en una pastilla grande con una etiqueta: 'TRADUCIR', 'PROGRAMAR', 'RESUMIR', 'CONVERSAR'. Las cuatro bien separadas, sin tocarse. Todas laten al final.",
}

raiz = Path("scratchpad/guiones_serie2")
nh = nm = 0
for p in sorted(raiz.glob("ln*.json")):
    k, g = p.name[:4], json.loads(p.read_text(encoding="utf-8"))
    for i, s in enumerate(g["scenes"]):
        if s.get("visual_type") != "kinetic":
            continue
        if i == 0 and k in HOOKS:                       # cold-open → clip de Omni
            s["visual_type"] = "kinetic_video"
            s["kinetic_video"] = {"words": s.pop("kinetic")["words"],
                                  "veo_prompt": HOOKS[k], "seconds": 4}
            nh += 1
        elif i > 0 and k in MEDIOS:                     # escena intermedia → animación
            s.pop("kinetic", None)
            s["visual_type"] = "custom"
            s["custom_anim"] = {"description": MEDIOS[k]}
            nm += 1
    p.write_text(json.dumps(g, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{nh} cold-opens → kinetic_video · {nm} escenas intermedias → custom")
