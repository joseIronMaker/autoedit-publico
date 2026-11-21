"""«Cómo aprende una máquina»: 12 capítulos y un epílogo (los tokens), del error a los LLM.

Una sola fuente para los guiones y los copys. `python estudio/serie/guiones.py` los vuelca a
`estudio/serie/<id>/guion.txt` y `copy.txt`. El capítulo 8 es la pieza del perro.
Cifras y nombres comprobados contra fuente primaria; ver `biblia.md`.
"""
from pathlib import Path

SERIE = "Cómo aprende una máquina"
AQUI = Path(__file__).parent

C = {}

C["c01_error"] = ("""La inteligencia artificial más poderosa del mundo empezó adivinando al azar.
Sin saber nada. Puros números al azar.
Pídele algo sencillo: que adivine cuánto cuesta una casa.
Su primera respuesta: dos pesos.
El precio real: tres millones.
Entre lo que dijo y lo que era, hay una distancia.
A esa distancia le llamamos error.
Y aquí está todo el secreto. La máquina no sabe qué es una casa. No sabe qué es un peso. Lo único que puede sentir es ese número.
Así que ajusta sus números por dentro, tantito, y vuelve a intentar.
Dos millones de error. Un millón. Cien mil.
Una vez, otra vez. Millones de veces.
Hasta que un día le atina a una casa que nunca había visto.
Eso es entrenar a una inteligencia artificial.
No le explicaron qué es una casa. Solo le dijeron cuánto se equivocó.
ChatGPT, los autos que se manejan solos, esta voz que te está hablando... todo nació de ese número.
Si le quitas el error, la máquina más poderosa del mundo no aprende nada.
Porque lo único que aprende una máquina... es a equivocarse menos.
""", "La inteligencia artificial más poderosa del mundo empezó adivinando al azar. No le explican nada: solo le dicen cuánto se equivocó, millones de veces. Por eso creo que el error no es el problema de la IA, es su único maestro. Parte 1 de 12 de «Cómo aprende una máquina». ¿Tú aprendes más de lo que te sale bien o de lo que te sale mal? #inteligenciaartificial #machinelearning #chatgpt #ia #aprendizajeautomatico")

C["c02_gradiente"] = ("""Un modelo como ChatGPT tiene miles de millones de perillas.
Cada una cambia un poquito lo que responde. ¿Cómo sabe cuál mover?
Probar combinaciones no acabaría jamás.
Mejor imagina esto. Cada combinación de perillas es un lugar en un terreno.
Donde el error es grande, hay montaña. Donde es chico, hay valle.
Y tú estás parado ahí, de noche, en medio de la niebla.
No ves el valle. Nadie lo ve. Ni la máquina, ni quienes la construyeron.
Pero tus pies sienten algo: hacia dónde se inclina el suelo.
A esa inclinación le llamamos gradiente.
Y lo mejor: las matemáticas la calculan para todas las perillas al mismo tiempo, de un solo jalón.
Das un paso hacia abajo. Vuelves a sentir el suelo. Otro paso.
Si tus pasos son muy cortos, nunca llegas.
Si son muy largos, te brincas el valle y acabas más arriba que antes.
Ese tamaño se llama tasa de aprendizaje, y elegirlo sigue teniendo algo de arte.
A todo esto le llamamos descenso de gradiente. Así se entrenan casi todas las inteligencias artificiales que usas.
Y ninguna ha visto nunca el mapa.
Ninguna sabe a dónde va.
Solo sabe dónde es abajo.
""", "Miles de millones de perillas y nadie sabe cuál mover. Así que la máquina hace lo que harías tú en una montaña con niebla: sentir el suelo y dar un paso hacia abajo. Para mí eso es lo más hermoso de todo esto: nunca ve el mapa. Parte 2 de 12 de «Cómo aprende una máquina». ¿Prefieres pasos cortos y seguros, o largos y arriesgarte a brincarte el valle? #inteligenciaartificial #machinelearning #gradiente #ia #deeplearning")

