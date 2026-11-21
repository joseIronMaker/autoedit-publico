"""Mide si los trucos famosos de prompting funcionan de verdad. Recibo para la serie 1.5.

Regla del canal (ago-2026): ninguna cifra entra a un guion si no existe en mediciones/.
Cada condición se corre N veces porque la decodificación es estocástica: una corrida no
es evidencia de nada.

    .venv/bin/python scratchpad/medir_prompts.py paso_a_paso
    .venv/bin/python scratchpad/medir_prompts.py rol
    .venv/bin/python scratchpad/medir_prompts.py ejemplos
"""
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv  # noqa: E402
load_dotenv()
from autoedit.model_router import ModelRouter  # noqa: E402
from autoedit.config import load_config        # noqa: E402

N = int(sys.argv[2]) if len(sys.argv) > 2 else 24

# Tareas con respuesta VERIFICABLE por código: nada de juzgar "calidad" a ojo.
# Tareas con respuesta VERIFICABLE por código: nada de juzgar "calidad" a ojo.
# Las clásicas (cuaderno y lápiz, máquinas, lirios) salen 20/20 sin truco: los modelos de
# 2026 ya razonan solos. Para ver si el truco sirve HOY hacen falta cadenas más largas.
# Tareas con TECHO: el modelo TIENE que fallar algunas veces sin el truco, o la medición
# no puede decir nada (efecto techo — lo cazó el crítico el 8-ago-2026: 20/20 en ambas
# condiciones no prueba que el truco no sirva, prueba que las tareas eran fáciles).
# Estas son de varios pasos con trampas de orden, unidades y negaciones.
TAREAS = [
    ("Un tinaco tiene 1200 litros. Una llave lo llena a 25 litros por minuto y un desagüe lo "
     "vacía a 18 litros por minuto. Empieza vacío con las dos abiertas. A los 40 minutos cierran "
     "el desagüe. ¿Cuántos minutos totales pasan hasta que se llena? Responde SOLO el número.",
     "76.8"),
    ("Cinco amigos comparten una cuenta de 1,240 pesos. Dos de ellos no tomaron bebidas y por eso "
     "pagan 90 pesos menos cada uno que los otros tres. ¿Cuánto paga cada uno de los tres? "
     "Responde SOLO el número en pesos.", "284"),
    ("Un tren sale de Puebla a las 8:40 y va a 90 km/h. Otro sale de la misma estación a las 9:10 "
     "y va a 120 km/h por la misma vía. ¿A qué hora alcanza el segundo al primero? Responde SOLO "
     "la hora en formato HH:MM de 24 horas.", "10:40"),
    ("En una bodega hay cajas de 12 y de 20 piezas. Hay 31 cajas y 500 piezas en total. ¿Cuántas "
     "cajas de 20 hay? Responde SOLO el número.", "16"),
    ("Un producto sube 25% y después baja 25%. Si terminó en 1,125 pesos, ¿cuánto costaba antes "
     "de la primera subida? Responde SOLO el número en pesos.", "1200"),
    ("Ana tiene el triple de años que Beto. Hace 6 años, Ana tenía cinco veces la edad de Beto. "
     "¿Cuántos años tiene Ana hoy? Responde SOLO el número.", "36"),
]

VARIANTES = {
    "paso_a_paso": [("sin el truco", ""), ("con 'piensa paso a paso'", "\n\nPiensa paso a paso.")],
    "rol": [("sin rol", ""),
            ("con rol de experto", "Eres un matemático experto con 20 años de experiencia.\n\n")],
    "ejemplos": [("solo instrucción", ""), ("con dos ejemplos", None)],
}

EJEMPLOS = ("Ejemplo: 'Dos plumas cuestan 30 pesos en total; una cuesta 20 más que la otra. "
            "¿Cuánto cuesta la barata?' → 5\n"
            "Ejemplo: 'Un libro y un separador cuestan 55; el libro cuesta 50 más. "
            "¿Cuánto el separador?' → 2.5\n\n")


def numero(txt: str) -> str:
    m = re.findall(r"-?\d+(?:[.,]\d+)?", (txt or "").replace(",", ""))
    return m[-1].rstrip("0").rstrip(".") if m else ""


def corre(router, prompt: str, reintentos: int = 3) -> str:
    """Una corrida. Un fallo de RED no es un fallo del truco: se reintenta.

    Antes devolvia "" ante cualquier excepcion y el llamador lo contaba como respuesta
    equivocada. Con eso, un rate-limit de la API se convertia en evidencia de que el
    truco no sirve — justo el error que esta serie dice no cometer.
    """
    for k in range(reintentos):
        try:
            r = router.generate_json(
                prompt + '\n\nDevuelve SOLO este JSON: {"respuesta": "<el número, nada más>"}')
            return numero(str(r.get("respuesta", "")))
        except Exception as e:  # noqa: BLE001
            if k == reintentos - 1:
                print(f"    (corrida perdida por la API: {str(e)[:70]})", flush=True)
                return "__ERROR__"
            time.sleep(2.0 * (k + 1))
    return "__ERROR__"


def main() -> None:
    cual = sys.argv[1] if len(sys.argv) > 1 else "paso_a_paso"
    # 3er argumento: FORZAR un modelo. Con el modelo grande las seis tareas salen 100%
    # en las dos condiciones (efecto techo) y la medicion no puede decir nada; el chico
    # todavia falla y ahi si hay margen para ver si el truco mueve algo.
    cfg = load_config()
    modelo = sys.argv[3] if len(sys.argv) > 3 else cfg["gemini"]["model"]
    cfg["gemini"] = {**cfg["gemini"], "model": modelo, "fallbacks": []}
    router = ModelRouter(cfg)
    out = {"truco": cual, "n_por_condicion": N, "tareas": len(TAREAS),
           "modelo": modelo, "condiciones": {}}
    for nombre, sufijo in VARIANTES[cual]:
        aciertos = total = perdidas = 0
        for tarea, esperado in TAREAS:
            p = tarea + (sufijo or "")
            if cual == "rol" and sufijo:
                p = sufijo + tarea
            if cual == "ejemplos" and sufijo is None:
                p = EJEMPLOS + tarea
            for _ in range(N // len(TAREAS) + 1):
                if total >= N:
                    break
                got = corre(router, p)
                if got == "__ERROR__":      # corrida perdida: NO cuenta como fallo
                    perdidas += 1
                    continue
                aciertos += int(got == numero(esperado))
                total += 1
                time.sleep(0.4)
        pct = 100.0 * aciertos / total if total else 0
        out["condiciones"][nombre] = {"aciertos": aciertos, "de": total,
                                      "pct": round(pct, 1), "corridas_perdidas": perdidas}
        print(f"  {nombre:28s} {aciertos}/{total} = {pct:.0f}%", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    sufijo_arch = "" if len(sys.argv) <= 3 else "_" + modelo.replace("-latest", "").replace("gemini-", "")
    Path(f"mediciones/prompt_{cual}{sufijo_arch}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"→ mediciones/prompt_{cual}{sufijo_arch}.json")


if __name__ == "__main__":
    main()
