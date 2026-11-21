"""¿Importa DÓNDE pones el dato dentro de un prompt largo? Recibo para el video 1.3.

Réplica propia del efecto "lost in the middle" (Liu et al., TACL 2023): el mismo dato se
esconde al INICIO, a la MITAD y al FINAL de un contexto largo lleno de distractores del
mismo tipo, y se mide cuántas veces lo recupera bien.

Regla del canal: ninguna cifra entra a un guion si no existe en mediciones/.

    .venv/bin/python scratchpad/medir_atencion.py
"""
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from autoedit.config import load_config        # noqa: E402
from autoedit.model_router import ModelRouter  # noqa: E402

# tamaño del pajar y corridas por posición se pasan por CLI: la primera corrida (300
# registros, n=20) dio 20/20 en las TRES posiciones — a ese tamaño el efecto de 2023 ya
# no aparece. Para saber si aparece más arriba hay que escalar el contexto.
N = int(sys.argv[1]) if len(sys.argv) > 1 else 20
N_REGISTROS = int(sys.argv[2]) if len(sys.argv) > 2 else 300
CIUDAD = "Tlaxcala"
CLAVE = "7431"

CIUDADES = [
    "Puebla", "Monterrey", "Mérida", "Culiacán", "Toluca", "Querétaro", "Torreón",
    "Hermosillo", "Veracruz", "Chihuahua", "Morelia", "Cancún", "Durango", "Saltillo",
    "Tampico", "Oaxaca", "Xalapa", "Celaya", "Irapuato", "Mazatlán", "Reynosa",
    "Villahermosa", "Tepic", "Colima", "Pachuca", "Zacatecas", "Campeche", "Uruapan",
]


def pajar() -> list[str]:
    """Registros distractores: MISMA forma que la aguja, con claves de otras bodegas."""
    lineas = []
    for i in range(N_REGISTROS):
        c = CIUDADES[i % len(CIUDADES)]
        clave = 1000 + (i * 37) % 8000
        if str(clave) == CLAVE:
            clave += 1
        lineas.append(f"Registro {i + 1:03d} · bodega de {c} {i // len(CIUDADES) + 1} · "
                      f"clave de acceso {clave} · inventario {200 + (i * 13) % 900} piezas")
    return lineas


AGUJA = f"Registro 000 · bodega de {CIUDAD} · clave de acceso {CLAVE} · inventario 512 piezas"

PREGUNTA = (f"\n\nCon base ÚNICAMENTE en los registros de arriba: ¿qué número hay que "
            f"teclear para entrar a la bodega de {CIUDAD}?")


def arma(pos: str) -> str:
    l = pajar()
    if pos == "inicio":
        l.insert(0, AGUJA)
    elif pos == "medio":
        l.insert(len(l) // 2, AGUJA)
    else:
        l.append(AGUJA)
    return "Estos son los registros de bodegas:\n\n" + "\n".join(l) + PREGUNTA


def corre(router, prompt: str) -> str:
    try:
        r = router.generate_json(
            prompt + '\n\nDevuelve SOLO este JSON: {"clave": "<el número, nada más>"}')
        m = re.findall(r"\d+", str(r.get("clave", "")))
        return m[0] if m else ""
    except Exception as e:  # noqa: BLE001
        print(f"    (fallo: {str(e)[:80]})", flush=True)
        return ""


def main() -> None:
    router = ModelRouter(load_config())
    out = {"tema": "posicion del dato dentro de un prompt largo",
           "replica_de": "Liu et al., 'Lost in the Middle', TACL 2023 (arXiv 2307.03172)",
           "modelo": load_config()["gemini"]["model"],
           "n_por_posicion": N, "registros_distractores": N_REGISTROS,
           "posiciones": {}}
    for pos in ("inicio", "medio", "final"):
        prompt = arma(pos)
        aciertos = 0
        for k in range(N):
            aciertos += int(corre(router, prompt) == CLAVE)
            time.sleep(0.3)
        pct = round(100.0 * aciertos / N, 1)
        out["posiciones"][pos] = {"aciertos": aciertos, "de": N, "pct": pct}
        print(f"  {pos:8s} {aciertos}/{N} = {pct}%", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    Path(f"mediciones/atencion_posicion_{N_REGISTROS}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"→ mediciones/atencion_posicion_{N_REGISTROS}.json")


if __name__ == "__main__":
    main()
