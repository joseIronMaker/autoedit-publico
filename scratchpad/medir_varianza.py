"""El MISMO prompt, muchas veces: ¿siempre da lo mismo? Recibo para el video P1.

`medir_prompts.py` mezcla las seis tareas en un solo porcentaje, y para este video hace
falta lo contrario: el desglose POR TAREA, porque la idea es que un prompt idéntico
acierta unas veces y falla otras. Sin ese desglose no se puede decir "una corrida no
prueba nada" con recibo.

    .venv/bin/python scratchpad/medir_varianza.py [n_por_tarea]
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from autoedit.config import load_config        # noqa: E402
from autoedit.model_router import ModelRouter  # noqa: E402
from medir_prompts import TAREAS, corre, numero  # noqa: E402

N = int(sys.argv[1]) if len(sys.argv) > 1 else 15


def main() -> None:
    router = ModelRouter(load_config())
    out = {"tema": "el mismo prompt repetido: cuanto varia la respuesta",
           "modelo": load_config()["gemini"]["model"], "n_por_tarea": N, "tareas": []}
    for i, (tarea, esperado) in enumerate(TAREAS):
        aciertos = 0
        for _ in range(N):
            aciertos += int(corre(router, tarea) == numero(esperado))
            time.sleep(0.3)
        out["tareas"].append({"n": i + 1, "aciertos": aciertos, "de": N,
                              "pct": round(100.0 * aciertos / N, 1),
                              "prompt": tarea[:70]})
        print(f"  tarea {i + 1}: {aciertos}/{N}", flush=True)
    tot = sum(t["aciertos"] for t in out["tareas"])
    de = N * len(TAREAS)
    perfectas = sum(1 for t in out["tareas"] if t["aciertos"] == N)
    out["resumen"] = {"aciertos": tot, "de": de, "pct": round(100.0 * tot / de, 1),
                      "tareas_perfectas": perfectas, "tareas": len(TAREAS)}
    print(f"  TOTAL {tot}/{de} · tareas siempre correctas: {perfectas}/{len(TAREAS)}")
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/prompt_varianza.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("→ mediciones/prompt_varianza.json")


if __name__ == "__main__":
    main()
