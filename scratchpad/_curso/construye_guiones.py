"""Escribe los guiones del curso de Python. Un diccionario por clase → un JSON por clase.

Todas las salidas de terminal que aparecen aquí se CAPTURARON corriendo el código de
verdad en esta máquina (regla de realidad); no hay ninguna inventada.
"""
import json
from pathlib import Path

DEST = Path(__file__).resolve().parent.parent / "guiones_curso"
DEST.mkdir(exist_ok=True)
MUSICA = ("hard techno bed, dark industrial groove, 150 BPM, rolling kick, restrained "
          "under a voice, instrumental, no vocals")


def term(title, lines, progress=None):
    d = {"title": title, "lines": lines}
    if progress:
        d["progress"] = {"label": progress}
    return d


def cmd(t):  return {"prompt": True, "text": t}
def out(t):  return {"text": t}
def hit(t):  return {"text": t, "accent": True}


def guarda(num, slug, title, keyword, headline, pregunta, escenas, tema):
    g = {"title": title, "slug": f"curso_py{num:02d}_{slug}", "tema": tema,
         "theme": "curso python con ia", "hook_tipo": "demostracion",
         "keyword": keyword, "hook_headline": headline, "pregunta_ab": pregunta,
         "music_prompt": MUSICA, "modo": "corto", "hook_locked": True,
         "scenes": escenas}
    p = DEST / f"py{num:02d}_{slug}.json"
    p.write_text(json.dumps(g, ensure_ascii=False, indent=2), encoding="utf-8")
    pal = sum(len(s["narration"].split()) for s in escenas)
    print(f"py{num:02d} {slug:28s} {len(escenas)} escenas  {pal:3d} palabras  ~{pal/150*60:.0f}s")


# ───────────────────────── MÓDULO 1 · Dirigir la máquina ─────────────────────────

guarda(2, "tres_ideas", "Las tres ideas que usan todos los lenguajes",
       "guardar, decidir y repetir", ["TRES", "IDEAS"],
       "¿Aprendes sintaxis o aprendes a pensar?",
       tema="las tres ideas base de cualquier lenguaje de programación explicadas en Python",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Los lenguajes de programación son como cincuenta. Y todos hacen las mismas tres cosas. En cuanto las ves, puedes leer código que jamás habías visto.",
   "terminal": term("las tres ideas", [
       out("nombre = \"José\"        # 1 · guardar"),
       out("if edad >= 18:          # 2 · decidir"),
       out("for i in range(3):      # 3 · repetir"),
       hit("con eso lees cualquier programa")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "La primera es guardar. Le pones un nombre a un dato y la computadora lo recuerda mientras el programa corre. La segunda es decidir: si pasa esto, haz aquello; si no, haz esta otra cosa. La tercera es repetir, para no copiar y pegar la misma línea cuarenta veces.",
   "image_prompts": [
       "editorial photograph of three labeled wooden boxes on a workbench, warm dim light, muted graphite and ochre palette, documentary style, no legible text",
       "editorial photograph of a fork in a path seen from above, two directions, muted colors, documentary style"]},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Míralo corriendo. Guardo el nombre y la edad. Decido si puede votar. Y repito tres veces. Ocho líneas, y ahí están las tres ideas completas.",
   "terminal": term("tres_ideas.py", [
       cmd("python3 tres_ideas.py"),
       out("José puede votar"),
       out("intento 1"),
       out("intento 2"),
       hit("intento 3")], progress="guardar · decidir · repetir")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y esto es lo que casi nadie te dice: cambia el lenguaje y cambian las palabras, no las ideas. En JavaScript el bucle se escribe distinto, pero sigue siendo repetir.",
   "mascota": {"pose": "profesor", "caption": "cambian las palabras, no las ideas"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Guardar, decidir, repetir. Si le pides algo a la IA y en el código no encuentras ninguna de las tres, seguro está haciendo otra cosa. En la que sigue, por qué programar importa más hoy que hace tres años.",
   "kinetic": {"words": [{"text": "guardar", "serif": True}, {"text": "decidir", "serif": True},
                          {"text": "REPETIR", "accent": True}], "variant": "dark"}},
       ])

guarda(3, "por_que_importa", "Por qué programar importa MÁS ahora que hay IA",
       "programar con inteligencia artificial", ["FALLA", "CALLADO"],
       "¿Copias lo que escribe la IA o lo revisas?",
       tema="por qué saber programar importa más ahora que la IA escribe el código",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.35,
   "narration": "Le pedí la misma función a dos inteligencias artificiales. Las dos me la dieron en dos segundos. Las dos calcularon bien el promedio. Y una de ellas revienta.",
   "terminal": term("la misma función, dos IAs", [
       out("promedio([8, 9, 10])"),
       hit("las dos contestan 9.0")])},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "El día que le pasas una lista vacía, la primera devuelve cero y la segunda se cae con división entre cero. Ninguna de las dos me avisó. Yo tuve que probarlo.",
   "terminal": term("la lista vacía", [
       cmd("python3 -c \"from promedio import promedio; print(promedio([]))\""),
       out("0"),
       cmd("python3 -c \"from promedio_codex import promedio; print(promedio([]))\""),
       hit("ZeroDivisionError: division by zero")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Eso es lo que cambió. Antes, no saber programar te frenaba en la primera línea. Hoy te frena tres semanas después, cuando el programa que no entiendes falla con un caso que nunca probaste.",
   "image_prompts": [
       "editorial photograph of a hairline crack in a concrete wall, close up, muted graphite palette, dramatic side light, documentary style",
       "editorial photograph of a person looking at a laptop screen at night, only the screen light on the face, muted colors, documentary style"]},
  {"beat_type": "tesis", "visual_type": "mascota",
   "narration": "Programar hoy no es teclear. Es saber qué pedir, entender lo que te devolvió y probarlo donde duele.",
   "mascota": {"pose": "profesor", "caption": "la IA teclea, tú respondes"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Por eso este curso no te va a hacer memorizar sintaxis. Te va a enseñar a leer. En la siguiente clase instalamos todo: Python, el editor y la terminal.",
   "kinetic": {"words": [{"text": "la IA no te avisa", "serif": True},
                          {"text": "CUANDO SE EQUIVOCA", "accent": True}], "variant": "dark"}},
       ])

guarda(4, "instala_python", "Instala Python, VS Code y abre tu terminal",
       "instalar Python", ["TRES", "COSAS"],
       "¿Instalas hoy o lo dejas para el domingo?",
       tema="instalar Python y VS Code y abrir la terminal por primera vez",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Necesitas tres cosas y las tres son gratis. Python, un editor, y una terminal que ya traes instalada aunque no la hayas abierto nunca.",
   "terminal": term("comprobar que ya jaló", [
       cmd("python3 --version"),
       hit("Python 3.12.3"),
       cmd("pip --version"),
       out("pip 24.0")])},
  {"beat_type": "proceso", "visual_type": "image",
   "narration": "Python lo bajas de python punto org, barra downloads. En Windows, la casilla que dice Add Python to PATH no es opcional: si no la marcas, la terminal no lo va a encontrar y vas a pensar que se instaló mal.",
   "image_prompts": [
       "editorial photograph of a laptop screen showing a software installer window, blurred, warm desk light, muted graphite palette, documentary style, no legible text",
       "editorial photograph of a hand clicking a checkbox on a laptop trackpad, close up, muted colors, documentary style"]},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "El editor es Visual Studio Code, también gratis. Y la terminal es esa ventana negra donde escribes órdenes: en Windows se llama PowerShell, en Mac se llama Terminal. Ahí escribes python tres, guion guion version, y si te contesta con un número, ya quedó.",
   "terminal": term("tu primer archivo", [
       cmd("mkdir curso-python"),
       cmd("cd curso-python"),
       cmd("echo 'print(\"listo\")' > prueba.py"),
       cmd("python3 prueba.py"),
       hit("listo")], progress="entorno listo")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Si te sale un error que dice command not found, no está roto: es que Windows no sabe dónde quedó Python. Se arregla reinstalando con la casilla marcada.",
   "mascota": {"pose": "error", "caption": "command not found = falta el PATH"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Con eso ya tienes taller. En la que sigue conectamos las dos herramientas que van a escribir contigo el resto del curso: Claude Code y Codex.",
   "kinetic": {"words": [{"text": "python", "serif": True}, {"text": "editor", "serif": True},
                          {"text": "TERMINAL", "accent": True}], "variant": "dark"}},
       ])

