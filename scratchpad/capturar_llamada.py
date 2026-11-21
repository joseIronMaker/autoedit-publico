"""Qué escribe DE VERDAD un modelo cuando "usa una herramienta". Recibo del video 1 de agentes.

Un modelo de lenguaje no ejecuta nada: escribe texto. Cuando decimos que "usó una
herramienta", lo que emitió fue un PEDIDO en texto, y otro programa —el agente— lo lee, lo
ejecuta de verdad y le devuelve el resultado para que siga.

Este script hace pasar ese ciclo completo UNA vez y lo congela, para poder mostrarlo en
pantalla sin dibujar nada: se ve el pedido tal como salió del modelo, se ve al programa
ejecutándolo, y se ve la respuesta final del modelo con el resultado ya en la mano.

    .venv/bin/python scratchpad/capturar_llamada.py
"""
import json
import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from dotenv import load_dotenv  # noqa: E402

load_dotenv()
from autoedit.config import load_config  # noqa: E402

# la herramienta de juguete: una que el modelo NO puede resolver de memoria, para que se vea
# que el pedido no es adorno. El inventario vive aquí, en Python, no en el modelo.
INVENTARIO = {"A-4471": 3, "B-2208": 0, "C-9015": 12}
PREGUNTA = "¿Cuántas piezas me quedan del pedido B-2208?"


def herramienta():
    from google.genai import types

    return types.Tool(function_declarations=[types.FunctionDeclaration(
        name="consultar_inventario",
        description="Devuelve cuántas piezas quedan de un pedido, buscándolo en el almacén.",
        parameters=types.Schema(
            type=types.Type.OBJECT, required=["folio"],
            properties={"folio": types.Schema(
                type=types.Type.STRING, description="folio del pedido, por ejemplo A-4471")}))])


def main() -> None:
    from google import genai
    from google.genai import types

    cfg = load_config()
    modelo = cfg["gemini"]["model"]
    cli = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    tool = herramienta()
    conf = types.GenerateContentConfig(tools=[tool], temperature=0.2)

    # ---- vuelta 1: el modelo NO contesta la pregunta. Pide una herramienta. ------------
    r1 = cli.models.generate_content(model=modelo, contents=PREGUNTA, config=conf)
    partes = r1.candidates[0].content.parts or []
    fc = next((p.function_call for p in partes if p.function_call), None)
    if not fc:
        sys.exit("el modelo no pidió la herramienta; sin pedido no hay nada que enseñar")
    pedido = {"name": fc.name, "args": dict(fc.args)}
    texto_1 = "".join(p.text or "" for p in partes).strip()

    # ---- lo que hace el AGENTE (o sea: Python, aquí abajo, no el modelo) ---------------
    folio = pedido["args"].get("folio", "")
    resultado = {"folio": folio, "piezas": INVENTARIO.get(folio)}

    # ---- vuelta 2: se le devuelve el resultado y AHORA sí contesta ---------------------
    hist = [
        types.Content(role="user", parts=[types.Part(text=PREGUNTA)]),
        r1.candidates[0].content,
        types.Content(role="user", parts=[types.Part.from_function_response(
            name=pedido["name"], response=resultado)]),
    ]
    r2 = cli.models.generate_content(model=modelo, contents=hist, config=conf)
    final = (r2.text or "").strip()

    out = {"tema": "lo que un modelo escribe cuando 'usa una herramienta': un pedido, no una acción",
           "modelo": modelo, "pregunta": PREGUNTA,
           "inventario_que_vive_en_python": INVENTARIO,
           "vuelta_1_texto_del_modelo": texto_1,
           "vuelta_1_pedido_del_modelo": pedido,
           "lo_ejecuto": "Python (el agente), no el modelo",
           "resultado_de_la_herramienta": resultado,
           "vuelta_2_respuesta_final": final,
           "lineas_para_pantalla": [
               {"prompt": True, "text": PREGUNTA},
               {"text": "el modelo escribe:"},
               {"text": json.dumps(pedido, ensure_ascii=False), "accent": True},
               {"text": "no ejecutó nada. pidió."},
               {"prompt": True, "text": "el agente lo ejecuta →  "
                                        + json.dumps(resultado, ensure_ascii=False)},
               {"text": final[:110], "accent": True},
           ]}
    (RAIZ / "mediciones").mkdir(exist_ok=True)
    (RAIZ / "mediciones" / "llamada_cruda.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    for k in ("vuelta_1_texto_del_modelo", "vuelta_1_pedido_del_modelo",
              "resultado_de_la_herramienta", "vuelta_2_respuesta_final"):
        print(f"{k}: {json.dumps(out[k], ensure_ascii=False)[:160]}")
    print("→ mediciones/llamada_cruda.json")


if __name__ == "__main__":
    main()
