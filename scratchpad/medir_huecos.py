"""Cuenta los HUECOS que el modelo rellena solo cuando el prompt no los trae.

Por qué existe: en tareas abiertas (un correo, un resumen, un anuncio) no hay respuesta
correcta, así que "contar aciertos" no aplica y el canal se quedaba sin forma de medir. Sí
hay algo objetivo y contable: los MARCADORES que el modelo deja cuando le falta un dato —
[Nombre], [fecha], {motivo}, <empresa>. Cada marcador es un hueco que tú no llenaste.

Tres condiciones sobre la MISMA petición:
  1. una línea                — la petición pelona
  2. + contexto y datos       — quién soy, quién lee, los datos duros
  3. + formato y restricciones— largo, tono, qué debe llevar

    .venv/bin/python scratchpad/medir_huecos.py [N_por_condicion] [modelo]
"""
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv  # noqa: E402
load_dotenv()
from autoedit.model_router import ModelRouter  # noqa: E402
from autoedit.config import load_config        # noqa: E402

N = int(sys.argv[1]) if len(sys.argv) > 1 else 36

# Seis encargos REALES de todos los días (el mundo del espectador, no el del ingeniero).
# Cada uno en tres versiones de la MISMA petición.
TAREAS = [
    {
        "linea": "Escríbeme un correo para avisar de un retraso.",
        "datos": ("Soy proveedor de uniformes escolares en Puebla. Le escribo a Marisol Rangel, "
                  "coordinadora de compras del Colegio Iberoamericano. Su pedido de 200 playeras "
                  "quedó para el 12 de septiembre y se va a entregar el 19 porque el proveedor de "
                  "tela no surtió el color. Ya tengo apartado el material y es la primera vez que "
                  "les fallo en tres años."),
        "formato": ("Máximo 90 palabras, un solo párrafo, tono directo y sin disculpas repetidas. "
                    "La fecha nueva va en la primera línea. Cierra ofreciendo dos opciones: "
                    "esperar al 19 o recibir 120 playeras el 12 y el resto después."),
    },
    {
        "linea": "Escríbeme una respuesta para un cliente molesto.",
        "datos": ("Tengo una cafetería en Xalapa. Don Ernesto dejó una reseña de una estrella "
                  "porque esperó 35 minutos un desayuno un domingo y le llegó frío. Es cliente "
                  "desde hace dos años y esa mañana se nos descompuso la plancha. Contesto yo, "
                  "el dueño, en público en Google."),
        "formato": ("Máximo 60 palabras, sin plantillas corporativas, sin 'lamentamos los "
                    "inconvenientes'. Reconoce el hecho concreto, di qué cambió y no ofrezcas "
                    "nada gratis: invítalo a que me busque a mí la próxima vez."),
    },
    {
        "linea": "Hazme un resumen de una junta.",
        "datos": ("Junta de mi equipo de soporte, seis personas, una hora, este martes. Se "
                  "acordó: pasar los tickets de WhatsApp a un solo buzón, que Karla arme el "
                  "instructivo antes del viernes, y que dejamos de contestar fuera de horario. "
                  "Quedó pendiente decidir quién cubre los domingos. El resumen lo lee mi jefa, "
                  "que no estuvo."),
        "formato": ("Máximo 120 palabras. Tres bloques con encabezado: Acuerdos, Responsables con "
                    "fecha, y Lo que sigue sin decidir. Sin introducción ni cierre."),
    },
    {
        "linea": "Escríbeme una publicación para anunciar algo.",
        "datos": ("Doy clases de natación para adultos que le tienen miedo al agua, en una alberca "
                  "techada en Coyoacán. Abro un grupo nuevo los sábados de 8 a 9, empieza el 6 de "
                  "septiembre, ocho lugares, 950 pesos al mes. Lo publico en el Facebook del barrio, "
                  "donde la mayoría son personas de más de 40 que nunca aprendieron."),
        "formato": ("Máximo 70 palabras, sin emojis, sin hashtags, sin signos de admiración. "
                    "Habla de tú. La primera línea tiene que nombrar el miedo, no el horario."),
    },
    {
        "linea": "Escríbeme un correo para pedir una prórroga.",
        "datos": ("Soy Jonathan Ríos, estudiante de la maestría en administración. Le escribo al "
                  "profesor Aguilar para pedir cinco días más en el ensayo final que vence el "
                  "viernes 29. Llevo escrito el marco teórico y me falta el análisis; el motivo "
                  "es que mi mamá estuvo hospitalizada dos semanas y yo la cuidé."),
        "formato": ("Máximo 80 palabras. Pide la prórroga en la primera oración, el motivo en una "
                    "sola línea y sin dramatizar, y propón una fecha concreta de entrega. "
                    "Sin adjuntar comprobantes ni prometer nada extra."),
    },
    {
        "linea": "Escríbeme la descripción de un producto.",
        "datos": ("Vendo mochilas de lona encerada hechas a mano en Oaxaca. La que voy a publicar "
                  "es de 18 litros, cabe una laptop de 14 pulgadas, tiene forro impermeable y "
                  "correas de piel, cuesta 1,450 pesos y la hace mi tío en un taller familiar. "
                  "Va en Mercado Libre y compito contra mochilas importadas de 600 pesos."),
        "formato": ("Máximo 80 palabras, en tercera persona, sin adjetivos vacíos como 'increíble' "
                    "o 'de la más alta calidad'. Menciona el precio y por qué cuesta más que las "
                    "importadas. Termina con la medida exacta que cabe adentro."),
    },
]

