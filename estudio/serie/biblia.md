# Biblia de «Cómo aprende una máquina»

12 capítulos, del error a los LLM. Listón: r6 y r2 (`scratchpad/_referentes/`) y el capítulo 8, la
pieza del perro (`remotion/src/perro/Perro.tsx`), que José aprobó: "está hermoso".

## Lo que une a la serie
- Mundo de papel (`PAPEL`), tinta negra, un solo acento (`ACENTO`) para lo que importa. Una vez por
  capítulo, como mucho, un corte seco a negro en el giro.
- Instrument Serif: redonda para decir, cursiva para bautizar. JetBrains Mono para números.
- La bola negra es el personaje recurrente: la predicción, el punto, lo que cae y se mueve.
- Las perillas, el error y "salen del error" son los hilos que vuelven en cada capítulo.
- Sin subtítulos corridos: las palabras clave forman parte de la animación.
- Un guion que suena a persona, no a clase.

## Lo que cambia en cada uno: la imagen central
Cada capítulo debe sentirse como una idea visual nueva, no como otra escena del anterior.

| Id | Idea | Imagen central |
|---|---|---|
| c01 error | La máquina solo siente un número | Tormenta de dígitos al azar que se vuelve una bola; una recta de precios; la barra de error entre lo que dijo y lo que era, que se encoge a golpes |
| c02 gradiente | Sabe dónde es abajo, nunca a dónde va | Terreno en niebla: solo existe lo que rodea a la bola. Las curvas aparecen a su alrededor y se pierden detrás; nunca vemos el mapa completo hasta el final, si acaso |
| c03 neurona | Multiplicar, sumar, decidir | Tres perillas reales que giran, entradas que fluyen a una balanza; el fiel cruza el límite. "Felicidades" te señala a ti |
| c04 capas | Una recta doblada puede casi todo | Una hoja de papel con puntos que se dobla en 3D; la recta atraviesa; al desdoblar queda una forma |
| c05 culpa | Aprender es repartir bien la culpa | Una red dibujada a mano; un rojo que viaja AL REVÉS y se reparte, más gordo donde hay más culpa |
| c06 memoria | Vale por lo que acierta en lo que nunca vio | Una curva que se retuerce hasta tocar cada punto; el punto nuevo; la nieve que tapa al lobo; dos curvas de error que se separan |
| c07 comida | A la idea le faltó comida | Una bola diminuta hambrienta frente a la idea enorme; fotos que llueven y se apilan; barras que se comparan; el salto del 26 al 15 |
| c09 atención | Significa según a quién mira | La frase en tipografía grande; hilos de distinto grosor que nacen de cada palabra y buscan a otra |
| c10 torre | Una torre de la misma idea | Una pila de capas en 3D; los puntos suben, transformándose en cada piso |
| c11 siguiente | Apostar una palabra a la vez | Una cinta de texto que avanza y una ruleta o barras de probabilidad que deciden cada palabra |
| c12 adivina | Nunca dejó de adivinar | Citas que se escriben solas y se deshacen; repaso que trae de vuelta la imagen de cada capítulo; termina como empezó c01 |
| c13 tokens (epílogo) | No son palabras: son pedazos | Una tira de texto que unas tijeras cortan en pedazos; cada pedazo se voltea y por detrás es un número de una cajonera de 200,000 cajones (« perro» = 96439, el mismo perro del c08). «ferrocarril» son cuatro cajas cerradas con las erres adentro |

## Datos comprobados
- AlexNet, ImageNet 2012: top-5 de 15.3% contra 26.2% del segundo; dos GTX 580.
- Backpropagation: Rumelhart, Hinton y Williams, Nature 1986. Hinton, Nobel de Física 2024.
- McCulloch y Pitts, 1943.
- "Attention Is All You Need", Google, 2017.
- Mata v. Avianca, 2023: seis casos inexistentes, multa de 5,000 dólares.
- Ribeiro et al. 2016 ("Why Should I Trust You?"): clasificador de lobos y huskies entrenado A PROPÓSITO
  con lobos en nieve.
- " perro" es el token 96439 en o200k_base.
