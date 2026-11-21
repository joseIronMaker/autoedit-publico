"""¿El MISMO prompt rinde igual en dos modelos distintos? Recibo para el video P6.

La creencia que rompe: los "packs de prompts" que se venden y los prompts que alguien
copia de otro. Aquí el prompt es idéntico, letra por letra; lo único que cambia es el
modelo que lo contesta.

    .venv/bin/python scratchpad/medir_modelos.py [n_por_modelo]
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from autoedit.config import load_config        # noqa: E402
from autoedit.model_router import ModelRouter  # noqa: E402
from medir_prompts import TAREAS, corre, numero  # noqa: E402

N = int(sys.argv[1]) if len(sys.argv) > 1 else 30


def router_de(modelo: str) -> ModelRouter:
    """Un router clavado a UN modelo: sin fallbacks, o la medición se contamina."""
    cfg = load_config()
    cfg["gemini"] = {**cfg["gemini"], "model": modelo, "fallbacks": []}
    return ModelRouter(cfg)


def main() -> None:
    cfg = load_config()
    modelos = [cfg["gemini"]["model"], *cfg["gemini"].get("fallbacks", [])][:2]
    out = {"tema": "el mismo prompt en dos modelos distintos",
           "n_por_modelo": N, "tareas": len(TAREAS), "modelos": {}}
    # K corridas por tarea, iguales para todas. El reparto viejo (`N // len(TAREAS) + 1`
    # con corte al llegar a N) dejaba a la ultima tarea con 1 corrida o con ninguna, y el
    # porcentaje salia pesado hacia las primeras. Ademas el modelo resulto DETERMINISTA
    # (medido: 90/90 y 20/20 a temperatura 1.0), asi que lo que vale es cuantas TAREAS
    # resuelve, no cuantas corridas: por eso se reporta tambien "tareas_resueltas".
    K = max(1, N // len(TAREAS))
    for modelo in modelos:
        router = router_de(modelo)
        aciertos = total = resueltas = 0
        detalle = []
        for i, (tarea, esperado) in enumerate(TAREAS):
            ok = 0
            for _ in range(K):
                ok += int(corre(router, tarea) == numero(esperado))
                total += 1
                time.sleep(0.3)
            aciertos += ok
            resueltas += int(ok == K)
            detalle.append({"tarea": i + 1, "aciertos": ok, "de": K})
        pct = round(100.0 * aciertos / total, 1) if total else 0
        out["modelos"][modelo] = {"aciertos": aciertos, "de": total, "pct": pct,
                                  "corridas_por_tarea": K, "tareas": len(TAREAS),
                                  "tareas_resueltas": resueltas, "detalle": detalle}
        print(f"  {modelo:28s} {aciertos}/{total} corridas · "
              f"tareas resueltas {resueltas}/{len(TAREAS)}", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/prompt_entre_modelos.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("→ mediciones/prompt_entre_modelos.json")


if __name__ == "__main__":
    main()
