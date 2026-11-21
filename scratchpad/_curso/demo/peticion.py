"""Las cuatro partes de una petición: dirección, parámetros, respuesta y código.

La dirección dice A QUIÉN le preguntas; los parámetros, QUÉ le preguntas.
En el código van separados y requests los pega con el signo de interrogación.
"""
import requests

DIRECCION = "https://api.open-meteo.com/v1/forecast"

PARAMETROS = {
    "latitude": 19.43,            # Ciudad de México
    "longitude": -99.13,
    "current": "temperature_2m",
}

r = requests.get(DIRECCION, params=PARAMETROS, timeout=20)

print("1 · dirección   ", DIRECCION)
print("2 · parámetros  ", PARAMETROS)
print("3 · respuesta   ", r.json()["current"])
print("4 · código      ", r.status_code, "→ salió bien" if r.ok else "→ algo falló")

print()
print("la dirección con los parámetros pegados (lo que viajó de verdad):")
print(" ", r.url)
