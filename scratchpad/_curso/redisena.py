"""Rediseño DIDÁCTICO de una clase: las escenas de concepto dejan de ser fotos.

José (2-sep-2026): "cero didácticos: cuando explicas conceptos pones imágenes en lugar de
crear animación; y luego pones resultados y no se ven en pantalla". Cada concepto va con
la herramienta del motor que lo EXPLICA: un flujo/lista animado (`diagram`) cuando la
narración enumera pasos, y una animación de Codex (`custom`) cuando lo que enseña es una
transformación (algo que se mueve, se atora, se marca). Las escenas de resultado enseñan
el código Y su salida en la misma captura.

Aplica los cambios en el guion fuente y en el guion de assets (el que lee
rehacer_escena), casando la escena por índice Y por el inicio de su narración; borra la
captura vieja si la escena deja de ser una terminal.

    .venv/bin/python scratchpad/_curso/redisena.py py03
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
G = RAIZ / "scratchpad" / "guiones_curso"

DEMO = "/home/jose/tiktok/scratchpad/_curso/demo"

DISEÑO = {
  "py03": {
    1: {"_narra": "El día que le pasas una lista vacía",
        "visual_type": "terminal",
        "captura": {"cmd": "cat prueba_vacia.py; echo; echo '$ python3 prueba_vacia.py'; python3 prueba_vacia.py",
                    "cols": 46, "filas": 30, "cwd": DEMO}},
    2: {"_narra": "Eso es lo que cambió",
        "visual_type": "custom",
        "custom_anim": {"description": (
            "Dos carriles horizontales apilados, cada uno con su etiqueta a la izquierda: "
            "ANTES arriba y HOY abajo. En el de ANTES se dibuja un archivo de código de cinco "
            "líneas y un cursor que llega a la línea 1 y se atora ahí: la línea se pone roja "
            "y sale una X grande. En el de HOY el mismo archivo se rellena en verde línea a "
            "línea, avanza una barra de tiempo con tres marcas etiquetadas semana 1, semana "
            "2 y semana 3, y justo en la marca 3 el programa se rompe: la barra se corta, "
            "aparece una X roja y un signo de interrogación grande al lado, porque el "
            "programa que no entiendes falla. Sin cifras.")}},
    3: {"_narra": "Programar hoy no es teclear",
        "visual_type": "diagram",
        "diagram": {"type": "flow", "title": "Programar hoy",
                    "items": ["Saber qué pedir", "Entender lo que devolvió", "Probarlo donde duele"]}},
  },
  "py04": {
    0: {"_narra": "Necesitas tres cosas y las tres son gratis",
        "visual_type": "diagram",
        "diagram": {"type": "list", "title": "Tres cosas, gratis",
                    "items": ["Python", "Un editor: VS Code", "La terminal, que ya traes"]}},
    1: {"_narra": "Python lo bajas de python punto org",
        "visual_type": "custom",
        "custom_anim": {"description": (
            "Un flujo de instalación de cuatro pasos que se van encendiendo de arriba abajo "
            "unidos por flechas: 1) una caja con el texto python.org/downloads, 2) un botón "
            "grande que dice Descargar, 3) una ventana de instalador con una casilla y el "
            "texto Add Python to PATH: la casilla parpadea, se marca con una palomita y se "
            "queda encendida, es el paso importante, 4) un botón que dice Instalar. Al final "
            "una palomita verde grande. Sin cifras.")}},
    3: {"_narra": "Si te sale un error que dice command not found",
        "visual_type": "custom",
        "custom_anim": {"description": (
            "Arriba una línea de terminal donde se teclea la palabra python. Debajo una "
            "lista vertical etiquetada PATH con tres cajas: Windows, Archivos de programa, "
            "Usuario. Un puntero recorre las cajas una por una buscando Python y no lo "
            "encuentra; entonces en la terminal aparece en rojo command not found. Luego "
            "una caja nueva con el texto Python entra deslizándose a la lista PATH, el "
            "puntero la encuentra, y la terminal muestra una palomita verde: se arregla "
            "reinstalando con la casilla marcada. Sin cifras.")}},
  },
}


def aplicar(clase: str) -> None:
    dis = DISEÑO[clase]
    fuente = sorted(G.glob(f"{clase}_*.json"))[0]
    g = json.loads(fuente.read_text(encoding="utf-8"))
    stem = f"gen_{g['slug']}"
    assets = RAIZ / "videos" / f"{stem}.assets"
    ga = json.loads((assets / "guion.json").read_text(encoding="utf-8"))
    for i, cambio in dis.items():
        narra = cambio.pop("_narra")
        for guion in (g, ga):
            esc = guion["scenes"][i]
            if not esc["narration"].startswith(narra):
                sys.exit(f"{clase} e{i}: la narración no empieza por {narra!r}: "
                         f"{esc['narration'][:60]!r}")
            for k in ("image_prompts", "mascota", "foto", "captura", "custom_anim", "diagram"):
                esc.pop(k, None)
            esc.update(cambio)
        if cambio["visual_type"] != "terminal":
            (assets / f"cap_{i}.mp4").unlink(missing_ok=True)   # o la captura vieja manda
        print(f"  e{i} → {cambio['visual_type']}")
    fuente.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
    (assets / "guion.json").write_text(json.dumps(ga, ensure_ascii=False, indent=1),
                                       encoding="utf-8")
    print(f"✔ {clase}: {stem}")


if __name__ == "__main__":
    for c in sys.argv[1:]:
        aplicar(c)
