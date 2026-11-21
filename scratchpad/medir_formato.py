"""¿Los ejemplos sirven para el FORMATO? Último intento de rescatar el video de few-shot.

Las seis tareas de `medir_prompts.py` tienen respuesta numérica y el modelo las resuelve
o no las resuelve: ahí ningún truco mueve nada (medido: 48/48 vs 48/48). Pero el few-shot
nunca prometió arreglar aritmética — promete que la SALIDA tenga la forma que pediste.
Eso sí es verificable por código, y es donde hay que medirlo.

    .venv/bin/python scratchpad/medir_formato.py [n_por_condicion]
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

N = int(sys.argv[1]) if len(sys.argv) > 1 else 30

TEXTOS = [
    "El pedido 4471 salió de Puebla el 3 de marzo a las 14:20 y llegó a Mérida el 6 de "
    "marzo. Lo recibió Ana Ruiz. Pesaba 12.4 kilos y costó 890 pesos.",
    "La factura A-208 se emitió el 12 de enero a nombre de Taller Solís por 3,450 pesos, "
    "con vencimiento el 11 de febrero. La firmó Rubén Mata.",
    "El equipo entregó la versión 2.3 el 8 de julio tras 14 semanas. Lo lideró Karina Peña "
    "y participaron seis personas. El presupuesto fue de 78,000 pesos.",
    "La orden 991 se canceló el 21 de septiembre porque el proveedor Lomas del Norte no "
    "surtió 40 piezas. La reportó Diego Nava y el monto era 15,200 pesos.",
    "El curso empezó el 2 de mayo, duró 9 sesiones y lo tomaron 23 personas. Lo impartió "
    "Marta Cordero y la sede fue Cholula.",
]

INSTRUCCION = (
    "Extrae los datos del texto. Devuélvelos como una lista de líneas, una por dato, "
    "con el formato exacto 'campo: valor'. El campo va en minúsculas y sin acentos. "
    "Sin viñetas, sin numeración, sin negritas, sin líneas en blanco y sin ningún "
    "texto antes ni después de la lista.\n\nTexto:\n")

EJEMPLOS = (
    "Ejemplo de salida correcta para otro texto:\n"
    "pedido: 1180\n"
    "fecha: 5 de abril\n"
    "responsable: Luis Peña\n"
    "monto: 2300 pesos\n\n"
    "Otro ejemplo correcto:\n"
    "factura: B-77\n"
    "cliente: Grupo Aldama\n"
    "vencimiento: 30 de junio\n\n")

LINEA = re.compile(r"^[a-z][a-z0-9 _]{1,24}: .+$")


def cumple(txt: str) -> bool:
    """El formato se verifica por código: nada de juzgar 'calidad' a ojo."""
    lineas = [l for l in (txt or "").strip().splitlines()]
    if len(lineas) < 3:
        return False
    return all(LINEA.match(l.strip()) for l in lineas if l.strip() != "") and \
        all(l.strip() != "" for l in lineas)


def corre(router, prompt: str, reintentos: int = 3) -> str:
    for k in range(reintentos):
        try:
            r = router.generate_json(
                prompt + '\n\nDevuelve SOLO este JSON: {"salida": "<la lista, con saltos '
                         'de linea reales>"}')
            return str(r.get("salida", ""))
        except Exception:  # noqa: BLE001
            if k == reintentos - 1:
                return "__ERROR__"
            time.sleep(2.0 * (k + 1))
    return "__ERROR__"


def main() -> None:
    cfg = load_config()
    modelo = sys.argv[2] if len(sys.argv) > 2 else cfg["gemini"]["model"]
    cfg["gemini"] = {**cfg["gemini"], "model": modelo, "fallbacks": []}
    router = ModelRouter(cfg)
    out = {"tema": "los ejemplos y el FORMATO de la salida", "modelo": modelo,
           "n_por_condicion": N, "textos": len(TEXTOS), "condiciones": {}}
    for nombre, pre in (("solo instrucción", ""), ("con dos ejemplos", EJEMPLOS)):
        ok = total = perdidas = 0
        i = 0
        while total < N:
            texto = TEXTOS[i % len(TEXTOS)]
            i += 1
            r = corre(router, pre + INSTRUCCION + texto)
            if r == "__ERROR__":
                perdidas += 1
                continue
            ok += int(cumple(r))
            total += 1
            time.sleep(0.3)
        out["condiciones"][nombre] = {"cumplen": ok, "de": total,
                                      "pct": round(100.0 * ok / total, 1),
                                      "corridas_perdidas": perdidas}
        print(f"  {nombre:20s} {ok}/{total} = {100.0 * ok / total:.0f}%", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/prompt_formato.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("→ mediciones/prompt_formato.json")


if __name__ == "__main__":
    main()
