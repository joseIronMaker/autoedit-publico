# DECISIÓN DE DIRECCIÓN — formato del canal, listo para cablear

**Formato elegido: FORENSE DE MI ERROR** (2 de 3 lentes lo votaron; el tercero lo puso #1 en producibilidad con 40/50). Se produce **con cuatro injertos** de los perdedores y **con su propio ejemplo corregido**: corrí su experimento en `/home/jose/tiktok/.venv` y la afirmación central del beat 4 del documento original ("por eso los ocho restan vecinos, igual que el mío") **es falsa** en `load_digits`. El receipt reproducible y sus controles quedaron en `/home/jose/tiktok/scratchpad/recibo_nitidez_conv.py` y `/home/jose/tiktok/scratchpad/recibo_nitidez_conv.log`.

---

## 1. Qué le falta al canal

El canal no cuenta mal una explicación: no hay explicación — 105 palabras repartidas en 6 escenas son 17 palabras por escena, o sea seis titulares con presupuesto para una sola idea, y por eso un ingeniero de IA dice "nunca entendí el hilo". Le falta **causa**: 16 conectores causales en 115 escenas significa que 5 de cada 6 transiciones son intercambiables, y algo intercambiable es una lista, no una historia. Le falta **dueño**: 14 marcas de primera o segunda persona en 115 escenas, una sola de primera persona en 19 videos completos — nadie sigue a una voz sin dueño, y ese es literalmente el 0.5% de vistas al perfil. Le falta **apuesta**: los videos explican cómo funciona la IA sin que José ponga nada en juego, mientras 9 de 9 referentes son persona real o pantalla real. Y le sobra **cambio**: la regla de los 3 segundos optimiza corte cuando lo que retiene es encadenamiento causal sobre un referente estable, y cortar cada 3s entre assets no relacionados es exactamente la textura del AI slop en la categoría que TikTok ya tiene contaminada.

---

## 2. El formato

**FORENSE DE MI ERROR — «lo creí / lo corrí / por eso»**
Cada video es el expediente de una creencia técnica de José que se rompió en pantalla. El tema es la coartada; el objeto del video es el error propio y el experimento que lo corrigió.

**Duración objetivo: 80–90 s de voz (230–260 palabras a 173 ppm). Sin tarjeta muda al final.**

### Los cuatro injertos (y una decisión que resuelve el desacuerdo del panel)

| Injerto | De dónde | Qué arregla |
|---|---|---|
| **Juicio forzado en el frame 1** ("adivina cuál") sobre dos artefactos REALES | CASO ABIERTO beat 1 | El peor defecto de FORENSE: su hook abría con jerga ("la primera capa de una red") y sin ancla visual. Ahora funciona **en mudo**. |
| **Prosa de mecanismo en tres tiempos** (zona plana → borde → cómo se llama el salto) | EXPEDIENTE beat 3 | FORENSE demostraba que la resta suma cero pero nunca decía **qué mide** la salida. |
| **Chyron numerado de caso + título-pregunta del siguiente** | EXPEDIENTE beat 7 | Identidad de serie reconocible en un frame; ataca el 0.5% de perfil por estructura. |
| **Regla de divulgación de selección** ("de los ocho que aprendió, este") + control que debería fallar | CASO ABIERTO riesgos + FORENSE | Tapa el cherry-picking de buena fe. Ya me salvó dos veces al escribir el ejemplo. |

**SE DESCARTA el sello de 70 segundos del término técnico** (CASO ABIERTO). Esconderle "convolución" a una audiencia que la nombró en el segundo 3 es condescendencia, y empuja al circunloquio. El término **se escribe en el chyron desde el beat 3** (en pantalla es gratis) y **se pronuncia una sola vez en el beat 6**.

**SE DESCARTA la tarjeta muda de 4 s** (EXPEDIENTE beat 7 / CASO ABIERTO beat 8) — dos lentes la pedían y una la mataba; decisión de dirección: **cuatro segundos de silencio al final regalan la caída justo donde se mide finalización**. El título-pregunta del siguiente caso aparece como **texto pequeño sobre el último frame de evidencia mientras se dice la última frase**, y el frame se sostiene **1.5 s**, no 4. Mismo bucle abierto, cero silencio, cero corte a negro.

### Beat por beat

---

**BEAT 1 · LA CREENCIA ROTA — `0:00–0:10` (28–31 palabras)**

*Propósito:* darle al espectador una tarea de juicio antes de que pueda deslizar, y meter un agente indexable desde la palabra 1.

> **REGLA EJECUTABLE:** Cuatro oraciones. (1) 12–15 palabras: nombra los **dos artefactos reales que están en pantalla en el frame 1** e incluye un marcador de segunda persona (`tu/tus`). (2) ≤10 palabras: el otro artefacto, con marca temporal propia (`anoche`, `el martes`). (3) **≤5 palabras: la orden de juicio** (`Adivina cuál falla más`). (4) **≤4 palabras: la confesión, primera persona del pasado** (`Me equivoqué dos años`). PROHIBIDO: jerga sin referente visual, tipografía protagonista, número en pantalla, promesa de contenido. El **sustantivo-ancla** que se nombre aquí debe reaparecer LITERAL en el beat 6 o el guion se rechaza.

*Visual:* Registro B. Split de dos artefactos reales lado a lado, sin corte de plano, 10 s. Chyron permanente arriba-izquierda: `CASO 04 · <fuente/URL/versión>`.

---

**BEAT 2 · LAS CUATRO VECES QUE YA LO USASTE — `0:10–0:27` (45–50 palabras)**

*Propósito:* fabricar el conocimiento previo sin el cual la brecha no existe. Cuatro tiros para que sea imposible que ninguno pegue. Aporta la oración larga #1.

> **REGLA EJECUTABLE:** UNA sola oración de **30–45 palabras** que enumere **4 objetos concretos que el espectador tocó esta semana** (una app, un botón, un archivo, una captura), todos con `tu/tus`, y que **termine nombrando la operación común sin explicarla**. Después UNA oración de **≤4 palabras** que niega la lectura cómoda. El ítem 1 es OBLIGATORIAMENTE el artefacto del beat 1. PROHIBIDO: conceptos, sentimientos, explicar cualquier ítem, y afirmar más de lo verificable (si los 4 casos no son literalmente la misma operación se dice "la misma cuenta", nunca "el mismo filtro").

*Visual:* Registro A. **17 s con UN solo plano que se transforma en dos bloques de 8–9 s**: el referente permanece y se deforma. Los 4 ítems entran como iconos de 1 s en el borde del cuadro, **nunca como cortes de escena**. Prohibido whoosh y partículas.

---

**BEAT 3 · LO CORRÍ — `0:27–0:47` (52–58 palabras, 3 bloques de ~6 s)**

*Propósito:* convertir la explicación en un evento con agente, tiempo y causa. Es la mitad del recibo.

> **REGLA EJECUTABLE:** (a) Verbo de acción propia en las primeras 3 palabras (`escribí/corrí/medí/resté/rompí`) con marca temporal. (b) El resultado se dice como **número o hecho binario**, nunca como adjetivo ("quedó rapidísimo" → "suma cero"). (c) **Patrón de mecanismo en tres tiempos, obligatorio** [injerto EXPEDIENTE]: qué pasa en la zona plana → qué pasa donde cambia → cómo se llama ese salto. (d) `Por eso` + la consecuencia mecánica. (e) Última oración de la escena ≤6 palabras. **LEY DEL RECIBO:** el código se corre ANTES de escribir la frase y la cifra se copia del stdout; si no se corrió, no se narra.

*Visual:* Registro B, **3 bloques encadenados sobre el MISMO experimento** (código → salida → la operación decisiva impresa). Única excepción a la alternancia. **Chyron de rigor** con el término exacto que la voz no puede pagar (`técnicamente, correlación cruzada`).

---

**BEAT 4 · EL DATO QUE ME CORRIGIÓ — `0:47–1:09` (58–64 palabras: 18 s registro B + 4 s registro C)**

*Propósito:* romper la creencia del beat 1 con el mismo objeto visto por segundo ángulo. La autoridad llega DESPUÉS de la evidencia propia, como alivio, no como permiso.

> **REGLA EJECUTABLE:** (a) Abre con conector causal explícito. (b) **Oración larga #2 (25–32 palabras)** seguida inmediatamente de una de ≤10. (c) **Máximo 3 cifras medidas por video; una comparación con sus controles cuenta como UNA.** Cada una lleva conector causal a ≤12 palabras y ninguna se redondea al alza. (d) **CONTROL OBLIGATORIO:** toda cifra se corre también contra algo que DEBERÍA fallarla; si el control la pasa, la métrica se tira y no se narra. (e) **Si el plano muestra 1 de N, la narración dice N.** (f) Si la diferencia medida está dentro del ruido, **se dice en voz alta** ("trece contra once no prueba nada"). (g) La autoridad real se nombra en la ÚLTIMA oración, ≤6 palabras, exactamente sobre su bloque en pantalla; si no hay fuente verificable, el bloque se borra.

*Visual:* Registro B en 3 bloques (ejecución → resultado crudo → el resultado aplicado al MISMO objeto del beat 3) + **Registro C de 4 s**: screenshot REAL de la ficha del paper (título, autores, fecha) en su página oficial. Nunca sus figuras. Ticker discreto en el chyron: `PRUEBA 2/2`.

---

**BEAT 5 · LO QUE ME COSTÓ CREERLO — `1:09–1:21` (30–35 palabras)**

*Propósito:* es el beat que da seguidores. Convierte el dato en consecuencia con dueño, y paga en experiencia lo que el canal no puede pagar en IP emocional.

> **REGLA EJECUTABLE:** Tres oraciones. (1) El precio propio del error **en unidades verificables** (años, pesos, horas, créditos), nunca "me sorprendió mucho". (2) Abre con `Por eso ahora` + lo que José hace HOY distinto, en presente y primera persona. (3) **≤6 palabras que le pasan la propiedad al espectador** ("Tú ya los apretaste hoy"). PROHIBIDO: tristeza, "el futuro del trabajo", cualquier imperativo, y confesar torpezas banales (typos, olvidos) — **solo creencias técnicas que la mayoría de la audiencia comparte**. Rotación obligatoria entre videos: `me equivoqué / me costó / me sorprendió`, nunca el mismo dos videos seguidos.

*Visual:* Registro A, 12 s en un plano: la metáfora se abre y adentro está el **MISMO objeto del beat 4**, no uno nuevo. Toda metáfora lleva la palabra `metáfora` visible. Si no hay metáfora honesta, se queda el terminal quieto — **nunca se rellena con imagen decorativa**.

---

**BEAT 6 · SENTENCIA CIRCULAR + PUERTA — `1:21–1:31` (26–30 palabras)**

*Propósito:* cerrar el bucle del beat 1 para que la única idea nueva salga con dos huellas del mismo objeto, e instalar el término justo cuando ya está pagado.

> **REGLA EJECUTABLE:** Cuatro oraciones. (1) ≤12 palabras que **reusan 3+ palabras LITERALES del beat 1 e invierten el veredicto**. (2) ≤5 palabras que instalan **el único término técnico nuevo del video, dicho una sola vez**. (3) ≤8 palabras: qué cambió de verdad. (4) **≤6 palabras que repiten el sustantivo-ancla**. PROHIBIDO: pregunta al público (esa vive en el copy), moraleja, "en conclusión", "esto apenas empieza", `mañana` como orden. **`visual_type` prohibido en esta escena: `kinetic`, `big_text`, `image` — validación dura.** **PRUEBA FINAL:** intercambia los beats 3 y 4; si el guion sigue teniendo sentido, es lista y se rechaza.

*Visual:* Registro B obligatorio: la sentencia se dice **SOBRE el último frame de evidencia real** con un solo movimiento (zoom lento). El **título-pregunta del siguiente caso** entra como texto pequeño en ese mismo frame durante la última oración; el frame se sostiene **1.5 s** tras la voz y termina. Sin corte, sin negro, sin silencio de 4 s.

---

## 3. Las reglas nuevas

Redactadas para pegar en `GUION_PROMPT` (`autoedit/generate.py`) y validar en `scratchpad/validar_guiones.py` + `autoedit/critico.py`.

---

**R1 · UN SOLO OBJETO** — `SUSTITUYE` a "cada escena aporta UN dato, número o paso concreto" (generate.py:141).
> El video entero gira sobre UN solo objeto, nombrado con un sustantivo concreto en la escena 1. Ese sustantivo debe reaparecer LITERAL en la última escena. Ningún otro concepto puede ocupar más de una escena. Si tienes dos mecanismos, son dos videos.
*Validador:* el sustantivo-ancla de la escena 1 aparece en la última escena → si no, ERROR.

**R2 · UN SOLO TÉRMINO TÉCNICO NUEVO** — `SUMA`.
> Un video = una idea nueva = UN término técnico nuevo. Se pronuncia UNA sola vez, y nunca antes de la escena 4. En pantalla puede escribirse desde la escena 3 (el chyron paga la precisión que la voz no puede gastar: "técnicamente, correlación cruzada").
*Validador:* lista de sello por video; contar ocurrencias en `narration` → >1 o antes de la escena 4 = ERROR.

**R3 · CADENA CAUSAL Y PRUEBA DE REORDENAMIENTO** — `SUSTITUYE` a la estructura de beats independientes (generate.py:403-406).
> De la escena 3 en adelante, cada escena abre con `por eso / entonces / así que / lo que hizo que`. PROHIBIDAS: `además`, `también`, `otro dato`, `pero hay un detalle`, `espera`, `lo interesante es`. Si intercambias dos escenas y el guion sigue teniendo sentido, es una lista: se rechaza y se reescribe.
*Validador:* mínimo 1 conector causal por transición desde la escena 3; regex de conectores prohibidos = ERROR.

**R4 · DUEÑO GRAMATICAL** — `SUMA`.
> Cada escena contiene al menos un marcador de segunda persona (`tú/tu/te/tus`) o de primera con posesivo (`yo/mi/me`). El video abre con un artefacto en segunda persona y confiesa en primera persona del pasado dentro de los primeros 10 segundos. PROHIBIDA la tercera persona neutra como sujeto de apertura de cualquier escena: "los modelos ahora pueden…" se reescribe como "tu modelo hace esto sin que se lo pidas".
*Validador:* ≥1 marcador por escena → si no, ERROR.

**R5 · LEY DEL RECIBO** — `SUMA`.
> El código se corre ANTES de escribir la frase y la cifra se copia del stdout. El script y su log se guardan junto al guion (`scratchpad/recibo_<slug>.py` + `.log`, con fecha). Si el experimento no se puede correr esta semana, se cambia el tema — no se suaviza la afirmación. PROHIBIDO "como ingeniero yo creo que": eso es opinión, no apuesta.
*Validador:* el guion declara `recibo: {script, log, fecha}`; sin eso no entra a la cola.

**R6 · CONTROL QUE DEBERÍA FALLAR + DIVULGACIÓN DE SELECCIÓN** — `SUMA`.
> Toda cifra se mide también contra un control que DEBERÍA fallarla (números al azar, la identidad, el caso trivial). Si el control la pasa, la métrica se tira: no se narra. Si el plano muestra 1 de N, la narración dice N ("de los ocho que aprendió, este"). Si la diferencia medida cae dentro del ruido, se dice en voz alta.

**R7 · LA CIFRA EN POSICIÓN CAUSAL** — `SUSTITUYE` a "ANCLAJE + CONTRASTE NUMÉRICO: da PRIMERO el número grande" (generate.py:173) y a "el texto EN PANTALLA del cold-open lleva un NÚMERO" (generate.py:108).
> PROHIBIDO el número en el hook y prohibido el número como remate de asombro. Máximo 3 cifras medidas por video (una comparación con sus controles cuenta como una), cada una seguida a ≤12 palabras de un conector causal que cambia lo que pasa después. Ninguna se redondea al alza.

**R8 · RANGO DINÁMICO DE ORACIÓN** — `SUSTITUYE` a "frases con MEDIANA de ~11 palabras y ~30% de frases de <8" (generate.py:233-234).
> Mínimo 2 oraciones de ≥25 palabras por video, cada una seguida inmediatamente de una de ≤7. La última oración de cada escena tiene ≤6 palabras. Prohibidas tres oraciones seguidas con diferencia <4 palabras entre sí. No acelerar el habla: 173 ppm.
*Validador:* ya es aritmética sobre `narration` — enchufa directo a `validar_guiones.py`.

**R9 · DOS REGISTROS EN BLOQUES DE 5–9 s** — `SUSTITUYE` a la REGLA DE LOS 3 SEGUNDOS (generate.py:138-139 y la línea equivalente de `CLAUDE.md`).
> Solo dos registros que alternan: **A metáfora** (`custom`/`cutout`/`mascota`) y **B evidencia** (`screen_demo`/`receipt`/`ml_demo`/`terminal`), más **C autoridad** una vez por video, 3-4 s. Registro B ≥40% del tiempo total. Bloques de 5–9 s: dentro del bloque el referente PERMANECE y se transforma, no se corta a otro asset. Registro A nunca encadena más de 2 bloques; B puede encadenar 3 si son pasos del mismo experimento. El texto en pantalla nunca duplica la narración: máximo 4 palabras, redactadas distinto.

**R10 · CIERRE SOBRE EVIDENCIA, NUNCA SOBRE TIPOGRAFÍA** — `SUSTITUYE` al beat "tesis" en `kinetic` (generate.py:406).
> La última escena no puede tener `visual_type` en {`kinetic`, `big_text`, `image`}. La sentencia final se dice sobre el último plano de pantalla real y reusa 3+ palabras literales de la escena 1. El título-pregunta del siguiente caso va como texto pequeño sobre ese mismo frame, con 1.5 s de sostenido. Prohibida la tarjeta muda al final y la pregunta al público en la voz: la pregunta binaria A-o-B vive en el copy.

**R11 · REGLA DE DESCARTE DEL TEMA** — `SUMA` [injerto EXPEDIENTE].
> Antes de escribir: si no puedes nombrar en UNA frase qué creí yo, qué código lo desmintió y qué le pasa al espectador que ya lo usó, el tema NO entra a este formato. Se reformula o se tira. Prohibido fabricar la confesión: si José no lo corrió, no lo pagó o no lo rompió, el video no existe.

**R12 · DURACIÓN Y ROTACIÓN** — `SUSTITUYE` a "28–34 segundos por DEFECTO" (generate.py:408).
> 80–90 segundos de voz (230–260 palabras a 173 ppm), 6 escenas, sin excepción por tema. Más duración NO significa más ideas: significa más pasos sobre la MISMA idea. Modo confesional rotativo (`me equivoqué` / `me costó` / `me sorprendió`), nunca el mismo dos videos seguidos.

---

## 4. Guion de ejemplo

**CASO 04 — "El filtro de nitidez de tu galería y la primera capa de una red hacen la misma cuenta"**
Serie: *Cómo la IA aprendió a ver*. **256 palabras · 88 s de voz + 1.5 s de sostenido.**
Recibo: `/home/jose/tiktok/scratchpad/recibo_nitidez_conv.py` → `.log` (corrido 2026-08-09, WSL2 CPU sin GPU).

> **[INPUT HUMANO REQUERIDO]** el "dos años" del beat 1 y 5 lo confirma José. Es la única línea que un agente no puede escribir sin mentir.

---

### ESCENA 1 · LA CREENCIA ROTA — `0:00–0:10` (29 palabras)

**Narración:**
> «Uno de estos dos filtros lo escribí yo, como el de tu galería. El otro lo encontró una red sola, anoche. Adivina cuál falla más. Me equivoqué dos años.»

**Visual:** Registro B. Split vertical, **un solo plano de 10 s, sin corte**. Izquierda: terminal imprimiendo `[[0,-1,0],[-1,5,-1],[0,-1,0]]` y, debajo, la foto de José filtrada con él. Derecha: `print` de un kernel 3×3 de la primera capa entrenada anoche, y la misma foto filtrada con él. Zoom lento simultáneo a las dos rejillas. **Cero tipografía grande, cero cifra en pantalla.**
**Chyron:** `CASO 04 · numpy + PIL · kernel aprendido en dígitos 8×8`
*Longitudes 13-8-4-4. Ancla: **filtro / nueve números**. Dueño: `yo`, `tu`, `me`.*

---

### ESCENA 2 · LAS CUATRO VECES QUE YA LO USASTE — `0:10–0:27` (48 palabras)

**Narración:**
> «El botón de nitidez con el que salvaste el recibo borroso, el escáner que le encontró solo las orillas a tu credencial y el desenfoque que te borró la cocina en la videollamada hacen la misma cuenta con una ventanita de números sobre tu foto. Ninguno inventa nada.»

**Visual:** Registro A, **17 s, un solo plano en dos bloques de 8-9 s**: la MISMA foto en cuadro todo el tiempo, con una ventanita 3×3 amarilla que la recorre; a su paso se encienden en el borde los tres objetos como iconos de 1 s. **Ni un corte.**
**Chyron:** `desenfoque, bordes y nitidez = la misma convolución, distinto kernel`
*Oración larga #1: 45 palabras + martillazo de 3. Se dice "la misma cuenta", no "el mismo filtro" — el rigor exacto se paga en el chyron.*

---

### ESCENA 3 · LO CORRÍ — `0:27–0:47` (55 palabras, 3 bloques de ~6 s)

**Narración:**
> «Anoche le resté la identidad al filtro de nitidez, sobre mi propia cara. Lo que sobra suma cero. Donde todo es igual, da cero. Donde cambia, se dispara: ahí hay un borde. Por eso afila: no agrega detalle, te suma un mapa de dónde cambia el brillo. No adorna: mide. Y eso lo sé escribir.»

**Visual:** Registro B, 3 bloques encadenados del MISMO experimento: (a) las cuatro líneas de `conv()` en el editor; (b) `nitidez − identidad` imprimiéndose como `[[0,-1,0],[-1,4,-1],[0,-1,0]]` con `suma = 0.0` resaltado; (c) el mapa de bordes de la cara de José apareciendo debajo — negro en la mejilla, blanco en el contorno de los lentes.
**Chyron:** `técnicamente, correlación cruzada · Pillow ImageFilter.SHARPEN`
**Recibo (stdout real):** `nitidez − identidad = [[0,-1,0],[-1,4,-1],[0,-1,0]] | suma = 0.0` · `identidad + 4*(identidad − promedio de los 4 vecinos) == nitidez → True` · `SHARPEN de Pillow == identidad + (identidad − promedio de los 8 vecinos) → True` · `error máximo sobre la cara: 0.0` · `zona plana p10 = 0.0 | borde p99 = 76.0`.
*El patrón de tres tiempos injertado de EXPEDIENTE está en las oraciones 3-4-5. Longitudes 13-5-6-8-15-3-5.*

---

### ESCENA 4 · EL DATO QUE ME CORRIGIÓ — `0:47–1:09` (62 palabras · 18 s registro B + 4 s registro C)

**Narración:**
> «Entonces hice la prueba justa: la misma red, el mismo código, mi misma laptop sin GPU, y lo único que cambia son los nueve números. Ocho filtros de libro fallan trece dígitos de casi cuatrocientos. Ocho números al azar, veintidós. Los ocho que ella encontró sola, once. Trece contra once no prueba nada. Nadie tuvo que escribirlos. Eso hizo LeCun en 1989.»

**Visual:** Registro B en 3 bloques: (a) terminal corriendo las cinco semillas con las tres barras de error creciendo lado a lado; (b) las **tres rejillas de 8 kernels completas** — a mano / al azar / aprendidos — sin seleccionar ninguno; (c) el kernel aprendido pasando por la MISMA `conv()` de la escena 3 sobre la cara de José. Luego **4 s de registro C**: screenshot REAL de la ficha de *Backpropagation Applied to Handwritten Zip Code Recognition* (LeCun et al., 1989) en su página oficial, con fecha legible, exactamente cuando se le nombra.
**Chyron:** `5 semillas · 1399 train / 398 test · 0.2 s en CPU` → ticker `PRUEBA 2/2`
**Recibo (stdout real):** `8 filtros clásicos escritos a mano: 96.8% | error 3.2% = 13 de 398` · `8 kernels al azar, congelados: 94.5% | error 5.5% = 22 de 398` · `8 kernels aprendidos: 97.2% | error 2.8% = 11 de 398`.
**Controles que mataron cifras (documentados, no narrados):** `centro positivo + 8 vecinos negativos: 0/40` (al azar da ~0.2% → no discrimina, se tiró) · `"filtro direccional": 33/40 aprendidos vs 71% al azar` → no discrimina, se tiró.
*Oración larga #2: 25 palabras + una de 10. Tres cifras = UNA comparación con sus controles. **"Trece contra once no prueba nada" es la línea que separa a este canal de todos los demás**: 398 dígitos no distinguen 13 de 11, y se dice.*

---

### ESCENA 5 · LO QUE ME COSTÓ CREERLO — `1:09–1:21` (34 palabras)

**Narración:**
> «Ese error me costó dos años tratando la primera capa como caja negra. Por eso ahora, cuando una red no ve, lo primero que imprimo son esos nueve números. Tú ya los apretaste hoy.»

**Visual:** Registro A, 12 s en un plano: la caja negra (con la palabra `metáfora` visible en pantalla) se abre y adentro está **la MISMA rejilla de 9 números** del bloque anterior. Objeto viejo, no objeto nuevo.
**Chyron:** `metáfora · el objeto real son 9 pesos de la primera capa`

---

### ESCENA 6 · SENTENCIA CIRCULAR + PUERTA — `1:21–1:31` (28 palabras + 1.5 s de sostenido)

**Narración:**
> «La primera capa no hace nada que tú no sepas apretar. Eso es una convolución. Lo que cambió no fue la cuenta. Nueve números: ya nadie los escribe.»

**Visual:** congela el último frame de evidencia (la cara de José filtrada por el kernel que la red encontró sola) con **zoom lento a la rejilla ganadora**. Durante la última oración entra, en texto pequeño de dos líneas sobre esa misma imagen: `CASO 05 — ¿Por qué tira la mitad de tu foto a propósito?` / `Cómo la IA aprendió a ver`. Sostiene 1.5 s y corta. **Sin `kinetic`, sin `big_text`, sin negro, sin silencio.**
**Chyron final:** `8 filtros · 0.2 s · sin GPU`
*Invierte el veredicto del beat 1 (yo no sabría escribirlo → tú ya sabes apretarlo). El término entra aquí, una vez, en 4 palabras. La pregunta A-o-B va en el copy, jamás en la voz.*

---

### Diferencia con el formato viejo, en una línea

El video viejo habría sido: *"Tu celular hace 3 mil millones de multiplicaciones por foto"* (cold-open con cifra) → 6 escenas independientes de 17 palabras → tesis en tipografía cinética: *"la IA no ve, calcula"* → 39 s. Este dura 88 s, tiene **un solo objeto**, **cuatro conectores causales**, **primera persona desde el segundo 6**, **48 s de pantalla real (55%)**, **cero tipografía protagonista**, y su afirmación central se puede reproducir en 0.2 segundos con un archivo que está en el repo.

---

## 5. Qué medir

**Ventana:** 3 videos con este formato en 7 días (uno cada 48 h, para no quemar el cold-start). Se lee en TikTok Studio a las 24 h de cada uno y se vuelca a `experiments.jsonl` (skill `diagnostico-tiktok`).

| Métrica | Hoy | Umbral a 7 días | Qué significa si falla |
|---|---|---|---|
| **Retención media absoluta** | 8.9 s de 35 s | **≥22 s** (media de los 3) | El formato no sostiene 88 s. **NO se acorta el misterio**: se corta a la variante de 55 s eliminando el beat 5 y bajando la enumeración a 3 ítems. |
| **Retención a los 3 s** | caída fuerte en 0:02 | **≥65%** | El juicio forzado no funcionó en mudo. Se cambian los dos artefactos por dos IMÁGENES comparables, no rejillas. |
| **Tasa de finalización** | (no medida) | **≥25%** en al menos 1 de 3 | El pago del beat 6 decepciona. Se revisa que la sentencia sea mecánica y aplicable, no aforística. |
| **Vistas al perfil / vistas** | **0.5%** | **≥1.5%** | El chyron numerado + título-pregunta no construyó identidad de serie. Es la métrica que decide si el formato sirve para el objetivo real. |
| **Seguidores nuevos** | 10 totales | **≥15 nuevos en los 3** | La apuesta propia no está convirtiendo respeto en seguimiento. |
| **Comentarios** | **0 en 843 vistas** | **≥3 en total** | Señal de que "adivina cuál" no produjo participación. Es la única métrica que el CTA implícito puede mover sin pedir nada. |
| **FYP %** | 86% | **≥80%** | Si cae, es señal de AIGC/slop: revisar registro B ≥40%. |
| **Vistas medias** | 843/7d ≈ 120/video | **≥250/video** | Secundaria: la distribución tarda; NO tomar decisiones con esto solo. |

**Regla de decisión, decidida de antemano:** si a los 3 videos la retención media absoluta no pasa de 22 s, se corta a 55 s eliminando el beat 5. **Jamás se recupera duración metiendo más ideas** — ese es exactamente el error que este formato viene a corregir. Y si retención sube pero perfil sigue <1% a los 3 videos, el problema no es el formato: es que falta la pieza larga detrás (decisión estratégica pendiente, no tarea de guion).

**Lo que hay que construir antes del primer video** (una pasada de `overlay` en ffmpeg sobre el concatenado — hoy `_assemble` va con `-c copy`, `generate.py:553-563`): (1) chyron permanente con número de caso y fuente; (2) texto pequeño sobre el frame final. Un día de trabajo, sirve para todos los episodios. El beat 1 con slider en movimiento necesita extender el cliente CDP de `screen_demo.py` (que ya tiene `evaluate` y screencast) con un modo de pasos JS; mientras no exista, se produce como split de terminales, que es lo que este ejemplo hace.

---

## 6. Lo que NO hay que hacer

1. **No escribir la frase y después buscar el número.** Es el error que cometieron los dos formatos perdedores en sus propios ejemplos: CASO ABIERTO sostiene 90 segundos sobre una anomalía que da **0 de 40** cuando se corre, y EXPEDIENTE narra "rayitas, diagonales, esquinas" que son un recuerdo de las figuras de AlexNet, no la salida de su demo. **A mí me pasó escribiendo esto**: mi primera medición decía "mi filtro pierde contra números al azar" — era mentira, había puesto 8 copias del mismo kernel; con la comparación justa da 13 contra 11. Se corre, luego se escribe.

2. **No narrar una cifra que su control también pasa.** Un recibo que suena preciso y no discrimina es peor que no tener recibo, porque destruye la autoridad justo donde se estaba construyendo. Maté dos métricas escribiendo este ejemplo: "centro positivo con vecinos negativos" (los kernels al azar la pasan) y "filtro direccional" (33/40 entrenados vs 71% al azar). Ninguna llegó al guion.

3. **No inventar precisión estadística.** "Son 512 combinaciones de signos y la red cayó en esa" es un p-valor fabricado: la hipótesis nula no es uniforme sobre 2⁹. Un ingeniero lo desarma en diez segundos y el canal queda quemado para siempre — el daño de un solo video así no se repara con veinte buenos.

4. **No darle deseos a la máquina.** "Quería ver", "intentó", "se rindió" es la gasolina emocional más barata y el impuesto más caro para un canal cuya marca es el rigor. El antropomorfismo no vive en una frase que se pueda etiquetar: vive en la gramática de las seis escenas. Cuando el hecho lo exige, el sujeto son **las personas que la hicieron**, no el modelo.

5. **No confundir familias de mecanismo.** Centro-periferia es retina/LGN; lo que Hubel y Wiesel describen en V1 son células **orientadas**. Y la máscara de desenfoque de un editor **no es** un kernel 3×3: es resta de un borroso con radio y umbral. El 3×3 es el caso mínimo, y eso se dice — o se paga en el chyron.

6. **No mostrar 1 de N sin decir N.** El máximo de 32 correlaciones siempre existe. Enseñar el ganador sin decir cuántos perdieron es cherry-picking con cara de recibo, y se hace de buena fe, que es lo que lo hace peligroso.

7. **No confesar torpezas banales ni repetir el mea culpa.** Cinco videos seguidos de "yo estaba equivocado" suenan a pose y erosionan al ingeniero que quiere ser referente. Solo se confiesan **creencias técnicas que la mayoría de la audiencia comparte**, y la corrección siempre viene de un experimento que solo alguien capaz produce: el error se paga con evidencia, y esa evidencia es la credencial.

8. **No recuperar la regla de los 3 segundos.** Cortar cada 3 s entre assets no relacionados es la textura visual exacta del AI slop, daña el aprendizaje (detalle seductor, g=−0.33) y es lo que hoy produce seis reindexaciones con presupuesto para una.

9. **No cerrar sobre tipografía ni sobre pregunta al público.** La misma frase sobre fondo se lee como cita motivacional; sobre la imagen se lee como conclusión. Y cerrar con moraleja en vez del dato prometido es la definición operativa de manipulación percibida: −48% de compartidos.

10. **No producir 88 segundos sin validar longitudes de oración.** El formato depende por completo del rango dinámico sintáctico y del ≥40% de pantalla real, porque el TTS no actúa. Producido sin validar, el acta forense leída plana es peor que seis titulares y la caída se mueve del 0:02 al 0:20. Relacionado y urgente: **el clon de voz se hizo con 40 s de audio**; este es el formato que más castigo recibe si José no re-graba la muestra.