guarda(5, "claude_vs_codex", "Claude Code y Codex: qué hace cada uno",
       "Claude Code y Codex", ["DOS", "AGENTES"],
       "¿Agente en la terminal o asistente en el editor?",
       tema="diferencia real entre Claude Code y Codex CLI trabajando en el mismo encargo",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Les di el mismo encargo a los dos agentes, con las mismas palabras, en la misma carpeta. Y no hicieron lo mismo.",
   "terminal": term("el mismo encargo", [
       cmd("claude -p \"escribe promedio(notas) en promedio.py\""),
       cmd("codex exec \"escribe promedio(notas) en promedio_codex.py\""),
       hit("misma orden, dos resultados")])},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Claude Code escribió el archivo y le puso una guardia: si la lista viene vacía, devuelve cero. Codex escribió la versión corta, sin guardia, y encima me avisó que su cajón de arena era de solo lectura, así que ni siquiera guardó el archivo.",
   "terminal": term("lo que escribió cada uno", [
       out("claude:  if not notas: return 0"),
       out("         return sum(notas) / len(notas)"),
       out("codex:   return sum(notas) / len(notas)"),
       hit("codex: writing is blocked by read-only sandbox")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Los dos son agentes de terminal: leen tu proyecto, escriben archivos y corren comandos. La diferencia práctica está en los permisos y en cuánto se atreven a decidir por ti.",
   "image_prompts": [
       "editorial photograph of two different keys on a wooden table, side by side, muted graphite and ochre palette, documentary style",
       "editorial photograph of a terminal window glowing on a dark desk at night, out of focus, muted colors, documentary style"]},
  {"beat_type": "tesis", "visual_type": "mascota",
   "narration": "Mi regla después de usarlos todos los días: el que te pide permiso te hace perder tiempo, y el que no te lo pide te puede borrar algo. Los dos sirven; ninguno decide por ti.",
   "mascota": {"pose": "pensando", "caption": "permisos: el detalle que sí importa"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "En el curso vamos a usar Claude Code porque escribe y corre en el mismo lugar. Y a partir de aquí empieza lo bueno: el vocabulario mínimo para leer lo que te escriba.",
   "kinetic": {"words": [{"text": "el agente teclea", "serif": True},
                          {"text": "TÚ FIRMAS", "accent": True}], "variant": "dark"}},
       ])


# ───────────────────────── MÓDULO 2 · El vocabulario mínimo ─────────────────────────

guarda(6, "variables", "Variables: cajas con nombre",
       "variables en Python", ["UNA", "CAJA"],
       "¿Nombres cortos o nombres claros?",
       tema="qué es una variable en Python y cómo se usa de verdad",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Una variable es una caja con nombre. Metes un dato, y la computadora lo recuerda mientras el programa corre. Eso es todo lo que hay que entender hoy.",
   "terminal": term("marcador.py", [
       out("puntos = 0"),
       out("puntos = puntos + 10"),
       out("puntos += 5"),
       hit("puntos → 15")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "El signo igual no significa igualdad, como en la escuela. Significa guarda esto aquí. Por eso puedes escribir puntos igual a puntos más diez, que en matemáticas no tendría sentido, y en programación quiere decir: toma lo que había, súmale diez y vuelve a guardarlo.",
   "image_prompts": [
       "editorial photograph of a labeled metal box on a workbench with a handwritten paper tag, warm dim light, muted graphite and ochre palette, documentary style",
       "editorial photograph of an arrow drawn with chalk pointing into a box, close up, muted colors, documentary style"]},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Míralo corriendo. Empiezo con cero puntos. Le sumo diez. Le sumo cinco más con la forma corta. Y en cada paso, la caja se queda con el último valor que le metí.",
   "terminal": term("python3 marcador.py", [
       cmd("python3 marcador.py"),
       out("empiezas con 0"),
       out("ahora llevas 10"),
       hit("y ahora 15")], progress="una caja, tres momentos")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "El error del principiante no es la sintaxis: es ponerle a la caja un nombre que no dice nada. Si le pones equis, en dos semanas ni tú vas a saber qué guardaste ahí. Y la IA tampoco.",
   "mascota": {"pose": "profesor", "caption": "puntos_del_jugador, no x"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Un nombre, un dato, y el último valor manda. En la siguiente clase, por qué dos más dos a veces da veintidós.",
   "kinetic": {"words": [{"text": "una caja", "serif": True}, {"text": "UN NOMBRE", "accent": True}],
               "variant": "dark"}},
       ])

guarda(7, "tipos_de_datos", "Tipos de datos: por qué dos más dos da veintidós",
       "tipos de datos", ["2 + 2", "= 22"],
       "¿Número o texto?",
       tema="tipos de datos en Python y el error de sumar texto",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.35,
   "narration": "Dos más dos da cuatro. Pero comillas dos, más comillas dos, da veintidós. No es un error de Python: es que le diste dos cosas distintas.",
   "terminal": term("el clásico", [
       cmd("python3 -c 'print(2 + 2)'"),
       out("4"),
       cmd("python3 -c 'print(\"2\" + \"2\")'"),
       hit("22")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Cuando pones comillas, ya no es un número: es texto. Y sumar dos textos no los suma, los pega. Los tipos básicos son tres: números, texto, y verdadero o falso. Con esos tres se construye casi todo lo que vas a escribir este año.",
   "image_prompts": [
       "editorial photograph of wooden letter blocks next to metal number stamps on a table, muted graphite and ochre palette, documentary style",
       "editorial photograph of two paper strips glued end to end, close up macro, muted colors, documentary style"]},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Python te dice el tipo si se lo preguntas. Int es número entero, str es texto, bool es verdadero o falso. Y si tienes un número disfrazado de texto, lo conviertes con int y ya suma bien.",
   "terminal": term("preguntarle el tipo", [
       cmd("python3 tipos.py"),
       out("<class 'int'> <class 'str'> <class 'bool'>"),
       cmd("python3 -c 'print(int(\"2\") + 2)'"),
       hit("4")], progress="int · str · bool")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y aquí está el que te va a morder de verdad: todo lo que el usuario escribe con input entra como texto. Aunque teclee un número. Si no lo conviertes, tu suma va a pegar en vez de sumar.",
   "mascota": {"pose": "error", "caption": "input siempre devuelve texto"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Número, texto, verdadero o falso. Tres tipos y el noventa por ciento de tus errores del primer mes se explican con esto. En la siguiente, tu programa empieza a hablar contigo.",
   "kinetic": {"words": [{"text": "con comillas", "serif": True}, {"text": "YA ES TEXTO", "accent": True}],
               "variant": "dark"}},
       ])

guarda(8, "print_input", "print e input: tu programa habla y escucha",
       "print e input", ["HABLA", "Y ESCUCHA"],
       "¿Programa que informa o programa que pregunta?",
       tema="entrada y salida en Python con print e input",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Hasta ahora tu programa hablaba solo. Con una línea más, empieza a preguntarte cosas y a usar lo que le contestas.",
   "terminal": term("saludo.py", [
       out("nombre = input(\"¿Cómo te llamas? \")"),
       out("print(\"Mucho gusto,\", nombre)"),
       hit("dos líneas, una conversación")])},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Míralo corriendo de verdad. El programa se detiene, espera a que escribas, y sigue con lo que tecleaste guardado en una caja. Aquí escribí José, y me contestó con mi nombre y hasta contó las letras.",
   "terminal": term("python3 saludo.py", [
       cmd("python3 saludo.py"),
       out("¿Cómo te llamas? Jose"),
       out("Mucho gusto, Jose"),
       hit("Tu nombre tiene 4 letras")], progress="entrada · salida")},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Print es la ventana por donde tu programa te enseña lo que está pasando. Input es la puerta por donde entra lo que tú le dices. Todo programa, hasta el más grande, es alguna versión de esas dos cosas.",
   "image_prompts": [
       "editorial photograph of an old intercom speaker on a wall, close up, muted graphite palette, documentary style",
       "editorial photograph of a mail slot in a wooden door, close up, warm dim light, documentary style"]},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y print no es solo para el usuario: es tu linterna. Cuando algo no funciona y no sabes por qué, pones un print antes y otro después, y ves qué valor traía la caja en ese momento. Los profesionales lo seguimos haciendo.",
   "mascota": {"pose": "profesor", "caption": "print también es tu linterna"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ya tienes un programa que escucha. En la siguiente clase le enseñamos a decidir, y ahí empieza a parecerse a algo vivo.",
   "kinetic": {"words": [{"text": "print habla", "serif": True}, {"text": "INPUT ESCUCHA", "accent": True}],
               "variant": "dark"}},
       ])

