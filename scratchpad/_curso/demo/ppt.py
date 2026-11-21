"""Piedra, papel o tijera: las reglas viven en un diccionario, no en una escalera de ifs."""
import random

GANA_A = {
    "piedra": "tijera",     # la piedra rompe la tijera
    "papel": "piedra",      # el papel envuelve la piedra
    "tijera": "papel",      # la tijera corta el papel
}

# el empate no suma: solo hay una variable para lo tuyo y otra para la maquina
ganadas, perdidas = 0, 0

for jugada in ["piedra", "papel", "tijera", "piedra", "tijera"]:
    maquina = random.choice(list(GANA_A))
    if jugada == maquina:
        resultado = "empate"
    elif GANA_A[jugada] == maquina:
        resultado = "ganas"
        ganadas += 1
    else:
        resultado = "pierdes"
        perdidas += 1
    print(f"{jugada} contra {maquina}: {resultado}")

print()
print(f"marcador: ganaste {ganadas}, perdiste {perdidas}")
