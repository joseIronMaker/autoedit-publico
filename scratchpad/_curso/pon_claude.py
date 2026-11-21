"""Mete a Claude Code REAL y el código en el editor donde todavía faltaban.

Mandato de José (1-sep-2026): "en todos quiero al claude real e interfaces reales" y
"los códigos donde explicas el código se deben ver con el editor".

La locución YA ESTÁ PAGADA, así que la escena elegida en cada clase es una cuya narración
admite la sesión del agente SIN contradecir la pantalla — la regla de "grabar primero,
escribir la voz después" al revés: aquí la voz manda y el visual se acomoda a ella.
Cada entrada dice por qué encaja.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
G = RAIZ / "scratchpad" / "guiones_curso"

# clase: (escena, comando, por qué encaja con la narración que ya está grabada)
CAMBIOS = {
    "py02": (0, "claude 'escribe tres_ideas.py: guarda nombre y edad, decide con if si puede votar, y repite 3 veces con for'",
             "narración: 'todos hacen las mismas tres cosas'"),
    "py03": (0, "claude 'escribe promedio.py con una funcion promedio(notas)'",
             "narración: 'le pedí la misma función a dos inteligencias artificiales'"),
    "py04": (2, "claude 'crea prueba.py con un print que diga listo y ejecutalo'",
             "narración: 'la terminal es esa ventana negra donde escribes órdenes y ellas te contestan'"),
    "py06": (0, "claude 'escribe marcador.py: una variable puntos que empieza en 0, le suma 10, luego 5, y la imprime'",
             "narración: 'metes un dato y la computadora lo recuerda'"),
    "py07": (2, "claude 'escribe tipos.py que imprima el type() de 5, de \"5\" y de True, y ejecutalo'",
             "narración: 'Python te dice el tipo si se lo preguntas'"),
    "py08": (0, "claude 'modifica saludo.py para que pregunte el nombre con input y salude'",
             "narración: 'con una línea más empieza a preguntarte cosas'"),
    "py09": (3, "claude 'agrega a clima_local.py un elif templado entre 18 y 25 grados'",
             "narración: 'cuando hay más de dos caminos entra elif' (y quita una captura repetida)"),
    "py10": (0, "claude 'escribe frutas.py: recorre una lista de frutas con for e imprime cada una'",
             "narración: 'si te encuentras copiando y pegando, estás escribiendo un bucle a mano'"),
    "py15": (0, "claude 'instala pygame en el venv y dime la version'",
             "narración: 'una librería que se instala en un renglón'"),
    "py16": (0, "claude 'crea ventana.py con tkinter: una ventana con un saludo'",
             "narración: 'nadie de tu familia lo va a usar si tiene que abrir una terminal'"),
    "py19": (1, "claude 'dame el comando de pyinstaller para empaquetar ventana.py en un solo archivo sin consola'",
             "narración: 'mete tu código, el intérprete y las librerías en el mismo archivo'"),
    "py20": (2, "claude 'explica en 3 lineas la diferencia entre correr un programa en mi compu y en un servidor'",
             "narración: 'y por eso hay dos mundos' (antes era un echo)"),
    "py22": (2, "claude 'muestra las 4 partes de una peticion a open-meteo: direccion, parametros, respuesta y codigo de estado'",
             "narración: 'la conversación tiene cuatro partes' (era terminal DIBUJADA)"),
    "py24": (2, "claude 'haz que clima.py imprima una frase con la temperatura de CDMX'",
             "narración: 'ya con el dato suelto haces lo que quieras: meterlo en una frase'"),
    "py25": (0, "claude 'junta clima.py y ventana.py: un boton que pide el clima y lo muestra en la etiqueta'",
             "narración: 'la clase donde todo el curso se junta en un solo programa'"),
    "py26": (2, "python3 malo.py ; sleep 3 ; claude 'arregla el error de malo.py'",
             "narración: 'Python hasta te sugiere' (primero el traceback, luego el agente)"),
    "py27": (0, "claude 'agrega un breakpoint en depurar.py justo antes de la division'",
             "narración: 'detén el programa en esa línea y pregúntale cuánto vale cada cosa'"),
    "py30": (2, "claude 'crea un .gitignore para un proyecto de python y un README corto'",
             "narración: 'dos archivos hacen la diferencia' (antes era un cat)"),
}

# el código que se EXPLICA se ve en el editor, no en un grep
EDITOR = {
    "py14": (2, "/home/jose/tiktok/.venv/bin/python ver.py ppt.py --lento && sleep 20",
             "narración: 'la forma buena es un diccionario de reglas' (era un grep)"),
    "py17": (2, "/home/jose/tiktok/.venv/bin/python ver.py ventana.py --lento && sleep 20",
             "narración: 'en command va el nombre de la función' (era un grep)"),
    "py23": (1, "/home/jose/tiktok/.venv/bin/python ver.py clima.py --lento && sleep 20",
             "narración: 'la dirección lleva la pregunta pegada al final' (era terminal DIBUJADA)"),
    "py25": (1, "/home/jose/tiktok/.venv/bin/python ver.py clima.py --lento && sleep 20",
             "narración: 'llama a una función que pide el clima' (era un grep)"),
}

tocadas = {}
for tabla in (CAMBIOS, EDITOR):
    for clase, (idx, cmd, porque) in tabla.items():
        f = sorted(G.glob(f"{clase}_*.json"))[0]
        g = json.loads(f.read_text(encoding="utf-8"))
        esc = g["scenes"][idx]
        esc["visual_type"] = "terminal"
        cap = esc.setdefault("captura", {})
        cap["cmd"] = cmd
        cap.setdefault("cwd", "/home/jose/tiktok/scratchpad/_curso/demo")
        f.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
        tocadas.setdefault(clase, []).append(idx)
        print(f"{clase} escena {idx}: {porque}")

print("\nclases a regrabar:", " ".join(sorted(tocadas)))
Path(RAIZ / "scratchpad" / "_curso" / "clases_claude.txt").write_text(
    " ".join(sorted(tocadas)) + "\n", encoding="utf-8")