C["c03_neurona"] = ("""Todo ChatGPT está hecho de una sola pieza, repetida.
Y esa pieza cabe en una línea de matemáticas de secundaria.
Imagina que decides si sales a correr.
¿Hace buen clima? Un punto. ¿Dormiste bien? Otro punto. ¿Está lloviendo? Menos tres.
Pero no todo pesa igual. La lluvia te importa más que el sueño.
Cada dato se multiplica por su importancia. A esa importancia le llamamos peso.
Luego se suma todo.
Si pasa de cierto límite, sales. Si no pasa, te quedas.
Felicidades. Acabas de ser una neurona artificial.
Multiplicar, sumar y decidir. Nada más.
La inventaron en mil novecientos cuarenta y tres, en papel, inspirados en el cerebro.
Pero no te confundas: se parece a una neurona de verdad lo que un avión de papel a un pájaro.
Y los pesos son esas perillas de las que tanto hablamos.
Nadie los escribe a mano. Salen del error.
Una sola neurona no entiende nada. No sabe qué es correr, ni qué es la lluvia.
Y ChatGPT no tiene ninguna otra pieza.
Solo tiene muchísimas.
""", "Todo ChatGPT está hecho de una sola pieza repetida, y esa pieza multiplica, suma y decide. Nada más. Yo sigo sin superar que algo tan simple, repetido suficientes veces, parezca pensar. Parte 3 de 12 de «Cómo aprende una máquina». ¿Crees que la inteligencia es una sola cosa muy complicada, o muchas cosas muy simples? #inteligenciaartificial #redesneuronales #machinelearning #ia #neurona")

C["c04_capas"] = ("""Una neurona sola solo sabe hacer una cosa: trazar una línea recta.
De este lado, sí. De este lado, no.
Y casi nada en el mundo se separa con una recta.
Mira estos puntos. Negros en medio, rojos alrededor.
Ninguna línea los separa. Inténtalo.
Ahora haz esto: agarra la hoja y dóblala.
Dóblala otra vez.
De pronto, una sola recta separa todo.
Eso hace una capa de neuronas: dobla el espacio.
Cada capa agarra lo que hizo la anterior, y lo vuelve a doblar.
Y cuando desdoblas la hoja, esa recta ya no es recta.
Se convirtió en una forma que rodea justo lo que querías.
Doblez tras doblez, así distingue una red una cara de un perro.
Por eso se llama aprendizaje profundo.
No significa que la máquina piense hondo. Significa que tiene muchas capas.
Y nadie le dice dónde doblar. Los dobleces también salen del error.
Una recta sola no puede casi nada.
Pero una recta, doblada suficientes veces, puede casi todo.
""", "«Profundo» no significa que la máquina piense hondo. Significa que dobla el espacio muchas veces, hasta que una simple recta separa lo que parecía imposible. De todas las explicaciones de deep learning, esta es la que a mí me hizo clic. Parte 4 de 12 de «Cómo aprende una máquina». ¿Sabías qué significaba «profundo» o también pensabas que era otra cosa? #inteligenciaartificial #deeplearning #redesneuronales #machinelearning #ia")

C["c05_culpa"] = ("""Tu red se equivocó.
Tiene millones de conexiones, y una sola respuesta mala al final.
¿De quién fue la culpa?
Porque el error solo se ve en la salida. Las capas de en medio nunca se enteran.
Durante años, entrenar esas capas escondidas fue el gran problema.
La solución suena casi infantil: regresar la culpa por donde vino.
Empiezas por el final. Esta neurona dijo mal. ¿Quién la empujó a decir eso?
Estas dos conexiones pesaron mucho: les toca más culpa. A esta otra, casi nada.
Y cada una reparte su parte hacia atrás, a quienes la alimentaron.
Capa por capa, hasta el principio.
Cuando llega, cada conexión sabe exactamente cuánto debe moverse.
A esto le llamamos retropropagación. En inglés, backpropagation.
Por debajo es la regla de la cadena, de cálculo de prepa.
La hizo famosa un artículo de mil novecientos ochenta y seis. Uno de sus autores, Geoffrey Hinton, ganó el Nobel en dos mil veinticuatro.
Cada vez que una inteligencia artificial aprende algo, pasa esto.
Nadie la regaña. Nadie le explica.
Solo una pregunta, viajando hacia atrás: ¿cuánto fue culpa tuya?
Aprender, para una máquina, es repartir bien la culpa.
""", "Una red se equivoca y tiene millones de conexiones. ¿De quién fue la culpa? La respuesta se llama backpropagation, y uno de los autores que la hicieron famosa ganó el Nobel en 2024, por su trabajo en redes neuronales. Yo digo que es la idea más humana de toda la IA. Parte 5 de 12 de «Cómo aprende una máquina». En tu trabajo, ¿la culpa se reparte como en una red o le cae siempre al último? #inteligenciaartificial #backpropagation #redesneuronales #machinelearning #ia")

