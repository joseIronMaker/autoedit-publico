"""El HUECO: lo que tú no escribes, ¿lo rellena al azar o siempre igual? Recibo del video
"Qué hace el modelo con tu texto" (serie 1.5).

Las mediciones previas de la serie cuentan ACIERTOS contra una respuesta correcta. Aquí no
hay respuesta correcta a propósito: el prompt es libre ("escribe una historia corta sobre un
perro") y lo que se mide es OTRA cosa — cuánto se repite el relleno que el modelo inventa
para el hueco que dejó el usuario. Si el relleno fuera azar, N corridas darían N nombres
distintos. Si es promedio, se amontonan en uno.

RIGOR: se corre a temperature 1.0 (la de una app de chat, no la 0.3 del proyecto) para que
nadie pueda decir que el amontonamiento es artefacto de bajar la temperatura. El nombre se
extrae con una segunda llamada de extracción, nunca pidiéndoselo en el mismo prompt (eso
cambiaría el prompt medido).

    .venv/bin/python scratchpad/medir_relleno.py [n]
"""
import json
import sys
import time
import unicodedata
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from autoedit.config import load_config        # noqa: E402
from autoedit.model_router import ModelRouter  # noqa: E402

N = int(sys.argv[1]) if len(sys.argv) > 1 else 40

# El prompt incompleto a propósito: no dice nombre, ni raza, ni tono, ni final, ni largo.
PROMPT = "Escribe una historia corta sobre un perro."


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", (s or "").strip().lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.split()[0].strip(".,;:!¡?¿\"'") if s.split() else ""


def historia(router) -> str:
    for k in range(3):
        try:
            r = router.generate_json(
                PROMPT + '\n\nDevuelve SOLO este JSON: {"texto": "<la historia completa>"}')
            return str(r.get("texto", "")).strip()
        except Exception as e:  # noqa: BLE001
            if k == 2:
                print(f"    (corrida perdida: {str(e)[:60]})", flush=True)
                return ""
            time.sleep(2.0 * (k + 1))
    return ""


def extrae(router, texto: str) -> dict:
    """Segunda llamada: extrae los rellenos. No juzga calidad, solo lee lo que dice."""
    p = ("Lee este relato y responde SOLO sobre lo que el relato dice, sin inventar.\n\n"
         f"---\n{texto[:4000]}\n---\n\n"
         'Devuelve SOLO este JSON: {"nombre": "<nombre propio del perro, o NINGUNO si no '
         'tiene>", "muere_o_se_pierde": "si|no", "narrador": "primera|tercera"}')
    for k in range(3):
        try:
            return router.generate_json(p)
        except Exception:  # noqa: BLE001
            if k == 2:
                return {}
            time.sleep(2.0 * (k + 1))
    return {}


def main() -> None:
    cfg = load_config()
    # temperature de app de chat, no la del proyecto: que el amontonamiento no sea artefacto.
    cfg["gemini"] = {**cfg["gemini"], "temperature": 1.0}
    router = ModelRouter(cfg)
    modelo = cfg["gemini"]["model"]

    nombres, muertes, narrador, largos, perdidas = [], 0, [], [], 0
    for i in range(N):
        txt = historia(router)
        if not txt:
            perdidas += 1
            continue
        d = extrae(router, txt)
        nom = norm(str(d.get("nombre", "")))
        if nom and nom != "ninguno":
            nombres.append(nom)
        if str(d.get("muere_o_se_pierde", "")).lower().startswith("s"):
            muertes += 1
        narrador.append(str(d.get("narrador", "")).lower())
        largos.append(len(txt.split()))
        print(f"  {i + 1:3d}/{N}  nombre={nom or '-':12s} palabras={len(txt.split())}",
              flush=True)
        time.sleep(0.3)

    c = Counter(nombres)
    top = c.most_common(6)
    validas = len(largos)
    out = {
        "tema": "el hueco de un prompt incompleto: ¿azar o promedio?",
        "fecha": "2026-08-16",
        "modelo": modelo,
        "temperature": 1.0,
        "prompt": PROMPT,
        "hueco": "el prompt no dice nombre, raza, tono, final ni largo",
        "corridas": validas,
        "corridas_perdidas": perdidas,
        "nombres": {
            "con_nombre": len(nombres),
            "distintos": len(c),
            "top": [{"nombre": n, "veces": v} for n, v in top],
            "mas_comun_pct": round(100.0 * top[0][1] / len(nombres), 1) if nombres else 0,
        },
        "otros_rellenos": {
            "muere_o_se_pierde": muertes,
            "de": validas,
            "narrador_tercera": narrador.count("tercera"),
            "palabras_mediana": sorted(largos)[len(largos) // 2] if largos else 0,
            "palabras_min": min(largos) if largos else 0,
            "palabras_max": max(largos) if largos else 0,
        },
    }
    print("\n  nombres distintos: %d de %d corridas" % (len(c), validas))
    for n, v in top:
        print(f"    {n:14s} {v}")
    print(f"  final triste/pérdida: {muertes}/{validas}")
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/prompt_relleno.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("→ mediciones/prompt_relleno.json")


if __name__ == "__main__":
    main()
