import requests

URL = ("https://api.open-meteo.com/v1/forecast"
       "?latitude=19.43&longitude=-99.13"
       "&current=temperature_2m&timezone=America/Mexico_City")

r = requests.get(URL, timeout=20)
datos = r.json()

temperatura = datos["current"]["temperature_2m"]
hora = datos["current"]["time"][-5:]

print(f"En la Ciudad de México hay {temperatura} grados a las {hora}.")
