"""Muestra un archivo de código en la terminal, con colores y números de línea.

Por qué no vim: dentro de una grabación automática vim recibe el guion por stdin, se
queda sin entrada y se cierra solo — la escena salía vacía. Esto imprime y se queda.
"""
import sys
import time

from rich.console import Console
from rich.syntax import Syntax

archivo = sys.argv[1]
lento = "--lento" in sys.argv
codigo = open(archivo, encoding="utf-8").read().rstrip()
consola = Console(width=70)

if lento:
    lineas = codigo.splitlines()
    for i in range(1, len(lineas) + 1):
        consola.clear()
        consola.print(Syntax("\n".join(lineas[:i]), "python", theme="monokai",
                             line_numbers=True, word_wrap=True))
        time.sleep(0.45)
else:
    consola.print(Syntax(codigo, "python", theme="monokai", line_numbers=True,
                         word_wrap=True))
