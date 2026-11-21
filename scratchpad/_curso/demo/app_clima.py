"""La app del clima: una ventana, un botón y una petición REAL a internet."""
import tkinter as tk

import requests

URL = ("https://api.open-meteo.com/v1/forecast"
       "?latitude=19.43&longitude=-99.13&current=temperature_2m")


def pedir_clima():
    """Trae la temperatura de verdad. Si no hay internet, lo dice en vez de caerse."""
    try:
        datos = requests.get(URL, timeout=10).json()
        return datos["current"]["temperature_2m"]
    except Exception:
        return None


def al_pulsar():
    t = pedir_clima()
    salida.config(text=f"{t} grados en CDMX" if t is not None else "sin internet")


ventana = tk.Tk()
ventana.title("Clima CDMX")
ventana.geometry("560x300+2180+180")
tk.Label(ventana, text="El clima, ahora mismo", font=("Arial", 20)).pack(pady=20)
salida = tk.Label(ventana, text="—", font=("Arial", 30), fg="#A8681F")
tk.Button(ventana, text="Ver clima", font=("Arial", 18), command=al_pulsar).pack(pady=10)
salida.pack(pady=10)
ventana.after(2500, al_pulsar)
ventana.after(45000, ventana.destroy)
ventana.mainloop()
