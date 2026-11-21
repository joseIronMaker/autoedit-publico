# Arco de 4 series — con la prueba del tema aplicada

Regla bloqueante: cada video declara **quién decide** algo sobre el espectador,
**qué le cuesta** si se equivoca, y **qué palanca** puede jalar hoy solo y gratis.
Sin los tres, el tema no se produce.

Todo sin cara. La señal de persona sale de la narración: anécdota propia + motivo dicho
en voz. Cifras traducidas a personas, pesos o minutos.

---

## SERIE 1 — LLMs: qué son de verdad y por qué te fallan   ✔ COMPLETA (6/6 producidos)
*Serie de MODELOS DE LENGUAJE, no de "IA en general" (José, 12-ago-2026). Todo tema que
no sea de LLM sale de aquí (el del banco se fue a `guiones_parking/`). Guiones en
`scratchpad/guiones_serie1/`, copys a mano en `scratchpad/copys_manuales_serie1/`,
producción con `scratchpad/producir_serie1.py sNN`.*

**1.1 · "La IA te da un número perfecto. ¿Lo buscó o lo adivinó?"** ✔ PRODUCIDO · 65.8s
- quién decide: el modelo decide si busca o completa de memoria, y no te avisa cuál hizo
- qué cuesta: le mandas a un cliente un dato que salió de una probabilidad, no de una fuente
- palanca: pídele la frase textual y la liga. 30 segundos.
- concepto: qué ES un LLM (predictor del siguiente token) y qué NO es (base de datos)
- prueba: dos capturas REALES de ChatGPT — una cita al INEGI, la otra se niega a inventar

**1.2 · "La misma pregunta en español te cuesta 23% más"** ✔ PRODUCIDO · 72.8s
- quién decide: el tokenizador decide en cuántos pedazos parte lo que escribes
- qué cuesta: pagas 23% más por lo mismo y te cabe menos en la ventana
- palanca: en lo que repites mucho, instrucción en inglés y respuesta en español
- concepto: BPE/subpalabras; por qué no puede contar las letras de tu apellido
- prueba: `mediciones/tokens_espanol.json` — 90 vs 73 tokens hoy (1.23×), 107 vs 75 en 2023
  (1.43×). `Cuauhtémoc` → `Cu-au-ht-ém-oc`; `Balbuena` → `Bal-bu-ena`
- límite en voz: **no es el doble; la brecha se redujo, no desapareció**

**1.3 · "Medí el consejo de prompting más repetido. Ya no aplica."** ✔ PRODUCIDO · 73.2s
- REENCUADRE (12-ago): el tema era "lo de en medio se le pierde" y la medición propia lo
  DESMINTIÓ. En vez de publicar lo contrario de mis datos, el video pasó a ser el que rompe
  la creencia con la medición.
- quién decide: un consejo de 2023 decide cómo escribes tus prompts y cuánto tiempo pierdes
- qué cuesta: horas moviendo párrafos mientras el problema real está en otro lado
- palanca: córrelo en tu caso — el dato al inicio y al final, cinco veces cada uno, y cuenta
- concepto: ventana de contexto y por qué nació el consejo (modelos de 2023)
- prueba: `mediciones/atencion_posicion_{300,2500}.json` + `atencion_multi.json` — **96/96**
  con el dato al inicio/medio/final de ~65 mil tokens; **130/130** claves pidiendo 1, 4 y 8
  datos de un jalón. Recibo del origen: Liu et al., TACL 2023, arXiv 2307.03172
- límite en voz: **es un modelo de 2026, un dato exacto y 65 mil tokens; no digo que la
  atención sea infinita, digo que en esta prueba la posición no movió nada**

**1.4 · "Por qué tu chatbot no sabe nada de tu empresa"** ✔ PRODUCIDO · 73.8s
- quién decide: un buscador decide qué trozo de TU documento le pasa al modelo
- qué cuesta: contesta genérico delante de un cliente y tú quedas como el que no sabe
- palanca: antes de culpar al modelo, imprime el trozo que le llegó
- concepto: recuperación y por qué falla cuando el trozo está mal cortado
- prueba: TF-IDF real sobre el `CLAUDE.md` de este proyecto — por párrafos el trozo correcto
  queda en **lugar 2 de 7**; cortado a ciegas cada 220 letras se hunde al **lugar 59 de 89**

**1.5 · "Ibas a pagar fine-tuning. OpenAI ya lo está cerrando."** ✔ PRODUCIDO · 75.0s
- quién decide: tú decides gastar semanas y dinero en el camino equivocado
- qué cuesta: el proyecto entero, en algo que nunca iba a saber tus datos
- palanca: la regla de una línea — ¿le falta CONOCIMIENTO o COMPORTAMIENTO?
- concepto: el ajuste fino mueve pesos (comportamiento), no guarda datos
- prueba: recibo de la doc de OpenAI — la plataforma no acepta usuarios nuevos, vive bajo
  "Legacy", y lista para qué sirve: clasificar, traducir con matiz, formato específico y
  corregir fallas de obediencia. Ninguna dice meter conocimiento

