"""¿Y si le pides VARIOS datos del mismo contexto largo? Segunda parte del recibo 1.3.

La primera prueba (un solo dato escondido entre 300 y entre 2500 registros, al inicio, a
la mitad y al final) salió 96 de 96: la posición ya no cambia nada con los modelos de
2026. Esta mide lo otro: cuántos datos puede sacar DE UN JALÓN del mismo contexto.

    .venv/bin/python scratchpad/medir_atencion_multi.py [n_corridas] [n_registros]
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

N = int(sys.argv[1]) if len(sys.argv) > 1 else 10
N_REGISTROS = int(sys.argv[2]) if len(sys.argv) > 2 else 2500

CIUDADES = [
    "Puebla", "Monterrey", "Mérida", "Culiacán", "Toluca", "Querétaro", "Torreón",
    "Hermosillo", "Veracruz", "Chihuahua", "Morelia", "Cancún", "Durango", "Saltillo",
    "Tampico", "Oaxaca", "Xalapa", "Celaya", "Irapuato", "Mazatlán", "Reynosa",
    "Villahermosa", "Tepic", "Colima", "Pachuca", "Zacatecas", "Campeche", "Uruapan",
]
# 8 agujas, una por ciudad que NO aparece en el pajar, repartidas parejo
AGUJAS = [("Tlaxcala", "7431"), ("Ensenada", "2860"), ("Tuxtla", "9145"),
          ("Chetumal", "3078"), ("Tlaquepaque", "5629"), ("Comitán", "8302"),
          ("Nogales", "4157"), ("Tehuacán", "6community"[:4])]
AGUJAS[-1] = ("Tehuacán", "6913")


def arma(k: int) -> str:
    """Contexto con las primeras k agujas repartidas entre los distractores."""
    lineas = []
    for i in range(N_REGISTROS):
        c = CIUDADES[i % len(CIUDADES)]
        clave = 1000 + (i * 37) % 8000
        lineas.append(f"Registro {i + 1:04d} · bodega de {c} {i // len(CIUDADES) + 1} · "
                      f"clave de acceso {clave} · inventario {200 + (i * 13) % 900} piezas")
    paso = len(lineas) // (k + 1)
    for j, (ciudad, clave) in enumerate(AGUJAS[:k]):
        lineas.insert(min(len(lineas), paso * (j + 1) + j),
                      f"Registro E{j:02d} · bodega de {ciudad} · clave de acceso {clave} · "
                      f"inventario 512 piezas")
    pedidas = ", ".join(c for c, _ in AGUJAS[:k])
    return ("Estos son los registros de bodegas:\n\n" + "\n".join(lineas) +
            f"\n\nCon base ÚNICAMENTE en los registros de arriba, dame la clave de acceso "
            f"de estas bodegas: {pedidas}.")


def corre(router, prompt: str, k: int) -> int:
    """Devuelve cuántas de las k claves salieron bien."""
    campos = ", ".join(f'"{c}": "<clave>"' for c, _ in AGUJAS[:k])
    try:
        r = router.generate_json(prompt + "\n\nDevuelve SOLO este JSON: {" + campos + "}")
        ok = 0
        for ciudad, clave in AGUJAS[:k]:
            got = re.findall(r"\d+", str(r.get(ciudad, "")))
            ok += int(bool(got) and got[0] == clave)
        return ok
    except Exception as e:  # noqa: BLE001
        print(f"    (fallo: {str(e)[:70]})", flush=True)
        return -1


def main() -> None:
    router = ModelRouter(load_config())
    out = {"tema": "cuantos datos puede sacar de un contexto largo de un jalon",
           "modelo": load_config()["gemini"]["model"], "n_por_condicion": N,
           "registros_distractores": N_REGISTROS, "condiciones": {}}
    for k in (1, 4, 8):
        prompt = arma(k)
        aciertos = pedidos = corridas_ok = 0
        for _ in range(N):
            r = corre(router, prompt, k)
            if r < 0:
                continue
            aciertos += r
            pedidos += k
            corridas_ok += int(r == k)
            time.sleep(0.3)
        pct = round(100.0 * aciertos / pedidos, 1) if pedidos else 0
        out["condiciones"][f"{k} datos a la vez"] = {
            "claves_correctas": aciertos, "de": pedidos, "pct": pct,
            "corridas_perfectas": corridas_ok, "corridas": N}
        print(f"  {k} datos: {aciertos}/{pedidos} claves = {pct}% · "
              f"corridas perfectas {corridas_ok}/{N}", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/atencion_multi.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("→ mediciones/atencion_multi.json")


if __name__ == "__main__":
    main()
