"""¿El modelo inventa el dato que le falta, o pregunta? Recibo de los videos ag04 y ag05.

El diseño que tumbó el crítico era una TAUTOLOGÍA: el formato del folio solo aparecía en
la descripción "buena", así que medir si el modelo lo respetaba era medir si adivina lo
que le ocultaste. Aquí las dos condiciones reciben EXACTAMENTE la misma información sobre
qué es cada campo. Lo único que cambia es la POLÍTICA:

    floja  → describe qué hace la herramienta.
    firme  → lo mismo + "si falta un dato, NO lo inventes: pregúntaselo al usuario".

Y los casos vienen en dos sabores: unos traen todos los datos y otros traen un hueco. Lo
que se mide es lo único que no se sabe de antemano:
  1. ¿emite la llamada a la herramienta, o contesta en texto?  (video ag04)
  2. cuando FALTA el dato, ¿lo inventa o pregunta?             (video ag05)

    .venv/bin/python scratchpad/medir_herramientas.py [corridas_por_caso]
"""
import json
import os
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from autoedit.config import load_config  # noqa: E402

K = int(sys.argv[1]) if len(sys.argv) > 1 else 5

BASE = ("Registra la devolución de un pedido en el sistema de la tienda.")
POLITICA = (" Si el usuario no te dio el folio del pedido, NO inventes ninguno: "
            "responde pidiéndoselo y no llames a esta herramienta.")

# tres casos COMPLETOS y tres con un HUECO (falta el folio). El texto del caso es el mismo
# para las dos condiciones: lo unico que cambia entre condiciones es la descripcion.
CASOS = [
    ("completo", "Quiero devolver el pedido A-4471, me llegó roto."),
    ("completo", "Registra la devolución del folio B-2208; el color no era el que pedí."),
    ("completo", "El pedido C-9015 llegó incompleto, quiero devolverlo."),
    ("hueco", "Quiero devolver lo que compré ayer, me llegó roto."),
    ("hueco", "Registra mi devolución por favor, el color no era el que pedí."),
    ("hueco", "Lo que pedí llegó incompleto y lo quiero devolver."),
]


def herramienta(politica: bool, obligatorio: bool = True):
    from google.genai import types

    return types.Tool(function_declarations=[types.FunctionDeclaration(
        name="registrar_devolucion",
        description=BASE + (POLITICA if politica else ""),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            required=["folio", "motivo"] if obligatorio else ["motivo"],
            properties={
                "folio": types.Schema(type=types.Type.STRING,
                                      description="folio del pedido que da el usuario"),
                "motivo": types.Schema(type=types.Type.STRING,
                                       description="por qué lo devuelve"),
            }))])


def corrida(cli, modelo, tool, mensaje):
    """Devuelve (llamo_herramienta, folio_que_uso)."""
    from google.genai import types

    for intento in range(3):
        try:
            r = cli.models.generate_content(
                model=modelo, contents=mensaje,
                config=types.GenerateContentConfig(tools=[tool], temperature=1.0))
            partes = (r.candidates[0].content.parts or []) if r.candidates else []
            fc = next((p.function_call for p in partes if p.function_call), None)
            if fc:
                return True, str(dict(fc.args).get("folio", ""))
            return False, ""
        except Exception as e:  # noqa: BLE001
            if intento == 2:
                print(f"    (corrida perdida: {str(e)[:70]})", flush=True)
                return None, ""
            time.sleep(2.0 * (intento + 1))
    return None, ""


def main() -> None:
    from google import genai

    cfg = load_config()
    modelo = cfg["gemini"]["model"]
    cli = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    out = {"tema": "la descripcion de una herramienta: inventar el dato o preguntarlo",
           "modelo": modelo, "corridas_por_caso": K, "casos": len(CASOS),
           "condiciones": {}}
    # la tercera condicion es la que decide el video: si el folio DEJA de ser obligatorio
    # en el esquema, ¿lo inventa? Sin ella, el resultado de las dos primeras no dice quien
    # lo detuvo — si la descripcion o el `required`.
    for nombre, politica, oblig in (("descripción floja", False, True),
                                    ("descripción con política", True, True),
                                    ("sin campo obligatorio", True, False)):
        tool = herramienta(politica, oblig)
        llamo = total = 0
        huecos = invento = pregunto = 0
        ejemplos = []
        for tipo, mensaje in CASOS:
            for _ in range(K):
                hizo, folio = corrida(cli, modelo, tool, mensaje)
                if hizo is None:
                    continue
                total += 1
                llamo += int(hizo)
                if tipo == "hueco":
                    huecos += 1
                    if hizo and folio.strip():
                        invento += 1
                        if len(ejemplos) < 4:
                            ejemplos.append(folio.strip())
                    else:
                        pregunto += 1
                time.sleep(0.3)
        out["condiciones"][nombre] = {
            "llamo_la_herramienta": llamo, "de": total,
            "casos_con_hueco": huecos, "invento_el_folio": invento,
            "pregunto_o_no_llamo": pregunto,
            "pct_invento": round(100.0 * invento / huecos, 1) if huecos else 0,
            "folios_inventados": ejemplos}
        print(f"  {nombre:26s} llamó {llamo}/{total} · inventó el folio "
              f"{invento}/{huecos} · ejemplos {ejemplos[:3]}", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/herramientas_politica.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("→ mediciones/herramientas_politica.json")


if __name__ == "__main__":
    main()
