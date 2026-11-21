"""Los TRES nombres que salen en el selector de Gemini, contra las mismas 6 tareas.

Recibo para el video "que modelo te esta contestando" (serie 1.5). El menu de
gemini.google.com (documentado por Google en support.google.com/gemini/answer/13275745)
ofrece Flash-Lite, Flash y Pro. Aqui se corre el MISMO prompt, letra por letra, contra
las versiones por API de esos tres nombres, N corridas por tarea, con respuesta
verificable por codigo.

    .venv/bin/python scratchpad/medir_tres_del_menu.py [corridas_por_tarea]
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

from medir_prompts import TAREAS, corre, numero  # noqa: E402  (mismas tareas verificables)

K = int(sys.argv[1]) if len(sys.argv) > 1 else 4

# nombre en el menu de la app  ->  modelo por API de esa misma familia
MODELOS = [
    ("Flash-Lite", "gemini-flash-lite-latest"),
    ("Flash", "gemini-flash-latest"),
    ("Pro", "gemini-pro-latest"),
]


def main() -> None:
    cfg = load_config()
    out = {"tema": "los tres nombres del selector de Gemini, mismo prompt",
           "corridas_por_tarea": K, "tareas": len(TAREAS),
           "fuente_menu": "https://support.google.com/gemini/answer/13275745",
           "modelos": {}}
    for etiqueta, modelo in MODELOS:
        c = {**cfg, "gemini": {**cfg["gemini"], "model": modelo, "fallbacks": []}}
        router = ModelRouter(c)
        detalle, aciertos, total, perdidas = [], 0, 0, 0
        for i, (tarea, esperado) in enumerate(TAREAS, 1):
            ok = n = 0
            for _ in range(K):
                got = corre(router, tarea)
                if got == "__ERROR__":
                    perdidas += 1
                    continue
                # OJO: la respuesta y lo esperado pasan POR LA MISMA normalizacion
                # (numero() recorta ceros finales y saca el ultimo numero del texto).
                # Comparar contra el string crudo hacia fallar siempre las tareas de
                # hora ("10:40") y las que acaban en cero ("1200").
                ok += int(got == numero(esperado))
                n += 1
                time.sleep(0.3)
            detalle.append({"tarea": i, "aciertos": ok, "de": n})
            aciertos += ok
            total += n
            print(f"  {etiqueta:11s} tarea {i}: {ok}/{n}", flush=True)
        out["modelos"][modelo] = {
            "etiqueta_en_el_menu": etiqueta, "aciertos": aciertos, "de": total,
            "pct": round(100.0 * aciertos / total, 1) if total else 0,
            "tareas_resueltas": sum(1 for d in detalle if d["aciertos"] == d["de"] and d["de"]),
            "corridas_perdidas": perdidas, "detalle": detalle}
        print(f"→ {etiqueta}: {aciertos}/{total}", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    p = Path("mediciones/prompt_tres_del_menu.json")
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"→ {p}")


if __name__ == "__main__":
    main()
