---
name: formato-viral-2026
description: Reglas de formato y operación para que los videos de IA de José crezcan en TikTok 2026. Consúltala ANTES de generar o ajustar guiones (Rama A), tocar GUION_PROMPT, o planear la subida. Cubre hook, anti-slop visual, gancho de guardado, voz, duración, hashtags, y el calentamiento/cadencia de una cuenta nueva.
---

# Playbook de formato viral 2026 (canal de IA en español, LATAM)

Basado en investigación cruzada (algoritmo TikTok 2026 + creadores de IA virales) tras el
fracaso de la semana 1. El nicho de IA en español está **poco saturado** = oportunidad real.

## Contenido (mayormente ya en GUION_PROMPT de generate.py — revísalo al tocarlo)
- **HOOK 0-3s = COLD-OPEN (regla jul-2026, nacida de métricas reales):** la escena 1 es ~2s de
  `kinetic`/`big_text`/`receipt` con el dato MÁS brutal; el host entra en la escena 2. MEDIDO en
  el video 1 publicado: abrir con el presentador perdió al 50% en el segundo 2 (avg watch 8.9s
  de 35s, full-video 3.8%). Primera frase ≤8 palabras, **keyword en voz alta en los primeros
  5s** (ASR = búsqueda gratis) y en texto en pantalla. **Resultado/demo PRIMERO** + INMEDIATEZ:
  pagar un dato antes del segundo 3.
- **ANTI-SLOP (crítico):** prioriza pantalla propia — `screen_demo` (herramienta REAL, skill
  `grabar-demo`), `diagram`, `big_text`. La foto-IA (`image`) **máx 1-2 por video**. El
  slideshow de foto-IA + voz es el patrón "AI slop" que TikTok clasifica como baja calidad y no
  reparte.
- **EJEMPLO REAL:** prefiere `screen_demo` (ChatGPT de verdad) sobre la animación `prompt`.
- **GANCHO DE GUARDADO:** "guarda esto" + prompt copiable en pantalla (en 2026 los guardados y
  compartidos amplifican más que los likes).
- **SIN OUTRO** de despedida (provoca swipe antes de completar); CTA de seguir **tejido** en la
  última escena de valor. Loop al inicio si se puede (re-plays = watch time).
- **Duración:** 28-34s (modo `corto`) — la FINALIZACIÓN es la señal #1 del algoritmo 2026
  (umbral viral ≈70%); 60-90s (modo `largo`, para monetización) solo cuando la retención esté
  probada.
- **Hashtags:** 3-5 alineados con lo que se DICE en el video (TikTok cruza
  transcript↔caption↔hashtags: +30-60% alcance); mezcla 1 nicho + 2-3 medios + 1 masivo,
  **NADA de #fyp**.
- **Ritmo:** REGLA DE LOS 3 SEGUNDOS (Kumar: 6 videos → 1M): cambio visual cada ~3s (techo
  3-4s), zooms progresivos, cero silencios muertos. Rotar el "esqueleto" cada 3-4 videos.

## Motor v2 (jul-2026 — TODO guion nuevo lo usa; detalles en GUION_PROMPT y CLAUDE.md)
- **Beats** `hook→proof→giro→tesis→cta` por escena (`beat_type`): activan la CURVA DE VOZ
  (hook 0.96× grave → desarrollo 1.08× → tesis 0.94× con peso) y pausas dramáticas.
- **Regla de realidad:** lo real se muestra real — `screen_demo`/`receipt` (screenshot/Apify);
  jamás imagen IA de un producto real. `cutout`/`mascota` solo conceptos.
- **Visuales Remotion:** `kinetic` (LA tesis, <10 palabras quotable), `terminal` (comandos
  reales en inglés), `receipt`, `cutout`, `mascota` (máx 1-2/video).
- **hook_headline** (titular 2 líneas sobre el host) + **music_prompt** (cama Lyria por video).
- **Misión pública** (`branding.mision`): CTAs como episodios de la misión — que quieran
  VERNOS ganar (la táctica del millón de Kumar).
- **Música del lenguaje** (Alborná 6M): frases mediana ~11 palabras, palabra-tema ×3, ≥3
  números, tríada anafórica en cierres emotivos, caption = respuesta a la última frase.
