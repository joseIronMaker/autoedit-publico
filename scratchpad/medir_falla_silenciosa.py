"""¿Cuántos caminos hay en este código para fallar y seguir como si nada? Recibo del video H4.

La falla que de verdad muerde con un agente no es la que truena: es la que NO truena. El
agente escribe un `except` que degrada, el programa sigue, y tú ves "listo" sobre algo que
nunca se hizo. Aquí se cuentan esos caminos con el AST de Python (no con grep), sobre el
código que este proyecto tiene vivo:

    detiene → el manejador vuelve a levantar la excepción, o corta con sys.exit/SystemExit.
    sigue   → el manejador se la traga: registra, degrada, o simplemente `pass`.

De los que siguen se separan los MUDOS: los que ni siquiera imprimen algo (`pass`,
`continue`, o una asignación a secas). Esos son los que no dejan rastro en pantalla.

    .venv/bin/python scratchpad/medir_falla_silenciosa.py
"""
import ast
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
OBJETIVO = ["autoedit/*.py", "autoedit/**/*.py", "scratchpad/*.py"]

AVISA = {"print", "log", "warn", "warning", "error", "info", "exception", "debug"}


def detiene(h: ast.ExceptHandler) -> bool:
    for n in ast.walk(h):
        if isinstance(n, ast.Raise):
            return True
        if isinstance(n, ast.Call):
            f = n.func
            nombre = getattr(f, "attr", None) or getattr(f, "id", None)
            if nombre in ("exit", "_exit"):
                return True
    return False


def avisa(h: ast.ExceptHandler) -> bool:
    for n in ast.walk(h):
        if isinstance(n, ast.Call):
            f = n.func
            nombre = (getattr(f, "attr", None) or getattr(f, "id", None) or "").lower()
            if any(a in nombre for a in AVISA):
                return True
    return False


def main() -> None:
    archivos = []
    for pat in OBJETIVO:
        archivos += [p for p in RAIZ.glob(pat) if p.is_file()]
    archivos = sorted(set(archivos))
    total = para = sigue = mudos = 0
    lineas = 0
    peores: list[tuple[str, int]] = []
    for p in archivos:
        try:
            src = p.read_text(encoding="utf-8")
            arbol = ast.parse(src)
        except Exception:  # noqa: BLE001
            continue
        lineas += len(src.splitlines())
        n_arch = 0
        for nodo in ast.walk(arbol):
            if not isinstance(nodo, ast.ExceptHandler):
                continue
            total += 1
            if detiene(nodo):
                para += 1
            else:
                sigue += 1
                n_arch += 1
                if not avisa(nodo):
                    mudos += 1
        if n_arch:
            peores.append((str(p.relative_to(RAIZ)), n_arch))
    peores.sort(key=lambda t: -t[1])
    out = {"tema": "cuantos caminos hay para fallar y seguir como si nada",
           "codigo": "el de este proyecto, escrito con un agente",
           "archivos_python": len(archivos), "lineas_python": lineas,
           "manejadores_de_error": total,
           "detienen_el_programa": para,
           "siguen_de_largo": sigue,
           "siguen_sin_avisar": mudos,
           "pct_siguen": round(100.0 * sigue / total, 1) if total else 0,
           "pct_mudos": round(100.0 * mudos / total, 1) if total else 0,
           "archivos_con_mas": peores[:6]}
    (RAIZ / "mediciones").mkdir(exist_ok=True)
    (RAIZ / "mediciones" / "falla_silenciosa.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    print("→ mediciones/falla_silenciosa.json")


if __name__ == "__main__":
    main()