C["c06_memoria"] = ("""Una inteligencia artificial puede sacar diez en todos sus exámenes, y no saber nada.
Mira. Aquí están sus ejemplos, y le pides una curva que los explique.
Al principio la curva es simple, y se equivoca un poco.
Sigue entrenando. La curva se dobla, se retuerce, y toca cada punto.
Error: cero. Perfecto.
Ahora llega un dato nuevo... y falla por muchísimo.
Se aprendió las respuestas, no la materia.
A esto le llamamos sobreajuste.
Y puede ser más raro todavía.
Unos investigadores entrenaron, a propósito, un modelo con fotos de lobos y de perros. Todos los lobos salían en la nieve.
Acertaba casi siempre. Parecía brillante.
Hasta que revisaron en qué se fijaba. No miraba al animal.
Miraba la nieve.
Por eso se esconde una parte de los datos. La máquina jamás la ve mientras entrena.
Ese es el examen de verdad.
Y cuando el error en lo que ya vio sigue bajando, pero en lo escondido empieza a subir, ahí se detiene todo.
Un modelo no vale por lo que acierta en lo que ya vio.
Vale por lo que acierta en lo que nunca vio.
""", "Una IA puede sacar diez en todos sus exámenes y no saber nada. Se llama sobreajuste, y la prueba más rara es un modelo que distinguía lobos mirando la nieve. Cuando alguien me presume la precisión de su modelo, yo siempre pregunto lo mismo: ¿en qué datos? Parte 6 de 12 de «Cómo aprende una máquina». ¿Alguna vez sacaste diez sin haber entendido nada? #inteligenciaartificial #machinelearning #sobreajuste #datos #ia")

C["c07_comida"] = ("""En mil novecientos ochenta y seis ya sabíamos casi todo lo que has visto aquí.
Neuronas. Capas. Error. Repartir la culpa.
Y no funcionaba.
Las redes eran chiquitas, lentas, y otros métodos les ganaban.
La idea era correcta. Le faltaban dos cosas.
La primera: comida. Una red aprende de ejemplos, y casi no había.
Hasta que internet llenó el mundo de fotos, y un equipo de investigadores etiquetó millones, con ayuda de miles de personas, foto por foto.
La segunda: músculo. Entrenar es multiplicar números, una y otra vez.
Y resulta que eso mismo hacen las tarjetas de video para pintar los videojuegos.
En dos mil doce se juntó todo. Una red llamada AlexNet, dos tarjetas de video de las que vendían en cualquier tienda, y más de un millón de fotos.
En el concurso mundial de reconocer imágenes, el segundo lugar falló el veintiséis por ciento.
AlexNet, el quince.
Nadie había visto un salto así.
Y no traía una gran idea nueva. Era casi la misma de los ochenta, en grande.
Por eso la inteligencia artificial llegó de golpe, aunque tenía décadas esperando.
A la idea nunca le faltó inteligencia.
Le faltó comida.
""", "La idea de las redes neuronales ya existía en 1986 y no funcionaba. Lo que cambió en 2012 fue la comida: millones de fotos, y tarjetas de video hechas para videojuegos. Yo creo que esto explica por qué la IA parece haber llegado de golpe. Parte 7 de 12 de «Cómo aprende una máquina». ¿Qué pesó más, los datos o las tarjetas de video? #inteligenciaartificial #alexnet #deeplearning #gpu #ia")

C["c08_perro"] = (None, "ChatGPT no sabe qué es un perro. Solo sabe dónde vive esa palabra, en un mapa que nadie dibujó y que se formó leyendo cómo hablamos. Por eso aprendió que rey es a reina lo que hombre a mujer, y también algo peor. Parte 8 de 12 de «Cómo aprende una máquina». ¿Eso es culpa de la máquina o de lo que le dimos a leer? Yo digo que de lo que le dimos a leer. #inteligenciaartificial #chatgpt #embeddings #machinelearning #ia")