**1.6 · "El detector dijo que lo escribiste con IA. Lo escribiste tú."** ✔ PRODUCIDO · 78.0s
- quién decide: un clasificador decide si copiaste, y tú cargas con probar que no
- qué cuesta: tu calificación, tu materia, tu entrega
- palanca: escribe en un documento con historial de versiones; ese historial es la prueba
- concepto: perplejidad — escribir simple y correcto parece "de máquina"
- prueba: `mediciones/detectores_no_nativos.json` + recibo arXiv 2304.02819 — 7 detectores,
  **61.3%** de falsos positivos, **18 de 91** acusados por los siete
- límite en voz: **se midió en 2023, sobre ensayos TOEFL**

---

## SERIE 2 — Agentes: un LLM con herramientas

**2.1 · "ChatGPT no puede hacer nada. Literalmente nada."**
- quién decide: el modelo solo escribe texto; alguien más decide si eso se ejecuta
- qué cuesta: le pides que mande el correo y solo te lo describe
- palanca: cómo saber si lo que usas es modelo o agente, antes de confiarle una tarea
- concepto: la diferencia exacta entre generar texto y ejecutar acciones

**2.2 · "Le di acceso a mis archivos y borró lo que no debía"**
- quién decide: el agente decide qué comando corre, con TUS permisos
- qué cuesta: archivos, una rama de git, una base
- palanca: el sandbox y la lista de permisos, configurados en 2 minutos
- concepto: permisos, confirmación humana, por qué "auto-approve" es una decisión seria
- anécdota propia obligatoria

**2.3 · "Cómo se le dan manos a un modelo"**
- quién decide: tú decides qué herramientas ve, y eso decide lo que puede hacer
- qué cuesta: herramienta mal descrita = el agente la usa mal o no la usa
- palanca: la plantilla de una descripción de herramienta que sí funciona
- concepto: function calling / tool use, el esquema JSON, por qué la descripción importa

**2.4 · "El bucle: pensar, actuar, mirar, repetir"**
- quién decide: el agente decide cuándo terminó
- qué cuesta: se queda dando vueltas y te consume el presupuesto
- palanca: poner tope de pasos y criterio de salida
- concepto: el ciclo ReAct, observación, el estado

**2.5 · "Por qué se atora en el paso siete"**
- quién decide: la ventana de contexto decide qué recuerda de lo que ya hizo
- qué cuesta: repite trabajo, se contradice, se cicla
- palanca: cortar la tarea en pasos con estado externo
- concepto: acumulación de contexto, compactación, memoria

---

## SERIE 3 — Los harneses: Claude Code, Codex, OpenCode
*La más fuerte del arco: ganancia aplicable pura, competencia casi nula en español,
y José los usa a diario. Su experiencia aquí es de primera mano.*

**3.1 · "El agente que sí edita tus archivos"**
- quién decide: el harness decide qué lee, qué escribe y qué ejecuta
- qué cuesta: seguir copiando y pegando código a mano, horas por semana
- palanca: instalarlo y correr la primera tarea, en el video
- concepto: qué es un harness y en qué se diferencia de un chat

**3.2 · "Claude Code, Codex y OpenCode: cuál para qué"**
- quién decide: tú, y la elección te amarra a un flujo de trabajo
- qué cuesta: meses en la herramienta equivocada
- palanca: la tabla de decisión según lo que haces
- concepto: modelo vs harness vs plan; costo real de cada uno

**3.3 · "El archivo que le enseña tu proyecto"**
- quién decide: lo que escribas ahí decide cómo se comporta en cada tarea
- qué cuesta: repetir las mismas instrucciones cien veces
- palanca: el archivo de contexto, escrito en el video
- concepto: contexto persistente, reglas de proyecto
- anécdota: el CLAUDE.md real de este canal

**3.4 · "Cómo no dejar que rompa nada"**
- quién decide: los permisos deciden qué puede tocar sin preguntarte
- qué cuesta: un comando destructivo aprobado por inercia
- palanca: la configuración de permisos, mostrada
- concepto: sandbox, allowlist, hooks

**3.5 · "Construí un canal entero con esto. Esto es lo que aprendí."**
- quién decide: tú decides cuánto le delegas
- qué cuesta: delegarle lo que no debe, o no delegarle nada
- palanca: las tres reglas que sacó de hacerlo
- concepto: dónde un agente rinde y dónde te hace perder tiempo
- **el video más personal del arco** — pura experiencia propia

---

## SERIE 4 — Lo nuevo: MCP, skills, agentes hablando entre agentes

**4.1 · "El enchufe universal de los agentes"**
- quién decide: el servidor MCP decide qué puede ver y hacer tu agente
- qué cuesta: reescribir la misma integración para cada herramienta
- palanca: conectar un MCP existente, en el video
- concepto: MCP, por qué un protocolo abierto cambia el juego

**4.2 · "Tu primer MCP, en el video"**
- palanca: uno funcionando de principio a fin
- concepto: recursos, herramientas, transporte

