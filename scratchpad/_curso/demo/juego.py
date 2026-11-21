"""Adivina el numero: random elige el secreto, el while repite hasta acertar,
el if compara y da la pista, y una variable cuenta los intentos."""
import os
import random

# SECRETO fijo solo para grabar la clase (la voz dice 10, 15, 12, 11 → 11)
secreto = int(os.environ.get("SECRETO") or random.randint(1, 20))
intentos = 0
print("Estoy pensando un número del 1 al 20.")

while True:
    try:
        texto = input("Tu intento: ").strip()
    except EOFError:
        print("\nJuego cancelado.")
        break
    if not texto.isdigit():
        print("Escribe un número, no letras.")
        continue
    numero = int(texto)
    intentos += 1
    if numero < secreto:
        print("Mayor.")
    elif numero > secreto:
        print("Menor.")
    else:
        veces = "intento" if intentos == 1 else "intentos"
        print(f"¡Le atinaste en {intentos} {veces}!")
        break
