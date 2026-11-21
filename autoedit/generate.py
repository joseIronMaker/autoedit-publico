"""Rama A: genera un video 9:16 desde un tema — guion, voz TTS, imágenes y Ken Burns.

El resultado se guarda como gen_<slug>.mp4 en la carpeta de videos: entra al mismo flujo
de siempre (Analizar → Renderizar) para recibir subtítulos karaoke y copys.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import unicodedata
import wave
from pathlib import Path
from typing import Callable

from .config import load_config
from .model_router import ModelRouter

# Formato del video, elegible desde la UI:
#   "corto" → crecimiento: ~30-40s, máxima retención y alcance (formato base del canal).
#   "largo" → monetización: ~80-100s, tema a fondo; supera el minuto que exige el Creator
#             Rewards Program de TikTok para pagar por views.
# Cambia el guion (duración, longitud de narración, profundidad) y el nº de escenas por defecto.
FORMATOS = {
    "corto": {
        "n_scenes": 7,
        "dur": "corto vertical (28–34 segundos), con escenas CORTAS y ágiles",
        "desarrollo": "cada escena narra UNA sola frase corta (8–16 palabras, "
                      "~3–5 segundos hablados)",
        "profundidad": "",
    },
    "largo": {
        "n_scenes": 13,
        "dur": "vertical de FORMATO LARGO (80–110 segundos, para monetización)",
        "desarrollo": "cada escena narra 1–2 frases (16–28 palabras, ~6–9 segundos hablados), "
                      "sin perder el ritmo",
        "profundidad": (
            "PROFUNDIDAD (formato largo): desarrolla el tema A FONDO — añade una escena de "
            "CONTEXTO (\"por qué esto te importa\") justo después del hook, cubre 3–5 pasos o "
            "subtemas concretos, incluye AL MENOS DOS escenas \"prompt\" con ejemplos reales "
            "distintos, y una escena de RECAP (los puntos clave en una \"list\") antes del CTA. "
            "Cada escena conserva su micro-gancho: profundo NO significa lento ni con relleno — "
            "la curiosidad nunca baja."
        ),
    },
}


def formato(modo: str | None) -> dict:
    """Devuelve la config del formato; 'corto' por defecto ante valores desconocidos."""
    return FORMATOS.get(modo or "corto", FORMATOS["corto"])


# FOTO REAL por defecto (mandato de José, 28-jul: "quiero siempre la máxima calidad").
# El neón/3D de antes hacía que todos los videos se vieran iguales y a "IA barata"; los 9
# referentes que él mandó son 9 de 9 material real. Un guion puede sobreescribirlo con
# "image_style" si el tema pide otra cosa.
# Estilo SOBRIO y anti-cliché. Las dos listas de prohibiciones son el resultado de fallas
# reales: el 11-ago-2026 el ancla de estilo devolvió el cerebro de neón cian/magenta —el
# cliché exacto de "IA"— y se coló como escena de un video cuya paleta es documental.
_IMG_STYLE = ("ultra realistic photograph, shot on a 50mm lens at f/1.8, natural light, "
              "photojournalistic, sharp focus, cinematic depth of field, "
              "vertical 9:16 composition, "
              "muted desaturated palette: graphite, ink blue, bone white and warm amber "
              "lamplight — LOW saturation, editorial documentary look. "
              "STRICTLY FORBIDDEN: neon, fluorescent cyan or magenta, glowing edges, "
              "glowing brains, circuit boards, humanoid robots, holograms, binary code, "
              "wireframe heads, blue tech grids — every visual cliché of 'artificial "
              "intelligence'. No illustration, no 3D render, no text, no words, no watermark")

GUION_PROMPT = """Eres el guionista de José, divulgador de IA en español para público general \
(LATAM). Posicionamiento: "el traductor de la IA" — convierte lo de frontera en algo usable hoy.

Escribe el guion de un video {dur}, en {n_scenes} escenas, sobre:
\"\"\"{tema}\"\"\"

PRUEBA DEL TEMA — BLOQUEANTE, va ANTES de escribir nada. El JSON debe traer estos tres \
campos, cada uno en una frase concreta:
  "quien_decide": quién decide algo SOBRE EL ESPECTADOR usando este mecanismo (un banco, un \
    detector, un filtro, el propio modelo con su prompt).
  "que_cuesta": qué pierde él si ese mecanismo se equivoca — en minutos, pesos, su calificación, \
    su trámite, su reputación. Nada abstracto.
  "palanca": qué puede HACER hoy, solo, en menos de dos minutos, sin comprar nada.
Si no puedes llenar los tres con verdad, el tema está mal elegido: devuelve \
{{"descartado": "por qué"}} y no escribas el guion. MEDIDO (ago-2026): explicar un mecanismo \
que no cambia ninguna decisión del espectador topa en 1.2% de guardado; con palanca real, \
4.5-5.3%. El techo NO es la animación, es el tema.

ORDEN OBLIGATORIO — la palanca ANTES del segundo 12:
  0-3s   la CONSECUENCIA ya ocurrida, en la pantalla que él usa. Nunca la amenaza futura, \
         nunca el término técnico en grande. Abrir explicando apaga la emoción antes de que \
         exista (modo analítico mata el afecto: Small/Loewenstein/Slovic 2007).
  3-8s   A QUIÉN SÍ Y A QUIÉN NO le pasa ("si escribes en inglés siendo hispanohablante", \
         "si tienes 22 a 25 y buscas tu primer empleo"). El "a quién no" es lo que hace \
         creíble el "a ti sí"; sin eso es alarmismo. Y la pérdida en MINUTOS O PESOS.
  8-12s  LA PALANCA COMPLETA, imperativa y copiable. Todavía sin explicar nada. Aunque se \
         vaya en el segundo 13, ya se la llevó. (Miedo sin salida = rechazo, no acción: \
         cuatro videos de "la IA te quita el trabajo" suman 7.5M de vistas y guardan 0.15-0.50%.)
  12-24s EL MECANISMO, y entra POR REFUTACIÓN: "crees que X — no es X". Máximo 2 escenas y \
         14 segundos. PROHIBIDO abrir el mecanismo con "cómo funciona", "vamos a ver" o el \
         nombre del concepto.
  24-32s el recibo en pantalla Y EL LÍMITE DICHO EN VOZ, y el límite tiene que RESTAR drama \
         ("eso se midió en modelos de 2023", "la sensibilidad no cayó"). Si no encuentras esa \
         frase, el tema está mal encuadrado. El límite chiquito en pantalla es coartada, no \
         honestidad.
  32-40s la palanca EJECUTADA o verificada + tu postura + la pregunta A-o-B.

ESTRUCTURA VIRAL OBLIGATORIA (Hook → Problema → Solución con ejemplo real → CTA):

1. HOOK (escenas 1–2) — los 2 primeros SEGUNDOS deciden todo. La escena 1 es un COLD-OPEN \
VISUAL de ~2 segundos: el dato/resultado MÁS brutal del video en "kinetic", "big_text" o \
"receipt" — JAMÁS "host" ni "image" (MEDIDO en este canal: abrir con el presentador pierde al \
50% de la audiencia en el segundo 2; el rostro entra en la escena 2, no en la 1). El cold-open \
abre con una DEMOSTRACIÓN (algo pasando en pantalla), una CONSECUENCIA para el que ve, o un \
número — en ese orden de preferencia. Si es número, tiene que ser del MUNDO DEL ESPECTADOR \
("$0", "2026", "el 80% de lo que escribes"), JAMÁS el conteo de un experimento mío ("lo corrí \
90 veces", "40 historias", "172 síes"): José, 17-ago-2026, por segunda vez — "siempre tus \
videos son medí el siguiente prompt 90 veces". Medido: 12 de 13 títulos de las últimas cuatro \
series eran un experimento mío; los 19 de la serie de lenguaje, escritos como clase, ninguno. Su narración \
es la PRIMERA FRASE hablada, MÁXIMO 8 palabras: abre un HUECO DE CURIOSIDAD o da una ORDEN \
directa que el espectador NECESITE resolver quedándose. La escena 2 (también beat "hook") es el \
presentador rematando la promesa. INMEDIATEZ (neuro): PAGA algo en los 3 primeros segundos — un \
dato que el espectador SE LLEVA aunque se vaya — y promete el resto ("en 30 segundos sabrás X"). \
PROHIBIDO: intro, saludo, "en este video", y frases compuestas \
o explicativas (nada de "X no piensa igual cuando… que si…"). Estilo ADICTIVO como los virales: \
imperativo, alto riesgo/FOMO, en segunda persona ("tú"), tono de "guía urgente". Elige UNA fórmula:
   - secreto/prohibido: "Nadie te enseña esto de ChatGPT."
   - urgencia temporal: "Si en 2026 sigues usando la IA así, vas tarde."
   - orden + stakes: "Deja de usar ChatGPT así. Te cuesta horas."
   - curiosidad: "Una IA ya sabe qué vas a comprar mañana."
   - contraria: "Escribir prompts largos es un error."
   - resultado brutal: "Este prompt de 9 palabras reemplaza a un diseñador."
   - confesión: "Perdí 2 horas al día hasta descubrir esto."
   - identidad: "Usas IA para trabajar y dejas dinero en la mesa."
   - experimento: "Probé 3 IAs con el mismo trabajo. Una arrasó."
   - predicción: "En 6 meses tu oficina usará esto a diario."
ROTA el arquetipo respecto a videos anteriores de la serie (no repetir la misma fórmula dos \
videos seguidos).
El objetivo del hook: que el espectador piense "¿cómo? explícame" o "¿yo estoy haciendo eso mal?".
RESULTADO PRIMERO: si el video tiene un resultado tangible (un prompt y su salida, una imagen, un \
número), MUÉSTRALO en la escena 1 — el "después" antes del "cómo" — para obligar a ver el proceso.
KEYWORD HABLADA (SEO 2026): di la keyword principal EN VOZ ALTA dentro de los primeros 5 segundos \
y ponla también en el texto en pantalla del hook — TikTok transcribe el audio (ASR) y lo indexa \
para búsqueda: es tráfico gratis. Si el tema es una herramienta (ChatGPT, etc.), su NOMBRE grande \
+ el resultado impactante van en la escena 1.
Si el tema lo permite, siembra un bucle abierto que se resuelva al FINAL ("quédate: al final \
está el error que casi todos cometen").
2. DESARROLLO — RITMO ÁGIL Y RETENCIÓN: {desarrollo}, con la REGLA DE LOS 3 SEGUNDOS: un \
cambio visual cada ~3 segundos (nuevo plano, nuevo elemento en pantalla o zoom progresivo), \
nunca una escena lenta. PROHIBIDO lo \
genérico ("la IA es increíble", "el futuro ya está aquí", "es muy fácil") — siempre lo \
específico: qué escribir, dónde, qué sale.

CADENA CAUSAL, NO LISTA. Esto sustituye a la regla vieja de "cada escena aporta UN dato", que \
es literalmente la instrucción que producía listas. MEDIDO en los 19 guiones anteriores: 16 \
conectores causales en 115 escenas — cinco de cada seis transiciones eran intercambiables, y \
algo intercambiable es una lista, no una historia. Por eso un ingeniero de IA dijo "nunca \
entendí el hilo".
  · Cada escena se une a la anterior por CAUSA: "por eso", "entonces", "lo que hizo que", \
    "así que", "de ahí que". Al menos 7 de cada 10 transiciones lo llevan.
  · PROHIBIDOS los micro-ganchos falsos: "pero hay un detalle", "y aquí está lo bueno", \
    "espera…", "además", "también", "otro dato". Eso es pegamento retórico, no causa.
  · PRUEBA DE REORDENAMIENTO: si puedes intercambiar dos escenas del medio y el guion sigue \
    teniendo sentido, está MAL. Reescríbelo hasta que el orden sea obligatorio.
  · UNA sola idea nueva y UN solo término técnico nuevo por video. El presupuesto de palabras \
    alcanza para una idea con dos o tres anclas; repartirlo entre seis objetos produce seis \
    titulares y ninguna explicación. Todo lo demás del video es la PRUEBA de esa idea.

RITMO CON RANGO. MEDIDO: el canal iba en 9.2 palabras por oración con máximo 28 — puros \
martillazos, así que ningún martillazo suena. Los referentes van en 15-17 de media con picos \
de 42-47 y frases de 4 palabras que caen como sentencia. Obligatorio por video: al menos UNA \
oración de 25+ palabras que acumule, y al menos una de 3-5 que corte seco justo después.
3. EJEMPLO REAL OBLIGATORIO: al menos una escena "screen_demo" que grabe ChatGPT REAL corriendo el \
prompt en vivo (= "input original", el formato que más crece en 2026). El prompt debe ser EXACTO y \
COPIABLE. Enmárcalo para que den ganas de guardarlo SIN pedirlo ("este prompt te va a servir la \
próxima vez que…", "cópialo tal cual" — instruir el USO de la herramienta sí; el imperativo \
"guárdalo" jamás): en 2026 los guardados amplifican más que los likes.
4. CIERRE (última escena): NO es una despedida ni una tarjeta aparte — cierra en el ÚLTIMO dato de \
VALOR, y si se puede un LOOP: enlaza la última frase con la idea del hook para invitar a re-ver \
(los re-plays cuentan como watch time). CTA IMPLÍCITO OBLIGATORIO (dato del curso: el CTA \
directo BAJA el engagement −15% y TikTok lo penaliza): PROHIBIDO decir "guárdalo", "sígueme", \
"comenta", "dale like" o "compártelo" en la narración. Cada acción se PROVOCA sin nombrarla:
   - GUARDADO → siembra la NECESIDAD FUTURA: "el día que te pregunten qué es la IA, vas a \
querer tener esto a la mano", "cuando te toque X, esto es lo que vas a buscar".
   - FOLLOW → el BUCLE ABIERTO del siguiente episodio ("mañana: <tema>") — la serie diaria \
implica seguir; pedirlo lo abarata.
   - COMENTARIO → lanza la pregunta A-o-B CON POSTURA PROPIA ("¿piensa o calcula? Yo digo que \
calcula.") — la gente responde para corregirte o darte la razón, sin que se lo pidas.
{cierre}

