# demo — ejemplos del curso de Python

Los programas que se ven en pantalla durante las clases del curso. Cada archivo es
corto, se ejecuta solo y enseña **una** idea: son los que se graban con
`scratchpad/graba_terminal.py` para las escenas de terminal y de ventana.

## Correrlos

```bash
python3 hola.py           # cualquiera se ejecuta suelto, sin instalar nada
python3 memoria.py --leer # algunos aceptan una bandera
python3 ver.py juego.py   # imprime un archivo con colores y números de línea
```

Tres necesitan librerías extra:

```bash
pip install requests pygame rich   # clima.py y peticion.py · pong.py · ver.py
```

## Qué hay

| Tema | Archivos |
|---|---|
| Primeros pasos | `hola.py`, `saludo.py`, `tipos.py`, `tres_ideas.py` |
| Decidir y repetir | `clima_local.py`, `frutas.py`, `intentos.py`, `marcador.py` |
| Listas y diccionarios | `ficha.py`, `ppt.py` |
| Funciones y pruebas | `promedio.py`, `promedio_codex.py`, `prueba_vacia.py` |
| Guardar datos | `memoria.py` (JSON), `base.py` (SQLite) |
| Internet | `clima.py`, `peticion.py` |
| Errores y depuración | `malo.py`, `depurar.py` |
| Proyectos con ventana | `pong.py` (pygame), `ventana.py` (tkinter) |
| Juego completo | `juego.py` — junta `random`, `while`, `if` y el marcador en archivo |

`ver.py` es la herramienta de la grabación, no una clase: imprime código en la
terminal y se queda ahí (vim se cierra solo cuando la sesión no tiene teclado).

## Archivos que aparecen solos

Correr los ejemplos crea `juego.db`, `marcador.json`, `datos.json` y capturas `.png`.
Están en el `.gitignore` a propósito: se regeneran ejecutando el script.
