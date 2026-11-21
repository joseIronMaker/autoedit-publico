#!/usr/bin/env python3
"""Corre el juego TAL CUAL lo escribió el modelo, con un jugador simulado.

No se toca juego.py: se sustituye la lectura del teclado por un patrón —moverse de lado a
lado y disparar— para que en la grabación se vea el juego JUGÁNDOSE y no una pantalla
quieta. El código, los gráficos y las reglas son los del modelo.
"""
import runpy
import sys
import time

import pygame

carpeta = sys.argv[1]
inicio = time.time()
_real = pygame.key.get_pressed


class Piloto:
    """Se comporta como el arreglo de teclas de pygame, pero con un plan."""

    def __getitem__(self, tecla):
        t = time.time() - inicio
        if tecla == pygame.K_SPACE:
            return int(t * 6) % 2 == 0          # dispara sin parar
        if tecla == pygame.K_LEFT:
            return int(t / 1.6) % 2 == 0        # barre a la izquierda…
        if tecla == pygame.K_RIGHT:
            return int(t / 1.6) % 2 == 1        # …y a la derecha
        if tecla in (pygame.K_RETURN, pygame.K_r):
            return t > 3 and int(t) % 7 == 0    # reinicia si hay pantalla de fin
        return False

    def __len__(self):
        return 512


pygame.key.get_pressed = lambda: Piloto()
sys.argv = ["juego.py"]
runpy.run_path(f"{carpeta}/juego.py", run_name="__main__")