guarda(9, "if_else", "if y else: cómo decide tu código",
       "condicionales if else", ["SI", "PASA ESTO"],
       "¿Muchos ifes o una tabla?",
       tema="condicionales en Python y cómo decide un programa",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Un programa que no decide nada es una calculadora. Con dos palabras, if y else, empieza a comportarse distinto según lo que pase.",
   "terminal": term("clima.py", [
       out("if temperatura > 30:"),
       out("    print(\"Hace calor\")"),
       out("else:"),
       hit("    print(\"Hace frío\")")])},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Con treinta y un grados me dice que hace calor. Y no es que Python sepa de clima: comparó treinta y uno contra treinta, le salió verdadero, y ejecutó la línea de adentro. Nada más.",
   "terminal": term("python3 clima.py", [
       cmd("python3 clima.py"),
       out("# temperatura = 31"),
       hit("Hace calor")], progress="comparar y ejecutar")},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "La comparación siempre da verdadero o falso. Mayor que, menor que, y para preguntar si dos cosas son iguales se usan dos signos de igual, no uno, porque uno solo significa guardar. Ese es el error clásico de la primera semana.",
   "image_prompts": [
       "editorial photograph of a railroad switch changing tracks, close up, muted graphite palette, documentary style",
       "editorial photograph of two identical stones balanced on a scale, muted colors, documentary style"]},
  {"beat_type": "giro", "visual_type": "terminal",
   "narration": "Y cuando hay más de dos caminos entra elif, que es como decir: y si no, prueba con esto otro. Python los revisa en orden, de arriba abajo, y en cuanto uno le sale verdadero se detiene. Por eso el orden de los ifes cambia el resultado.",
   "terminal": term("tres caminos", [
       out("if temperatura > 30:      # calor"),
       out("elif temperatura > 18:    # templado"),
       out("else:                     # frío"),
       hit("se detiene en el PRIMERO que da verdadero")])},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Comparar, decidir, seguir. En la siguiente clase, cómo repetir algo cien veces sin escribirlo cien veces.",
   "kinetic": {"words": [{"text": "compara", "serif": True}, {"text": "Y DECIDE", "accent": True}],
               "variant": "dark"}},
       ])

guarda(10, "bucles", "Bucles for y while: repetir sin copiar y pegar",
       "bucles for y while", ["REPETIR", "SIN COPIAR"],
       "¿for o while?",
       tema="bucles for y while en Python",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Si te encuentras copiando y pegando la misma línea, estás escribiendo un bucle a mano. Y Python ya trae dos formas de hacerlo bien.",
   "terminal": term("frutas.py", [
       out("for fruta in [\"mango\", \"sandía\", \"papaya\"]:"),
       out("    print(\"me gusta la\", fruta)"),
       hit("tres vueltas, dos líneas")])},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "El for recorre una lista: da una vuelta por cada elemento, y en cada vuelta la caja fruta vale otra cosa. Mira la salida: tres vueltas, tres frases, y yo escribí una sola.",
   "terminal": term("python3 frutas.py", [
       cmd("python3 frutas.py"),
       out("me gusta la mango"),
       out("me gusta la sandía"),
       hit("me gusta la papaya")], progress="una vuelta por elemento")},
  {"beat_type": "contexto", "visual_type": "terminal",
   "narration": "El while es el otro: no repite por cada elemento, repite mientras se cumpla una condición. Le quedan tres intentos, dos, uno, y en cuanto llega a cero se detiene. Sirve cuando no sabes cuántas vueltas van a ser.",
   "terminal": term("intentos.py", [
       cmd("python3 intentos.py"),
       out("te quedan 3"),
       out("te quedan 2"),
       hit("te quedan 1")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y aquí va la advertencia: si dentro del while nunca cambias lo que estás midiendo, el programa se queda dando vueltas para siempre. Se corta con control c, y a todos nos ha pasado.",
   "mascota": {"pose": "error", "caption": "bucle infinito: control + C"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "For cuando sabes cuántas, while cuando no. En la siguiente clase le ponemos nombre a un pedazo de trabajo, y ahí tu código empieza a ordenarse solo.",
   "kinetic": {"words": [{"text": "for: cuántas", "serif": True}, {"text": "WHILE: MIENTRAS", "accent": True}],
               "variant": "dark"}},
       ])

guarda(11, "funciones", "Funciones: ponerle nombre a un pedazo de trabajo",
       "funciones en Python", ["UN NOMBRE", "UN TRABAJO"],
       "¿Todo en una línea o partido en funciones?",
       tema="funciones en Python y por qué la IA escribe mejor código cuando se las pides",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Una función es un pedazo de trabajo con nombre. Lo escribes una vez, y lo usas todas las veces que quieras sin volver a pensarlo.",
   "terminal": term("promedio.py", [
       out("def promedio(notas):"),
       out("    return sum(notas) / len(notas)"),
       cmd("promedio([8, 9, 10])"),
       hit("9.0")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Tiene tres partes y ya. El nombre, lo que entra entre paréntesis, y lo que devuelve con return. Si no pones return, la función hace su trabajo pero no te entrega nada, y ese es otro clásico de las primeras semanas.",
   "image_prompts": [
       "editorial photograph of a vintage coin-operated machine slot, close up, muted graphite and ochre palette, documentary style",
       "editorial photograph of a hand receiving a small paper ticket from a machine, close up, muted colors, documentary style"]},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Míralo con dos llamadas seguidas. Con ocho, nueve y diez me devuelve nueve punto cero. Con seis y siete me devuelve seis punto cinco. Mismo trabajo, distintos datos, y yo no reescribí nada.",
   "terminal": term("python3 promedio.py", [
       cmd("python3 promedio.py"),
       out("9.0"),
       hit("6.5")], progress="mismo trabajo, otros datos")},
  {"beat_type": "giro", "visual_type": "terminal",
   "narration": "Y esto es lo que cambia cuando trabajas con un agente: si le pides funciones con nombre, te devuelve código que puedes leer y probar por pedazos. Si le pides todo de corrido, te devuelve un bloque que solo se puede probar entero. Yo se lo pido siempre así.",
   "terminal": term("cómo se lo pido a claude", [
       cmd("claude -p \"hazlo en una función promedio(notas) con return\""),
       out("def promedio(notas):"),
       out("    if not notas:"),
       hit("        return 0")])},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Nombre, entrada, return. Con esto se acaba el vocabulario mínimo: ya puedes leer cualquier programa sencillo. En el siguiente módulo lo usamos todo junto para hacer tu primer juego.",
   "kinetic": {"words": [{"text": "un nombre", "serif": True}, {"text": "UN TRABAJO", "accent": True}],
               "variant": "dark"}},
       ])


# ───────────────────────── MÓDULO 3 · Tu primer juego ─────────────────────────