{profundidad}
{mision_block}
NEUROMARKETING (curso del canal — aplícalo, el 85–95% de la decisión de quedarse es \
SUBCONSCIENTE; emoción primero, dato racional después):
- MIEDO A LO DESCONOCIDO = la emoción más intensa: el hook lo toca y el video lo DESAPARECE \
(el espectador se queda para resolver su miedo, se va tranquilo y con la solución).
- NECESIDADES REPTILIANAS: ancla el tema en 1–2 (exploración/descubrimiento, pertenencia \
["todos ya lo usan"], control/orden [automatiza, domina], protección/seguridad [tu empleo, \
tus datos, tu dinero], poder/reconocimiento [destaca en tu trabajo]).
- ANCLAJE + CONTRASTE NUMÉRICO: da PRIMERO el número grande y luego el real ("costaba \
$200,000… hoy gratis"); ordena cifras para dramatizar. AVERSIÓN A LA PÉRDIDA (2× más potente \
que ganar): encuadra como lo que PIERDE por no saberlo ("cada semana pierdes 3 horas").
- TIEMPO > DINERO para audiencia profesional: vende ahorro de HORAS antes que pesos.
- FACILIDAD COGNITIVA: números redondos, frases simples, UNA idea por escena; CERTEZA POR \
PATRÓN: anuncia la estructura ("3 herramientas, 1 ganadora") y numera el progreso. Cuando el \
tema sea un CÓMO, estructura de TUTORIAL con pasos numerados (dato del curso: el tutorial \
paso a paso logra +85% de finalización — la señal #1).
- TASA BASE: abre con el CASO concreto, no con la estadística (la anécdota pega, el número \
la respalda). AUTOEFICACIA: pasos replicables HOY ("hazlo hoy y me cuentas").
- POSICIÓN SERIAL: lo primero y lo último se recuerda; el dato más fuerte va al hook y la \
tesis quotable al final — el medio lleva el ritmo, no la carga.
- EFECTO ENFOQUE: UNA sola promesa por video, martillada; nunca lista de features.

AUDIENCIA REAL MEDIDA (TikTok Studio jul-2026): México 95.8%, 66% hombres, 71% de 25–44 años \
— profesionales. Ejemplos con pesos MXN, su trabajo, su tiempo; nada de tono adolescente.

MARCA PERSONAL (identidad — no negociable): este canal es José, ingeniero de IA mexicano \
documentando su camino a ser el máximo exponente de IA en Latinoamérica. El guion debe sonar \
a ÉL, no a agencia: criterio de ingeniero en lenguaje simple, y al menos UNA frase de \
EXPERIENCIA o POSTURA propia ("yo lo uso para…", "como ingeniero, lo que me importa es…", \
"yo digo que…"). CONTENIDO DE VALOR (curso M9): tips de experiencia real y conocimiento \
especializado que la audiencia pagaría por tener — PROHIBIDO información genérica, contenido \
superficial o venta disfrazada de valor. FÓRMULA VIRAL (M9): el video debe ser bello, útil, \
inspirador o divertido Y ADEMÁS muy humano (emocional) o muy raro (sorprendente) — el punto \
medio no funciona. Éxito de marca personal = seguidores ALINEADOS con el nicho y ER >7%.

RIGOR TÉCNICO (viralidad CON credibilidad — mandato de José): el hook puede ser provocador \
pero JAMÁS técnicamente falso; las metáforas se presentan COMO metáforas y el TÉRMINO REAL \
se dice al menos una vez en el video ("se llaman parámetros — imagínalos como perillas"); \
solo cifras verificables; si simplificar obliga a mentir, cambia el ángulo. NO DEJES UN \
MECANISMO IMPLÍCITO QUE DÉ UNA IDEA FALSA DE CAUSA: si el efecto viene de MUCHOS elementos \
combinados, dilo explícitamente (no dejes creer que UN elemento lo hace solo). Enseñar con \
los términos correctos construye confianza, respeto y credibilidad: la viralidad trae el \
alcance, el rigor lo convierte en autoridad.
HECHOS FINOS YA CORREGIDOS (no volver a equivocarlos): ReLU es LINEAL A TROZOS (un solo \
quiebre) — una sola NO curva; la frontera "curva" de una red ReLU son MUCHOS dobleces rectos \
encadenados (angulosa, no suave). SIGMOIDE y TANH sí son curvas suaves por sí mismas (una \
sola ya curva). Al hablar de activaciones, deja CLARA esa diferencia; nunca digas ni sugieras \
que "ReLU curva" por sí solo.

EMOCIÓN Y CONVERSACIÓN — comentarios y re-watch son las señales #1 del algoritmo (no lo omitas):
- Toca UNA emoción real en el espectador: frustración ("pierdes horas en esto"), miedo a \
quedarte atrás/FOMO ("todos ya lo usan menos tú"), asombro ("no vas a creer lo que hace"), o \
indignación ("te lo vendieron al revés"). NO informes en frío: que SIENTA algo en cada frase.
- Lanza una OPINIÓN fuerte o un contraste polémico que dé ganas de debatir en comentarios.
- OBLIGATORIO: una pregunta BINARIA A-o-B que se responda en UNA palabra ("¿equipo ChatGPT o \
equipo Claude?", "¿la usas o te da miedo?") en el hook o el cierre, SIEMPRE con TU postura \
("yo digo que X") y JAMÁS con el imperativo "comenta" — la postura provoca la respuesta sola. \
Cuando el tema lo permita, dale PODER a la audiencia (ilusión de control): "el que gane \
decide el próximo video".
- DISONANCIA COGNITIVA como gatillo: "crees X pero haces Y" — la incomodidad se resuelve \
comentando o re-viendo.
- RE-WATCH: además del loop final, siembra UN detalle denso que solo se capta al re-ver \
(un número en pantalla, un texto rápido del terminal, un item extra del diagrama) — el replay \
rate >1.2 dispara distribución.

Tono: primera persona, cercano, con OPINIÓN y EMOCIÓN (nunca neutro ni de manual). \
Cero jerga sin explicar.

MÚSICA DEL LENGUAJE (medida en virales de 6M vistas — aplícala): frases con MEDIANA de ~11 \
palabras y ~30% de frases de <8; al menos 3 NÚMEROS concretos en el video; elige UNA \
palabra-tema y úsala EXACTAMENTE 3 veces (plantarla en el hook, desarrollarla, resolverla al \
final); si el video tiene cierre emotivo, remata con UNA tríada anafórica ("que cada X…, que \
cada Y…, que cada Z…"); la ÚLTIMA frase debe poder responderse con el copy del post (loop \
caption↔video que dispara comentarios).

Visuales por escena (visual_type + su clave):
- "veo" → "veo": {{"prompt": "<cinematic english prompt>", "seconds": 4}} — clip de VIDEO IA \
cinematográfico generado (Gemini Omni/Veo): cámara en movimiento, luz volumétrica, partículas \
— MUCHO más atractivo que una foto fija. Úsalo en 1–2 escenas de CONCEPTO/metáfora por video \
(el cerebro que aprende, la fábrica de ideas, la red que se enciende). Prompt en INGLÉS con \
la estética del canal ("dark tech aesthetic, neon cyan and magenta, near-black background"), \
SIN texto en pantalla y SIN personas identificables. PROHIBIDO para productos/sitios/personas \
reales (regla de realidad: para eso están screen_demo/receipt).
- "image" → "image_prompts": LISTA de 2-3 fotos editoriales verticales cinematográficas, en \
INGLÉS, SIN texto ni letras ni logos, que cuenten la idea como una secuencia (plano general → \
detalle → consecuencia). Se generan con Codex y se encadenan con disolvencia sobre la misma \
locución, así que la escena NUNCA se queda quieta. Usa 3 placas si la narración pasa de 8 s, \
2 si es más corta; "image_prompt" (una sola) solo para narraciones de menos de 5 s. \
Cada placa debe ser una IMAGEN CONCRETA (objetos, manos, luz), jamás un concepto abstracto.
- "showcase" → "showcase": {{"items": [{{"label": "<2-4 palabras MAYÚS>", "image_prompt": \
"<escena en INGLÉS que ILUSTRE el concepto, metáfora visual potente>"}}, …2–4]}} — el formato \
PREFERIDO para enumerar 2-4 conceptos/razones/pasos SIN muro de texto: cada uno se muestra UNO \
A LA VEZ con una IMAGEN grande + su etiqueta corta, en secuencia. VENDE mucho más que una \
"list" de texto. Úsalo en vez de "list" siempre que puedas imaginar una imagen por ítem. \
FUENTE POR ÍTEM (regla de realidad): si el ítem es un CONCEPTO/metáfora usa "image_prompt" \
(imagen generada); si es una COSA REAL Y NOMBRABLE (un producto, empresa, persona, herramienta \
—ChatGPT, NVIDIA, etc.) usa "query_fotos": "<búsqueda de foto real>" en vez de image_prompt \
(trae una FOTO REAL de Apify — jamás inventes con imagen IA algo real).
- "diagram" → "diagram": animación programada, en ESPAÑOL (se ve en pantalla). Tipos:
  El ÚNICO diagrama que queda es "neural_net" (abajo). "flow", "list", "bars" y \
"compare" están PROHIBIDOS: se dibujaban como pilas de TARJETAS DE TEXTO con etiquetas y \
José los vetó. Un proceso, una comparación o unas cifras se explican con "custom", \
describiendo la animación que lo DIBUJA (algo que entra, se transforma y sale; algo que \
crece contra algo que se apaga), nunca listándolo en cajas.
  * "neural_net" — red neuronal ANIMADA con pulsos viajando de entrada a salida. Úsala \
SIEMPRE que expliques redes neuronales, deep learning, entrenamiento o "cómo aprende" una \
IA: {{"type": "neural_net", "title": "...", "layers": [3,4,4,2], "in_label": "<qué entra>", \
"out_label": "<qué sale>"}} (2–5 capas, 1–6 nodos por capa; elige capas con sentido para \
lo narrado).
  Para comparar NÚMEROS reales usa "ml_demo" (ejecuta código y su gráfica entra al \
video) o "custom": las barras-con-etiqueta del viejo diagrama están prohibidas.
  Elige el diagrama que DIBUJE el concepto, no siempre texto: si hablas de una red \
neuronal, muestra la red; si comparas cifras, muestra barras.
REGLA DE HILO (José, 2-ago-2026: "nunca entendí el hilo de tus videos y soy ingeniero \
de IA"): el video es UNA pregunta y SU respuesta, no un dato estirado. La escena 1 abre \
una pregunta concreta; la escena del "giro" la CONTESTA; la tesis es esa respuesta en \
menos de diez palabras. Y todo cuelga de UN SOLO ejemplo concreto que se ve en pantalla \
desde el principio hasta el final —el mismo objeto, no uno nuevo por escena—. Si una \
escena no hace avanzar la respuesta, sobra.
TRADUCE TODA CIFRA A PERSONAS, PESOS O MINUTOS: si una escena dice un porcentaje, la MISMA \
escena lo dice también como "de cada diez", en pesos o en minutos. "La exactitud cae 20%" no \
se siente; "veinte minutos de tu día" sí. El término técnico (especificidad, exactitud, \
perplejidad) va en pantalla en cuerpo pequeño — JAMÁS en el cold-open ni dicho en voz sin su \
traducción.

ATERRIZAJE MEXICANO: una frase verdadera que ubique el riesgo o la palanca en México o en el \
trabajo del espectador. Sin ella el dato se disuelve como "cosa de gringos".

LA PALANCA NO PIDE VALENTÍA SOCIAL NI DINERO: se ejecuta solo, en su teléfono o su compu, en \
menos de dos minutos. PROHIBIDAS las palancas tipo "pídele a tu jefe que…", "diles en la junta \
que…", "contrata X".

SIN CARA: este canal va en voz en off (decisión de José, 8-ago-2026: grabar diario no escala). \
La señal de PERSONA — que es la que produce seguidores — sale entonces de la NARRACIÓN, y es \
obligatoria: (a) una anécdota propia en primera persona con detalle concreto ("a mí me llegó el \
mensaje del banco un martes"), y (b) el MOTIVO dicho en voz, no la credencial. Lo que predice \
la confianza no es que se note que sabes, es que se note por qué lo haces (Wald & Bhatti 2026, \
n=927). PROHIBIDO el tono de documental o de locutor: habla como en tus cursos — "vean cómo", \
"imagínense", "recuerden", preguntas al aire.

REGLA DE CIFRAS: cualquier número que se DIGA en la narración tiene que ser exactamente \
el que calcula el código de esa escena. Nunca lo estimes ni lo redondees "a ojo": si no \
sabes cuánto da, no lo digas y deja que la gráfica lo muestre.
- "custom" → "custom_anim": {{"description": "<describe en detalle la animación ideal: \
qué elementos se ven, cómo se mueven, qué representa cada cosa>"}} — cuando NINGÚN tipo \
anterior dibuje bien el concepto (una molécula, órbitas, un mapa, engranajes, ondas, un \
robot, lo que el tema pida). Un programador-IA convertirá tu descripción en animación \
real: sé específico y visual.
- "screen_demo" → "screen_demo": {{"tool": "chatgpt", "prompt": "<el prompt EXACTO a ejecutar en \
la herramienta, máx 240 caracteres>"}} — GRABA ChatGPT REAL ejecutando el prompt EN VIVO, en 9:16. \
Es la ÚNICA forma de mostrar un prompt o una herramienta: una demo REAL ("input original"), el \
formato que más crece en 2026. PROHIBIDO simular chats o animaciones de ChatGPT falsas. \
IMPORTANTE: la NARRACIÓN de esta escena debe ser MÁS LARGA (2–3 frases, ~8–9 segundos hablados) y \
DECIR/LEER el prompt en voz alta (o parafrasearlo) mientras se ve en pantalla — así el espectador \
lo LEE y lo ESCUCHA, y la escena dura lo suficiente para alcanzar a leerlo.
- "big_text" → "big_text": {{"items": ["<frase de impacto, máx 6 palabras>", …1–3]}} — \
para el hook o un dato fuerte. La última palabra de cada frase se resalta en color.
- "kinetic" → "kinetic": {{"words": [{{"text": "la mejor ia", "serif": true}}, {{"text": "YA NO \
ES"}}, {{"text": "PAGAR", "accent": true}}], "variant": "dark|accent|light"}} — tipografía \
cinética full-screen (palabras entrando una a una, serif itálica + sans black mezcladas). ÚSALA \
para la TESIS quotable (frase autónoma de <10 palabras diseñada para compartirse) o un giro \
fuerte; 2–6 palabras, las serif en minúsculas y las fuertes en MAYÚS con "accent": true.
- "kinetic_video" → "kinetic_video": {{"words": [<igual que kinetic>], "veo_prompt": \
"<cinematic english prompt del video de FONDO>", "seconds": 4, "variant": "dark"}} — el COLD-OPEN \
ESTRELLA: tipografía cinética SOBRE un clip de video IA en movimiento (doble capa = máximo \
scroll-stop). El fondo debe ser la METÁFORA del hook en la estética del canal ("dark tech \
aesthetic, neon cyan and magenta, near-black"). Solo conceptos (regla de realidad).
- "terminal" → "terminal": {{"title": "<archivo/contexto corto>", "lines": [{{"prompt": true, \
"text": "<comando REAL>"}}, {{"text": "# <instrucción en español>", "accent": true}}, …2–4], \
"progress": {{"label": "<etiqueta corta>"}}}} — slide de terminal técnico (typewriter + barra \
de progreso). REGLA: las líneas con "prompt": true son COMANDOS REALES Y EJECUTABLES en inglés \
(ollama pull …, pip install …, git clone …) que el espectador pueda copiar; el español va SOLO \
en líneas de comentario (empiezan con "# ") o de salida. JAMÁS pseudo-comandos inventados.
- "cutout" → "cutout": {{"image_prompt": "<UN sujeto claro y concreto, en inglés>", "keyword": \
"<MAYÚS 1-4 palabras>", "from": "left|right|bottom|diag"}} — ilustración cartoon RECORTADA que \
entra deslizándose con rebote (estilo documental animado). SOLO para conceptos abstractos y \
metáforas (una neurona gigante, una fábrica de ideas); JAMÁS para productos o apps reales.
- "mascota" → "mascota": {{"pose": "neutral|profesor|cartel|pensando|celebra|error", "caption": \
"<frase corta en minúsculas>", "sign_text": "<MAYÚS ≤4 palabras, SOLO con pose cartel>"}} — el \
robot pixel-art del canal como pattern interrupt con humor. MÁXIMO 1–2 veces por video, nunca \
en escenas seguidas.
- "receipt" → "receipt": {{"url": "<URL REAL que conozcas con certeza>", "query_fotos": "<o \
búsqueda de foto real si no hay URL>", "title": "<chip corto MAYÚS>", "caption": "<fuente>"}} — \
RECIBO verificable: screenshot real del sitio/ranking/anuncio dentro de un mock de navegador. \
La prueba más creíble que existe. SOLO con URLs reales (JAMÁS inventes una URL).
- "host" → "host_top": el ROSTRO REAL de José (formato presentador-retención). ÚSALO SOLO en \
la escena 2 (el remate del hook, NUNCA la escena 1 — esa es el cold-open) y en el CTA. Arriba \
va una animación de marca; abajo su cara. "host_top" define el gráfico \
de arriba: {{"kind": "duo", "labels": ["<A>", "<B>"], "title": "<breve MAYÚS>"}} (2 nodos \
contrastados — ideal hooks de contraste) o {{"kind": "save", "title": "<beneficio futuro breve \
MAYÚS — JAMÁS imperativos tipo 'GUÁRDALO'/'SÍGUEME'; ej. 'PARA CUANDO', 'TU VENTAJA'>", \
"subtitle": "MAÑANA: <tema> →"}} (bookmark — el ícono ya insinúa guardar, el texto vende el \
beneficio) o {{"kind": "headline", "lines": ["<LÍNEA ≤3 palabras>", "<LÍNEA ≤3 palabras>"]}} \
(titular del hook sobre barras de color, estilo evidencia — ideal HOOK con claim fuerte). \
Textos MUY breves en MAYÚSCULAS.
- "ml_demo" → "ml_demo": {{"code": "<Python REAL (numpy/sklearn/matplotlib/seaborn Y TAMBIÉN \
PyTorch — `import torch`) que construye/entrena un modelo y hace su gráfica>", "display_code": \
["<líneas cortas a mostrar>"], "caption": "archivo.py"}}. DEMO REAL de CÓDIGO: se EJECUTA de \
verdad y su gráfica real entra al video (editor: el código se escribe → revela el resultado \
REAL). Es el "input original" más fuerte de 2026. Úsalo para MOSTRAR CÓMO SE CONSTRUYE algo \
(ej. un perceptrón en PyTorch: `nn.Linear(2,1)` entrenado → frontera de decisión real; una \
regresión; un clasificador). El preámbulo ya trae np, plt, sns, sklearn, la paleta neón \
(CYAN/ORANGE/MAG/GREEN/RED) y OUT; PyTorch (`torch`) está disponible. CÓDIGO en inglés, \
comentarios en español. La narración de esta escena es LARGA (~9-11s) y explica lo que hace.

PRIORIDAD DE VISUALES (regla anti-"AI slop" 2026): TikTok premia el "input original" y clasifica \
como baja calidad los videos hechos casi solo de FOTOS IA con voz (marca "slide video / imágenes de \
baja calidad" = NO elegible para "Para ti"). Por eso PRIORIZA: 1º material REAL ("screen_demo" para \
CUALQUIER prompt/herramienta en vivo, "receipt" para sitios/rankings/anuncios), 2º animación propia \
("kinetic", "terminal", "diagram", "big_text"), 3º VIDEO IA cinematográfico ("veo", máx 1–2, solo \
conceptos — movimiento real que sube el atractivo visual del video), 4º ilustración propia con \
moderación ("cutout", "mascota"). Usa "image" (foto fija IA) solo como último recurso; NUNCA por \
defecto. No repitas el mismo tipo en escenas seguidas; la escena 1 es el COLD-OPEN \
("kinetic"/"big_text"/"receipt"/"veo") y el "host" va en la escena 2.

ELIGE EL MEDIO POR CONCEPTO (el motor decide qué EXPLICA mejor cada idea, no lo que sea más \
fácil). REGLA DURA (mandato de José, 12-ago-2026, tras vetar dos animaciones del s01): el \
DEFAULT es la IMAGEN de Codex, no la animación. "custom" SOLO se permite cuando el concepto \
es un MECANISMO cuyo movimiento ES el contenido y no existe manera de fotografiarlo (cómo baja \
el gradiente, cómo fluye el backprop, cómo se reparte la atención). Todo lo demás —una idea, \
una comparación, una consecuencia, una metáfora— va como "image" con varias placas o como \
"showcase". Si dudas, es imagen: una animación mediocre se ve amateur y hunde el video; una \
foto editorial bien encuadrada nunca. Números que crecen → "bars". VARIEDAD \
OBLIGATORIA (mandato de José): NUNCA repitas el mismo recurso visual entre videos ni dentro del \
mismo; cada concepto estrena su propia animación/imagen, siempre mejor que la anterior — la \
repetición aburre y mata la retención.
PROHIBIDAS LAS TARJETAS DE SOLO TEXTO (mandato de José: "aburren"): NO uses "list" ni "compare" \
como cajas de texto sin imagen. Para enumerar 2-4 cosas usa "showcase" (una imagen generada por \
ítem); para comparar, muéstralo con imágenes o una animación. El texto plano en cajas es lo \
que hunde la retención.
CONEXIÓN CON LA PRÁCTICA (obligatorio — mandato de José: "no me queda claro para qué se usa"): \
cada concepto abstracto DEBE conectarse con PARA QUÉ SIRVE en una IA REAL, no solo con qué es. \
Ej.: "el gradiente es la brújula que le dice a la red hacia dónde mejorar"; "la loss es cómo \
sabes si tu IA ya está lista o hay que seguir entrenando"; "backprop es lo que hace posible \
entrenar modelos gigantes como ChatGPT". Incluye ESO ES PARA ESTO: al menos una frase por video \
que ate el concepto a su uso real (en el hook, el giro o el cierre).

REGLA DE REALIDAD (obligatoria): si una escena habla de una herramienta, producto, sitio, modelo \
o persona REAL (ChatGPT, Claude, Gemini, un leaderboard, una app), su visual DEBE ser material \
REAL: "screen_demo" (la graba en vivo) o "receipt" (screenshot/foto real). PROHIBIDO usar "image" \
o "cutout" para representar cosas reales — una imagen IA de un producto real destruye la \
credibilidad. "cutout", "mascota" e "image" quedan SOLO para conceptos, metáforas y emociones.

FORMATO DEL CANAL — "FORENSE DE MI ERROR". Cada video es el expediente de UNA creencia
técnica que se rompió al medirla. El tema es la coartada; el objeto del video es el error y
el experimento que lo corrigió. Ganó contra otros dos formatos en un panel de tres jueces
independientes (retención, rigor y producibilidad).

  BEAT 1 · LA CREENCIA (0-10s) — enuncia en segunda persona la predicción que el espectador
    HARÍA, y rómpela. "Si tuvieras que adivinar cuánta memoria necesita, dirías ochenta
    gigas. Son seis." SIN número en pantalla, SIN jerga. Una proposición sobre ÉL que tenga
    que juzgar. Obligar a predecir sube la curiosidad Y la memoria de la respuesta (Brod &
    Breitwieser 2019); un dato brutal descontextualizado lo deja en "no tengo idea", donde
    la curiosidad CAE. Además el pico de atención del dato brutal le roba los recursos a la
    lección que viene justo después.
  BEAT 2 · LA ENUMERACIÓN DE CINCO (10-18s) — UNA oración larga (25-45 palabras) que lista
    4-5 síntomas concretos que el espectador vivió ESTA SEMANA, sin explicar ninguno. "El
    prompt que reescribiste ocho veces. La respuesta que sonaba perfecta y era falsa. La
    factura de API que no supiste explicarle a nadie." No es adorno: sin conocimiento previo
    no hay brecha de curiosidad que sentir, y esto la fabrica en seis segundos dando cinco
    tiros para que sea imposible que ninguno toque. Es la ÚNICA oración larga de la primera
    mitad.
  BEAT 3 · LA PALANCA (18-25s) — qué hacer HOY, solo, en menos de dos minutos, gratis.
    Completa e imperativa, TODAVÍA SIN EXPLICAR NADA. Aunque se vaya en el segundo 26, ya se
    la llevó. Miedo o intriga sin salida no funcionan: producen rechazo, no acción.
  BEAT 4-5 · EL MECANISMO (25-60s) — máximo dos escenas, y entra POR REFUTACIÓN: "crees que
    X — no es X". PROHIBIDO abrirlo con "cómo funciona", "vamos a ver" o el nombre del
    concepto. Aquí va el término técnico, UNA vez, dicho bien.
  BEAT 6 · EL RECIBO Y SU LÍMITE (60-75s) — la medición en pantalla CON su ficha (qué se
    corrió, cuántas veces, cuándo) y EL LÍMITE DICHO EN VOZ, y el límite tiene que RESTAR
    drama: "eso se midió en modelos de 2023", "la otra métrica no cambió". Si no encuentras
    esa frase, el tema está mal encuadrado. El límite chiquito en pantalla es coartada.
  BEAT 7 · EL CIERRE (75-90s) — tu postura propia + la pregunta A-o-B. El título del
    siguiente caso va en texto pequeño sobre el último plano MIENTRAS hablas — jamás una
    tarjeta muda al final: cuatro segundos de silencio regalan la caída justo donde se mide
    la finalización.

EL VISUAL TIENE QUE SER DEL MUNDO DEL ESPECTADOR, NO DEL TUYO. Si el video habla de algo
que la gente hace en ChatGPT, en su celular o en una hoja, se GRABA ESO — no un editor de
código ni una terminal. José, 10-ago-2026: "estás hablando de prompts y sacas programación".
Quien escribe prompts no corre bucles de bash, y verlo lo expulsa. Regla dura:
  · tema de PROMPTS o de usar una herramienta → "screen_demo" de la herramienta REAL.
  · "terminal" y editores de código SOLO si el video es de programar o de correr un modelo.
  · si dudas, pregúntate: ¿el espectador ha visto esta pantalla alguna vez? Si no, cámbiala.

TEXTO SOBRE NEGRO: PROHIBIDO. Nunca uses "kinetic" ni "big_text" como escena completa —
una pantalla negra con una frase encima está VACÍA y José la rechazó dos veces (10-ago-2026,
viendo el primer video del motor nuevo: "porquerías vacías; animaciones o imágenes sí").
La tipografía SIEMPRE va ENCIMA de algo que se mueve: "kinetic_video" (letras sobre un clip
real), una animación programada ("custom_anim"), una foto ("image") o el recibo ("receipt").
La tesis del video también: se dice sobre imagen, jamás sobre negro. Y "big_text" queda solo
como degradación automática de emergencia del motor, nunca como elección tuya.

DUEÑO — OBLIGATORIO, este canal va SIN CARA. MEDIDO: UNA sola frase en primera persona en 19
videos completos. Nadie sigue a una voz sin dueño, y eso es exactamente el 0.5% de visitas al
perfil. Como no hay rostro, toda la señal de persona está en las palabras:
  · Una ANÉCDOTA PROPIA con detalle concreto ("a mí me llegó el mensaje del banco un martes,
    en la fila del súper"). Mínimo dos marcas de primera persona por video.
  · El MOTIVO dicho en voz, no la credencial: lo que predice la confianza no es que se note
    que sabes, es que se note por qué lo haces.
  · Háblale de TÚ desde la primera frase. Mínimo tres marcas de segunda persona.
  · PROHIBIDO el tono de documental o de locutor. Si el guion se lo podría leer cualquiera,
    está mal escrito.

ESTRUCTURA DE BEATS (marca cada escena con "beat_type"): "hook" (2 escenas: cold-open visual \
≤2s + presentador con la promesa) → "contexto" (opcional) → "proof" (2–3, con recibo/demo real \
y números concretos: el contraste numérico "#18 → #1" retiene más que cualquier adjetivo) → \
"giro" (confesión/opinión) → "tesis" (LA frase quotable del video, <10 palabras, en "kinetic") \
→ "cta". El visual cambia cuando el PASO cambia, no cada 3 segundos por reloj: cortar entre \
imágenes no relacionadas cada 3 s es la textura exacta del contenido basura de IA, en la \
categoría que TikTok ya tiene más saturada. Un plano puede durar 8 segundos si la evidencia que \
muestra sigue avanzando. \
DURACIÓN OBJETIVO: 60–90 segundos (≈175–260 palabras) cuando el video enseña un mecanismo — la \
cadena causal de 3–4 pasos NO cabe en 39 s, y los videos más largos bien ritmados alcanzan más. \
Bajar a 30–40 s solo si el video es una sola palanca sin mecanismo. PERO si el tema es TÉCNICO Y PROFUNDO (incluye demo de código real, un \
mecanismo que hay que ver paso a paso, un ejemplo trabajado), PUEDES extenderte hasta 1–3 \
MINUTOS: más vale enseñar bien y completo que cortar el valor. En ese caso cada escena sigue \
aportando algo nuevo y con cambio visual (nada de relleno). No infles por inflar; alarga solo \
cuando la profundidad lo pida.

Responde SOLO este JSON:
{{
  "title": "<título corto del video>",
  "slug": "<slug corto en minúsculas con guiones bajos>",
  "hook_tipo": "resultado|identidad|contraria|bucle|confesion|error|beneficio|secreto|novedad|problema",
  "keyword": "<keyword principal>",
  "hook_headline": ["<LÍNEA 1 ≤3 palabras MAYÚS>", "<LÍNEA 2 ≤3 palabras MAYÚS>"],
  "pregunta_ab": "<OBLIGATORIO: la pregunta BINARIA A-o-B del video, respondible en UNA \
palabra; DEBE aparecer TEXTUAL dentro de la narración del hook o del cta>",
  "music_prompt": "<cama musical en INGLÉS: instrumental, género, energía, BPM (ej. 'dark \
energetic electronic tech instrumental, driving beat, no vocals, 124 BPM')>",
  "scenes": [
    {{"narration": "<texto que se narra>",
      "pause_after": <OPCIONAL: segundos de silencio dramático tras la frase (0.4-0.8);
úsalo MÁX 2-3 veces: tras el hook, antes de un reveal o tras la tesis>,
      "beat_type": "creencia|enumeracion|palanca|mecanismo|recibo|cierre",
      "visual_type": "image|diagram|screen_demo|big_text|host|ml_demo|kinetic|terminal|cutout|mascota|receipt|veo",
      "image_prompt": "...", "diagram": {{}}, "screen_demo": {{}}, "big_text": {{}}, "veo": {{}},
      "host_top": {{}}, "ml_demo": {{}}, "kinetic": {{}}, "terminal": {{}}, "cutout": {{}},
      "mascota": {{}}, "receipt": {{}}}}
  ]
}}
(incluye SOLO la clave del visual elegido en cada escena)"""


VALIDATE_PROMPT = """Eres el director de arte de un canal de TikTok de divulgación de IA. \
Ves 3 fotogramas (inicio / medio / final) de UNA escena animada de un video vertical.

Narración de la escena: "{narration}"

Evalúa SOLO problemas reales y visibles:
1. texto cortado, incompleto o que se sale del cuadro
2. elementos encimados o ilegibles
3. contenido importante en el 30% INFERIOR de la imagen (zona reservada a subtítulos)
4. la visual no tiene nada que ver con lo narrado
5. escena vacía, rota o ilegible

NO seas quisquilloso con gustos estéticos menores: aprueba si no hay problemas graves.

Responde SOLO este JSON:
{{"aprobada": true/false, "grave": true/false, "problemas": ["<descripción corta de cada problema>"]}}"""


FIX_SPEC_PROMPT = """Esta especificación de un diagrama animado produjo problemas visuales.

Especificación actual: {spec}
Problemas detectados por el revisor: {problemas}

Corrígela: acorta los textos, reduce la cantidad de items o simplifica, según los \
problemas. Mantén el MISMO formato JSON y el mismo "type". Responde SOLO el JSON corregido."""


def _scene_frames(seg: Path, dur: float) -> list[bytes]:
    """Extrae 3 fotogramas del segmento (reducidos) para el validador."""
    frames = []
    for frac in (0.15, 0.55, 0.90):
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", f"{max(0.0, dur * frac):.2f}", "-i", str(seg),
             "-frames:v", "1", "-vf", "scale=540:-1", "-f", "image2pipe",
             "-vcodec", "mjpeg", "-"],
            capture_output=True, check=True, timeout=60,
        )
        if r.stdout:
            frames.append(r.stdout)
    return frames


# Umbral de "cuerpo vacío": fracción de bordes marcados en la franja central
# (sin título ni banda de subtítulos). Medido 29-jul-2026 sobre la serie 2:
# diagrama vacío de ln04 = 0.018; la peor escena buena = 0.041. Corto en 0.030.
_INK_MIN = 0.030
_TIPOS_PROGRAMADOS = {"diagram", "custom", "kinetic", "terminal", "big_text",
                      "receipt", "cutout", "mascota", "showcase"}


def _cuerpo_vacio(seg: Path, dur: float) -> float:
    """Máxima 'tinta' del cuerpo de la escena; ~0 = fondo pelón bajo el título."""
    from PIL import Image, ImageFilter
    import io

    mejor = 0.0
    for frac in (0.15, 0.40, 0.65, 0.90):
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", f"{max(0.0, dur * frac):.2f}", "-i", str(seg),
             "-frames:v", "1", "-vf", "scale=270:-1", "-f", "image2pipe", "-vcodec", "png", "-"],
            capture_output=True, timeout=60)
        if not r.stdout:
            continue
        im = Image.open(io.BytesIO(r.stdout)).convert("L")
        w, h = im.size
        im = im.crop((0, int(h * 0.17), w, int(h * 0.70)))
        hist = im.filter(ImageFilter.FIND_EDGES).histogram()
        mejor = max(mejor, sum(hist[24:]) / max(1, sum(hist)))
    return mejor


def _validate_scene(seg: Path, dur: float, narration: str, router,
                    visual_type: str = "") -> tuple[bool, str]:
    """Gemini revisa la escena renderizada; devuelve (ok, problemas)."""
    try:
        # candado determinista: una animación programada JAMÁS puede quedar en
        # título sobre fondo vacío (bug ln04: 8s de nada y el revisor lo aprobó).
        if visual_type in _TIPOS_PROGRAMADOS:
            tinta = _cuerpo_vacio(seg, dur)
            if tinta < _INK_MIN:
                return False, (f"la escena está VACÍA: solo se ve el título sobre el fondo, "
                               f"no se dibujó ningún elemento (tinta={tinta:.3f})")
        frames = _scene_frames(seg, dur)
        if not frames:
            return True, ""
        v = router.generate_json(VALIDATE_PROMPT.format(narration=narration), images=frames)
        ok = bool(v.get("aprobada")) or not bool(v.get("grave"))
        return ok, "; ".join(str(p) for p in v.get("problemas") or [])
    except Exception as e:  # noqa: BLE001 — el validador nunca tumba la generación
        print(f"  aviso: validador falló ({e}); escena aceptada sin revisar")
        return True, ""


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:40] or "video"


# Los diagramas se dibujan desde "items"; un guion escrito a mano puede llamarle
# "steps"/"pasos"/"puntos"/"filas". Sin este alias el motor dibujaba el título sobre
# el fondo vacío y no fallaba (bug real: ln04/07/09/10/14, 28-jul-2026).
_DIAG_ALIAS = ("items", "steps", "pasos", "puntos", "filas", "rows", "bullets", "elementos")
_DIAG_SIN_ITEMS = {"neural_net", "big_text"}


def _normalizar_diagrama(spec: dict) -> dict:
    """Unifica los alias de `items` y REVIENTA si el diagrama quedaría vacío."""
    spec = dict(spec or {})
    tipo = spec.get("type") or ""
    if not spec.get("items"):
        for k in _DIAG_ALIAS[1:]:
            if spec.get(k):
                spec["items"] = spec.pop(k)
                break
    if tipo not in _DIAG_SIN_ITEMS and not spec.get("items"):
        raise ValueError(
            f"diagrama '{tipo}' sin contenido: no trae 'items' (ni alias). "
            f"Claves recibidas: {sorted(spec)}")
    if tipo == "neural_net" and not spec.get("layers"):
        raise ValueError("diagrama 'neural_net' sin 'layers'")
    return spec


def _wav_from_pcm(pcm: bytes, path: Path) -> float:
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(24000)
        f.writeframes(pcm)
    return len(pcm) / 2 / 24000


def _render_scene(img: Path, voz: Path, dur: float, idx: int, out: Path, gcfg: dict) -> None:
    """Ken Burns DIRIGIDO: zoom con easing (smoothstep) + paneo diagonal real (no centro fijo)."""
    w, h, fps = gcfg["width"], gcfg["height"], gcfg["fps"]
    zt = float(gcfg.get("ken_burns_zoom", 1.10))  # zoom objetivo
    frames = max(2, int(dur * fps))
    FR = frames - 1
    sm = f"((on/{FR})*(on/{FR})*(3-2*(on/{FR})))"   # smoothstep 0→1 (paneo suave)
    eo = f"(1-(1-on/{FR})*(1-on/{FR}))"             # ease-out: zoom RÁPIDO al inicio = 'punch'
    z = f"1+{zt - 1:.4f}*{eo}"
    # paneo diagonal, alternando dirección por escena (evita el 'respiro' de centro fijo)
    dirs = [(0.12, 0.15, 0.55, 0.5), (0.88, 0.85, 0.45, 0.5),
            (0.5, 0.10, 0.5, 0.9), (0.15, 0.88, 0.85, 0.12)]
    fx0, fy0, fx1, fy1 = dirs[idx % len(dirs)]
    x = f"(iw-iw/zoom)*({fx0}{fx1 - fx0:+.3f}*{sm})"
    y = f"(ih-ih/zoom)*({fy0}{fy1 - fy0:+.3f}*{sm})"
    big_w, big_h = int(w * 1.6), int(h * 1.6)
    vf = (
        f"scale={big_w}:{big_h}:force_original_aspect_ratio=increase,"
        f"crop={big_w}:{big_h},"
        f"zoompan=z='{z}':x='{x}':y='{y}':d=1:s={w}x{h}:fps={fps},format=yuv420p"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         # -framerate ANTES de -loop: ffmpeg lee una imagen fija a 25 fps por defecto y
         # el zoompan la re-etiqueta a fps (30), así que el video quedaba al 83% de su
         # duración (6.63 s → 5.53 s) mientras el audio iba completo. Al concatenar manda
         # el video y la cola de la última escena se perdía: el "audio cortado" que José
         # reportó tres veces (medido 8-ago-2026).
         "-framerate", str(fps), "-loop", "1", "-t", f"{dur:.3f}", "-i", str(img),
         "-i", str(voz),
         "-vf", vf, "-af", "apad=pad_dur=1.6",
         "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-t", f"{dur:.3f}", str(out)],
        check=True, timeout=600,
    )


# direcciones de paneo: se alternan para que dos placas seguidas no se muevan igual
_KB_DIRS = [(0.12, 0.15, 0.55, 0.5), (0.88, 0.85, 0.45, 0.5),
            (0.5, 0.10, 0.5, 0.9), (0.15, 0.88, 0.85, 0.12)]


def _kb_chain(dur: float, idx: int, gcfg: dict) -> str:
    """Cadena de filtros Ken Burns para UNA placa (sin audio)."""
    w, h, fps = gcfg["width"], gcfg["height"], gcfg["fps"]
    zt = float(gcfg.get("ken_burns_zoom", 1.10))
    FR = max(1, int(dur * fps) - 1)
    sm = f"((on/{FR})*(on/{FR})*(3-2*(on/{FR})))"
    eo = f"(1-(1-on/{FR})*(1-on/{FR}))"
    z = f"1+{zt - 1:.4f}*{eo}"
    fx0, fy0, fx1, fy1 = _KB_DIRS[idx % len(_KB_DIRS)]
    x = f"(iw-iw/zoom)*({fx0}{fx1 - fx0:+.3f}*{sm})"
    y = f"(ih-ih/zoom)*({fy0}{fy1 - fy0:+.3f}*{sm})"
    bw, bh = int(w * 1.6), int(h * 1.6)
    return (f"scale={bw}:{bh}:force_original_aspect_ratio=increase,crop={bw}:{bh},"
            f"zoompan=z='{z}':x='{x}':y='{y}':d=1:s={w}x{h}:fps={fps},"
            f"setsar=1,format=yuv420p")


def _render_scene_plates(imgs: list[Path], voz: Path, dur: float, idx: int,
                         out: Path, gcfg: dict) -> None:
    """Varias PLACAS encadenadas con disolvencia sobre UNA sola locución.

    Por qué existe: una escena de 11 s con una sola foto quieta se muere en pantalla
    (regla de los 3 segundos) y ese fue el reclamo de José el 12-ago. Con 3 placas hay
    un cambio visual cada ~4 s y las imágenes salen de Codex, así que cuesta cero.
    """
    if len(imgs) == 1:
        _render_scene(imgs[0], voz, dur, idx, out, gcfg)
        return
    fps = gcfg["fps"]
    n = len(imgs)
    X = 0.6                                   # disolvencia entre placas
    d = (dur + (n - 1) * X) / n               # duración de cada placa (se solapan)
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for p in imgs:
        cmd += ["-framerate", str(fps), "-loop", "1", "-t", f"{d + 0.2:.3f}", "-i", str(p)]
    cmd += ["-i", str(voz)]
    partes = [f"[{j}:v]{_kb_chain(d + 0.2, idx + j, gcfg)}[v{j}]" for j in range(n)]
    prev = "v0"
    for j in range(1, n):
        off = j * (d - X)
        etq = f"x{j}"
        partes.append(f"[{prev}][v{j}]xfade=transition=fade:duration={X}:"
                      f"offset={off:.3f}[{etq}]")
        prev = etq
    partes.append(f"[{prev}]trim=duration={dur:.3f},setpts=PTS-STARTPTS[vout]")
    subprocess.run(
        cmd + ["-filter_complex", ";".join(partes),
               "-map", "[vout]", "-map", f"{n}:a", "-af", "apad=pad_dur=1.6",
               "-c:v", "libx264", "-crf", "18", "-preset", "medium",
               "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
               "-t", f"{dur:.3f}", str(out)],
        check=True, timeout=900,
    )


def _gen_image(prompt: str, destino: Path, router, anchor_bytes) -> Path:
    """Imagen de escena: Codex primero (plan ChatGPT = $0), Gemini de respaldo.

    Mandato de José (12-ago-2026): las imágenes de Codex se ven mejor que cualquier
    animación que sepa dibujar el motor. Gemini solo entra si Codex no está o truena,
    y ahí sí lleva el ancla de estilo para no perder la cohesión de marca.
    """
    try:
        from .codex_client import codex_available, codex_image

        if not codex_available():
            raise RuntimeError("codex no disponible")
        codex_image(prompt, destino)
        return destino
    except Exception as e:  # noqa: BLE001
        print(f"  aviso: codex img falló ({e}); uso Gemini")
        refs = [anchor_bytes] if anchor_bytes else None
        destino.write_bytes(router.generate_image(prompt, reference_images=refs))
        return destino


def _assemble(segments: list[Path], out_path: Path, gcfg: dict) -> None:
    """Une las escenas. Con transiciones = xfade+acrossfade con easing; si no, concat -c copy."""
    if not gcfg.get("transitions") or len(segments) < 2:
        concat = out_path.parent / f".concat_{out_path.stem}.txt"
        concat.write_text("".join(f"file '{s.resolve()}'\n" for s in segments), encoding="utf-8")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
             "-i", str(concat.resolve()), "-c", "copy", "-movflags", "+faststart",
             str(out_path.resolve())],
            check=True, timeout=300,
        )
        concat.unlink(missing_ok=True)
        return

    # TRANSICIÓN PUNCH: cada escena arranca con un zoom-golpe rápido (empieza acercada y "cae" a
    # 1.0 con ease-out) → cada corte PEGA (pattern interrupt) sin frames muertos. La escena 1 golpea
    # MÁS fuerte = arranque explosivo para retener en los primeros frames. Reemplaza el fundido a
    # negro (que metía frames muertos y mataba la retención).
    w, h, fps = gcfg["width"], gcfg["height"], gcfg["fps"]
    # los temporales del punch van a una carpeta PROPIA de este video: con el nombre fijo
    # `videos/_punch_N.mp4` dos ensamblados en paralelo se pisaban y el concat leía un mp4
    # a medio escribir ("moov atom not found") → el video salía con una sola escena
    tmp = out_path.parent / f".tmp_{out_path.stem}"
    tmp.mkdir(exist_ok=True)
    faded = []
    for i, s in enumerate(segments):
        pf = max(2, int(fps * (0.26 if i == 0 else 0.16)))   # frames del golpe (~0.26s escena 1)
        z0 = 1.18 if i == 0 else 1.08                        # cuánto acerca al inicio (ease-out)
        # ease-out (cae rápido y frena): p = 1-(1-x)^2 sobre los primeros pf frames, luego z=1.0
        vf = (f"zoompan="
              f"z='if(lt(on,{pf}), 1 + ({z0}-1)*(1-on/{pf})*(1-on/{pf}), 1)':d=1:"
              f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps={fps},format=yuv420p")
        fs = tmp / f"_punch_{i}.mp4"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(s.resolve()),
             "-vf", vf, "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-c:a", "copy",
             str(fs.resolve())],
            check=True, timeout=900)
        faded.append(fs)
    concat = tmp / "concat.txt"
    concat.write_text("".join(f"file '{f.resolve()}'\n" for f in faded), encoding="utf-8")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", str(concat.resolve()), "-c", "copy", "-movflags", "+faststart",
         str(out_path.resolve())],
        check=True, timeout=900)
    for f in faded:            # limpia los temporales del punch
        f.unlink(missing_ok=True)
    concat.unlink(missing_ok=True)
    tmp.rmdir()


HOOK_DESIGN_PROMPT = """Eres el DIRECTOR DE HOOKS de un canal de IA en español (audiencia \
medida: México, profesionales de 25-44). El cold-open (escena 1, ~2 segundos) decide TODO: \
medido en el canal, un arranque débil pierde al 50% de la audiencia en el segundo 2.

TEMA DEL VIDEO: "{tema}"
GUION: título "{title}"; keyword "{keyword}"; tesis: "{tesis}"; datos clave: {datos}
COLD-OPEN ACTUAL (escena 1): "{frase_actual}" con visual "{visual_actual}"

Diseña 4 COLD-OPENS ALTERNATIVOS que le compitan, cada uno con un MECANISMO distinto:
1. "numero_ancla" — "kinetic" o "big_text" cuyo texto EN PANTALLA es un NÚMERO brutal \
(anclaje: "$0", "3 IAs", "#1", "2026") + su frase hablada.
2. "recibo_real" — "receipt": screenshot REAL de una URL PÚBLICA y RICA EN CONTENIDO que \
se capture bien en un navegador headless (leaderboard, pricing page, repo de GitHub, doc, \
arXiv abstract). PROHIBIDO URLs con muro de pago, login o de ARCHIVO histórico (NYT/medios \
viejos) — salen en blanco; y PROHIBIDO hechos históricos/abstractos como recibo (para "nació \
en 1958" usa número-ancla o texto-sobre-video, no un recibo). SIEMPRE acompaña con \
"query_fotos" (búsqueda de foto real) como respaldo. JAMÁS inventes una URL.
3. "animacion_medida" — "custom": describe una animación de 2 segundos ESPECTACULAR y \
concreta (qué se ve, qué se mueve; paleta neón cian/magenta sobre fondo oscuro) que un \
programador-IA codeará. Legible en 2s: UN elemento protagonista, no una escena compleja.
4. "texto_sobre_video" — "kinetic_video": tipografía cinética SOBRE un clip de video IA en \
movimiento (doble capa: la palabra golpea y el fondo respira — el candidato de máximo \
scroll-stop). Trae "words" (2–5, con NÚMERO si existe) + "veo_prompt" en INGLÉS con la \
metáfora del hook ("dark tech aesthetic, neon cyan and magenta, near-black, no text, no \
people"). SOLO conceptos; PROHIBIDO representar productos/sitios/personas reales.
5. "libre" — el cold-open más scroll-stopping que se te ocurra (cualquier visual_type \
permitido), sin repetir mecanismo.

REGLAS para TODOS: frase hablada ≤8 palabras que abre hueco de curiosidad (sin saludo, sin \
"en este video"); incluye la keyword "{keyword}" en la frase cuando sea natural (SEO por \
ASR); texto en pantalla con NÚMERO cuando el tema tenga uno — pero SOLO números que las \
escenas del guion respalden o hechos verificables (JAMÁS inventes un porcentaje o cifra: \
rigor = credibilidad); el texto en pantalla ("words"/"items") SIEMPRE condensa LA MISMA \
frase hablada — jamás un claim distinto que la narración no dice; REGLA DE REALIDAD (nada \
real como imagen IA/cartoon); legible en 2 segundos. Y si \
el cold-open ACTUAL ya es "kinetic_video" (texto sobre video), tus candidatos tipográficos \
deben ser TAMBIÉN "kinetic_video" copiando la misma clave "video" del actual — la doble capa \
(texto + video en movimiento) siempre retiene más que la tipografía sobre fondo plano.

Responde SOLO este JSON:
{{"candidates": [{{"mecanismo": "...", "frase": "<≤8 palabras>", "visual_type": \
"kinetic|big_text|receipt|custom|kinetic_video", "kinetic": {{"words": [{{"text": "...", \
"accent": true}}], "variant": "dark|accent"}}, "big_text": {{"items": ["<≤6 palabras>"]}}, \
"receipt": {{"url": "...", "query_fotos": "...", "title": "<chip MAYÚS>", "caption": \
"<fuente>"}}, "custom_anim": {{"description": "..."}}, "kinetic_video": {{"words": [...], \
"veo_prompt": "<cinematic english prompt>", "seconds": 4}}}}, … ×5]}}
(cada candidato SOLO trae la clave de SU visual_type)"""

HOOK_JUDGE_PROMPT = """Eres el JUEZ DE RETENCIÓN de TikTok 2026. Elige el cold-open (escena 1, \
~2s) que MÁS detiene el scroll de un profesional mexicano de 25-44 años en el feed.

CRITERIOS (medidos en el canal y en virales):
- Pattern interrupt en el primer frame (movimiento/contraste; lo estático pierde).
- NÚMERO o dato concreto legible en 2s (anclaje) vale más que adjetivos.
- Hueco de curiosidad: obliga a preguntarse "¿cómo?/¿por qué?" — imposible de resolver sin ver.
- Frase ≤8 palabras, sin preámbulos.
- El material REAL ("receipt") da credibilidad instantánea SI la prueba es contundente y se \
LEE en 2s; si sería confusa o pequeña, pierde contra tipografía grande.
- REGLA DE REALIDAD: producto/sitio real jamás como imagen IA.
- Coherencia: promete EXACTAMENTE lo que el video paga (el clickbait roto = swipe + señal \
negativa).

TEMA: "{tema}"
CANDIDATOS (el 0 es el actual del guion):
{candidatos}

Responde SOLO este JSON:
{{"winner_index": <índice 0-based>, "scores": [<1-10 de cada candidato, en orden>], \
"razon": "<1 frase>"}}"""

_HOOK_SPEC_KEYS = ("kinetic", "big_text", "receipt", "custom_anim", "veo", "kinetic_video")

# CTA implícito (feedback José 21-jul + curso M10: el CTA directo baja −15% y TikTok lo
# penaliza). El prompt lo prohíbe, pero un slip del modelo no debe llegar al video: se
# detecta y se repara con una reescritura quirúrgica.
_CTA_COERCIVOS = re.compile(
    r"\b(gu[aá]rdal[oa]|guarda\s+est[eoa]|s[ií]guem[e]|comenta\b|dale\s+like|"
    r"comp[aá]rtel[oa]|dale\s+seguir|tienes\s+que\s+seguir)", re.I)

_CTA_REPAIR_PROMPT = """Estas narraciones de un video de TikTok contienen IMPERATIVOS de \
plataforma prohibidos (TikTok penaliza el CTA directo). Reescribe CADA una eliminando el \
imperativo y logrando lo mismo de forma IMPLÍCITA: el guardado se insinúa con necesidad \
futura ("esto te va a servir cuando…"), el follow con lo que viene mañana (sin "sígueme"), \
el comentario con la pregunta + postura propia ("yo digo que X"). Mantén la longitud \
(±3 palabras), el tono cercano y TODO lo demás igual (números, tema, pregunta A-o-B).

NARRACIONES A REPARAR:
{items}

Responde SOLO este JSON: {{"reescritas": ["<narración reparada en el mismo orden>", …]}}"""


def _enforce_implicit_cta(scenes: list, router: ModelRouter,
                          on_step: Callable[[str, str], None]) -> None:
    """Red de seguridad post-guion: si alguna narración trae un imperativo de plataforma,
    UNA llamada la reescribe en CTA implícito. Nunca tumba la generación."""
    malas = [(i, s["narration"]) for i, s in enumerate(scenes)
             if _CTA_COERCIVOS.search(s.get("narration") or "")]
    if not malas:
        return
    try:
        on_step("cta", f"reparando {len(malas)} narración(es) con CTA directo → implícito")
        items = "\n".join(f'{n + 1}. "{t}"' for n, (_, t) in enumerate(malas))
        resp = router.generate_json(_CTA_REPAIR_PROMPT.format(items=items))
        nuevas = resp.get("reescritas") or []
        for (idx, _), nueva in zip(malas, nuevas):
            if isinstance(nueva, str) and nueva.strip() \
                    and not _CTA_COERCIVOS.search(nueva):
                scenes[idx]["narration"] = nueva.strip()
    except Exception as e:  # noqa: BLE001 — mejor un imperativo que tumbar el video
        print(f"  aviso: reparación de CTA falló ({e}); queda la narración original")


def design_hook(tema: str, guion: dict, scenes: list, router: ModelRouter,
                on_step: Callable[[str, str], None]) -> None:
    """Motor de hooks: 4 candidatos de Gemini + juez de retención (mandato de José: hooks
    espectaculares con toda la artillería — Gemini diseña/juzga, codex/Remotion producen,
    receipt trae material real). El ganador SUSTITUYE el cold-open. Nunca tumba el video."""
    try:
        s0 = scenes[0]
        tesis = next((s.get("narration", "") for s in scenes
                      if s.get("beat_type") == "tesis"), "")
        datos = " | ".join(s.get("narration", "") for s in scenes[1:4])[:320]
        design = router.generate_json(HOOK_DESIGN_PROMPT.format(
            tema=tema, title=guion.get("title", ""), keyword=guion.get("keyword", ""),
            tesis=tesis, datos=datos, frase_actual=s0.get("narration", ""),
            visual_actual=s0.get("visual_type", "")))
        cands = [c for c in (design.get("candidates") or [])
                 if isinstance(c, dict) and c.get("frase")
                 and len(str(c["frase"]).split()) <= 9   # ≤8 palabras (margen 1)
                 and c.get("visual_type") in ("kinetic", "big_text", "receipt", "custom",
                                              "veo", "kinetic_video")
                 and any(c.get(k) for k in _HOOK_SPEC_KEYS)][:5]
        if not cands:
            return
        actual = {"mecanismo": "actual", "frase": s0.get("narration", ""),
                  "visual_type": s0.get("visual_type", "")}
        for k in _HOOK_SPEC_KEYS:
            if s0.get(k):
                actual[k] = s0[k]
        todos = [actual] + cands
        fallo = router.generate_json(HOOK_JUDGE_PROMPT.format(
            tema=tema, candidatos=json.dumps(todos, ensure_ascii=False, indent=1)))
        w = int(fallo.get("winner_index", 0))
        if not (0 <= w < len(todos)) or w == 0:
            on_step("hook", "juez de retención: gana el cold-open original")
            return
        win = todos[w]
        # CANDADO DE RIGOR (28-jul): el motor propuso "ChatGPT convierte tu texto en 1536
        # números" para un guion que jamás menciona esa cifra — 1536 es la dimensión de los
        # modelos de EMBEDDINGS de OpenAI, no de ChatGPT. Un número inventado en el hook es
        # lo primero que ve la audiencia y le cuesta la autoridad a José ("solo cifras
        # verificables"). Un hook NO puede introducir números que el guion no traía.
        _nums = lambda s: set(re.findall(r"\d[\d.,]*", s or ""))
        _del_guion = set().union(*(_nums(s.get("narration")) for s in scenes)) or set()
        _inventados = _nums(win.get("frase")) - _del_guion
        if _inventados:
            print(f"  ⚠ hook descartado: introduce cifras que el guion no trae "
                  f"({', '.join(sorted(_inventados))}). Me quedo con el cold-open original.")
            on_step("hook", "juez: hook descartado por inventar cifras")
            return
        nuevo = {"narration": win["frase"], "beat_type": "hook",
                 "visual_type": win["visual_type"],
                 "pause_after": s0.get("pause_after", 0.45)}
        for k in _HOOK_SPEC_KEYS:
            if win.get(k):
                nuevo[k] = win[k]
        # HERENCIA DE FONDO (en código, no solo en el prompt): si el cold-open original
        # era texto-sobre-video, un ganador tipográfico se CONVIERTE a kinetic_video con
        # el mismo fondo (video local o veo_prompt) — la doble capa nunca se pierde.
        _bg = s0.get("kinetic_video") or {}
        if (win["visual_type"] in ("kinetic", "big_text")
                and (_bg.get("video") or _bg.get("veo_prompt"))):
            words = (win.get("kinetic") or {}).get("words") or [
                {"text": t, "accent": i == 0}
                for i, t in enumerate((win.get("big_text") or {}).get("items") or [])]
            if words:
                nuevo["visual_type"] = "kinetic_video"
                nuevo["kinetic_video"] = {
                    "words": words,
                    "variant": (win.get("kinetic") or {}).get("variant", "dark"),
                    **({"video": _bg["video"]} if _bg.get("video")
                       else {"veo_prompt": _bg["veo_prompt"],
                             "seconds": _bg.get("seconds", 4)})}
                nuevo.pop("kinetic", None)
                nuevo.pop("big_text", None)
        scenes[0] = nuevo
        try:  # mantiene guion["scenes"] coherente (para el JSON que se archiva)
            guion["scenes"][guion["scenes"].index(s0)] = nuevo
        except ValueError:
            pass
        on_step("hook", f"cold-open ganador: {win.get('mecanismo')} — “{win['frase']}”")
    except Exception as e:  # noqa: BLE001 — el motor de hooks jamás tumba la generación
        print(f"  aviso: motor de hooks falló ({e}); se usa el hook original")


def generate_video(tema: str, root: Path, cfg: dict,
                   on_step: Callable[[str, str], None] = lambda s, d: print(f"→ {s} {d}"),
                   n_scenes: int | None = None,
                   avoid_stems: frozenset[str] | set[str] = frozenset(),
                   siguiente: str | None = None,
                   modo: str = "corto",
                   guion: dict | None = None) -> Path:
    router = ModelRouter(cfg)
    if not router.available:
        raise RuntimeError("GEMINI_API_KEY no configurada; la Rama A requiere Gemini.")
    gcfg = cfg["generate"]
    fmt = formato(modo)
    n = n_scenes or fmt["n_scenes"]

    # cierre consciente de la serie: el bucle abierto debe prometer el tema REAL del
    # próximo video (no uno inventado), para que el "mañana te enseño X" se cumpla.
    if siguiente:
        cierre = ('El cierre DEBE prometer EXACTAMENTE lo que trae el PRÓXIMO video de esta '
                  f'serie, que trata de: "{siguiente}". Escríbelo natural y SIN pedir el follow '
                  '(p. ej. "mañana te enseño <ese tema concreto en tus palabras>" — el bucle '
                  'abierto implica seguir). PROHIBIDO prometer un tema distinto al del próximo '
                  'video: el bucle abierto tiene que cumplirse.')
    else:
        cierre = ('Cierra prometiendo lo que viene en el canal SIN pedir el follow ni decir '
                  '"sígueme" (p. ej. "esto apenas empieza" o "lo que viene está mejor").')

    # Claude es el GUIONISTA: si se pasa un `guion` pre-escrito (por Claude), se usa tal cual
    # (mejor coherencia de serie + marketing 2026). Si no, lo escribe Gemini como respaldo.
    if guion is None:
        on_step("guion", f"Gemini escribe el guion ({'largo' if modo == 'largo' else 'corto'})")
        # misión pública (táctica Kumar): el CTA puede sentirse episodio de una historia
        _mision = (cfg.get("branding") or {}).get("mision", "")
        mision_block = (
            f'MISIÓN PÚBLICA (narrativa de protagonista — convierte espectadores en fans): '
            f'la misión declarada del canal es "{_mision}". Cuando el cierre lo permita (sin '
            f'forzarlo en TODOS los videos), el CTA puede sonar a episodio de esa misión '
            f'("voy documentando el camino", "esto apenas empieza") — SIN pedir el follow: la '
            f'audiencia debe querer VERNOS GANAR.' if _mision else "")
        guion = router.generate_json(GUION_PROMPT.format(
            tema=tema, n_scenes=n, cierre=cierre, mision_block=mision_block,
            dur=fmt["dur"], desarrollo=fmt["desarrollo"], profundidad=fmt["profundidad"]))
    else:
        on_step("guion", "guion de Claude (guionista)")
    scenes = [s for s in (guion.get("scenes") or [])
              if isinstance(s, dict) and s.get("narration")]
    if not scenes:
        raise RuntimeError("el guion no trajo escenas")

    # preflight: un diagrama vacío se veía como fondo pelón durante toda la escena.
    # Revienta ANTES de gastar TTS/Omni, no a mitad del render.
    for _i, _s in enumerate(scenes):
        if _s.get("visual_type") == "diagram" and _s.get("diagram"):
            try:
                _s["diagram"] = _normalizar_diagrama(_s["diagram"])
            except ValueError as e:
                raise RuntimeError(f"escena {_i + 1}: {e}") from None

    # motor de hooks (José: "hooks espectaculares"): candidatos + juez de retención.
    # Corre también sobre guiones de Claude (el original compite como candidato 0);
    # se salta con "hook_locked": true en el guion.
    if gcfg.get("hook_engine", True) and len(scenes) >= 3 and not guion.get("hook_locked"):
        on_step("hook", "motor de hooks: 4 candidatos + juez de retención")
        design_hook(tema, guion, scenes, router, on_step)

    # red de seguridad: cero imperativos de plataforma en las narraciones (CTA implícito)
    _enforce_implicit_cta(scenes, router, on_step)

    slug = _slugify(guion.get("slug") or guion.get("title") or tema)
    out_path = root / f"gen_{slug}.mp4"
    i = 1
    # unicidad GLOBAL (videos/ y todas las series): dos videos con el mismo stem
    # confundirían la limpieza y el borrado
    while out_path.exists() or out_path.stem in avoid_stems:
        out_path = root / f"gen_{slug}_{i}.mp4"
        i += 1
    assets = root / f"{out_path.stem}.assets"
    assets.mkdir(exist_ok=True)
    (assets / "guion.json").write_text(
        json.dumps({"tema": tema, "modo": modo, **guion}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # tema visual (paleta) por video — rota entre familias de forma determinista por slug,
    # para variar el mood entre videos sin perder coherencia dentro de cada uno
    from .diagrams import THEMES

    theme_names = list(THEMES.keys())
    theme = guion.get("theme") if guion.get("theme") in THEMES else \
        theme_names[sum(map(ord, out_path.stem)) % len(theme_names)]
    gcfg["theme"] = theme    # que host_layout use la misma paleta que los diagramas del cuerpo

    # ESTILO GRÁFICO por video (feedback de José 26-jul: "los estilos siempre muy
    # repetitivos"). El guion puede pedir un look propio; si no, el neón de marca.
    if guion.get("image_style"):
        gcfg = {**gcfg, "image_style": guion["image_style"]}
    img_style = guion.get("image_style") or _IMG_STYLE

    # imagen ancla de estilo: se pasa como referencia a cada escena 'image' para cohesión de marca
    style = gcfg.get("image_style", "")
    anchor_bytes: bytes | None = None
    # el ancla solo sirve a escenas "image": no gastar una imagen si el guion no trae ninguna
    has_image_scenes = any(s.get("visual_type", "image") == "image" for s in scenes)
    if gcfg.get("anchor") and has_image_scenes:
        try:
            on_step("estilo", "generando imagen ancla de marca")
            # El ancla fija el ESTILO (luz, paleta, lente), NUNCA el tema. Cuando decía
            # "representing: {tema}" y el tema hablaba de IA, devolvía el cerebro de neón
            # de banco de imágenes — y como el ancla se pasa de referencia a cada escena,
            # ese cliché contaminaba imágenes cuyo prompt pedía otra cosa por completo.
            anchor_bytes = router.generate_image(
                "A photographic style reference plate: a quiet desk by a window in the "
                "late afternoon, a notebook and a cup, nobody in frame. "
                f"The point of this image is the LIGHT and the PALETTE, not the subject. {style}")
            (assets / "anchor.png").write_bytes(anchor_bytes)
        except Exception as e:  # noqa: BLE001
            print(f"  aviso: ancla de estilo falló ({e}); sigo sin referencia")

    segments = []
    total = len(scenes)
    validate = bool(gcfg.get("validate_scenes", True))
    _ec = (cfg.get("tts") or {}).get("elevenlabs") or {}
    # TOMA ÚNICA (tts.elevenlabs.single_take): toda la narración en una petición, partida
    # por alineación de caracteres. La entonación no se reinicia en cada escena — es lo que
    # separa "locutor" de "robot". Con toma única no aplica la curva by_beat (ver router).
    _voces: list[bytes] | None = None
    # REUTILIZAR VOZ (mandato de José: no re-gastar ElevenLabs en regeneraciones).
    # Si los wav de esta carpeta corresponden a EXACTAMENTE estas narraciones, se usan
    # tal cual: un re-render por un bug visual no vuelve a pagar la locución.
    # la firma incluye la VOZ: cambiar de voice_id tiene que invalidar el audio cacheado,
    # si no se reusa la locución de la voz anterior sin avisar (3-ago-2026)
    _firma = hashlib.sha1(
        ("␟".join(s["narration"] for s in scenes)
         + "␟" + str(_ec.get("voice_id", "")) + str(_ec.get("model_id", ""))
         ).encode("utf-8")).hexdigest()
    _firma_f = assets / "voz.sha1"
    _reusar_voz = (
        _firma_f.exists() and _firma_f.read_text().strip() == _firma
        and all((assets / f"scene_{i}.wav").exists() for i in range(total)))
    if _reusar_voz:
        on_step("voz", f"reutilizo la locución ya pagada ({total} escenas)")
    elif _ec.get("single_take"):
        on_step("voz", f"toma única de {total} escenas")
        _voces = router.generate_tts_batch([s["narration"] for s in scenes],
                                           gcfg.get("tts_style", ""))
    for idx, scene in enumerate(scenes):
        voz_path = assets / f"scene_{idx}.wav"
        _cola = 1.0 if idx == total - 1 else 0.18   # la última respira; las demás, poco
        if _reusar_voz:
            with wave.open(str(voz_path)) as _w:      # ya trae la pausa dentro
                dur = _w.getnframes() / _w.getframerate() + _cola
        else:
            on_step(f"escena {idx + 1}/{total}", "generando voz")
            if _voces is not None:
                pcm = _voces[idx]
            else:
                # CURVA DE VOZ por beat (config tts.elevenlabs.by_beat): hook lento/grave,
                # desarrollo ágil, tesis con peso — el tono acompaña al guion (Alborná)
                _curva = (_ec.get("by_beat") or {}).get(str(scene.get("beat_type") or ""), {})
                pcm = router.generate_tts(scene["narration"], gcfg.get("tts_style", ""),
                                          overrides=_curva or None)
            # pausa dramática tras la frase (gramática de pausas de Alborná): el guion puede
            # pedirla con "pause_after"; por defecto, el hook y la tesis respiran solos
            _pausa_default = {"hook": 0.45, "tesis": 0.35}.get(
                str(scene.get("beat_type") or ""), 0.0)
            _pausa = float(scene.get("pause_after") or _pausa_default)
            if _pausa > 0:
                pcm += b"\x00" * (int(24000 * min(_pausa, 1.5)) * 2)
            # COLA: 0.3 s por escena para que el corte no muerda la última sílaba. La
            # ÚLTIMA escena lleva 1.0 s: ahí termina el video y sin ese respiro la voz y
            # la música se cortan en seco (José, 4-ago-2026: "se corta el audio").
            dur = _wav_from_pcm(pcm, voz_path) + _cola
            if idx == total - 1:      # locución completa: queda firmada para reusarla
                _firma_f.write_text(_firma)

        seg = assets / f"seg_{idx}.mp4"
        # CACHÉ POR ESCENA (mandato de José: no re-gastar en regeneraciones). Un
        # re-render por un bug de UNA escena no vuelve a pagar D-ID, Omni ni Codex
        # en las otras cinco: se reusa el segmento si la escena no cambió.
        # Para forzar el rebuild de una escena basta borrar su seg_N.sha1.
        _seg_firma = hashlib.sha1(
            (json.dumps(scene, ensure_ascii=False, sort_keys=True) + str(theme)
             + str(_ec.get("voice_id", ""))     # otra voz = otro audio = otro segmento
             + f"|cola={_cola}"                 # cambiar la cola CAMBIA el segmento
             ).encode("utf-8")).hexdigest()
        _seg_f = assets / f"seg_{idx}.sha1"
        if (seg.exists() and _seg_f.exists()
                and _seg_f.read_text().strip() == _seg_firma):
            on_step(f"escena {idx + 1}/{total}", "sin cambios: reutilizo el render")
            segments.append(seg)
            continue

        def build_seg(feedback: str = "") -> None:
            vt = scene.get("visual_type", "image")
            # ANFITRIÓN talking-head: el ROSTRO REAL de José hablando con su voz clonada
            # (ya generada en voz_path); D-ID le pone lip-sync fonético. Ver autoedit/host.py.
            # Se escala al formato del pipeline para concatenar con las demás escenas.
            if vt == "host":
                # anfitrión COMPOSITE (formato presentador-retención): rostro D-ID abajo con
                # aire + animación de marca arriba (motion); subtítulos los pone Rama B. La
                # duración se rellena frame-exacta para calzar con las demás escenas. Ver
                # host_layout.py (el full-screen anterior aburría; esto retiene).
                # Si D-ID falla (créditos agotados, API caída) degrada a big_text con el
                # headline: la escena pierde el rostro pero el video NUNCA se tumba.
                try:
                    from . import host_layout

                    host_top = scene.get("host_top") or {
                        "kind": "title", "title": (scene.get("keyword") or "").upper()}
                    host_layout.build_host_segment(
                        voz_path, seg, gcfg, host_top,
                        image_path=gcfg.get("host_image"),
                        target_frames=int(round(dur * gcfg["fps"])),
                        on_step=lambda s, d: on_step(f"escena {idx + 1}/{total}", d))
                    return
                except Exception as e:  # noqa: BLE001
                    print(f"  aviso: host/D-ID falló ({e}); uso big_text de respaldo")
                    ht = scene.get("host_top") or {}
                    scene["big_text"] = {"items": ht.get("lines")
                                         or [ht.get("title") or "SÍGUEME"]}
                    vt = "big_text"
            # DEMO REAL de ML tradicional (numpy/sklearn/matplotlib/seaborn): el código del
            # guion se EJECUTA y su gráfica real entra al video (código→gráfica). "Input
            # original" (crece en 2026), no un dibujo. Degrada a big_text si el modelo falla.
            if vt == "ml_demo" and scene.get("ml_demo"):
                try:
                    from . import ml_demo

                    ml_demo.render_ml_demo_scene(
                        scene["ml_demo"], voz_path, dur, seg, gcfg,
                        on_step=lambda s, d: on_step(f"escena {idx + 1}/{total}", d))
                    return
                except Exception as e:  # noqa: BLE001
                    print(f"  aviso: ml_demo falló ({e}); uso big_text de respaldo")
                    scene["big_text"] = scene.get("big_text") or {
                        "items": [scene.get("ml_demo", {}).get("caption", "Modelo real")]}
                    vt = "big_text"
            # Grabación REAL de la herramienta (ChatGPT, etc.). NO tiene respaldo a propósito:
            # antes degradaba a una animación dibujada de la herramienta y eso VIOLA la regla
            # de realidad — José vio una ventana neón falsa con el título "Prompt en acción" y
            # no había forma de enterarse antes de abrir el video. Si la grabación no sale, el
            # video se detiene con el motivo (casi siempre: falta iniciar sesión en el perfil
            # C:\autoedit-chrome). Un video sin terminar es mejor que un video que miente.
            if (vt == "screen_demo" and scene.get("screen_demo")
                    and (cfg.get("screen_demo") or {}).get("enabled", True)):
                sd = scene["screen_demo"]
                on_step(f"escena {idx + 1}/{total}", "grabando herramienta REAL")
                from .screen_demo import record_demo

                record_demo(sd.get("prompt", ""), voz_path, dur, seg, cfg,
                            tool_name=sd.get("tool", "chatgpt"),
                            capture_seconds=sd.get("capture_seconds"))
                return
            # VIDEO GENERADO (Veo/Gemini) — mandato: hooks espectaculares. SOLO conceptos y
            # metáforas (regla de realidad). Se ajusta a la duración de la narración (loop si
            # hace falta) y degrada a big_text si Veo falla: nunca tumba el video.
            if vt == "veo" and scene.get("veo"):
                try:
                    on_step(f"escena {idx + 1}/{total}", "generando video (Veo)")
                    clip = assets / f"veo_{idx}.mp4"
                    if not clip.exists():   # regeneraciones: no re-gastar Veo
                        router.generate_video_clip(
                            scene["veo"].get("prompt", ""), clip,
                            seconds=max(3, int(scene["veo"].get("seconds", 4) or 4)))
                    subprocess.run(
                        ["ffmpeg", "-y", "-loglevel", "error",
                         "-stream_loop", "-1", "-i", str(clip), "-i", str(voz_path),
                         "-vf", ("scale=1080:1920:force_original_aspect_ratio=increase,"
                                 "crop=1080:1920,fps=30,format=yuv420p"),
                         "-af", "apad=pad_dur=1.6", "-map", "0:v", "-map", "1:a",
                         "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                         "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                         "-t", f"{dur:.3f}", str(seg)],
                        check=True, timeout=1800)
                    return
                except Exception as e:  # noqa: BLE001
                    if str(scene.get("beat_type") or "") == "hook":
                        # el cold-open no puede esperar: tipografía de golpe
                        print(f"  aviso: veo falló ({e}); uso big_text de respaldo")
                        scene["big_text"] = scene.get("big_text") or {
                            "items": [scene.get("narration", "")[:40]]}
                        vt = "big_text"
                    else:
                        # escena de concepto: cae a foto IA con el MISMO prompt (Ken Burns)
                        print(f"  aviso: veo falló ({e}); uso imagen de respaldo")
                        scene["image_prompt"] = (scene.get("image_prompt")
                                                 or scene["veo"].get("prompt", ""))
                        vt = "image"
            # ── beats del formato presentador-evidencia (motor Remotion) ─────────────
            # RECIBO: material REAL (screenshot de URL real o foto Apify). Nunca imagen IA.
            if vt == "receipt" and scene.get("receipt") and not scene.get("_receipt_src"):
                rc = scene["receipt"]
                try:
                    from . import real_assets

                    shot = assets / f"receipt_{idx}.png"
                    if rc.get("image") and Path(rc["image"]).exists():
                        shot = Path(rc["image"])          # el guionista ya trajo la imagen
                    elif not shot.exists():
                        if rc.get("url"):
                            try:
                                on_step(f"escena {idx + 1}/{total}",
                                        "screenshot REAL del sitio")
                                real_assets.screenshot(rc["url"], shot)
                            except Exception as e_shot:  # noqa: BLE001
                                # URL en blanco/paywall/archivo: si hay búsqueda de foto
                                # real, ese es el respaldo antes de degradar
                                if not rc.get("query_fotos"):
                                    raise
                                print(f"  aviso: screenshot vacío ({e_shot}); "
                                      f"foto real por Apify")
                                shot = real_assets.fetch_photos(
                                    rc["query_fotos"], assets / f"fotos_{idx}", n=1)[0]
                        elif rc.get("query_fotos"):
                            on_step(f"escena {idx + 1}/{total}", "foto real (Apify)")
                            shot = real_assets.fetch_photos(
                                rc["query_fotos"], assets / f"fotos_{idx}", n=1)[0]
                        else:
                            raise RuntimeError("receipt sin url/imagen/query_fotos")
                    scene["_receipt_src"] = str(shot)
                except Exception as e:  # noqa: BLE001
                    print(f"  aviso: receipt falló ({e}); uso big_text")
                    scene["big_text"] = {"items": [rc.get("title") or "DATO REAL"]}
                    vt = "big_text"
            # CUTOUT: cartoon recortado — imagen por codex ($0, plan ChatGPT) o Gemini,
            # y recorte alpha con rembg si no vino transparente. Solo CONCEPTOS.
            if vt == "cutout" and scene.get("cutout") and not scene.get("_cutout_src"):
                co = scene["cutout"]
                cut = assets / f"cutout_{idx}.png"
                try:
                    if not cut.exists():
                        raw_c = assets / f"cutout_{idx}_raw.png"
                        prompt_c = (
                            f"{co.get('image_prompt', '')}. flat 2D cartoon illustration, bold "
                            "thick black outlines, vibrant flat colors, electric cyan (#00E5FF) "
                            "and hot magenta (#FF2DAA) as accent colors, playful modern animated "
                            "explainer style, simple clean shapes, single isolated subject, "
                            "fully transparent background, cut-out sticker style, PNG with "
                            "alpha, no text, no words, no letters")
                        if not raw_c.exists():
                            try:
                                from .codex_client import codex_available, codex_image

                                if not codex_available():
                                    raise RuntimeError("codex no instalado")
                                on_step(f"escena {idx + 1}/{total}", "cartoon (codex, $0)")
                                codex_image(prompt_c, raw_c)
                            except Exception as ce:  # noqa: BLE001
                                print(f"  aviso: codex imagen falló ({ce}); uso Gemini")
                                raw_c.write_bytes(router.generate_image(prompt_c))
                        from PIL import Image

                        im = Image.open(raw_c).convert("RGBA")
                        if im.getextrema()[3][0] >= 250:   # vino sin alpha → recorte rembg
                            on_step(f"escena {idx + 1}/{total}", "recortando (rembg)")
                            from rembg import remove       # import pesado, solo si hace falta

                            im = remove(im, alpha_matting=True,
                                        alpha_matting_foreground_threshold=250,
                                        alpha_matting_background_threshold=15,
                                        alpha_matting_erode_size=3)
                        bbox = im.getbbox()
                        if bbox:
                            im = im.crop(bbox)
                        im.save(cut)
                    scene["_cutout_src"] = str(cut)
                except Exception as e:  # noqa: BLE001
                    print(f"  aviso: cutout falló ({e}); uso big_text")
                    scene["big_text"] = {"items": [co.get("keyword") or "MÍRALO"]}
                    vt = "big_text"
            # MASCOTA: robot pixel-art del canal (branding/mascota/<pose>.png)
            if vt == "mascota" and scene.get("mascota") and not scene.get("_mascota_src"):
                mv = scene["mascota"]
                pose = str(mv.get("pose") or "neutral").lower()
                pf = Path(__file__).resolve().parent.parent / "branding" / "mascota" / f"{pose}.png"
                if not pf.exists():
                    pf = pf.with_name("neutral.png")
                if pf.exists():
                    scene["_mascota_src"] = str(pf)
                else:
                    print("  aviso: no hay poses en branding/mascota; uso big_text")
                    scene["big_text"] = {"items": [mv.get("caption") or "MÍRALO"]}
                    vt = "big_text"
            spec = None
            if vt == "diagram" and scene.get("diagram"):
                spec = _normalizar_diagrama(scene["diagram"])
                if feedback:  # el validador rechazó: Gemini corrige la especificación
                    spec = router.generate_json(FIX_SPEC_PROMPT.format(
                        spec=json.dumps(spec, ensure_ascii=False), problemas=feedback))
            elif vt == "big_text" and scene.get("big_text"):
                bt = scene["big_text"]
                spec = {"type": "big_text",
                        "items": bt if isinstance(bt, list) else bt.get("items", [])}
            elif vt == "kinetic" and scene.get("kinetic"):
                spec = {"type": "kinetic", **scene["kinetic"]}
            elif vt == "perceptron":
                # animación bespoke del perceptrón (mecanismo → se explica MOVIÉNDOSE, no
                # con una imagen fija). Componente Remotion propio de este video.
                spec = {"type": "perceptron", **(scene.get("perceptron") or {})}
            elif vt == "activation_bend":
                # animación bespoke de la no-linealidad (recta que falla → curva que separa)
                spec = {"type": "activation_bend", **(scene.get("activation_bend") or {})}
            elif vt == "gradient_descent":
                # animación bespoke: la pelota bajando la montaña de la pérdida
                spec = {"type": "gradient_descent", **(scene.get("gradient_descent") or {})}
            elif vt == "backprop":
                # animación bespoke: el error propagándose hacia atrás (regla de la cadena)
                spec = {"type": "backprop", **(scene.get("backprop") or {})}
            # texto cinético SOBRE video Omni/Veo en movimiento (hook compuesto — el
            # cold-open estrella). Reusa un clip existente ("video") o genera uno nuevo
            # ("veo_prompt"); si el video falla, degrada a kinetic plano.
            elif vt == "kinetic_video" and scene.get("kinetic_video"):
                kv = scene["kinetic_video"]
                try:
                    from .remotion_scenes import stage_asset

                    clip = (Path(kv["video"]) if kv.get("video")
                            else assets / f"veo_{idx}.mp4")
                    if not clip.exists():
                        on_step(f"escena {idx + 1}/{total}", "generando video de fondo (Veo)")
                        # Omni exige mínimo 3s (y el diseñador a veces pide 2)
                        router.generate_video_clip(
                            kv.get("veo_prompt", ""), clip,
                            seconds=max(3, int(kv.get("seconds", 4) or 4)))
                    from .remotion_scenes import spec_kinetic_video

                    spec = spec_kinetic_video(kv, clip, guion.get("theme", "violeta"))
                except Exception as e:  # noqa: BLE001
                    print(f"  aviso: kinetic_video sin clip ({e}); kinetic plano")
                    spec = {"type": "kinetic", "words": kv.get("words") or [],
                            "variant": kv.get("variant", "dark")}
            elif vt in ("terminal", "mascota") and (scene.get("captura") or scene.get("foto")):
                # la escena la va a SUSTITUIR una captura real (graba_curso) o la foto del
                # perrito (pon_perrito): el beat de Remotion sería trabajo tirado, y es justo
                # el que más se cuelga (TerminalSlide/Mascota: 8-9 min al 0% en las clases
                # 5, 6 y 8 del curso). Se deja un marcador barato en PIL.
                on_step(f"escena {idx + 1}/{total}", "marcador PIL (la captura/foto lo sustituye)")
                # _pil: el marcador NO pasa por Remotion (big_text es diagrama de Remotion y
                # el marcador de la clase 11 se colgó 8 min ahí, justo lo que quería evitar)
                spec = {"type": "big_text", "_pil": True,
                        "items": [scene.get("terminal", {}).get("title")
                                  or (scene.get("mascota") or {}).get("caption") or "…"]}
            elif vt == "terminal" and scene.get("terminal"):
                spec = {"type": "terminal",
                        "watermark": (cfg.get("branding") or {}).get("handle", ""),
                        **scene["terminal"]}
            elif vt == "lottie" and scene.get("lottie"):
                # animación profesional (.json de After Effects / LottieFiles) dentro
                # de la franja de contenido. El json se sirve desde public/dyn.
                from .remotion_scenes import stage_asset

                lt = scene["lottie"]
                _j = Path(lt["file"])
                if not _j.is_absolute():
                    _j = Path(__file__).resolve().parent.parent / _j
                if not _j.exists():
                    raise RuntimeError(f"lottie: no existe {_j}")
                spec = {"type": "lottie", "src": stage_asset(_j),
                        "title": lt.get("title"), "caption": lt.get("caption"),
                        "loop": lt.get("loop", True)}
            elif vt == "receipt" and scene.get("_receipt_src"):
                from .remotion_scenes import stage_asset

                rc = scene["receipt"]
                spec = {"type": "receipt", "image": stage_asset(Path(scene["_receipt_src"])),
                        "title": rc.get("title"),
                        "url_label": rc.get("url_label") or (rc.get("url") or "")[:60] or None,
                        "highlight": rc.get("highlight"), "caption": rc.get("caption")}
            elif vt == "cutout" and scene.get("_cutout_src"):
                from .remotion_scenes import stage_asset

                co = scene["cutout"]
                spec = {"type": "cutout", "image": stage_asset(Path(scene["_cutout_src"])),
                        "keyword": co.get("keyword"), "from": co.get("from", "bottom")}
            elif vt == "mascota" and scene.get("_mascota_src"):
                from .remotion_scenes import stage_asset

                mv = scene["mascota"]
                spec = {"type": "mascota", "image": stage_asset(Path(scene["_mascota_src"])),
                        "caption": mv.get("caption"),
                        "sign_text": (mv.get("sign_text")
                                      if str(mv.get("pose")) == "cartel" else None)}
            # SHOWCASE: conceptos UNO A LA VEZ, cada uno con una IMAGEN grande. FUENTE POR
            # ÍTEM (regla de realidad): "query_fotos" → foto REAL de Apify (cosa nombrable,
            # producto, persona); si no, "image_prompt" → imagen generada por codex ($0,
            # Gemini de respaldo) para CONCEPTOS/metáforas. Imágenes cacheadas por escena.
            elif vt == "showcase" and scene.get("showcase"):
                from .remotion_scenes import stage_asset

                items_out = []
                for j, it in enumerate((scene["showcase"].get("items") or [])[:4]):
                    img = assets / f"showcase_{idx}_{j}.png"
                    if not img.exists():
                        if it.get("query_fotos"):   # cosa REAL → foto real (Apify)
                            on_step(f"escena {idx + 1}/{total}",
                                    f"foto real {j + 1} (Apify)")
                            try:
                                from . import real_assets

                                shot = real_assets.fetch_photos(
                                    it["query_fotos"], assets / f"sc_fotos_{idx}_{j}",
                                    n=1)[0]
                                Path(shot).replace(img)
                            except Exception as e:  # noqa: BLE001
                                print(f"  aviso: Apify falló ({e}); genero con codex")
                                it = {**it, "query_fotos": None}
                        if not img.exists():        # CONCEPTO → imagen generada
                            # el panel del showcase es CASI CUADRADO y recorta con
                            # objectFit:cover — una imagen 9:16 pierde ~60% del alto. Medido
                            # en ln03 (28-jul): la foto de la mesa larga se quedó en pura
                            # madera, sin los dos objetos que eran el punto. El encuadre del
                            # showcase manda sobre el 9:16 del estilo general del video.
                            prompt = (f"{it.get('image_prompt', it.get('label', ''))}. "
                                      f"{img_style}. SQUARE 1:1 composition; the subject must "
                                      f"be complete and centred within the middle square of "
                                      f"the frame; keep nothing important near the top or "
                                      f"bottom edges")
                            on_step(f"escena {idx + 1}/{total}",
                                    f"generando imagen {j + 1} (codex)")
                            try:
                                from .codex_client import codex_available, codex_image

                                if not codex_available():
                                    raise RuntimeError("codex no disponible")
                                codex_image(prompt, img)
                            except Exception as e:  # noqa: BLE001 — Gemini de respaldo
                                print(f"  aviso: codex img falló ({e}); uso Gemini")
                                img.write_bytes(router.generate_image(prompt))
                    items_out.append({"label": it.get("label", ""),
                                      "image": stage_asset(img)})
                if items_out:
                    spec = {"type": "showcase", "items": items_out}
            elif vt == "custom" and scene.get("custom_anim"):
                ca = scene["custom_anim"]
                # si el guion trae CÓDIGO (animación escrita por Claude), se compila directo y se
                # RESPETA (Claude la escribió a propósito; NO cae a Gemini por un rechazo del QC —
                # Claude no está en tiempo de render para corregir). Solo cae a Gemini si el código
                # NO compila (error real), no por una observación estética del validador.
                if ca.get("code"):
                    on_step(f"escena {idx + 1}/{total}", "animación de Claude (código)")
                    try:
                        from .diagrams import custom_spec_from_code

                        spec = custom_spec_from_code(ca["code"], dur, gcfg)
                    except Exception as e:  # noqa: BLE001
                        print(f"  aviso: código custom de Claude no compiló ({e}); uso Gemini")
                        from .diagrams import build_custom_spec

                        spec = build_custom_spec(ca.get("description", ""), scene["narration"],
                                                 router, gcfg, dur)
                else:
                    # CACHÉ DE LA ANIMACIÓN: el dibujo depende de la DESCRIPCIÓN, no de las
                    # palabras que se dicen encima. Al re-narrar una clase (voz nueva, mismas
                    # escenas) volver a pedirle el código al modelo cuesta minutos por escena
                    # y devuelve OTRA animación: la que ya se aprobó se reusa y solo se
                    # re-anima a la duración nueva.
                    from .diagrams import build_custom_spec

                    desc = ca.get("description", "")
                    _cache = assets / f"custom_{idx}.json"
                    _cfirma = hashlib.sha1(desc.encode("utf-8")).hexdigest()
                    # se guarda el CÓDIGO, no el spec: el spec trae la función ya
                    # compilada y eso no es serializable
                    if _cache.exists() and not feedback:
                        try:
                            _c = json.loads(_cache.read_text(encoding="utf-8"))
                            if _c.get("firma") == _cfirma and _c.get("code"):
                                from .diagrams import custom_spec_from_code

                                spec = custom_spec_from_code(_c["code"], dur, gcfg)
                                on_step(f"escena {idx + 1}/{total}",
                                        "animación a medida ya escrita: la reuso")
                        except Exception as e:  # noqa: BLE001 — caché inservible: la rehago
                            print(f"  aviso: animación cacheada no sirve ({e}); la reescribo")
                            spec = None
                    if not spec:
                        on_step(f"escena {idx + 1}/{total}", "programando animación a medida")
                        if feedback:
                            desc += (f"\nEl intento anterior tuvo estos problemas visuales, "
                                     f"evítalos: {feedback}")
                        spec = build_custom_spec(desc, scene["narration"], router, gcfg, dur)
                        if spec.get("_code") and not feedback:
                            _cache.write_text(json.dumps(
                                {"firma": _cfirma, "code": spec["_code"]}, ensure_ascii=False),
                                encoding="utf-8")
            if spec:
                spec.setdefault("theme", theme)   # paleta de marca del video
                on_step(f"escena {idx + 1}/{total}", f"animando {spec.get('type', 'diagrama')}")
                # motor Remotion (diagramas estructurados + beats); PIL de fallback
                from .remotion_scenes import (BEAT_TYPES, REMOTION_DIAGRAMS,
                                              remotion_available, render_remotion_scene)

                stype = spec.get("type")
                if (gcfg.get("remotion") and stype in (REMOTION_DIAGRAMS | BEAT_TYPES)
                        and not spec.get("_pil") and remotion_available()):
                    try:
                        render_remotion_scene(spec, voz_path, dur, seg, gcfg)
                        return
                    except Exception as e:  # noqa: BLE001 — nunca tumba el video
                        print(f"  aviso: Remotion falló ({e}); degrado a PIL")
                        if stype in BEAT_TYPES:   # los beats no existen en PIL → big_text
                            texto = (spec.get("keyword") or spec.get("title")
                                     or spec.get("caption")
                                     or " ".join(w.get("text", "")
                                                 for w in spec.get("words", []))
                                     or "…")
                            spec = {"type": "big_text", "theme": theme,
                                    "items": [texto[:40]]}
                from .diagrams import render_diagram_scene

                render_diagram_scene(spec, voz_path, dur, seg, gcfg)
            else:
                # una escena de imagen puede traer VARIAS placas ("image_prompts"): con
                # locuciones largas una sola foto quieta rompe la regla de los 3 segundos.
                prompts = [p for p in (scene.get("image_prompts") or []) if p]
                if not prompts:
                    prompts = [scene.get("image_prompt")
                               or f"a cinematic scene about: {tema}"]
                prompts = prompts[:4]
                imgs, faltan = [], []
                for j, base_prompt in enumerate(prompts):
                    img_path = assets / (f"scene_{idx}.png" if len(prompts) == 1
                                         else f"scene_{idx}_{j}.png")
                    prompt_img = f"{base_prompt}. {style}"       # bloque de estilo anti-slop
                    if feedback:
                        prompt_img += f". Avoid these visual issues: {feedback}"
                    # se reusa lo ya generado salvo que el QC haya pedido rehacerla
                    if feedback or not img_path.exists():
                        faltan.append((prompt_img, img_path))
                    imgs.append(img_path)
                if faltan:
                    # EN PARALELO: cada placa es un `codex exec` que se pasa minutos
                    # esperando a la API. En serie, una escena de 3 placas costaba ~9
                    # minutos de reloj; concurrentes, lo que tarde la más lenta.
                    from concurrent.futures import ThreadPoolExecutor

                    on_step(f"escena {idx + 1}/{total}",
                            f"generando {len(faltan)} imagen(es) en paralelo")
                    with ThreadPoolExecutor(max_workers=len(faltan)) as ex:
                        list(ex.map(lambda t: _gen_image(t[0], t[1], router, anchor_bytes),
                                    faltan))
                on_step(f"escena {idx + 1}/{total}", "animando (Ken Burns)")
                _render_scene_plates(imgs, voz_path, dur, idx, seg, gcfg)

        build_seg()
        # host/ml_demo (material real) y mascota (marca fija) no pasan por el QC visual.
        # screen_demo tampoco: rechazarlo dispara build_seg() otra vez y eso es una SEGUNDA
        # grabación completa contra la cuenta real de ChatGPT. Su control de calidad es
        # `_verifica_captura` (congelada / en blanco / sin frames), que es determinista y gratis.
        # receipt SÍ pasa: un screenshot puede capturar un 404/captcha y el QC lo cacha
        # (lección: el "paper" de arxiv salió como página de error y se publicó).
        if validate and scene.get("visual_type") not in (
                "host", "ml_demo", "mascota", "screen_demo"):
            _vt = scene.get("visual_type", "")
            ok, problems = _validate_scene(seg, dur, scene["narration"], router, _vt)
            if not ok and problems:
                on_step(f"escena {idx + 1}/{total}", f"QC visual rechazó: {problems[:60]}")
                build_seg(problems)
                ok2, p2 = _validate_scene(seg, dur, scene["narration"], router, _vt)
                if not ok2:
                    print(f"  aviso: escena {idx + 1} sigue con observaciones: {p2}")
        _seg_f.write_text(_seg_firma)
        segments.append(seg)

    brand = cfg.get("branding", {})
    if brand.get("outro") and brand.get("handle"):
        on_step("outro", "cierre con el nombre del canal")
        from .diagrams import render_diagram_scene

        voz_path = assets / "outro.wav"
        dur = _wav_from_pcm(
            router.generate_tts(brand.get("outro_text", f"Sígueme. Soy {brand.get('canal', '')}."),
                                gcfg.get("tts_style", "")), voz_path
        ) + 0.4
        seg = assets / "seg_outro.mp4"
        render_diagram_scene(
            {"type": "outro", "handle": brand["handle"], "theme": theme,
             "sub": brand.get("outro_sub", "")}, voz_path, dur, seg, gcfg,
        )
        segments.append(seg)

    on_step("ensamblando", f"{len(segments)} escenas → {out_path.name}")
    _assemble(segments, out_path, gcfg)
    # con escenas host/beats, el audio pasó por varios re-encodes AAC → micro-huecos de
    # priming en las uniones. Se reconstruye la pista como PCM continuo y AHÍ MISMO se
    # mezclan los SFX de transición (whoosh) para que ningún re-encode los pierda.
    _av_continuo = {"host", "ml_demo", "kinetic", "terminal", "cutout", "mascota", "receipt"}
    if any(s.get("visual_type") in _av_continuo for s in scenes) or gcfg.get("sfx"):
        on_step("audio", "audio continuo + SFX de transición")
        from . import host_layout

        sfx = Path(__file__).parent / "assets" / "sfx" / "whoosh.mp3"
        host_layout.continuous_base_audio(
            out_path, segments,
            sfx_path=sfx if gcfg.get("sfx") else None,
            sfx_gain=float(gcfg.get("sfx_gain", 0.32)))
    # cama musical GENERADA para este video (Lyria) — render.py la usa con prioridad
    # sobre la cama global (convención: <stem>.assets/music.m4a)
    if gcfg.get("music_generated") and guion.get("music_prompt"):
        _cama = assets / "music.m4a"
        if _cama.exists():            # regeneración: la cama ya se pagó (mandato de José)
            on_step("música", "reutilizo la cama musical de este video")
        else:
            try:
                on_step("música", "generando cama del video (Lyria)")
                from .music_gen import build_music_bed

                build_music_bed(str(guion["music_prompt"]), _cama, router)
            except Exception as e:  # noqa: BLE001 — cae a la cama global de config
                print(f"  aviso: cama Lyria falló ({e}); se usará la cama global")
    print(f"✔ {out_path}")
    return out_path


def main() -> None:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    p = argparse.ArgumentParser(prog="autoedit-gen",
                                description="Genera un video 9:16 desde un tema (Rama A)")
    p.add_argument("tema", help="tema del video, p. ej. 'cómo usar NotebookLM para estudiar'")
    p.add_argument("--scenes", type=int, default=None, help="número de escenas")
    p.add_argument("--modo", choices=["corto", "largo"], default="corto",
                   help="corto = crecimiento (~35s); largo = monetización (~90s, +1 min)")
    p.add_argument("--dir", type=Path, default=Path.cwd(), help="carpeta de salida")
    p.add_argument("--config", type=Path, default=None)
    p.add_argument("--guion", type=Path, default=None,
                   help="JSON con un guion pre-escrito (Claude guionista); omite la generación de Gemini")
    args = p.parse_args()

    cfg = load_config(args.config)
    guion = json.loads(args.guion.read_text(encoding="utf-8")) if args.guion else None
    out = generate_video(args.tema, args.dir.resolve(), cfg, n_scenes=args.scenes,
                         modo=args.modo, guion=guion)
    print(f"\nAhora pásalo por el flujo normal para subtítulos y copys:\n"
          f"  autoedit {out.name} --auto   (o desde la web)")


if __name__ == "__main__":
    main()