CONDICIONES = ["una línea", "con contexto y datos", "con formato y restricciones"]

# Un HUECO es un marcador que el modelo deja para que TÚ lo llenes: [Nombre], {fecha},
# <empresa>. Se cuenta por código, no a ojo: es la única propiedad objetiva de un texto
# abierto. Se excluyen los enlaces markdown [texto](url) y las casillas de lista "- [ ]"
# / "- [x]", que no son huecos sino formato (inflaban la cuenta 3x en el resumen de junta).
_HUECO = re.compile(r"\[[^\]\n]{2,60}\](?!\()|\{[^\}\n]{2,60}\}|<[^>\n@]{2,60}>")
_CASILLA = re.compile(r"^\[[ xX]\]$")


def huecos(txt: str) -> list:
    return [m.group(0) for m in _HUECO.finditer(txt or "")
            if not _CASILLA.match(m.group(0)) and re.search(r"[A-Za-zÁÉÍÓÚáéíóúñÑ]", m.group(0))]


def arma(t: dict, cond: int) -> str:
    if cond == 0:
        return t["linea"]
    if cond == 1:
        return t["linea"] + "\n\n" + t["datos"]
    return t["linea"] + "\n\n" + t["datos"] + "\n\n" + t["formato"]


def corre(router, prompt: str, reintentos: int = 3) -> str:
    for k in range(reintentos):
        try:
            return router.generate_text(prompt)
        except Exception as e:  # noqa: BLE001
            if k == reintentos - 1:
                print(f"    (corrida perdida: {str(e)[:70]})", flush=True)
                return "__ERROR__"
            time.sleep(2.0 * (k + 1))
    return "__ERROR__"


def main() -> None:
    cfg = load_config()
    modelo = sys.argv[2] if len(sys.argv) > 2 else cfg["gemini"]["model"]
    cfg["gemini"] = {**cfg["gemini"], "model": modelo, "fallbacks": []}
    router = ModelRouter(cfg)
    out = {"tema": "cuantos huecos rellena el modelo cuando el prompt no los trae",
           "modelo": modelo, "n_por_condicion": N, "tareas": len(TAREAS),
           "que_cuenta_un_hueco": "marcador [x] {x} <x> que el modelo deja para que lo llenes",
           "condiciones": {}}
    por_ronda = max(1, N // len(TAREAS))
    for c, nombre in enumerate(CONDICIONES):
        tot_h = tot_r = con_hueco = perdidas = 0
        ejemplos: list = []
        detalle: list = []
        for i, t in enumerate(TAREAS):
            p = arma(t, c)
            th = tr = tc = 0
            for _ in range(por_ronda):
                r = corre(router, p)
                if r == "__ERROR__":
                    perdidas += 1
                    continue
                hs = huecos(r)
                th += len(hs)
                tr += 1
                tc += int(bool(hs))
                if hs and len(ejemplos) < 14:
                    ejemplos.extend(hs[:3])
                time.sleep(0.3)
            tot_h += th
            tot_r += tr
            con_hueco += tc
            detalle.append({"encargo": t["linea"], "respuestas": tr, "huecos": th,
                            "por_respuesta": round(th / tr, 2) if tr else 0,
                            "con_hueco": tc})
        out["condiciones"][nombre] = {
            "respuestas": tot_r,
            "huecos_totales": tot_h,
            "huecos_por_respuesta": round(tot_h / tot_r, 2) if tot_r else 0,
            "respuestas_con_al_menos_un_hueco": con_hueco,
            "pct_con_hueco": round(100.0 * con_hueco / tot_r, 1) if tot_r else 0,
            "ejemplos_de_hueco": ejemplos[:14],
            "por_encargo": detalle,
            "corridas_perdidas": perdidas,
        }
        d = out["condiciones"][nombre]
        print(f"  {nombre:28s} {d['huecos_por_respuesta']:5.2f} huecos/respuesta · "
              f"{d['pct_con_hueco']:.0f}% con al menos uno  (n={tot_r})", flush=True)
    Path("mediciones").mkdir(exist_ok=True)
    suf = "" if len(sys.argv) <= 2 else "_" + modelo.replace("-latest", "").replace("gemini-", "")
    p = Path(f"mediciones/prompt_huecos{suf}.json")
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"→ {p}")


if __name__ == "__main__":
    main()
