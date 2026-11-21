import json
import sys

ARCHIVO = "datos.json"

if "--leer" in sys.argv:
    datos = json.load(open(ARCHIVO))
    print("leído:", datos["jugador"], "lleva", datos["puntos"], "puntos")
else:
    datos = {"jugador": "Ana", "puntos": 15}
    json.dump(datos, open(ARCHIVO, "w"))
    print("guardado:", datos)
