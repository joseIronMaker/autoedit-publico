"""¿Qué hace de verdad un harness que un chat no puede hacer? Recibo de los videos H1 y H5.

Un chat te devuelve texto y TÚ lo aplicas. Un harness abre el archivo, lo edita y corre el
comando. Aquí se cuenta ESO sobre la bitácora real de este proyecto: cuántas veces escribió
en un archivo, cuántos comandos ejecutó, en cuántos archivos distintos, y qué quedó en git.

PRIVACIDAD: no se vuelca el contenido de ningún mensaje ni ninguna ruta. De las rutas solo
se cuenta cuántas DISTINTAS hubo (un entero), y las herramientas se agrupan por NOMBRE.

    .venv/bin/python scratchpad/medir_harness_trabajo.py
"""
import collections
import json
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BITACORAS = Path.home() / ".claude" / "projects" / "-home-jose-tiktok"

ESCRIBE = {"Edit", "Write", "NotebookEdit"}
CORRE = {"Bash"}
LEE = {"Read", "Glob", "Grep"}


def bitacoras() -> dict:
    turnos_asistente = turnos_usuario = 0
    llamadas = collections.Counter()
    rutas = set()
    for p in sorted(BITACORAS.glob("*.jsonl")):
        for linea in p.open(encoding="utf-8", errors="replace"):
            try:
                o = json.loads(linea)
            except Exception:  # noqa: BLE001
                continue
            tipo = o.get("type")
            msg = o.get("message") or {}
            cont = msg.get("content")
            if tipo == "assistant":
                turnos_asistente += 1
            elif tipo == "user":
                # OJO: el resultado de cada herramienta también se guarda como "user", y
                # además el propio editor inyecta recordatorios y ecos de comandos. Un
                # mensaje MÍO es el que trae texto, ningún tool_result y no es inyectado.
                bloques = cont if isinstance(cont, list) else []
                if not (isinstance(cont, str) or not any(
                        isinstance(c, dict) and c.get("type") == "tool_result"
                        for c in bloques)):
                    continue
                txt = cont if isinstance(cont, str) else " ".join(
                    c.get("text", "") for c in bloques if isinstance(c, dict))
                t = txt.lstrip()
                if t and not t.startswith(("<system-reminder", "Caveat", "<command-",
                                           "<local-command")):
                    turnos_usuario += 1
            if not isinstance(cont, list):
                continue
            for c in cont:
                if not (isinstance(c, dict) and c.get("type") == "tool_use"):
                    continue
                nombre = c.get("name") or "?"
                llamadas[nombre] += 1
                if nombre in ESCRIBE:
                    ruta = (c.get("input") or {}).get("file_path")
                    if ruta:
                        rutas.add(ruta)          # solo para contar cuántas distintas
    tot = sum(llamadas.values())
    return {"turnos_asistente": turnos_asistente, "turnos_usuario": turnos_usuario,
            "llamadas_a_herramienta": tot,
            "escrituras_en_archivo": sum(v for k, v in llamadas.items() if k in ESCRIBE),
            "comandos_ejecutados": sum(v for k, v in llamadas.items() if k in CORRE),
            "lecturas": sum(v for k, v in llamadas.items() if k in LEE),
            "archivos_distintos_escritos": len(rutas),
            "herramientas_distintas": len(llamadas),
            "top_herramientas": llamadas.most_common(6)}


def git() -> dict:
    def sal(*args: str) -> str:
        return subprocess.check_output(["git", *args], cwd=RAIZ, text=True).strip()

    commits = int(sal("rev-list", "--count", "HEAD"))
    primero = sal("log", "--reverse", "--format=%ad", "--date=short").splitlines()[0]
    ultimo = sal("log", "-1", "--format=%ad", "--date=short")
    mas, menos, archivos = 0, 0, set()
    crudo = sal("log", "--numstat", "--format=")
    for linea in crudo.splitlines():
        partes = linea.split("\t")
        if len(partes) != 3:
            continue
        a, b, ruta = partes
        if a.isdigit():
            mas += int(a)
        if b.isdigit():
            menos += int(b)
        archivos.add(ruta)
    py = subprocess.check_output(
        "cat $(git ls-files 'autoedit/*.py' 'scratchpad/*.py') | wc -l",
        cwd=RAIZ, shell=True, text=True).strip()
    dias = (__import__("datetime").date.fromisoformat(ultimo)
            - __import__("datetime").date.fromisoformat(primero)).days + 1
    return {"commits": commits, "primer_commit": primero, "ultimo_commit": ultimo,
            "dias_calendario": dias, "lineas_agregadas": mas, "lineas_borradas": menos,
            "archivos_tocados": len(archivos), "lineas_python_vivas": int(py)}


def main() -> None:
    out = {"tema": "lo que un harness hace y un chat no: editar y ejecutar",
           "herramienta": "Claude Code (bitácoras reales de este proyecto)",
           "bitacoras": bitacoras(), "git": git()}
    b, g = out["bitacoras"], out["git"]
    out["resumen"] = {
        "escrituras_por_turno_mio": round(b["escrituras_en_archivo"] / b["turnos_usuario"], 2),
        "acciones_por_cada_lectura": round(
            (b["escrituras_en_archivo"] + b["comandos_ejecutados"]) / max(1, b["lecturas"]), 1),
        "lineas_por_dia": round(g["lineas_agregadas"] / g["dias_calendario"]),
    }
    Path(RAIZ / "mediciones").mkdir(exist_ok=True)
    (RAIZ / "mediciones" / "harness_trabajo.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out["bitacoras"], ensure_ascii=False, indent=2))
    print(json.dumps(out["git"], ensure_ascii=False, indent=2))
    print(json.dumps(out["resumen"], ensure_ascii=False))
    print("→ mediciones/harness_trabajo.json")


if __name__ == "__main__":
    main()