**4.3 · "Skills: enseñarle un procedimiento, no repetírselo"**
- quién decide: la skill decide cómo hace esa tarea a partir de ahora
- qué cuesta: explicar el mismo flujo cada vez
- palanca: escribir una skill propia
- concepto: skills vs prompt vs herramienta

**4.4 · "Agentes que se hablan entre ellos"**
- quién decide: quién coordina, quién ejecuta, quién verifica
- qué cuesta: un agente solo topa en tareas grandes
- palanca: el patrón mínimo de orquestación
- concepto: A2A, subagentes, orquestación

---

## Orden recomendado

Empezar por la **3**, no por la 1. Razones:
1. Ganancia aplicable pura — la emoción que más guardados produce (4.5-5.3% medido).
2. Nadie lo cubre en español. La 1 compite contra mil canales.
3. Es experiencia REAL de José, y sin cara la única señal de persona es esa.

La 1 sirve mejor como refuerzo después, cuando ya haya audiencia: los fundamentos se
consumen cuando alguien ya te sigue, no cuando te descubre.

---

## SERIE 1.5 — Ingeniería de prompts (medida, no recitada)

*El nicho más saturado del arco. La diferencia de José: NADIE mide si los trucos famosos
funcionan. Cada video rompe una creencia popular CON una medición propia — formato forense
puro. Ángulo de serie: "corrí el truco veinte veces; esto es lo que salió".*

**P1 · "Le pedí lo mismo veinte veces. Once salieron bien. Con una línea más: diecinueve."**
- creencia rota: crees que si tu prompt funcionó una vez, funciona
- quién decide: la decodificación estocástica decide qué respuesta te toca hoy
- qué cuesta: llevas meses confiando en prompts que fallan 4 de cada 10 veces
- palanca: córrelo diez veces antes de confiar en él; cuenta los aciertos
- concepto: temperature y top-p; por qué una corrida no es evidencia
- MEDIBLE por mí

**P2 · "No te falta el prompt mágico. Te faltan cinco piezas."** — C.T.F.E.R.
- creencia rota: crees que existe una frase secreta que lo desbloquea
- quién decide: lo que omites decide lo que el modelo inventa para rellenar
- qué cuesta: tres reescrituras por tarea, todos los días
- palanca: Contexto · Tarea · Formato · Ejemplos · Restricciones
- material propio de José (su curso)

**P3 · "'Piensa paso a paso' ya casi no hace nada"**
- creencia rota: EL truco más famoso de todos, y hoy está medio obsoleto
- quién decide: el modelo que te tocó decide si ya razona solo
- qué cuesta: llenas el prompt de ruido que no aporta y pagas los tokens
- palanca: cuándo sí sirve y cuándo estorba
- concepto: cadena de pensamiento vs modelos con razonamiento nativo
- MEDIBLE por mí · el que más rompe creencias

**P4 · "Dos ejemplos valen más que tres párrafos de instrucciones"**
- creencia rota: crees que explicando mejor lo va a entender mejor
- quién decide: el formato de tus ejemplos decide el formato de su respuesta
- qué cuesta: párrafos de instrucciones que igual sale mal
- palanca: cambia el párrafo por dos ejemplos del resultado que quieres
- concepto: few-shot / aprendizaje en contexto
- MEDIBLE por mí

**P5 · "Le dije que era un experto y no cambió nada"**
- creencia rota: "actúa como un experto en X", el consejo más repetido
- quién decide: tú decides gastar tokens en un rol que a veces no hace nada
- qué cuesta: crees que estás mejorando el prompt y no
- palanca: qué poner en su lugar (la tarea y el criterio de éxito)
- MEDIBLE por mí

**P6 · "El prompt que le funcionó a otro no te va a funcionar"**
- creencia rota: los packs de prompts que se venden
- quién decide: tu contexto y tu modelo deciden, no el prompt
- qué cuesta: dinero en packs y tiempo copiando lo ajeno
- palanca: las tres cosas que hay que cambiarle a un prompt prestado
- concepto: dependencia de modelo, de versión y de contexto

**P7 · "Puse el mismo dato al inicio, a la mitad y al final. Medí la diferencia."**
- creencia rota: crees que lee todo tu prompt con la misma atención
- quién decide: la posición del dato decide cuánto pesa
- qué cuesta: pegas tres páginas y culpas al modelo del mal resultado
- palanca: instrucción arriba y repetida abajo; recorta el contexto
- concepto: ventana de contexto, curva en U
- MEDIBLE por mí + Liu et al. TACL 2023

### Por qué esta serie es la mejor apuesta del arco
1. Ganancia aplicable pura — la emoción con más guardados (4.5-5.3% medido).
2. Está saturada de recetas SIN evidencia; medir es un hueco enorme y es tu terreno.
3. Cinco de los siete los puedo medir yo en esta máquina, gratis y hoy.
4. Encaja perfecto con el formato forense: cada video rompe una creencia con un número.
