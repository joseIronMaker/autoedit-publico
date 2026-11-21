"""¿De qué depende que el mismo prompt dé respuestas distintas? De la TEMPERATURA.

Por qué existe: `medir_varianza.py` dio 90/90 y las seis condiciones de los trucos
dieron exactamente 15/36 cada una. Eso no es que los trucos no sirvan: es que a la
temperatura configurada (0.3) el modelo es DETERMINISTA con estas tareas, así que
repetir el mismo prompt N veces no son N muestras — es la misma muestra N veces.
Aquí se mide justo eso: cuántas respuestas DISTINTAS salen del mismo prompt según la
temperatura. Es el recibo honesto de "una corrida no prueba nada".

    .venv/bin/python scratchpad/medir_temperatura.py [n_por_temperatura]
"""
import json
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from autoedit.config import load_config        # noqa: E402
from autoedit.model_router import ModelRouter  # noqa: E402
from medir_prompts import TAREAS, corre, numero  # noqa: E402

N = int(sys.argv[1]) if len(sys.argv) > 1 else 20
TEMPS = [0.0, 0.3, 1.0]
# la tarea del tinaco: la que mas se le atraviesa (trampa de orden y de unidades)
TAREA, ESPERADO = TAREAS[0]


def main() -> None:
    base = load_config()
    out = {"tema": "cuanto varia el mismo prompt segun la temperatura",
           "modelo": base["gemini"]["model"], "n_por_temperatura": N,
           "tarea": TAREA[:90], "esperado": ESPERADO, "temperaturas": {}}
    for t in TEMPS:
        cfg = load_config()
        cfg["gemini"] = {**cfg["gemini"], "temperature": t, "fallbacks": []}
        router = ModelRouter(cfg)
        respuestas = []
        for _ in range(N):
            r = corre(router, TAREA)
            if r != "__ERROR__":
                respuestas.append(r)
            time.sleep(0.3)
        cuenta = Counter(respuestas)
        aciertos = sum(1 for r in respuestas if r == numero(ESPERADO))
        out["temperaturas"][str(t)] = {
            "aciertos": aciertos, "de": len(respuestas),
            "pct": round(100.0 * aciertos / max(1, len(respuestas)), 1),
            "respuestas_distintas": len(cuenta),
            "top": cuenta.most_common(4)}
        print(f"  temp {t}: {aciertos}/{len(respuestas)} aciertos · "
              f"{len(cuenta)} respuestas distintas · {cuenta.most_common(3)}", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/prompt_temperatura.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("→ mediciones/prompt_temperatura.json")


if __name__ == "__main__":
    main()