guarda(12, "adivina_el_numero", "Adivina el número: tu primer juego completo",
       "hacer un juego en Python", ["4", "INTENTOS"],
       "¿Lo escribes tú o se lo pides?",
       tema="hacer el juego de adivinar el número pidiéndoselo a Claude Code y revisándolo",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Este juego lo escribió Claude Code en una sola orden, y yo lo gané en cuatro intentos. Vamos a leer línea por línea qué fue lo que escribió, porque ahí está todo lo del módulo anterior junto.",
   "terminal": term("juego.py", [
       cmd("python3 juego.py"),
       out("Tu intento: 10 → Mayor."),
       out("Tu intento: 15 → Menor."),
       hit("11 → Correcto! Era 11. En 4 intentos.")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "La orden fue una línea en español. Fíjate en lo que pedí: qué tiene que hacer y con qué reglas. No le dije cómo programarlo, le dije qué quería que pasara. Ese es el músculo que hay que entrenar.",
   "terminal": term("la orden completa", [
       cmd("claude -p \"crea juego.py: adivinar un numero del 1 al 20\""),
       out("# Creé juego.py: elige un número al azar,"),
       out("# lee tu intento y te dice Mayor o Menor"),
       hit("# hasta que le atinas.")], progress="pedir · leer · probar")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y ahora léelo conmigo. Guarda un número al azar en una caja. Repite con un while, porque no sabe cuántos intentos vas a necesitar. Decide con if si tu número es menor o mayor. Y cuenta los intentos con una variable que va sumando. Guardar, decidir, repetir: las tres ideas de la clase dos.",
   "terminal": term("las tres ideas, otra vez", [
       out("secreto = random.randint(1, 20)   # guardar"),
       out("while True:                       # repetir"),
       out("    if numero < secreto: ...      # decidir"),
       hit("    intentos += 1                 # contar")])},
  {"beat_type": "giro", "visual_type": "terminal",
   "narration": "Y mira este detalle que yo no pedí: si escribes una palabra en vez de un número, no se cae, te dice que escribas un entero. La IA le puso esa guardia sola. A veces acierta y a veces no, y por eso hay que leerlo.",
   "terminal": term("lo que no pedí", [
       out("if not entrada.isdigit():"),
       out("    print(\"Escribe un numero entero.\")"),
       hit("una guardia que yo nunca pedí")])},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ya tienes tu primer juego, y entiendes cada línea. En la siguiente clase le agregamos memoria: listas y diccionarios para guardar el marcador.",
   "kinetic": {"words": [{"text": "pedir", "serif": True}, {"text": "leer", "serif": True},
                          {"text": "PROBAR", "accent": True}], "variant": "dark"}},
       ])

guarda(13, "listas_diccionarios", "Listas y diccionarios: guardar muchas cosas",
       "listas y diccionarios", ["FILA", "O FICHA"],
       "¿Lista o diccionario?",
       tema="listas y diccionarios en Python con el marcador del juego",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Una caja guarda un dato. ¿Y si quieres guardar los tres jugadores de tu partida? Para eso hay dos estructuras, y elegir mal te complica el programa entero.",
   "terminal": term("marcador.py", [
       out("marcador = [\"José\", \"Ana\", \"Luis\"]"),
       cmd("print(marcador[0], \"va primero\")"),
       hit("José va primero")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "La lista es una fila: importa el orden y se llega a cada cosa por su número de posición, que empieza en cero, no en uno. El diccionario es una ficha: no importa el orden, cada dato tiene una etiqueta y lo pides por su nombre.",
   "image_prompts": [
       "editorial photograph of people queuing in a line seen from above, muted graphite palette, documentary style",
       "editorial photograph of an old library index card in a wooden drawer, close up, warm dim light, documentary style"]},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Mira la ficha corriendo. El jugador tiene nombre, puntos y nivel. Le pido los puntos por su etiqueta, le sumo cinco, y la ficha se queda con el valor nuevo. Doce más cinco, diecisiete.",
   "terminal": term("python3 ficha.py", [
       cmd("python3 ficha.py"),
       out("Ana lleva 12 puntos"),
       hit("ahora lleva 17")], progress="fila · ficha")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Mi regla después de años haciendo esto: si vas a recorrerlo todo, usa lista. Si vas a buscar uno en concreto por su nombre, usa diccionario. Cuando lo eliges bien, el código se escribe casi solo.",
   "mascota": {"pose": "profesor", "caption": "recorrer → lista · buscar → diccionario"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Fila o ficha. Con esas dos ya puedes guardar el marcador de un juego entero. En la siguiente clase hacemos piedra, papel o tijera con reglas de verdad.",
   "kinetic": {"words": [{"text": "lista: una fila", "serif": True},
                          {"text": "DICCIONARIO: UNA FICHA", "accent": True}], "variant": "dark"}},
       ])

guarda(14, "piedra_papel_tijera", "Piedra, papel o tijera con reglas de verdad",
       "juego de piedra papel o tijera", ["REGLAS", "DE VERDAD"],
       "¿Ifes encadenados o una tabla de reglas?",
       tema="programar piedra papel o tijera con marcador y empates",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Piedra, papel o tijera parece un juego de niños hasta que lo programas. Tiene tres jugadas, nueve combinaciones y empates. Y es el ejercicio perfecto para ver cómo se ordenan las reglas.",
   "terminal": term("ppt.py", [
       out("jugadas = [\"piedra\", \"papel\", \"tijera\"]"),
       out("maquina = random.choice(jugadas)"),
       hit("nueve combinaciones posibles")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "La forma torpe es encadenar ifes: si yo saqué piedra y la máquina tijera, gano; si saqué piedra y la máquina papel, pierdo. Son nueve ramas y es facilísimo equivocarse en una sin que nadie se dé cuenta.",
   "terminal": term("la forma torpe", [
       out("if yo == \"piedra\" and maquina == \"tijera\": ..."),
       out("elif yo == \"piedra\" and maquina == \"papel\": ..."),
       hit("...y así nueve veces")])},
  {"beat_type": "giro", "visual_type": "terminal",
   "narration": "La forma buena es un diccionario de reglas: cada jugada apunta a la que le gana. Piedra le gana a tijera, tijera le gana a papel, papel le gana a piedra. Tres líneas en vez de nueve, y si te equivocas se ve a simple vista.",
   "terminal": term("la forma buena", [
       out("gana_a = {\"piedra\": \"tijera\","),
       out("          \"tijera\": \"papel\","),
       out("          \"papel\": \"piedra\"}"),
       hit("if gana_a[yo] == maquina: ganaste")], progress="9 ramas → 3 líneas")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y el marcador es una variable que sube cuando ganas, otra cuando pierdes, y el empate no suma nada. Al final imprimes las dos. Eso es todo el juego.",
   "terminal": term("python3 ppt.py", [
       cmd("python3 ppt.py"),
       out("tú: piedra   máquina: tijera → ganas"),
       out("tú: papel    máquina: tijera → pierdes"),
       hit("marcador  1 - 1")])},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Cuando le pidas un juego a la IA, pídele que las reglas vivan en un diccionario, no en una escalera de ifes. Se lo pides así y te devuelve código que puedes leer. En la que sigue: tu primer juego con ventana.",
   "kinetic": {"words": [{"text": "las reglas", "serif": True}, {"text": "EN UNA TABLA", "accent": True}],
               "variant": "dark"}},
       ])

guarda(15, "pygame", "Un juego con ventana: pygame en tres minutos",
       "pygame", ["UNA", "VENTANA"],
       "¿Terminal o ventana?",
       tema="primer juego con ventana usando pygame",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Hasta ahora tus juegos vivían en la terminal. Con una librería que se instala en un renglón, empiezan a tener ventana, colores y teclado.",
   "terminal": term("instalar pygame", [
       cmd("pip install pygame"),
       out("Installed 1 package"),
       hit("+ pygame==2.6.1")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Una librería es código que otra gente ya escribió y tú usas. Pygame te da tres cosas: una ventana, formas para dibujar y una manera de saber qué tecla apretaron. Lo demás lo pones tú.",
   "image_prompts": [
       "editorial photograph of an old arcade cabinet screen glowing in a dark room, muted colors, documentary style",
       "editorial photograph of a mechanical keyboard close up with two keys lit, muted graphite palette, documentary style"]},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Todo juego con ventana tiene la misma forma: un bucle que no para. En cada vuelta mira si apretaste algo, mueve lo que se tenga que mover, borra la pantalla y vuelve a dibujar. Sesenta veces por segundo. Eso es lo que ves como movimiento.",
   "terminal": term("el bucle del juego", [
       out("while True:"),
       out("    revisar_teclas()"),
       out("    mover()"),
       hit("    dibujar()      # 60 veces por segundo")], progress="revisar · mover · dibujar")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Este cuadro no es una imagen que yo haya buscado: lo dibujó pygame corriendo aquí mismo, con dos paletas, una pelota y el marcador. Veinte líneas de Python.",
   "terminal": term("pong.py", [
       cmd("python3 pong.py"),
       out("pygame 2.6.1"),
       hit("frame real guardado: pong.png")])},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ventana, bucle y dibujo. Con eso ya puedes hacer un pong. En el siguiente módulo cambiamos de terreno: una app de escritorio de verdad, con botones y datos que se guardan.",
   "kinetic": {"words": [{"text": "revisar", "serif": True}, {"text": "mover", "serif": True},
                          {"text": "DIBUJAR", "accent": True}], "variant": "dark"}},
       ])


# ───────────────────── MÓDULO 4 · Una app de escritorio ─────────────────────