C["c09_atencion"] = ("""El trofeo no cabía en la maleta porque era muy grande.
¿Qué era grande? El trofeo, claro.
Ahora cambia una palabra. El trofeo no cabía en la maleta porque era muy chica.
¿Qué era chica? La maleta.
Tú lo resolviste sin pensar. A una máquina le costó décadas.
Porque leía palabra por palabra, y para cuando llegaba al final, ya se le había ido el principio.
El truco llegó con un nombre muy simple: atención.
Cada palabra mira a todas las demás, y pregunta: ¿quién de ustedes me importa?
La palabra chica busca. Mira a trofeo: poco. Mira a maleta: mucho.
Y se queda con una mezcla, un pedazo de cada una, según cuánto le importó.
Por eso banco no es el mismo punto en «me senté en el banco» que en «el banco me cobró».
Mira a sus vecinas, y se mueve.
Nadie programó esas miradas. Salen del error, como todo lo demás.
En dos mil diecisiete, unos investigadores de Google publicaron un artículo con un título casi insolente: La atención es todo lo que necesitas.
Tenían razón. De ese artículo sale la T de ChatGPT.
Una palabra, sola, casi no significa nada.
Significa según a quién mira.
""", "«El trofeo no cabía en la maleta porque era muy chica.» Tú sabes qué era chica sin pensar. A una máquina le costó décadas, hasta que cada palabra aprendió a mirar a las demás. Ese artículo de 2017 es, para mí, el más importante de la década. Parte 9 de 12 de «Cómo aprende una máquina». ¿Cuándo sentiste por primera vez que una IA te entendía de verdad? #inteligenciaartificial #atencion #transformers #chatgpt #ia")

C["c10_torre"] = ("""GPT son tres letras, y casi nadie sabe qué significan.
La G es de generativo: produce cosas nuevas.
La P es de preentrenado: ya leyó muchísimo antes de hablar contigo.
Y la T, la importante, es de transformer.
Antes, las redes leían como tú: una palabra tras otra. Lento, y olvidando.
Un transformer lee la frase completa, de un jalón.
Primero, cada palabra se vuelve un punto.
Luego pasa por la atención: cada una mira a las demás, y se acomoda.
Y sale transformada. Ya no es perro a secas. Es este perro, en esta frase.
Entonces pasa a la siguiente capa, y a la otra. Decenas de capas, y cada una afina lo que hizo la anterior.
Como todo ocurre al mismo tiempo, se puede repartir entre miles de chips. Por eso pudo crecer tanto.
Y eso es prácticamente todo lo que hay.
No hay un módulo de gramática. No hay otro de lógica.
Neuronas, pesos y atención, apilados.
Una torre de la misma idea, repetida.
Y de esa torre, por arriba, sale una sola cosa: una lista de qué palabra podría seguir.
""", "GPT son tres letras y casi nadie sabe qué significan. La T es la que cambió todo: una torre de la misma idea repetida, sin módulo de gramática ni de lógica. A mí me sigue pareciendo increíble que no haga falta más. Parte 10 de 12 de «Cómo aprende una máquina». ¿Sabías qué significaba GPT? #inteligenciaartificial #gpt #transformers #chatgpt #ia")

C["c11_siguiente"] = ("""Todo lo que ChatGPT ha escrito lo hizo con un solo truco.
Adivinar la siguiente palabra.
Escribes: el cielo es...
Por dentro aparece una lista. Azul, setenta por ciento. Gris, diez. Hermoso, cinco.
Elige una. Y vuelve a empezar, ahora con: el cielo es azul...
Palabra por palabra. Cada una, sin saber cómo termina la frase.
Tu teléfono hace algo parecido cuando te sugiere palabras.
La diferencia es la escala: esto leyó una parte enorme de lo escrito en internet.
¿Y cómo aprendió? Igual que todo en esta serie.
Le tapaban la siguiente palabra. Adivinaba. Medían el error. Repartían la culpa. Y ajustaban las perillas.
Una cantidad absurda de veces.
Por eso se le llama modelo de lenguaje grande. En inglés, LLM.
Y no siempre elige la más probable. Si lo hiciera, sonaría a robot.
Le dejan un poco de azar, y a eso le llaman temperatura.
Por eso la misma pregunta te da dos respuestas distintas.
Un poema, un programa, un consejo de pareja.
Nadie escribió nada de eso. Salió de apostar, una palabra a la vez.
Y cada apuesta fue, nada más, la más creíble.
""", "Todo lo que ChatGPT ha escrito lo hizo con un solo truco: adivinar la siguiente palabra. Sin saber cómo termina la frase. Yo lo uso todos los días y aun así me impresiona que eso alcance. Parte 11 de 12 de «Cómo aprende una máquina». Sabiendo esto, ¿le confías más o menos que antes? #inteligenciaartificial #llm #chatgpt #machinelearning #ia")

