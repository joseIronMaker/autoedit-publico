# Serie 2 — "Cómo la IA aprendió a LEER" (19 videos)

Continúa la serie de Deep Learning. Hilo conductor único en los 19: **"Está increíble… para
dormirse"** — una frase que rompe a cada generación de IA y que en el video 19 se resuelve
sin entrenar nada, solo escribiendo. Temario en `series/como_la_ia_aprendio_a_leer/serie.json`.

## Producir un video (un solo comando)

```bash
.venv/bin/python scratchpad/producir_serie2.py ln03      # genera + Rama B + entrega
```

Hace: `autoedit-gen --guion` → `autoedit --auto` → copia a Descargas como
`leerNN_<slug>.mp4` + `leerNN_copy_tiktok.txt` → deja una tira de QC en
`scratchpad/qc_<slug>.png` para revisar de un vistazo.

**Después de producir, SIEMPRE:**
1. Ver la tira de QC (escenas rotas, texto encimado, paleta mezclada).
2. Revisar el copy que generó Gemini: suele arrancar con "Y por eso…" y no menciona el
   hilo de la serie. Reescribirlo a mano (3-4 líneas + pregunta A-o-B con postura propia
   + hashtags, sin "guárdalo/sígueme/comenta").
3. Comprobar la duración: objetivo 28-34 s.

## VOZ — resuelto el 27-jul, NO volver a tocarlo sin preguntar

`config.yaml` quedó en **`eleven_multilingual_v2` + `single_take: true`** (stability .45,
style .3, sin `speed`). José validó de oído:

- **`eleven_v3` está DESCARTADO.** Es más expresivo (5.96 vs 3.78 semitonos de variación)
  pero sube el tono medio de 124 a 154 Hz y deja de sonar a él: *"no es mi voz ya"*.
- Aprobados por él: `Descargas/prueba_voz/ES_TU_VOZ_v2_tomaunica.mp3` y
  `VIDEO_2_tomaunica_v2.mp3`.
- La **toma única** (una petición para todo el video, cortada por alineación de caracteres)
  arregla el encadenado, no lo plano. Medido en ln01: antes el EDL hallaba 5 silencios
  muertos entre escenas (5.3s de 48.7s), ahora 1 (0.6s, el final).

**PENDIENTE de José:** lo plano viene de que `branding/voz_ref.mp3` dura **40.6 s** y el clon
nunca aprendió su rango. Se le dejó `Descargas/prueba_voz/GUION_PARA_CLONAR.txt` (~4 min de
lectura). Si lo graba, hay que re-clonar ANTES de producir el resto — si no, los videos salen
con el mismo defecto que él mismo señaló como el peor. Preguntarle si ya lo grabó.

## Ojo con la duración

Con toma única los videos salen **~39s**, no 28-34: hay menos silencio que cortar. Va en la
dirección que apuntan los referentes de José (mediana 58s, ver memoria
`diagnostico-semana2-referentes`), pero rompe el objetivo con el que se escribieron los
guiones. Si él quiere 34s, hay que recortar narración en los 19 JSON.

## Estado

| # | guion | tema | estado |
|---|-------|------|--------|
| 01 | ln01_frase_rompio_ia | neon | **ENTREGADO con voz nueva** (27-jul, 39.4s) |
| 02 | ln02_orden_lo_es_todo | ambar | REHACER — el `leer02_*.mp4` de Descargas trae la voz vieja troceada; el fuente está en `scratchpad/serie2_v1_descartados/` |
| 03 | ln03_palabras_a_numeros | menta | pendiente |
| 04 | ln04_neurona_con_memoria | carmin | pendiente |
| 05 | ln05_backprop_en_el_tiempo | hielo | pendiente |
| 06 | ln06_olvidaba_el_principio | selva | pendiente |
| 07 | ln07_lstm_compuertas | violeta | pendiente |
| 08 | ln08_tres_defectos | sunset | pendiente |
| 09 | ln09_atencion | cyber | pendiente |
| 10 | ln10_query_key_value | matrix | pendiente |
| 11 | ln11_numero_que_decide | neon | pendiente |
| 12 | ln12_donde_quedo_el_orden | ambar | pendiente |
| 13 | ln13_varias_cabezas | menta | pendiente |
| 14 | ln14_el_transformer | carmin | pendiente |
| 15 | ln15_datos_gratis | hielo | pendiente |
| 16 | ln16_sin_gpu_fine_tuning | selva | pendiente |
| 17 | ln17_hacerlo_gigante | violeta | pendiente |
| 18 | ln18_lo_que_aprendio_solo | sunset | pendiente |
| 19 | ln19_de_llm_a_agente | cyber | pendiente |

Ninguna paleta se repite en videos seguidos. El estilo gráfico y la música también cambian
en cada uno (feedback de José: "siempre muy repetitivo el color, los estilos y música").

## Trampas ya conocidas (no volver a caer)

- **ml_demo sin regex.** Un `token_pattern` con `\b` se corrompe al escapar por JSON y
  CountVectorizer se queda sin vocabulario. Usar `analyzer=str.split`. El validador
  (`scratchpad/validar_guiones.py`) rechaza cualquier doble backslash.
- **No empezar una tesis con "La IA".** Con la voz lenta de tesis, ElevenLabs mete una
  pausa dentro y Whisper transcribe "ella" → el subtítulo sale mal en la frase más
  importante del video.
- **Paletas duplicadas** en `diagrams.py` y `remotion/src/theme.ts`. Si solo está en una,
  los beats salen con la paleta por defecto sin dar error. `remotion_themes()` avisa.
- **El video 19 necesita una respuesta REAL** de un modelo en su escena de terminal; se
  captura al producir y se pega literal (ver `_nota_produccion` en el guion).