guarda(16, "app_escritorio", "Qué es una app de escritorio (y por qué tkinter)",
       "app de escritorio en Python", ["CON", "VENTANA"],
       "¿Terminal o ventana?",
       tema="qué es una app de escritorio y por qué tkinter viene con Python",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Tu programa funciona, pero nadie de tu familia lo va a usar si tiene que abrir una terminal y escribir órdenes. Con la misma cantidad de código, puede tener ventana.",
   "terminal": term("lo que ya viene incluido", [
       cmd("python3 -c \"import tkinter; print('tkinter ok')\""),
       hit("tkinter ok"),
       out("# no se instala nada: viene con Python")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Una app de escritorio es un programa con ventana propia que corre en tu computadora, sin navegador y sin internet. Tkinter es la librería que ya viene con Python para hacerlas. No es la más bonita del mundo, pero no se instala nada y funciona en Windows, Mac y Linux igual.",
   "image_prompts": [
       "editorial photograph of an old desktop computer monitor showing a simple grey window interface, muted graphite palette, documentary style, no legible text",
       "editorial photograph of a small wooden tool box open on a workbench, muted colors, warm dim light, documentary style"]},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Cambia la forma de pensar. En la terminal, tú mandas: el programa va de arriba abajo y termina. En una ventana, manda el usuario: el programa se queda esperando, y solo reacciona cuando alguien aprieta un botón. Se llama programación por eventos.",
   "terminal": term("dos formas de correr", [
       out("terminal:  paso 1 → paso 2 → fin"),
       out("ventana:   esperar → ¿clic? → reaccionar"),
       hit("            ...y volver a esperar")], progress="de guion a evento")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y esto explica el error más famoso de las apps con ventana: si metes un trabajo largo dentro del botón, la ventana se congela y Windows te dice que no responde. No está rota: está haciendo lo que le pediste.",
   "mascota": {"pose": "error", "caption": "se congela porque está trabajando"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ventana propia, sin instalar nada, y el usuario al mando. En la siguiente clase la construimos: una ventana con caja de texto y un botón que responde.",
   "kinetic": {"words": [{"text": "manda", "serif": True}, {"text": "EL USUARIO", "accent": True}],
               "variant": "dark"}},
       ])

guarda(17, "primera_ventana", "Tu primera ventana con botones",
       "tkinter ventana y botones", ["UN", "BOTÓN"],
       "¿Lo diseñas tú o se lo dictas a la IA?",
       tema="construir la primera ventana con tkinter, entrada y botón",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Ocho líneas y ya tienes una ventana con una caja de texto, un botón y una respuesta. Esto corriendo en tu computadora, no en una página web.",
   "terminal": term("ventana.py", [
       out("import tkinter as tk"),
       out("r = tk.Tk(); r.title(\"Mi primera app\")"),
       out("tk.Button(r, text=\"Saludar\", command=saludar).pack()"),
       hit("r.mainloop()")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Son cuatro piezas. La ventana, que es la raíz. Los widgets, que son las cosas de adentro: etiquetas, cajas de texto, botones. El pack, que los acomoda. Y el mainloop, que es el bucle que mantiene todo vivo esperando.",
   "terminal": term("las cuatro piezas", [
       out("Tk()        → la ventana"),
       out("Label/Entry/Button → lo de adentro"),
       out(".pack()     → dónde va cada cosa"),
       hit("mainloop()  → se queda esperando")], progress="ventana · widgets · layout · bucle")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "El botón no ejecuta código: llama a una función tuya. Por eso en command va el nombre de la función sin paréntesis. Si le pones paréntesis, se ejecuta una vez al arrancar y nunca más, y ese error se lo he visto hasta a gente con años programando.",
   "terminal": term("el error de los paréntesis", [
       out("command=saludar     # correcto"),
       out("command=saludar()   # se ejecuta al arrancar"),
       hit("sin paréntesis: le pasas la función, no el resultado")])},
  {"beat_type": "giro", "visual_type": "terminal",
   "narration": "Y así se lo pido yo al agente, en una sola orden con las cuatro cosas que quiero: qué widgets, qué hace el botón, qué tamaño y en qué archivo. Entre más concreta la orden, menos vueltas.",
   "terminal": term("la orden que sí funciona", [
       cmd("claude -p \"ventana.py con tkinter: una entrada, un boton"),
       cmd("   Saludar y una etiqueta que muestre Hola nombre\""),
       hit("# escribió el archivo y lo dejó corriendo")])},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ventana, widgets, botón y bucle. Ya tienes app. En la siguiente clase, que se acuerde de lo que escribiste después de cerrarla.",
   "kinetic": {"words": [{"text": "el botón", "serif": True}, {"text": "LLAMA A TU FUNCIÓN", "accent": True}],
               "variant": "dark"}},
       ])

guarda(18, "guardar_datos", "Guardar datos: archivos y JSON",
       "guardar datos en un archivo JSON", ["QUE SE", "ACUERDE"],
       "¿Texto plano o JSON?",
       tema="guardar y leer datos en archivos y JSON desde Python",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Tu app funciona hasta que la cierras. Todo lo que escribiste vivía en la memoria, y la memoria se borra. Para que se acuerde, hay que escribirlo en un archivo.",
   "terminal": term("guardar y leer", [
       out("json.dump(datos, open(\"datos.json\", \"w\"))"),
       out("datos = json.load(open(\"datos.json\"))"),
       hit("dos líneas: guardar y recuperar")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Podrías guardarlo como texto suelto, pero entonces te toca a ti separar los campos y volver a armarlos al leer. JSON hace eso solo: guarda listas y diccionarios tal cual, y te los devuelve iguales.",
   "image_prompts": [
       "editorial photograph of a filing cabinet drawer with labeled folders, muted graphite palette, documentary style",
       "editorial photograph of a notebook page with a structured handwritten table, warm dim light, documentary style, no legible text"]},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Mira el ciclo completo. Guardo un diccionario con el marcador. Cierro el programa. Lo vuelvo a abrir, leo el archivo, y ahí están los mismos datos con el mismo tipo: los números siguen siendo números.",
   "terminal": term("python3 memoria.py", [
       cmd("python3 memoria.py"),
       out("guardado: {'jugador': 'Ana', 'puntos': 17}"),
       cmd("python3 memoria.py --leer"),
       hit("leído: Ana lleva 17 puntos")], progress="escribir · cerrar · leer")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Dos trampas. La primera: si el archivo no existe todavía, tu programa se cae la primera vez que alguien lo abre. La segunda: si guardas mientras el usuario escribe, puedes dejarlo a medias. Se resuelven con un if y guardando al cerrar.",
   "mascota": {"pose": "pensando", "caption": "la primera vez el archivo no existe"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ya tienes una app que recuerda. En la siguiente clase la conviertes en un archivo que le puedes pasar a alguien que ni siquiera tiene Python.",
   "kinetic": {"words": [{"text": "la memoria se borra", "serif": True},
                          {"text": "EL ARCHIVO NO", "accent": True}], "variant": "dark"}},
       ])