C["c12_adivina"] = ("""En dos mil veintitrés, un abogado en Nueva York le presentó a un juez seis casos que le dio ChatGPT.
Con nombres, con fechas, con citas.
Ninguno existía.
Y cuando el abogado le preguntó si eran reales, ChatGPT le dijo que sí.
Lo multaron.
Pero eso no fue una mentira. Para mentir, necesitas saber la verdad.
Recuerda cómo funciona: la palabra más creíble, una tras otra.
Después de «según el caso», viene algo que suena a caso. Después, un número que suena a cita.
Todo encaja. Nada se consultó.
A eso le llaman alucinación. Yo le diría completar.
Porque por dentro no hay un archivo de hechos. Hay un mapa de cómo hablamos.
Y en ese mapa, lo verdadero y lo que suena verdadero viven muy cerca.
Por eso hoy le conectan buscadores y documentos, para que lea antes de responder. Ayuda mucho. No lo arregla del todo.
Mira de dónde venimos. Un número al azar. Un error. Una pendiente. Una suma. Un doblez. La culpa viajando hacia atrás. Un punto en un mapa. Una palabra que mira a las otras.
Empezó adivinando.
Y hoy, con todo lo que parece saber, sigue haciendo exactamente eso.
Nunca dejó de adivinar.
Solo aprendió a hacerlo con nuestras palabras.
""", "En 2023 un abogado le presentó a un juez seis casos que le dio ChatGPT. Ninguno existía. No fue una mentira: para mentir necesitas saber la verdad. Por eso yo verifico todo lo importante, por muy segura que suene la respuesta. Parte 12 de 12 de «Cómo aprende una máquina». ¿Tú revisas lo que te dice o le crees si suena bien? #inteligenciaartificial #chatgpt #alucinaciones #llm #ia")


# Epílogo: lo pidió José el 2-nov-2026 ("el concepto de token nunca se vio"). Va DESPUÉS de c12 y
# conecta con «Cómo actúa una máquina», donde la mesa y el costo se miden en tokens.
# Medido con tiktoken o200k_base (GPT-4o): 200,019 piezas; " fiesta" 1, " inolvidable" 3
# (" inol" "vid" "able"), " otorrinolaringólogo" 5, " ferrocarril" 4 (" fer" "roc" "arr" "il"),
# " perro" = 96439. El espacio de antes es parte del pedazo.
C["c13_tokens"] = ("""Al final de esta serie te dije que la máquina aprendió a adivinar con nuestras palabras.
Te simplifiqué algo.
No ve palabras.
Antes de leer nada, corta todo en pedazos.
Fiesta es un pedazo. Inolvidable son tres: inol, vid, able. Otorrinolaringólogo, cinco.
A cada pedazo le llamamos token.
Y no los ve como letras. Cada token es un número, de una lista fija.
En GPT-4o, de OpenAI, la lista tiene unas doscientas mil piezas. Perro es la noventa y seis mil cuatrocientos treinta y nueve.
Lo que el modelo adivina, en realidad, es el siguiente token. Después se traduce otra vez a texto.
¿Y quién decidió dónde cortar? Nadie, a mano.
Un programa leyó montañas de texto, y fue pegando los pedazos que más se repetían juntos. Se llama BPE, codificación por pares de bytes.
Por eso lo común queda entero, y lo raro se rompe.
Y por eso, por años, a los modelos les costó contar letras.
¿Cuántas erres tiene ferrocarril? Él ve cuatro pedazos. Las letras quedan escondidas adentro.
Esto importa más de lo que parece.
En la siguiente serie, la máquina empieza a actuar, y todo se mide en tokens: cuánto cabe en su mesa, cuánto cuesta cada paso.
Así que ese es el último secreto.
No aprendió con nuestras palabras.
Aprendió con pedacitos...
que nosotros nunca vemos.
""", "Durante doce videos te dije que la IA adivina la siguiente palabra. Te simplifiqué algo: adivina tokens, pedazos que ni siquiera son letras. Para GPT-4o, inolvidable son tres pedazos: inol, vid, able. Por eso le costaba contar letras, y por eso todo en una IA se cobra en tokens. Epílogo de «Cómo aprende una máquina». ¿Lo sabías o te tomó por sorpresa? #inteligenciaartificial #tokens #chatgpt #llm #ia")

if __name__ == "__main__":
    for k, (g, copy) in C.items():
        d = AQUI / k
        d.mkdir(exist_ok=True)
        if g:
            (d / "guion.txt").write_text(g, encoding="utf-8")
            n = len(g.split())
            print(f"{k}: {n} palabras, ~{n / 160 * 60:.0f} s")
        (d / "copy.txt").write_text(copy + "\n", encoding="utf-8")
        for mala in ("guárdalo", "sígueme", "comenta", "dale like", "síguenos"):
            assert mala not in copy.lower(), (k, mala)