- **Copys:** 3 líneas (73% decide ahí) + variante comment-gate alternada como experimento.

## Neuromarketing (curso Héctor Peña, jul-2026 — ya cableado en GUION_PROMPT)
- **85-95% de la decisión es subconsciente**: emoción primero, dato después. La emoción más
  intensa = MIEDO (y el mayor: a lo DESCONOCIDO) → el hook lo toca, el video lo desaparece.
- **10 necesidades reptilianas**: cada video ancla 1-2 (exploración, pertenencia,
  control/orden, protección/seguridad, poder/reconocimiento).
- **Anclaje** (número grande primero), **aversión a la pérdida** (2× más potente que ganar),
  **tiempo > dinero** (audiencia profesional), **posición serial** (fuerte al inicio y final),
  **facilidad cognitiva** (números redondos, subs ≤3 palabras), **certeza por patrón** ("3
  herramientas, 1 ganadora" + progreso), **tasa base** (caso concreto antes que estadística),
  **efecto enfoque** (UNA promesa), **disonancia** ("crees X pero haces Y").
- **CTA IMPLÍCITO** (feedback de José 21-jul + dato del curso: CTA directo = −15% y TikTok lo
  penaliza): PROHIBIDO "guárdalo"/"sígueme"/"comenta"/"dale like" hablados o en el copy. El
  guardado se siembra con NECESIDAD FUTURA ("el día que te pregunten, vas a querer tener
  esto"); el follow, con el bucle abierto ("mañana: X" — la serie implica seguir); el
  comentario, con la pregunta A-o-B + POSTURA propia ("yo digo que calcula"). La tarjeta
  `save` lleva beneficio, no imperativo (el ícono bookmark ya insinúa).
- **Comentarios**: pregunta BINARIA A-o-B respondible en 1 palabra + postura propia + darle
  poder ("el que gane decide el próximo video" = ilusión de control). **Re-watch**: loop + un
  detalle denso que solo se capta al re-ver (replay rate >1.2 dispara distribución).
- **Marca personal + rigor** (José): el canal es un ingeniero de IA mexicano rumbo a máximo
  exponente de IA en LATAM — cada guion lleva UNA frase de experiencia/postura propia, términos
  técnicos CORRECTOS (las metáforas se etiquetan como metáforas y el término real se dice),
  cifras verificables. "No todo lo viral conviene, pero todo lo AUTÉNTICO construye valor."
  Viralidad = alcance; rigor = autoridad. Tutorial paso a paso cuando el tema es un CÓMO
  (+85% finalización).

## Fórmula de viralidad (Módulo 9) + métricas (Módulo 10)
- Viral = **bello/útil/inspirador/gracioso** Y ADEMÁS **muy humano (emocional) o muy raro
  (sorprendente)** — los extremos funcionan, el punto medio no.
- Filtro de trends: sentido común · pertinencia · tiempo (súmate en el PICO) · creatividad
  (giro propio, jamás copia). Valor = experiencia real que "la audiencia pagaría por tener".
- Datos del curso: hooks +65% retención · música de tendencia +45% alcance · tutorial paso a
  paso +85% finalización · CTA directo −15% engagement.
- **Horarios heatmap (curso) + México (fuentes 2026)**: Muy Alto = Lun 18-20h, Jue 21-23h,
  Vie 18-20h, Sáb 21-23h; bloques México 12PM y 9-11PM. Consistencia > hora exacta.
- **Regla de José 120/120**: >120 likes en los primeros 120 min = éxito; 2h sin ~1 like/min =
  muerto. Benchmarks educativo 2026: retención media 40%+ (30-60s) / 50%+ (<30s); caída >30%
  en los primeros 3s = hook fallido; checkpoint 24h: ~35% completion + engagement ≥1.5% pasa
  al pool de 5-10k.
- **Etiqueta AIGC**: el rostro D-ID es IA realista — activar el toggle "contenido generado con
  IA" al subir; sin etiqueta TikTok reduce distribución o elimina (C2PA detecta).

## Voz (fix #1 de retención) — ver skill `voz-tts`
NUNCA voz robótica. HOY: voz CLONADA de José en ElevenLabs (`JXJizDZeZ1VEyaHJQIYE`) con
settings anti-muletillas (stability .60 / style .10 — style alto generaba "je je") + curva
por beat (`tts.elevenlabs.by_beat`) + adeclick en masterización. QC de voz: análisis
multimodal del video final con Gemini (detecta muletillas con timestamp).

## Operación de cuenta nueva (la mitad del problema, no es código)
- **Calentar 5-7 días** usando la app como humano ANTES de publicar en serie (scroll en "Para
  ti", likes, comentarios, seguir 15-30 cuentas del nicho: Dot CSV, @javadex, Xavier Mitjana).
- Publicar **1-2/día, NO en lote**, a horas distintas. **Subir NATIVO desde el celular** (no
  automatización de navegador — eso fue parte del fracaso).
- **Presente la 1ª hora** de cada post respondiendo comentarios (dispara señales tempranas).
- **Mismo nicho 10-15 videos seguidos** (no saltar de tema).
- Truco: sonido en tendencia a volumen bajo bajo tu voz (se hace en la app, no se programa).

## Motor de hooks + video IA (20-jul-2026, mandato "hooks espectaculares")
- `generate.hook_engine`: Gemini diseña 4-5 cold-opens (número-ancla / recibo real /
  animación a medida / video Omni / libre) y un JUEZ DE RETENCIÓN elige contra el original.
  El guion puede bloquearlo con `"hook_locked": true`.
- `visual_type:"veo"` = clip de video IA 9:16 (Gemini **Omni Flash** primario vía Interactions
  API, Veo 3.1 fast de fallback — ambos validados): úsalo en 1-2 escenas de CONCEPTO por video
  y como candidato de hook. SOLO conceptos/metáforas (regla de realidad). Prompt en inglés con
  "dark tech aesthetic, neon cyan and magenta, near-black background, no text, no people".
- `visual_type:"kinetic_video"` (componente `KineticOverVideo` escrito por codex) = **cold-open
  estrella**: tipografía cinética sobre clip Omni en movimiento (doble capa). `"video"` = ruta
  local para reusar un clip pagado; `"veo_prompt"` para generar uno. Degrada a kinetic plano.
- Arquetipos de hook (Kallaway): investigador/secreto, contrarian, mago/resultado,
  experimentador ("probé X"), fortuneteller (predicción), teacher — ROTAR entre videos.

## Lo que hacen los top informativos 2026 (y nuestro plan)
Medido en Moris Dieck (ganador Aprende en TikTok MX 2026), Pulpo Culto, Jon Hernández,
@javadex (12% engagement), Riley Brown, Humphrey Yang, Nate B Jones:
- **Video-respuesta a comentarios** (+41% engagement; convierte el comment-gate en guiones
  infinitos) → PRÓXIMO módulo del pipeline.
- **Carruseles Photo Mode** (5× alcance, listicles = rey del save, costo ~0 con nuestro
  motor) → PRÓXIMO: generar carrusel del mismo guion.
- **Largo ocasional 3-4 min** cuando el tema lo pide (long-form ya es 18% del watch time,
  2.4× comentarios) → usar modo `largo` 1 de cada ~5 videos.
- **Racha/experimento público** ("probé X 30 días", Humphrey: 260 días seguidos) → formato
  serie-reto; encaja con la misión pública.
- **Lo-fi auténtico**: 73% de 18-34 confía más en lo "filmado con teléfono" que en lo pulido
  → mezclar tomas reales crudas de José entre videos con avatar (mitiga el riesgo D-ID).
- **Responder comentarios técnicos con profundidad** la 1ª hora (motor del 12% de javadex).
- Velocidad sobre noticia: publicar EL DÍA del lanzamiento (ventana <72h = 3-5×).
- IA dirigida por humano 3.1% engagement vs 1.9% IA pura — el presentador real + material
  real ES la estrategia correcta.

## Referente de formato a copiar
Riley Brown (demo de pantalla): logo grande de la herramienta → "voy a hacer X" → lo hace en
vivo → cierre. Es justo lo que ahora produce `screen_demo`.

Datos/fuentes: memorias `canal-fracaso-semana1-rediseno` y `crecimiento-tiktok-2026`.