guarda(19, "hacer_exe", "Convierte tu app en un .exe para regalarla",
       "crear un ejecutable con PyInstaller", ["UN", "ARCHIVO"],
       "¿Se lo mandas o lo instalas tú?",
       tema="empaquetar una app de Python en un ejecutable con PyInstaller",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Tu tía no va a instalar Python. Con una orden, tu app se convierte en un solo archivo que ella abre con doble clic.",
   "terminal": term("empaquetar", [
       cmd("pip install pyinstaller"),
       cmd("pyinstaller --onefile --windowed ventana.py"),
       hit("dist/ventana.exe")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Lo que hace es meter tu código, el intérprete de Python y las librerías que usaste dentro del mismo archivo. Por eso pesa varios megas aunque tu programa sean veinte líneas: adentro va Python entero.",
   "terminal": term("qué lleva dentro", [
       out("tu código          ~20 líneas"),
       out("+ intérprete de Python"),
       out("+ librerías que importaste"),
       hit("= un solo .exe de varios megas")], progress="uno solo, pesado")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Dos banderas importan. Onefile, para que sea un solo archivo y no una carpeta con cincuenta cosas. Y windowed, para que al abrirlo no salga la ventana negra de la terminal atrás de tu app.",
   "terminal": term("las dos banderas", [
       out("--onefile    → un solo archivo"),
       out("--windowed   → sin terminal negra atrás"),
       hit("sin windowed se ve amateur")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y una advertencia honesta: el ejecutable solo sirve en el sistema donde lo creaste. Si lo compilas en Windows, corre en Windows. Para Mac tienes que compilarlo en una Mac. No hay atajo.",
   "mascota": {"pose": "profesor", "caption": "compilas en Windows → corre en Windows"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ya puedes regalar tu programa. En el siguiente módulo, dónde vive en realidad tu código y dónde deberían vivir sus datos.",
   "kinetic": {"words": [{"text": "un archivo", "serif": True}, {"text": "DOBLE CLIC", "accent": True}],
               "variant": "dark"}},
       ])


# ────────────────── MÓDULO 5 · El terreno donde vive tu código ──────────────────

guarda(20, "compu_vs_servidor", "Tu compu contra un servidor: dónde corre tu programa",
       "dónde corre tu programa", ["¿DÓNDE", "CORRE?"],
       "¿Tu máquina o la de alguien más?",
       tema="diferencia entre correr un programa en tu computadora y en un servidor",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Cierras la laptop y tu programa deja de existir. No es un error: es que estaba corriendo en tu máquina, y tu máquina se durmió.",
   "terminal": term("un servidor casero", [
       cmd("python3 -m http.server 8000"),
       out("Serving HTTP on 0.0.0.0 port 8000"),
       hit("mientras esta terminal viva, existe")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "Un servidor no es una cosa mágica: es una computadora que alguien dejó prendida todo el tiempo, con una dirección para que otros la encuentren. Nada más. La misma orden que acabas de ver, corriendo en una máquina que nunca se apaga, ya es un servidor.",
   "image_prompts": [
       "editorial photograph of a small server rack with blinking lights in a dim room, muted graphite and steel blue palette, documentary style",
       "editorial photograph of a closed laptop on a desk at night, one small light on, muted colors, documentary style"]},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Y por eso hay dos mundos. Lo que corre en tu máquina lo tienes ahí, va rápido y nadie más lo ve. Lo que corre en un servidor lo puede usar cualquiera, pero le tienes que pagar a alguien para que no se apague.",
   "terminal": term("los dos mundos", [
       out("tu compu:   rápido · privado · se apaga"),
       out("servidor:   siempre encendido · lo ve cualquiera"),
       hit("y cuesta dinero al mes")], progress="local vs remoto")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Mi consejo después de ver a mucha gente atorarse aquí: no subas nada a un servidor hasta que el programa te sirva a ti en tu máquina. Casi todo lo que vas a escribir el primer año no necesita servidor.",
   "mascota": {"pose": "profesor", "caption": "primero que te sirva a ti"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Tu máquina para aprender, un servidor cuando alguien más lo necesite. En la siguiente clase, dónde deben vivir los datos cuando el archivo se te queda chico.",
   "kinetic": {"words": [{"text": "tu compu se apaga", "serif": True},
                          {"text": "EL SERVIDOR NO", "accent": True}], "variant": "dark"}},
       ])

guarda(21, "sqlite", "Dónde viven los datos: del archivo a una base de datos",
       "base de datos SQLite en Python", ["ARCHIVO", "→ BASE"],
       "¿JSON o base de datos?",
       tema="pasar de guardar en JSON a usar SQLite, que ya viene con Python",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Guardar en un archivo funciona hasta que tienes diez mil partidas y quieres las tres mejores. Ahí tienes que leerlo todo para encontrar tres cosas. Una base de datos hace justo eso, pero bien.",
   "terminal": term("sqlite viene incluido", [
       cmd("python3 -c \"import sqlite3; print('listo')\""),
       hit("listo"),
       out("# tampoco se instala nada")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Son tres pasos. Te conectas a un archivo de base de datos, que se crea solo. Creas una tabla diciendo qué columnas va a tener. Y metes filas. A partir de ahí, en vez de leer el archivo entero, le haces preguntas.",
   "terminal": term("crear y llenar", [
       cmd("con = sqlite3.connect('juego.db')"),
       cmd("con.execute('CREATE TABLE partidas(jugador TEXT, intentos INT)')"),
       cmd("con.executemany('INSERT INTO partidas VALUES (?,?)', filas)"),
       hit("con.commit()   # sin esto, no se guarda")], progress="conectar · crear · insertar")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y esta es la pregunta corriendo de verdad: dame jugador e intentos, ordenados de menor a mayor, y solo los dos primeros. La base me devuelve a José con tres intentos y a Ana con cuatro. Yo no recorrí nada.",
   "terminal": term("preguntarle a la base", [
       cmd("SELECT jugador, intentos FROM partidas"),
       cmd("ORDER BY intentos LIMIT 2"),
       out("('José', 3)"),
       hit("('Ana', 4)")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "El error que se paga caro: pegar el dato del usuario dentro de la consulta con un más. Así es como se cuelan las inyecciones. Se usan los signos de interrogación y la librería se encarga. Siempre, sin excepción.",
   "mascota": {"pose": "error", "caption": "nunca pegues datos en la consulta"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Archivo para poquito, base de datos para preguntar. En la siguiente clase, cómo tu programa le pide datos a una computadora que no es tuya.",
   "kinetic": {"words": [{"text": "no lo leas todo", "serif": True},
                          {"text": "PREGÚNTALE", "accent": True}], "variant": "dark"}},
       ])

guarda(22, "que_es_api", "Qué es una API y por qué todo la usa",
       "qué es una API", ["PEDIR", "Y RECIBIR"],
       "¿Copias los datos a mano o los pides?",
       tema="qué es una API y cómo se pide un dato a otro servidor",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Tu programa acaba de preguntarle la temperatura de la Ciudad de México a una computadora que está en otro país. Quince grados, a las cinco de la mañana. Eso es una API.",
   "terminal": term("una petición real", [
       cmd("GET api.open-meteo.com/v1/forecast?latitude=19.43..."),
       out("status 200"),
       hit("{\"time\": \"2026-08-31T05:15\", \"temperature_2m\": 15.0}")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "API quiere decir interfaz de programación. En cristiano: una ventanilla donde otro programa atiende. Tú llegas con una pregunta en un formato acordado, y te contesta con datos en un formato acordado. Ni ves su código ni te importa.",
   "image_prompts": [
       "editorial photograph of a service window at an old office counter, muted graphite palette, warm dim light, documentary style",
       "editorial photograph of two hands exchanging a small paper form across a counter, close up, muted colors, documentary style"]},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "La conversación tiene cuatro partes. La dirección, que dice a quién le preguntas. Los parámetros, que dicen qué le preguntas. El código de respuesta, que dice si salió bien. Y el cuerpo, que trae los datos.",
   "terminal": term("las cuatro partes", [
       out("dirección   → a quién"),
       out("parámetros  → qué le pides"),
       out("código 200  → salió bien"),
       hit("cuerpo JSON → los datos")], progress="dirección · parámetros · código · datos")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y por esto importa: casi ninguna app que usas guarda sus propios datos de todo. Tu app del clima le pregunta a un servicio meteorológico; la de mapas, a otro. Programar hoy es, en buena parte, saber a quién preguntarle.",
   "mascota": {"pose": "profesor", "caption": "casi todo lo que usas pregunta a otro"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Una ventanilla, una pregunta, unos datos. En la siguiente clase la haces tú desde Python, con tres líneas.",
   "kinetic": {"words": [{"text": "una ventanilla", "serif": True},
                          {"text": "QUE ATIENDE PROGRAMAS", "accent": True}], "variant": "dark"}},
       ])


# ────────────────── MÓDULO 6 · Conectar con el mundo ──────────────────

guarda(23, "requests", "Tu primera petición con requests",
       "requests en Python", ["TRES", "LÍNEAS"],
       "¿Copias los datos o los pides?",
       tema="hacer la primera petición HTTP desde Python y leer el código de respuesta",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Tres líneas de Python y tu programa trae datos de internet. Sin navegador, sin copiar y pegar nada a mano.",
   "terminal": term("clima.py", [
       out("import requests"),
       out("r = requests.get(url)"),
       out("print(r.status_code)"),
       hit("200")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "La dirección lleva la pregunta pegada al final, después del signo de interrogación: latitud, longitud y qué dato quieres. Aquí le pedí la temperatura actual en la Ciudad de México.",
   "terminal": term("la dirección con la pregunta", [
       out("api.open-meteo.com/v1/forecast"),
       out("  ?latitude=19.43&longitude=-99.13"),
       out("  &current=temperature_2m"),
       hit("y esta API no pide contraseña")], progress="dirección · parámetros")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y esto es lo que contestó de verdad hace un momento: código doscientos, que significa salió bien, y adentro la hora y quince grados. Ese dato no lo escribí yo.",
   "terminal": term("la respuesta real", [
       cmd("python3 clima.py"),
       out("status 200"),
       hit("{\"time\": \"2026-08-31T05:15\", \"temperature_2m\": 15.0}")])},
  {"beat_type": "giro", "visual_type": "terminal",
   "narration": "Los códigos que vas a ver todo el tiempo son tres. Doscientos: salió bien. Cuatrocientos cuatro: esa dirección no existe, casi siempre es una letra mal escrita. Y cuatrocientos uno o cuatrocientos tres: existe, pero no te dejan pasar sin credencial.",
   "terminal": term("los tres códigos", [
       out("200 → salió bien"),
       out("404 → esa dirección no existe"),
       out("401 / 403 → falta tu credencial"),
       hit("500 → se rompió del otro lado, no tú")])},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ya sabes pedir. En la siguiente clase, cómo sacar de esa respuesta solo el dato que te importa.",
   "kinetic": {"words": [{"text": "pides", "serif": True}, {"text": "Y TE CONTESTAN", "accent": True}],
               "variant": "dark"}},
       ])

guarda(24, "leer_json", "Leer JSON y sacar solo lo que te importa",
       "leer JSON en Python", ["DEL MURO", "AL DATO"],
       "¿Te asusta el JSON o lo navegas?",
       tema="navegar una respuesta JSON en Python y sacar el dato exacto",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "La respuesta de una API se ve como un muro de llaves y corchetes. Da miedo la primera vez. Pero es exactamente lo que ya conoces: diccionarios y listas.",
   "terminal": term("no es un muro", [
       out("{\"current\": {\"time\": \"05:15\","),
       out("             \"temperature_2m\": 15.0}}"),
       hit("es un diccionario dentro de otro")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Se navega igual que una ficha. Pides la llave current, y adentro pides temperature. Cada corchete es un paso hacia adentro. Si te equivocas de nombre, Python te dice exactamente cuál no encontró.",
   "terminal": term("navegar paso a paso", [
       cmd("datos = r.json()"),
       cmd("datos[\"current\"][\"temperature_2m\"]"),
       hit("15.0"),
       out("# KeyError te dice la llave que fallaste")], progress="un corchete, un paso")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y ya con el dato suelto haces lo que quieras: meterlo en una frase, compararlo, guardarlo en tu base. Aquí lo puse en una línea que cualquiera entiende.",
   "terminal": term("del JSON a una frase", [
       cmd("python3 clima.py --bonito"),
       hit("En CDMX hay 15.0 grados a las 05:15")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Truco que uso siempre: antes de escribir el código, imprime la respuesta completa una vez y míralas con calma. Diez segundos leyendo la estructura te ahorran media hora adivinando nombres de llaves.",
   "mascota": {"pose": "pensando", "caption": "primero imprime, luego programa"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Diccionarios dentro de diccionarios. Nada nuevo. En la siguiente clase juntamos todo: la API dentro de tu ventana.",
   "kinetic": {"words": [{"text": "una llave", "serif": True}, {"text": "UN PASO ADENTRO", "accent": True}],
               "variant": "dark"}},
       ])

guarda(25, "app_del_clima", "App del clima: API y ventana, funcionando",
       "app del clima en Python", ["TODO", "JUNTO"],
       "¿Proyecto terminado o carpeta de ejercicios?",
       tema="proyecto final: una app de escritorio que consulta una API del clima",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.35,
   "narration": "Esta es la clase donde todo el curso se junta en un solo programa: una ventana, un botón, una petición a internet y un dato real en pantalla.",
   "terminal": term("app_clima.py", [
       out("ventana + botón      (módulo 4)"),
       out("requests + JSON      (módulo 6)"),
       out("guardar la ciudad    (módulo 4)"),
       hit("70 líneas en total")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "El botón no hace el trabajo: llama a una función que pide el clima y devuelve un número. Esa función se puede probar sola, sin abrir la ventana. Es exactamente la razón por la que en la clase once insistí en pedir funciones.",
   "terminal": term("separado, se puede probar", [
       out("def clima(ciudad): ...  → devuelve 15.0"),
       out("def al_clic(): etiqueta.config(text=clima(...))"),
       hit("probar la función ≠ abrir la app")], progress="lógica · interfaz")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y lo que falla en la vida real no es el código: es internet. Si no hay conexión, la petición se cae y la app se muere con el usuario mirando. Se envuelve en un try, y si falla le dices sin conexión en vez de reventar.",
   "terminal": term("lo que sí pasa", [
       out("try:"),
       out("    t = clima(ciudad)"),
       out("except Exception:"),
       hit("    etiqueta.config(text=\"sin conexión\")")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Cuando le pidas esto al agente, pídelo en dos pedazos: primero la función que trae el dato, la pruebas, y ya que sirve, la ventana. Si lo pides todo junto y algo falla, no vas a saber si fue la API o el botón.",
   "mascota": {"pose": "profesor", "caption": "primero el dato, luego la ventana"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Ya tienes una app tuya que trae datos del mundo. En el último módulo, lo que separa a quien programa de quien copia: leer errores y no perder el trabajo.",
   "kinetic": {"words": [{"text": "una ventana", "serif": True}, {"text": "CON DATOS REALES", "accent": True}],
               "variant": "dark"}},
       ])


# ────────────────── MÓDULO 7 · No perder el trabajo ──────────────────

guarda(26, "traceback", "Leer un error sin miedo: el traceback",
       "leer un traceback en Python", ["DE ABAJO", "ARRIBA"],
       "¿Lo lees o lo pegas en el chat?",
       tema="cómo leer un traceback de Python y encontrar el error",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Este muro rojo asusta al principio y es lo más amable que hace Python: te está diciendo el archivo, la línea y qué esperaba encontrar.",
   "terminal": term("un error de verdad", [
       cmd("python3 malo.py"),
       out("  File \"malo.py\", line 1, in <module>"),
       out("    Print(\"Hola, mundo\")"),
       hit("NameError: name 'Print' is not defined")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Se lee de abajo hacia arriba. La última línea es el qué: qué tipo de error y qué pasó. La línea de arriba es el dónde: qué archivo y qué número de línea. Todo lo de en medio es el camino que siguió el programa hasta llegar ahí.",
   "terminal": term("cómo se lee", [
       out("↑ camino que siguió el programa"),
       out("↑ archivo y línea exacta"),
       hit("↑ el qué: tipo de error y explicación"),
       out("# empieza por abajo, siempre")], progress="qué · dónde · cómo llegó")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y desde la versión tres punto once, Python hasta te sugiere. Aquí escribí Print con mayúscula y me contestó: no existe Print, ¿querías decir print? Nadie lee eso y luego se pasan veinte minutos adivinando.",
   "terminal": term("la sugerencia", [
       hit("NameError: name 'Print' is not defined."),
       hit("Did you mean: 'print'?"),
       out("# la respuesta estaba en el error")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Los tres errores que te vas a encontrar el primer mes: NameError, que es un nombre mal escrito. TypeError, que es mezclar texto con número. Y IndentationError, que son espacios mal puestos. Con esos tres cubres casi todo.",
   "mascota": {"pose": "profesor", "caption": "NameError · TypeError · IndentationError"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Antes de pegarle el error a una IA, léelo. La mitad de las veces ya te dijo la respuesta. En la siguiente clase, cómo ver tu programa por dentro mientras corre.",
   "kinetic": {"words": [{"text": "el error", "serif": True}, {"text": "YA TE DIJO DÓNDE", "accent": True}],
               "variant": "dark"}},
       ])

guarda(27, "depurador", "El depurador: ver tu programa por dentro",
       "depurador de Python", ["PÁRALO", "Y MIRA"],
       "¿Prints o depurador?",
       tema="usar breakpoint y el depurador de Python para inspeccionar variables",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Cuando algo no cuadra, no adivines: detén el programa en esa línea y pregúntale cuánto vale cada cosa. Python trae eso incluido, con una sola palabra.",
   "terminal": term("breakpoint()", [
       out("total = sum(notas)"),
       out("breakpoint()"),
       hit("print(total / len(notas))")])},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Mira la sesión real. El programa se detiene justo antes de esa línea y me abre una consola. Le pregunto cuánto vale total: veintisiete. Cuántas notas hay: tres. Escribo c para continuar, y me da nueve. Ya sé que la cuenta está bien.",
   "terminal": term("una sesión de verdad", [
       cmd("python3 depurar.py"),
       out("(Pdb) p total"),
       out("27"),
       out("(Pdb) p len(notas)"),
       hit("3")], progress="parar · preguntar · continuar")},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Son cuatro teclas y con eso te alcanza para todo. P para ver cuánto vale algo. N para pasar a la siguiente línea. C para continuar hasta el final. Y Q para salir.",
   "terminal": term("las cuatro teclas", [
       out("p  → ver el valor de algo"),
       out("n  → siguiente línea"),
       out("c  → continuar"),
       hit("q  → salir")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "En VS Code es lo mismo pero con clic: le picas al lado del número de línea, sale un punto rojo, y el programa se detiene ahí. Yo uso print para cosas rápidas y el depurador cuando llevo más de diez minutos perdido.",
   "mascota": {"pose": "profesor", "caption": "print para rápido, depurador para perdido"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Parar, preguntar, continuar. En la siguiente clase, aplicamos esto a lo que escribió la inteligencia artificial.",
   "kinetic": {"words": [{"text": "no adivines", "serif": True}, {"text": "PREGÚNTALE", "accent": True}],
               "variant": "dark"}},
       ])

guarda(28, "depurar_ia", "Depurar el código que escribió la IA",
       "revisar código escrito por IA", ["REVISAR", "LO QUE ESCRIBE"],
       "¿Confías o pruebas?",
       tema="cómo revisar y depurar el código que genera un agente de IA",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.35,
   "narration": "La IA no escribe código malo. Escribe código que funciona con el caso que le contaste, y ya. Lo que falla es lo que nunca le mencionaste.",
   "terminal": term("las dos versiones", [
       out("claude:  if not notas: return 0"),
       out("codex:   return sum(notas) / len(notas)"),
       hit("las dos dan 9.0 con [8, 9, 10]")])},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Con la lista vacía, una devuelve cero y la otra revienta. Cinco segundos de prueba y ya sé cuál me sirve. Sin esa prueba, ese error llega al día que un cliente no compró nada.",
   "terminal": term("la prueba que las separa", [
       cmd("python3 prueba_vacia.py"),
       out("claude: 0"),
       hit("codex: ZeroDivisionError: division by zero")], progress="probar los extremos")},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Mi rutina, siempre la misma, tres preguntas. Uno: ¿qué pasa si le doy nada, cero o vacío? Dos: ¿qué pasa si le doy un montón? Y tres: ¿qué pasa si le doy algo que no es lo que espera, un texto donde pide un número?",
   "terminal": term("las tres preguntas", [
       out("1 · vacío o cero"),
       out("2 · un montón"),
       out("3 · el tipo equivocado"),
       hit("si sobrevive a las tres, la firmo")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y cuando encuentres el fallo, no le digas al agente que no funciona. Dile qué le pasaste, qué esperabas y qué te devolvió. Con esas tres cosas lo arregla a la primera; sin ellas, te va a dar vueltas.",
   "mascota": {"pose": "profesor", "caption": "qué le di · qué esperaba · qué salió"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Probar los extremos y reportar con datos. Eso es revisar. En las dos últimas clases: cómo no perder nunca lo que ya funcionaba.",
   "kinetic": {"words": [{"text": "funciona con tu ejemplo", "serif": True},
                          {"text": "NO CON LOS DEMÁS", "accent": True}], "variant": "dark"}},
       ])

guarda(29, "git", "Git: la máquina del tiempo de tu proyecto",
       "git para principiantes", ["VOLVER", "A AYER"],
       "¿Copias carpetas o versionas?",
       tema="usar git para guardar versiones de un proyecto y volver atrás",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Si tienes carpetas que se llaman proyecto final, proyecto final dos y proyecto final bueno, necesitas esta clase. Git guarda versiones de verdad y te deja volver a cualquiera.",
   "terminal": term("las tres órdenes", [
       cmd("git init"),
       cmd("git add ."),
       cmd("git commit -m \"primera version\""),
       hit("ya tienes una foto de tu proyecto")])},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Un commit es una foto de cómo estaba todo en ese momento, con un mensaje tuyo. Add elige qué entra en la foto y commit la toma. No se sube nada a internet: todo esto pasa en tu computadora.",
   "terminal": term("el historial real", [
       cmd("git log --oneline"),
       out("c54f7d6 segunda version"),
       hit("de4064e primera version")], progress="add · commit · log")},
  {"beat_type": "proof", "visual_type": "terminal",
   "narration": "Y esto es lo que te salva. Le pregunto qué cambió respecto a la foto anterior, y me dice: un archivo, una línea agregada y una quitada. Cuando la IA te toque veinte archivos, esta orden es la que te dice qué te hizo.",
   "terminal": term("qué cambió", [
       cmd("git diff HEAD~1 --stat"),
       out(" app.py | 2 +-"),
       hit(" 1 file changed, 1 insertion(+), 1 deletion(-)")])},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Por eso yo hago commit antes de pedirle un cambio grande a un agente. Si lo que devuelve es peor, vuelvo a la foto anterior con una orden y no perdí nada. Sin eso, estás confiando en control zeta.",
   "mascota": {"pose": "profesor", "caption": "commit antes de soltarle el volante"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Fotos con mensaje y la posibilidad de volver. En la última clase, cómo llevar eso a internet y que además te sirva de portafolio.",
   "kinetic": {"words": [{"text": "una foto", "serif": True}, {"text": "ANTES DE ROMPER", "accent": True}],
               "variant": "dark"}},
       ])

guarda(30, "github", "Sube tu proyecto a GitHub y compártelo",
       "subir un proyecto a GitHub", ["UN", "ENLACE"],
       "¿Portafolio o carpeta en el escritorio?",
       tema="subir un repositorio local a GitHub y usarlo como portafolio",
       escenas=[
  {"beat_type": "hook", "visual_type": "terminal", "pause_after": 0.3,
   "narration": "Tu proyecto vive en tu computadora. Con tres órdenes vive también en internet, con un enlace que le puedes pasar a quien te pida ver lo que sabes hacer.",
   "terminal": term("del local a la nube", [
       cmd("git remote add origin <url>"),
       cmd("git branch -M main"),
       cmd("git push -u origin main"),
       hit("ya está en línea")])},
  {"beat_type": "contexto", "visual_type": "image",
   "narration": "GitHub es donde vive el código del mundo. Guardas tu proyecto ahí, y de paso queda como portafolio: quien entre ve tus archivos, tus mensajes de commit y qué tanto has trabajado.",
   "image_prompts": [
       "editorial photograph of a public library shelf with labeled boxes, muted graphite palette, documentary style",
       "editorial photograph of a business card being handed over a table, close up, muted colors, documentary style"]},
  {"beat_type": "proceso", "visual_type": "terminal",
   "narration": "Dos archivos hacen la diferencia entre parecer principiante o no. El punto gitignore, que le dice a git qué NO subir: contraseñas, carpetas de librerías, basura. Y el README, que explica en cuatro líneas qué hace tu programa y cómo se corre.",
   "terminal": term("los dos archivos", [
       out(".gitignore  → qué NO subir"),
       out("README.md   → qué hace y cómo se corre"),
       hit("sin ellos, tu repo se ve abandonado")], progress="gitignore · readme")},
  {"beat_type": "giro", "visual_type": "mascota",
   "narration": "Y la advertencia más importante del curso: jamás subas una contraseña o una llave de API. Aunque borres el archivo después, queda en el historial, y hay robots que se dedican a buscarlas. Se guardan aparte y se ignoran.",
   "mascota": {"pose": "error", "caption": "nunca subas llaves ni contraseñas"}},
  {"beat_type": "cta", "visual_type": "kinetic",
   "narration": "Con esto cierras el curso: sabes escribir, leer, probar, corregir y guardar. Lo que sigue no lo doy yo, lo eliges tú: agarra un problema tuyo, de tu casa o de tu trabajo, y hazlo programa.",
   "kinetic": {"words": [{"text": "ya no copias", "serif": True}, {"text": "AHORA DIRIGES", "accent": True}],
               "variant": "dark"}},
       ])
