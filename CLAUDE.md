# autoedit — notas para desarrollo

## El método: `estudio/` (desde 2-nov-2026)

José lo aprobó con el capítulo 3 de «Cómo aprende una máquina»: "es una joya… establécelo como el método".
**Todo video o serie nueva se hace así**, con las skills `estudio-pieza`, `animar-con-codigo`,
`voz-narradora` y `cuento-animado`, y los comandos `/crear-video` y `/crear-serie`.

1. Una idea que incomode, no un tema; y una imagen central que se transforme.
2. Guion escrito a mano y comprobado contra la fuente. La voz se graba en una toma y Gemini la escucha.
3. Animación: código propio en `estudio/remotion/src/<pieza>/`. Sin esquema de escenas, `visual_type` ni plantillas.
   `kit.ts` y `marca.tsx` son herramientas, no moldes.
4. Sonido en `partitura.py`: foley sintetizado desde el mismo tiempo que el dibujo y música de Lyria verificada.
5. `estudio/kit_termina.sh <id>`: render, integridad, movimiento, volumen, final cerrado, copy y escucha de cortes.
6. Abrir los cuadros y mirarlos. Nada se da por bueno solo porque el comando terminó.

Referencia de nivel: `estudio/remotion/src/serie/c03/Pieza.tsx`. Listón externo: `scratchpad/_referentes/fuente/r6.mp4`
y `r2.mp4`. Y lo que José oyó y yo no: pausas a media palabra, finales en suspenso. Por eso existe `kit_escucha.py`.

Todo lo que sigue describe el motor anterior (`autoedit/`). Sus reglas de formato (duraciones,
beats, conteos, hook obligatorio) NO atan al motor nuevo; sus reglas de honestidad y sus trampas
técnicas medidas (WSL2, Remotion, Chrome huérfano, TikTok Studio) siguen vigentes. Los videos,
clips pagados y `.assets` que menciona se borraron el 2-nov-2026 por orden de José.

---

Estudio de video automático del canal de IA de José. Dos ramas del plan maestro:
- **Rama B** (editar grabaciones): faster-whisper local → Gemini (cortes/énfasis/clips/
  copys) → ffmpeg (subtítulos ASS karaoke).
- **Rama A** (generar desde un tema): Gemini guion → TTS + imagen por escena → ffmpeg
  Ken Burns 1080×1920 → el resultado (`gen_*.mp4`) entra al flujo de la Rama B.

Código con nombres en inglés, mensajes/UI/docs en español.

## Comandos

```bash
source .venv/bin/activate                 # venv creado con uv (no hay python3-venv de sistema)
uv pip install --python .venv/bin/python -e .   # reinstalar tras tocar pyproject
autoedit video.mp4 --clips --auto         # pipeline completo por CLI
autoedit-web                              # UI web en http://localhost:8765
```

Prueba rápida sin grabar: `prueba.mp4` (voz TTS sintética) y `primero.mp4` (video real
de José) están en la raíz con sus `.autoedit/` ya generados.

## Estructura

- `autoedit/cli.py` — entrada CLI; orquesta transcribe → edl → clips → render → copys
- `autoedit/transcribe.py` — faster-whisper, timestamps por palabra
- `autoedit/edl.py` — cortes por silencio (local) + cortes/énfasis de Gemini; escribe `edl.json`
- `autoedit/clips.py` — Gemini propone clips autocontenidos; escribe `clips.json`
- `autoedit/copys.py` — copys TikTok/IG/FB (plantillas del plan maestro §6); escribe `.md` y `.json`
- `autoedit/subtitles.py` — genera ASS karaoke (grupos ≤3 palabras, `\kf`, énfasis en color)
- `autoedit/render.py` — keep-segments (complemento de cortes), remapeo de timestamps a la
  línea de tiempo cortada, filtergraph ffmpeg (trim+concat+ass+loudnorm+zoom alternado)
- `autoedit/generate.py` — Rama A completa (`autoedit-gen`); guion con hook_tipo + beat_type
  (hook/contexto/proof/giro/tesis/cta) + hook_headline + music_prompt, escenas en `gen_*.assets/`.
  `visual_type` por escena: `image` (Ken Burns) · `diagram` · `screen_demo` · `big_text` ·
  `custom` (código) · `host` (presentador) · `ml_demo` (ML real) · **beats Remotion**: `kinetic`
  (tipografía cinética, para la TESIS) · `terminal` (typewriter+progreso) · `cutout` (cartoon
  recortado codex+rembg, solo CONCEPTOS) · `mascota` (robot pixel del canal) · `receipt`
  (screenshot REAL en mock de navegador con highlight) · `lottie` (animación profesional
  .json de After Effects/LottieFiles: `{"file": "ruta.json", "title", "caption"}`). Tras
  `_assemble` aplica `continuous_base_audio` (+ whoosh en uniones) y la cama Lyria del video
- `autoedit/diagrams.py` — diagramas animados frame a frame con PIL (flow/list/compare/bars/
  neural_net/big_text), mismos parámetros de encode que Ken Burns para concatenar con -c copy
- `autoedit/host.py` — anfitrión talking-head vía **D-ID API** (rostro real de José + voz clonada,
  lip-sync). Key `DID_API_KEY` en `.env`. USAR SIEMPRE la API (la UI Studio se cuelga)
- `autoedit/host_layout.py` — formato **presentador-retención** (`visual_type:"host"`): composite
  rostro D-ID abajo + animación de marca arriba (`host_top` kind `duo`|`save`) + subtítulos;
  `delogo` quita el logo D-iD (el plan Lite no lo remueve); `continuous_base_audio` = audio PCM
  continuo calzado a la duración de cada video (sin cortes en transiciones)
- `autoedit/ml_demo.py` — `visual_type:"ml_demo"`: EJECUTA código real (numpy/sklearn/matplotlib/
  seaborn con paleta neón inyectada) y lo muestra como escena editor→gráfica. Para IA predictiva/
  ML clásico. Degrada a big_text si el modelo falla
- `autoedit/publish.py` — copia un video APROBADO a `Descargas/videos/NN_titulo/` (mp4 + copy.md).
  Comando `/publicar`. Se corre solo al aprobar (no automático)
- `autoedit/series.py` — temario de series con Gemini; estado en `series/<slug>.json`;
  la cola vive en server.py (`series_start`, un video a la vez, reanudable). El LARGO de
  la serie lo decide EL TEMA (3-8 videos, `n` opcional) — jamás 5 fijo (mandato de José)
- `autoedit/topics.py` — agente de temas: búsqueda web grounded (google_search tool de
  Gemini) + estructuración JSON; diario vía hilo scheduler en server.py; on/off en
  `topics/agent.json`
- `autoedit/model_router.py` — ÚNICA puerta a Gemini (texto JSON, TTS, imagen, MÚSICA Lyria,
  VIDEO Omni/Veo); modelos pineados + fallbacks; TTS devuelve PCM s16le 24 kHz mono;
  `generate_music` devuelve mp3 (~30s; Lyria responde part[0]=tag texto, part[1]=inline_data
  audio/mpeg); `generate_video_clip` devuelve mp4 9:16 — primario `gemini-omni-flash-preview`
  vía **Interactions API** (`client.interactions.create` con `response_format`
  `{type:"video", aspect_ratio, duration}`; el mp4 llega en `interaction.output_video`
  base64), fallback Veo 3.1 por `generate_videos` long-running. Ambos VALIDADOS 20-jul-2026
- `autoedit/remotion/` — proyecto Remotion 4 (React, npm, node_modules gitignored). Composiciones:
  `Diagram` (los 6 diagramas estructurados), `Beat` (kinetic/terminal/cta/receipt/cutout/mascota),
  `TopBand` (banda 1080×660 del composite presentador, kind `headline`). Assets dinámicos via
  `public/dyn/` (staticFile). SIN backdrop-filter (parpadea en headless); grano SVG anti-banding
- `autoedit/remotion_scenes.py` — runner Python↔Remotion: `render_remotion_scene` deja el
  segmento en el MISMO contrato de encode que `render_diagram_scene` (mux de narración incluido);
  `render_top_band` para host_layout; `stage_asset` copia a public/dyn (se limpia tras render)
- `autoedit/music_gen.py` — cama musical por video: clip Lyria + acrossfade×4 (~115s) →
  `<stem>.assets/music.m4a`; render.py la usa con PRIORIDAD sobre la cama global
- `autoedit/codex_client.py` — delegación a Codex CLI headless (`codex exec`): imágenes con el
  plan ChatGPT de José (costo $0, no gasta Gemini); fallback a Gemini si falla
- `autoedit/real_assets.py` — material REAL: `screenshot` (Chrome headless), `fetch_photos`
  (Apify google-images-scraper, `APIFY_TOKEN` en .env), `fetch_video` (yt-dlp del venv)
- `autoedit/win_browser.py` — puente al Chrome **REAL de Windows** desde WSL2, para que
  `screen_demo` grabe herramientas con sesión iniciada (regla de realidad). El puerto CDP
  9222 NO se alcanza por el gateway (NAT+firewall), pero `powershell.exe` sí corre desde WSL
  y habla con `127.0.0.1` del lado Windows; el websocket lo sostiene PowerShell con
  `System.Net.WebSockets.ClientWebSocket`. Perfil de automatización `C:\autoedit-chrome`
  (José inicia sesión UNA vez). Tres restricciones MEDIDAS: (1) `MachinePolicy = AllSigned`
  por directiva de grupo → los `.ps1` sin firmar no corren y `-ExecutionPolicy Bypass` se
  ignora: TODO va por `-EncodedCommand` (base64 UTF-16LE); (2) `powershell -Command -` lee
  stdin línea por línea y rompe los bloques `do/while`; (3) PowerShell en español usa coma
  decimal → los tiempos de frames viajan como milisegundos ENTEROS. Las pestañas se crean con
  `Target.createTarget`, no con `/json/new` (Chrome 151 exige PUT ahí)
- `autoedit/web/server.py` — FastAPI; jobs en hilos con estado en dict (`_jobs`)
- `autoedit/web/static/` — Vue 3 SIN build (vue.js empaquetado local); index.html + app.js + styles.css

## Datos que produce

- `usage.jsonl` (gitignored) — costo real por llamada a Gemini; lo escribe ModelRouter y
  lo lee `GET /api/costs` (visible en el sidebar de la web).
- `experiments.jsonl` — registro §7 del plan por video generado (hook_tipo, keyword,
  duración, serie); las métricas se completarán con el bucle de analítica.
- Los JSON compartidos entre workers y el poll de la web se escriben SIEMPRE con
  `util.write_json_atomic` (nunca `write_text` directo).

## Reglas del proyecto

- **Ningún nombre de modelo fuera de `config.yaml`** (los previews de Gemini deprecan con
  ~2 semanas de aviso). Todo LLM pasa por `ModelRouter.generate_json`.
- Los cortes en `edl.json` soportan `"disabled": true` (los pone la UI web); `keep_segments`
  los ignora. No eliminar esa semántica.
- Los subtítulos SIEMPRE se generan sobre timestamps remapeados post-corte (`remap_words`),
  nunca sobre los originales.
- Colores de subtítulos en formato ASS **BGR**, no RGB.
- La revisión humana del EDL es deliberada (QC del plan maestro): no automatizarla por defecto.
- imports pesados (faster_whisper, google.genai) van dentro de funciones, no a nivel de módulo.
- Los endpoints que lanzan trabajos usan `_claim()` (check+set atómico bajo lock), no
  `_busy()` + `_set_job()` separados: evita dobles pipelines por doble clic.
- Los stems de videos generados son únicos GLOBALMENTE (`avoid_stems=_all_stems()`):
  jamás debe existir el mismo stem en `videos/` y una serie.
- **Formato presentador** = default del canal: rostro de José (`host`) SOLO en el remate del
  hook y el CTA (antídoto al "IA-total" de la semana 1 + ahorra créditos D-ID). NO full-screen:
  siempre composite (animación de marca arriba). La cara usa `branding/host_jose.png`.
- **REGLA COLD-OPEN** (métricas reales 19-jul: host en escena 1 = −50% de audiencia en el
  segundo 2): la escena 1 SIEMPRE es ~2s de `kinetic`/`big_text`/`receipt` con el dato más
  brutal; el host entra en la escena 2. Ya cableada en GUION_PROMPT y skills.
- **Cama musical CONSTANTE** (`render.py`), nunca con sidechain/ducking: el ducking sube la
  música en las pausas y la baja de golpe al volver la voz → se oye como corte entre temas.
  Electrónica en `autoedit/assets/bed_electronico.m4a`; volumen en `config.yaml` (`music_gain`).
- **Optimizar recursos** (mandato de José): reusar audio existente, no re-gastar ElevenLabs/D-ID
  en regeneraciones; poner el rostro solo donde aporta, sin sacrificar calidad.
- **REGLA DE REALIDAD** (mandato de José): herramientas/productos/sitios/personas REALES se
  muestran con material REAL — `screen_demo` (grabar pantalla), `receipt` (screenshot/foto
  Apify) o video fuente (yt-dlp). PROHIBIDO representar cosas reales con imagen IA o cartoon.
  `cutout`/`mascota`/`image`/`veo` solo para conceptos y metáforas. Y no publicar recibos de
  claims no verificables (si la URL oficial no existe/está gated, se pivotea el tema).
- **MOTOR DE HOOKS** (`generate.hook_engine`, mandato "hooks espectaculares"): antes de
  producir, Gemini diseña 4-5 cold-opens alternativos (número-ancla, recibo real, animación a
  medida, texto-sobre-video, libre) y un juez de retención elige contra el original (candidato
  0); se salta con `"hook_locked": true` en el guion. `visual_type:"veo"` = clip Omni/Veo 9:16
  (máx 1-2 por video, SOLO conceptos; degrada a big_text en hook o a `image` en el resto).
  `visual_type:"kinetic_video"` = el cold-open estrella: tipografía cinética SOBRE un clip
  Omni en movimiento (beat Remotion `KineticOverVideo`, escrito por codex; acepta `video`
  ruta local para REUSAR clips ya pagados o `veo_prompt` para generar; degrada a kinetic).
- **Motor Remotion** (`generate.remotion` en config): diagramas y beats se renderizan con
  Remotion (npx desde `autoedit/remotion/`, SIEMPRE con
  `--browser-executable=/usr/bin/google-chrome` — el unzip interno de Chromium está roto en
  WSL2); PIL queda de fallback automático. Los beats degradan a big_text si Remotion falla.
  VELOCIDAD MEDIDA (2-ago, máquina limpia): **6.3 fps** un beat normal, **2.6 fps** uno con
  Lottie → ~3 min por video de 40s. Si ves renders de 20-30 min, NO es WSL2: busca procesos
  de Chrome huérfanos de renders anteriores (`ps -eo etime,comm | grep chrome`) comiéndose
  los núcleos, y mátalos. Evaluado y DESCARTADO migrar a HyperFrames (heygen): misma
  arquitectura (HTML→Chrome→ffmpeg) y su única ventaja real (Lottie/GSAP/Three) ya está
  disponible dentro de Remotion con `@remotion/lottie`, sin rehacer el contrato de encode.
- En componentes Remotion PROHIBIDO `filter: blur()` y `drop-shadow()` (el raster por
  software de WSL2 tira tiles → rectángulos opacos tapando la escena; además 2.5× más
  lento). Glows y sombras = `radial-gradient` puro. Y NO usar `--gl=swangle` (10× más lento).
- **`codex_image` trabaja en un TEMPORAL, no en la carpeta destino** (24-ago-2026): corría
  con `-C` sobre `*.assets` y la instrucción "no crees ningún otro archivo" hacía que codex
  BORRARA los PNG ajenos — dos generaciones en paralelo sobre la misma carpeta se pisaban y
  el fallo era mudo (la imagen se creaba bien y desaparecía segundos después). Genera en un
  `TemporaryDirectory` y copia al final.
- **Delegación a codex** (mandato de José): imágenes cartoon/mascota y código de animaciones
  se delegan a Codex CLI (`codex exec`, plan ChatGPT = $0); también registrado como MCP server
  de Claude Code (`codex mcp-server`). Gemini queda de fallback de imágenes.
- La mascota del canal vive en `branding/mascota/<pose>.png` (neutral/profesor/cartel/pensando/
  celebra/error, PNG alpha 1254px, pixel-art cian/magenta). Regenerarla solo con codex y
  manteniendo el diseño.
- SFX (`autoedit/assets/sfx/`): el whoosh de transición se mezcla en `continuous_base_audio`
  (pista PCM continua), NUNCA por segmento (los re-encodes lo perderían).
- Estructura de guion v2.2: beats hook(cold-open + host)→proof(recibos con números)→giro→
  tesis(kinetic, <10 palabras, quotable)→cta; REGLA DE LOS 3 SEGUNDOS (ningún tramo >3-4s sin
  cambio visual); duración objetivo 60-95s — el 28-34s original ya NO describe lo que funciona (José 17-ago-2026 leyendo Studio: "aunque duran más se han visto más los de más duración que los de 30s"; y los 9 referentes del nicho: mediana 58s); copy en 3 líneas con
  pregunta BINARIA A-o-B + postura propia; MISIÓN PÚBLICA del canal en `branding.mision`.
- **DOCENCIA: el video ENSEÑA, la cifra solo ancla** (José 16-ago-2026, viendo la serie de
  agentes terminada: "no explica; en el de los agentes qué es un agente, se la pasa diciendo
  cosas de mediciones"). La regla de "ninguna cifra sin recibo" era sobre DE DÓNDE SALE EL
  DATO y se convirtió sin querer en QUÉ SE CUENTA: cuatro videos de agentes y ninguno define
  qué es un agente. Cada guion necesita (a) una escena que DEFINA la cosa, (b) una de
  MECANISMO en verbos de proceso (lee, manda, devuelve, repite) y (c) UNA cifra de ancla.
  Prueba del amigo: si al quitar los números el video se queda sin nada que decir, está mal.
  BLOQUEANTE en `critico.py` (`DEFINE`/`PROCESO`/`CIFRA` → `ok_define`, `ok_mecanismo`,
  `ok_balance`) y en `validar_guiones.py`. Medido sobre lo publicado: pro01 y pro03 cero
  definiciones, cero mecanismo, 5 de 6 escenas con cifra. Y el ARNÉS (cuántos beats y en qué
  orden) sale DEL TEMA, no de la plantilla de seis — "muy similares" fue el otro veto.
- **ChatGPT SIN CUENTA sirve para `screen_demo`** (medido 16-ago-2026): el perfil
  `C:\autoedit-chrome` no tiene sesión de ChatGPT ni de Gemini, pero chatgpt.com deslogueado
  igual acepta el prompt y responde. Eso desbloqueó pro02 sin que José iniciara sesión, y
  encima el espectador puede reproducir la demo sin pagar nada.
- **EL VIDEO NO ES UN EXPERIMENTO** (José 17-ago-2026, segunda vez que lo dice: "siempre tus
  videos son medí el siguiente prompt 90 veces"). La regla "ninguna cifra sin recibo" tiene un
  efecto secundario que se comió el canal: la única prueba que se puede fabricar en solitario es
  un script que mide algo, así que TODO video terminó siendo un reporte de laboratorio. MEDIDO
  sobre lo escrito: **12 de 13 títulos** de las últimas cuatro series son un experimento mío
  ("Medí los 4 trucos", "Pedí 40 historias", "Le vacié la memoria 12 veces"); los **19** de la
  serie de lenguaje, escritos como clase, **ninguno**. El eje de un video es la PREGUNTA que la
  gente hace + la DEMOSTRACIÓN en pantalla real + la experiencia de José; la cifra es un ancla
  opcional, nunca el esqueleto. BLOQUEANTE: el título no puede reportar cuántas veces se corrió
  algo (`validar_guiones.TÍTULO-EXPERIMENTO`) y un guion admite **máximo 2 escenas con cifra**
  (`critico.ok_balance`, antes toleraba el 75%). El cold-open ya no exige número (GUION_PROMPT):
  prefiere demostración > consecuencia > número, y si es número, del mundo del espectador.
- **GRABAR PRIMERO, ESCRIBIR LA VOZ DESPUÉS** (17-ago-2026, dos videos rotos el mismo día): la
  narración escrita contra metraje IMAGINADO miente sobre pixeles reales. pro04 prometía "otro
  nombre… tres perros distintos" y las dos capturas decían Bruno las dos veces; un diseño de
  agentes describía un menú de ChatGPT que nadie había abierto ('Crear imagen' no existe ahí).
  Se graba, se miran los frames, y con esos frames enfrente se escribe la voz.
- **CTA IMPLÍCITO** (feedback José 21-jul, TikTok penaliza el directo −15%): PROHIBIDO
  "guárdalo/sígueme/comenta/dale like" en narración Y copys — guardado = necesidad futura,
  follow = bucle abierto, comentario = pregunta A-o-B con postura propia. Tarjeta `save` con
  beneficio, sin imperativo.
- **Marca personal + rigor técnico** (José): canal = ingeniero de IA mexicano rumbo a máximo
  exponente de IA en LATAM; cada guion lleva UNA frase de experiencia/postura propia; términos
  técnicos correctos (metáfora etiquetada como metáfora + término real dicho); solo cifras
  verificables. Viralidad = alcance, rigor = autoridad. Contenido de valor = experiencia real,
  jamás información genérica. Filtro de trends (sentido común/pertinencia/pico/giro propio)
  cableado en topics.py.
- **Neuromarketing** (curso Héctor Peña) cableado en GUION_PROMPT: miedo a lo desconocido en
  el hook, 1-2 necesidades reptilianas por tema, anclaje numérico, aversión a la pérdida,
  tiempo>dinero, CTA sin coerción (pie en la puerta, autonomía, propiedad), pregunta A-o-B
  con poder ("gana en comentarios"), detalle de re-watch. Detalle en skill `formato-viral-2026`.
- **Bucle de métricas**: tras 24h de cada publicación, leer TikTok Studio (skill
  `diagnostico-tiktok`) y volcar `resultados` a `experiments.jsonl`. Baseline video 1:
  187 views, FYP 84%, avg 8.9s/35s, caída en 0:02 → origen de la regla cold-open.
- **BIBLIOTECA DE CLIPS PAGADOS**: hay ~76 clips Omni/Veo en `videos/*/veo_*.mp4` que ya se
  pagaron. Antes de generar uno nuevo, buscar ahí: `kinetic_video` acepta `"video": "<ruta
  local>"` justo para reusarlos. La TESIS jamás va como `kinetic` a secas (sale texto blanco
  sobre negro, prohibido): va como `kinetic_video` sobre un clip — reusado si existe uno que
  sirva de metáfora.
- **PALETA SOBRIA** (feedback de José 11-ago-2026: "esos fondos fosforescentes no van, mejor
  sobrios"): el look del canal es documental, no neón. Fondos de grafito/tinta con saturación
  baja, un acento cálido apagado y otro frío; el contraste lo da el VALOR, no el brillo. Vive
  en CUATRO lugares que deben moverse juntos o el video sale con dos looks: `diagrams.THEMES`
  (+ globals RED/GREEN/TEXT/MUTED), `remotion/src/theme.ts`, la paleta de `ml_demo.py` y
  **`config.yaml → generate.image_style`**, que PISA a `generate._IMG_STYLE` y es el que de
  verdad se le manda al generador de imágenes (se quedó neón hasta el 12-ago y sacó fotos
  fosforescentes en el s02 con el resto del motor ya sobrio; `scratchpad/regen_placas.py`
  rehace las placas de una escena con el estilo vigente, gratis). El
  bloom del overlay va atenuado (0.22/0.14), no compuesto a alfa completo: a alfa completo los
  elementos "emiten luz" y ese era justo el efecto rechazado.
- **UN CLIP MÁS CORTO QUE SU ESCENA SE CONGELA, Y NADIE AVISA** (7-sep-2026, los tres
  videos de noticias): `OffthreadVideo` sin `loop` se queda en el ÚLTIMO CUADRO cuando el
  clip se acaba. Medido: los clips del Cybercab duran 4.5 s y sus escenas 20-33 s → **71 s
  de 177 (40%) eran una foto fija**, y el de la escena 2 congelaba en NEGRO (luma 6) durante
  26 s. En `kinetic_video` se sumaba que el rótulo era UNO solo para 27 s. Arreglado en
  `KineticOverVideo.tsx`: `loop` en el video, zoom con `vaiven` de periodo propio (no
  `interpolate` sobre `durationInFrames`) y **`stanzas`** — varias frases repartidas a lo
  largo de la escena, opcional para no cambiar los videos ya aprobados. OJO: el spec se arma
  en DOS sitios (`generate.py` y `scratchpad/rehacer_escena.py`) y hay que tocar los dos, o
  la escena se rehace sin la llave nueva y el fallo es mudo. Verificación: diff medio entre
  cuadros a `scale=80:76` en gris; el cierre pasó de 84% de cuadros parados a 19%.
- **UN 16:9 VERTICALIZADO CON RELLENO DEJA LA IMAGEN EN UN TERCIO** (7-sep-2026): el promo
  de Tesla que mandó José es 1920×1080 y al pasarlo a 1080×1920 con fondo desenfocado, el
  metraje REAL ocupaba el 32% del alto — lo contrario de "que se vea más la conducción
  autónoma". Recortar 1:1 (`crop=1080:1080`) sobre el fondo desenfocado lo sube al 56% y el
  coche sigue reconocible. Y antes de cortar tramos hay que sacar los CORTES del fuente
  (`select='gt(scene,0.2)'` + `metadata=print`): ese promo corta cada 1-2 s, así que
  cualquier tramo de 4-6 s cruza varios planos; los fondos se montan pegando planos limpios
  con el demuxer concat.
- **LA IMAGEN LE GANA A LA ANIMACIÓN** (José 12-ago-2026, tras vetar dos escenas `custom` del
  s01: "si la calidad de tus animaciones está basura, mejor genera con codex imágenes"): el
  DEFAULT visual de un concepto es una FOTO editorial de Codex, no una animación dibujada.
  `custom` solo se permite cuando el movimiento ES el contenido y no hay manera de
  fotografiarlo (gradiente bajando, backprop fluyendo, atención repartiéndose). Una animación
  mediocre se ve amateur; una foto bien encuadrada nunca. Cableado en `GUION_PROMPT`.
- **PLACAS: una escena de imagen NO se queda quieta**. `visual_type:"image"` acepta
  `"image_prompts": [...]` (2-4 fotos) y `generate._render_scene_plates` las encadena con
  disolvencia de 0.6 s sobre la MISMA locución: cambio visual cada ~4 s (regla de los 3
  segundos) por $0, porque las genera Codex. 3 placas si la narración pasa de 8 s. Las
  imágenes se llaman `scene_<i>_<j>.png` y se REUSAN si ya existen (solo se regeneran si el
  QC visual pidió rehacer la escena), así que un re-render no re-gasta.
- **`generate._gen_image`**: toda imagen de escena va por Codex primero (plan ChatGPT = $0) y
  Gemini solo de respaldo. Antes las escenas `image` iban directo a Gemini y solo el
  `showcase` usaba Codex.
- **SERIE 1 = LLMs** (José 12-ago-2026: "las series eran cuatro, la primera era sobre llms").
  Temario en `scratchpad/ARCO_4_SERIES.md`; guiones en `scratchpad/guiones_serie1/`, se
  producen con `scratchpad/producir_serie1.py <sNN>`. Un tema que no sea de modelos de
  lenguaje NO va en la serie 1 (el de "tu banco ya usaba IA" se movió a
  `scratchpad/guiones_parking/`).
- **`screen_demo` NO tiene respaldo, a propósito**: antes degradaba a una ventana de chat
  dibujada (`prompt_demo` / "Prompt en acción") y eso viola la REGLA DE REALIDAD sin que
  nadie se entere hasta abrir el video. Ese camino se eliminó del motor (`generate.py` y
  `diagrams._prompt_demo`). Si la grabación no sale, el video se DETIENE con el motivo.
  `screen_demo._verifica_captura` rechaza las tres fallas mudas: pocos frames, **captura
  congelada** (<3 frames distintos: pasa si grabas después de que llegó la respuesta en vez
  de desde que se escribe el prompt) y **captura en blanco** (muro de login). Por eso
  `screen_demo` queda fuera del QC visual de Gemini: rechazarlo re-grabaría contra la cuenta
  real de ChatGPT.
- **UNA escena mala NO se arregla relanzando el generador** (mandato de optimizar recursos):
  `scratchpad/rehacer_escena.py <stem> <idx>` reusa locuciones, clips pagados y los demás
  segmentos, rehace solo esa escena y re-ensambla. Relanzar `autoedit-gen` re-gasta ElevenLabs
  y Veo aunque el guion sea "el mismo": basta una llave de más en el JSON para invalidar la
  firma de la voz. Para el video final después, `autoedit <mp4> --render` (usa el `edl.json` y
  la transcripción ya calculados: sin Whisper y sin Gemini).
- **ZONA SEGURA DE TIKTOK** (medido 23-ago-2026 sobre el jose06 publicado): la UI de TikTok
  tapa el pie del video — nombre de usuario, copy y barra de progreso arrancan en y≈1594 de
  1920. En el panel inferior del formato "José grabado" (`remotion/src/Panel.tsx`) eso son
  tres constantes que NO se tocan: `SUB_ZONE=168` arriba (subtítulos ASS quemados),
  `SAFE_BOTTOM=330` abajo y `SAFE_RIGHT=104` (riel de corazón/comentar/compartir). La banda
  útil real mide **528 px de alto**: lo que se diseñe más alto se recorta. Solo `photo` y
  `clip` sangran hasta el borde, porque una imagen medio tapada se ve bien y un titular no.
- **EL MOVIMIENTO VA CON PERIODO PROPIO, NUNCA REPARTIDO EN LA DURACIÓN** (medido 24-ago-2026,
  la causa de fondo del "se traban los videos"): un `interpolate(frame, [0, total], ...)` se
  diluye en los paneles largos — un zoom del 13% en 19 s son 0.02% por frame y se lee como
  foto fija (la gráfica de temperatura del jose08 estaba parada 19 s de sus 19). Usa
  `vaiven(t, periodo)` en `Panel.tsx` o tiempo continuo: así un panel de 4 s y uno de 20 se
  mueven igual. Ojo con el Ken Burns sobre GRÁFICAS: con `objectFit: contain` cualquier
  escala > 1 recorta los ejes y el título, que es justo lo que la gráfica enseña — ahí el
  zoom se queda por debajo de 1.0 y el movimiento lo pone el fondo. Cadena medida sobre el
  mismo formato: 58.6% de panel congelado → 23.9% (fondos) → 11.7% (tramas) → ~4%.
  Verificación: `scale=80:76` en gris, diff medio entre frames; < 0.35 es "parado".
- **EL ENCUADRE DEL TIMELAPSE CAMBIA CON EL TRAMO, y los recortes NO se cablean**
  (`scratchpad/timelapse_pantalla.py`, 29-ago-2026): en una sesión larga la ventana de
  arriba deja de ser la app de escritorio y pasa a ser la TERMINAL (que ocupa toda la
  columna, no la mitad), y al final el visor 3D se abre flotando y ya no hay dos columnas.
  Por eso los encuadres son LAYOUTS CON NOMBRE que se declaran por CLI
  (`--layout chat=700x622+250+300/960x853+960+120`, `--layout viz=solo:940x910+730+88`) y
  cada zona elige el suyo (`--zona INI:FIN:FACTOR:NOMBRE`): cada grabación tiene su propio
  escritorio y las constantes de la anterior salen estiradas. En la sesión del robot
  hicieron falta CUATRO (chat+CAD, terminal+CAD, terminal+Gazebo, panel de visión+celda)
  porque el escritorio cambió tres veces en 5 horas. Cada recorte debe respetar la
  proporción del hueco donde cae (1.125 en el partido) o la imagen se deforma.
  **El recorte de arriba empieza pasada la barra lateral del chat**, que lista nombres de
  proyectos de clientes: recortar es la
  única tapa que no se olvida. Y la cama de música dura 9.6 s: sin `-stream_loop` se acaba
  al décimo segundo y el resto va con la voz seca (`monta_pantalla`). Y ANTES de armar
  las zonas, buscar los tramos NEGROS: en una sesión de horas el monitor se duerme (en el
  del brazo robótico, 6 min seguidos a partir del segundo 6735) y en el timelapse eso son
  2-3 s de pantalla en negro que se leen como un fallo del video. Se detectan barato sobre
  el render ya hecho (`scale=64:114,format=gray`, luma media por segundo < 26) y se mapean
  al fuente por regla de tres dentro de su zona; luego la zona se parte en dos para
  saltárselos. Barato y exacto sobre el FUENTE: `-skip_frame nokey` + `signalstats` recorre
  5 horas en 5 min (68× tiempo real) porque solo descomprime keyframes. Ojo: el negro
  también puede ser REGIONAL — en la sesión del robot la pantalla entera nunca se apagó,
  pero la ventana de Gazebo se quedó en negro dos veces mientras reiniciaba la simulación
  (15820-16200 y 16540-16950), y eso solo se ve midiendo la luma DEL RECORTE de abajo.
- **GRABAR LA PANTALLA DE WINDOWS: cuatro trampas MEDIDAS** (`scratchpad/graba_terminal.py`,
  1-sep-2026, las cuatro salieron mirando frames, ninguna dio error). (1) **DPI**: el segundo
  monitor está al 150%, `GetWindowRect` devuelve unidades LÓGICAS y `CopyFromScreen` píxeles
  FÍSICOS → se grababa ⅔ de la ventana y el código salía cortado por la derecha
  (`print(f"...del {LO`). `SetProcessDPIAware` NO basta (deja el proceso a la DPI del monitor
  PRIMARIO): hace falta `SetThreadDpiAwarenessContext(PER_MONITOR_AWARE_V2 = -4)` en TODOS los
  PowerShell, el que mide y el que captura. La ventana pasó de 704×690 a 1064×1039.
  (2) **Ventanas de WSLg** (pygame, tkinter): nacen ENCIMA de la terminal que las lanzó y no se
  dejan mover ni traer al frente — `SetWindowPos` las deja NEGRAS porque las pinta el compositor
  de WSLg, no Windows. Lo que funciona: soltar la app con `setsid ... &` y dejar que la terminal
  se cierre; la ventana se queda sola en el monitor y `CopyFromScreen` la captura perfecta. Se
  busca por TÍTULO (`--titulo`), no por región: grabar "el monitor entero" sacaba el escritorio
  de Windows con la barra de tareas. (3) **WSLg ignora la posición al mapear**: tkinter acababa
  en (0,0) sobre el monitor de José y por la sombra de la ventana se colaba SU PANTALLA dentro
  del video — se vuelve a pedir la geometría ya mapeada (`ventana.after(300, ...)`).
  (4) **La app tiene que durar más que la escena**: `pong.py` corría 11 s y la escena 16 → los
  últimos 5 s eran escritorio negro; ídem `ventana.py` con su `after(14000, destroy)`. Ambas a
  45 s. Y el x11grab de `:0` NO sirve de atajo: Xwayland es rootless y la raíz sale negra.
- **GRABACIÓN Y TIKTOK STUDIO NUNCA A LA VEZ** (3-sep-2026, clase 15): el Chrome del puente
  a TikTok se abre en el segundo monitor y quedó DETRÁS de la ventana del pong mientras se
  grababa: por los bordes de la captura se veía el TikTok Studio de José. `graba_terminal`,
  `borra_tiktok` y `subir_tiktok` toman todos `/tmp/pantalla.lock` (y los dos últimos también
  `/tmp/tiktok_studio.lock`, para que dos automatismos no se pisen en el mismo Chrome).
- **UNA TERMINAL DE 34 FILAS CON UNA LÍNEA DE CÓDIGO SE LEE COMO UN FALLO**: se graba alta
  porque algunas escenas escupen mucho, pero `print("Hola, mundo")` dejaba 33 filas de negro.
  `rehacer_escena._alto_util` mide la última fila con texto sobre el cuadro MÁS LLENO (el
  último) y recorta ahí, con mínimo 620 px y tope en el alto real — sin el tope, `crop=iw:620`
  sobre una ventana de tkinter de 393 px revienta el filtro y la escena se queda sin grabar.
- **EL FONDO DESENFOCADO NO SE HACE CON `gblur` GRANDE**: un `gblur=sigma=42` sobre 1080×1920
  era el 60% del tiempo de cada escena de terminal (12 min por clase). Empequeñecer a 136×240,
  desenfocar con sigma 5 y volver a ampliar se ve igual y tarda ~50 veces menos: 3 min por clase.
- **RE-NARRAR UNA CLASE: dos fallos MUDOS encadenados** (5-sep-2026, José: "les falta
  gracia… rehaz los audios"). (1) `autoedit-gen` **no sobrescribe** un video ya generado:
  por la unicidad global de stems le pone `_1` al nombre, así que la voz nueva se escribió
  en `<stem>_1.assets` mientras el resto del pipeline seguía recomponiendo la carpeta vieja
  — la clase se entregó con el audio de antes y los tres verificadores dijeron OK. Antes de
  regenerar hay que `rm -f videos/<stem>.mp4`; la carpeta de assets se reusa tal cual y las
  capturas sobreviven. `scratchpad/_curso/firma_voz.py` compara la firma de `voz.sha1` con
  la narración del guion y ABORTA la clase si no coinciden. (2) `render_seguro.sh` elegía
  `--render` o `--auto` por DURACIÓN, y re-narrar con otras palabras da casi los mismos
  segundos: el video salía con la voz nueva y los subtítulos VIEJOS. Ahora compara el TEXTO
  de `transcript.json` contra la narración del guion (difflib > 0.62). Y el texto vive en
  la llave `text`, no en `segments`.
- **UN CHISTE POR ESCENA, Y LA APERTURA SIEMPRE DISTINTA** (José 5-sep-2026: "les falta ser
  más gracioso, se oyen muy monótonos… y cambia el hook, siempre es qué pedo banda"): el
  registro de barrio NO es pegar `cabrón` al final de la frase — eso es un sello, y 22
  clases seguidas abriendo con "¿qué pedo, banda?" se oyen idénticas. La regla es: apertura
  distinta en cada video, y un REMATE por escena (comparación absurda, exageración o
  autoburla) que va DESPUÉS del dato, nunca antes, para que el chiste no se coma la
  explicación. Los diálogos del curso viven en `scratchpad/_curso/narr/*.json` y se aplican
  con `aplica_narr.py` (valida que el número de escenas cuadre antes de tocar el guion).
- **`--render` REUSA `edl.json` Y ESO PUEDE ESTAR VIEJO**: la clase 29 del curso se entregaba
  en 13.8 s de 72.6 porque su edl se había calculado sobre otra versión del video. Si el
  ensamblado cuadra pero el final dura mucho menos, el sospechoso es el edl: `--auto` lo rehace.
- **DOS ENSAMBLADOS EN PARALELO SE PISABAN** (1-sep-2026, la causa de "12 segundos en vez
  de 78"): `generate._assemble` escribía los temporales del punch con nombre FIJO en la
  carpeta compartida (`videos/_punch_N.mp4`, `videos/concat.txt`), así que al correr la cola
  de grabación y la pasada final a la vez el concat de un video leía el mp4 de otro a medio
  escribir → `moov atom not found`, ffmpeg seguía adelante y el video salía con UNA escena.
  El fallo es MUDO: el log dice "✔ ensamblado" con la duración equivocada. Ahora los
  temporales van a `videos/.tmp_<stem>/`. Y antes de entregar, correr
  `scratchpad/_curso/verifica_ensamblado.py`: compara la duración del mp4 con la suma de sus
  `seg_*.mp4` y caza el caso en segundos.
- **UN `concat` DENTRO DEL FILTRO SE COME LA RAM** (medido 30-ago-2026, "Cannot allocate
  memory" a media sesión): con varias ramas colgando de un `split`, el filtro `concat` le
  pide frames a la primera hasta el final del video y las demás tienen que GUARDAR en
  memoria todo lo que producen mientras tanto — 21 s de 1080×1920 son 2 GB por rama, y con
  cuatro ramas se acabaron los 15 GB de la máquina. La forma correcta es UNA SALIDA POR
  RAMA en el mismo ffmpeg (cada frame se va a disco en cuanto está, y el fuente se sigue
  decodificando una sola vez) y pegar los trozos después con el DEMUXER concat y `-c copy`.
  Vale igual para el montaje por tramos del intro (`monta_intro_ritmo.py`).
- **LA CAMA DE UN GRABADO NO ES `bed_electronico`** (José 29-ago-2026: "la pista es fea,
  esta lenta"): esa cama va a **100 BPM y centroide 1322 Hz** — lenta y apagada. La que
  llevaban jose13/14/15 estaba GENERADA con Lyria y se había quedado escondida dentro de
  `jose13.assets/music.m4a`; ahora vive en `autoedit/assets/bed_house.m4a` (125 BPM,
  centroide 3995 Hz). Para un grabado se usa **`scratchpad/cama_festival.py`**: dos pistas
  Lyria guardadas en assets (`bed_<estilo>_build` / `_drop`) que se montan con el BUILD
  bajo la voz y el DROP entrando **en el frame exacto** donde arranca el timelapse — la
  emoción la da el contraste, no el volumen. El ESTILO se pide por CLI (`--estilo`) porque
  José lo pide por DJ, no por descripción: "estilo de la dj Novah WE1" (30-ago-2026) = el
  set de Novah en el mainstage de Tomorrowland 2026, o sea **hard techno** con acid e
  industrial → `--estilo techno` (medido: 152 BPM, 41% de la energía en graves, centroide
  1900-2050 Hz). Traducir el nombre del DJ al género ANTES de escribir el prompt de Lyria.
  Ese techno es desde el 30-ago-2026 la **cama POR DEFECTO del canal** ("ese estilo es el
  que quiero en los videos por defecto ya siempre"): `config.yaml → render.music` apunta a
  `bed_techno_build.m4a` y `cama_festival.py` arranca en `--estilo techno`.
- **LA CAMA BAJO LA VOZ VA A 0.45, Y ESO ES UNA MEDIDA** (José 30-ago-2026, tercera vez que
  lo dice: "cuando hablo casi no se escucha"): las camas de Lyria salen a **-14.7 LUFS**
  integrados, así que el gain se calcula, no se tantea — 0.45 las deja en -21.6 LUFS, unos
  **7.5 dB por debajo** de una voz normalizada a -14. Los valores anteriores estaban 11.8 dB
  (0.28) y 17 dB (0.10) abajo, que es donde no se oye. La inteligibilidad se protege con un
  **-4 dB en 2 kHz sobre la CAMA**, no bajándola entera: ahí vive la voz y el bombo no. Y la cama bajo la voz va a
  **0.28 sobre una pista ya normalizada a −14 LUFS** (≈ −25 LUFS, 11 dB bajo la voz):
  al 0.10 de antes José no la oía. Antes de dar por buena una cama, MEDIRLA (bpm por
  autocorrelación de la envolvente + centroide espectral); "suena parecida" no es un dato.
- **EN UN GRABADO, LA CARA DE JOSÉ VA DESDE EL PRIMER SEGUNDO** (30-ago-2026: "en las
  primeras escenas del video no sale mi cara"). La REGLA COLD-OPEN — abrir con el dato y
  meter al presentador en la escena 2 — se midió sobre los videos GENERADOS, donde la cara
  es un avatar de D-ID; en un grabado la cara es él de verdad hablando de lo que se ve en
  pantalla, y adelantar un plano del final para abrir le quita justo eso. En el formato
  "José grabado" el video empieza donde empieza la grabación.
- **LA VELOCIDAD DE LA VOZ SE MIDE EN PALABRAS POR MINUTO, no se cablea**
  (`scratchpad/monta_intro_ritmo.py`, 30-ago-2026): el ×1.4 que funcionó en jose13-16 sale
  de que ahí José hablaba a 138 ppm; en la grabación del robot habla a **173 ppm** y ese
  mismo ×1.4 lo dejaba en 243 ppm — ardilla. El objetivo es el rango que ya funcionó,
  **194-201 ppm**, así que ahí tocó ×1.15. El script imprime las dos cifras antes de
  codificar. Y el ritmo de un grabado no es uno solo: cada TRAMO lleva su factor — `voz`
  a la velocidad medida, `rápido` (solo imagen, factor libre, audio en silencio) para los
  minutos en que José se calla y mira correr su simulación, y `voz@A:B` para poner la voz
  de un tramo sobre la IMAGEN de otro, que es como se hace el cold-open sin volver a
  grabar: se oye la primera frase mientras se ve el final ya funcionando.
- **CHROME HUÉRFANO: el editor lo limpia solo** (`editor_grabados.mata_chrome_huerfano`).
  Cortar un render a media tarea deja Chrome vivos que degradan TODOS los renders
  siguientes sin avisar: el panel 27 del jose08 reventó el timeout de 30 min y con la
  máquina limpia tarda 50 s. La limpieza mata SOLO los reparentados a init (PPID 1): matar
  "todo lo que se llame chrome" se lleva por delante el servidor MCP y el puente a Windows.
- **EL CHROME HUÉRFANO EN WSL2 CUELGA DE `/init`, NO DE PID 1** (2-sep-2026): un Chrome de
  un render de Remotion cortado a medias estuvo 1 h al 39% de CPU sin que
  `mata_chrome_huerfano` lo viera (filtraba PPID 1), y dejó COLGADO al render siguiente:
  el `npm exec remotion` murió, pero sus Chrome mantenían abierta la tubería y
  `generate.py` se quedó esperando para siempre (ni el timeout lo soltó). El limpiador
  mira ahora el COMANDO del padre (`/init` cuenta como huérfano) y exceptúa el Chrome
  del MCP por su `--remote-debugging-port`. `produce_v2.sh` lo corre antes de cada clase.
  Y `remotion_scenes._mata_huerfanos` ya NO mata por edad: con dos producciones a la vez
  mataba renders VIVOS del otro proceso ("maté un render huérfano (36 min)" ×3) y
  colgaba al generate.py que los esperaba. Huérfano = el padre murió o es `/init`.
- **EL CURSO ENSEÑA CON ANIMACIÓN, NO CON FOTOS** (José 2-sep-2026: "cero didácticos… pones
  imágenes en lugar de crear animación; y luego pones resultados y no se ven"). En el
  curso, la escena de concepto usa la herramienta que EXPLICA el mecanismo: `diagram`
  flow/list/compare cuando la narración enumera pasos, `custom` (Codex) cuando lo que
  enseña se mueve o se transforma; las de resultado enseñan código Y salida en la misma
  captura (`cat archivo; echo; python3 archivo`). Las escenas de Claude EDITAN de verdad
  los archivos del demo (marcador.py acabó imprimiendo solo `15`): el demo se restaura
  desde git antes de CADA escena y se graba sobre una copia limpia en `~/curso`, porque
  dentro del repo Claude narraba "el archivo ya existía en git, forma parte de la clase
  py03 del curso" en pantalla. Rediseño por clase: `scratchpad/_curso/redisena.py`;
  producción desde cero con voz nueva: `scratchpad/_curso/produce_v2.sh`. La tesis va
  como `kinetic_video` sobre un clip pagado del catálogo, nunca `kinetic` a secas.
- **LA SESIÓN DE CLAUDE GRABADA PUEDE NO CONTESTAR** (3-sep-2026, clases 13 y 14): la API
  devolvió `529 Overloaded · Retrying` y la captura quedó con el error en pantalla; el QC de
  tinta no lo ve porque HAY texto. Se mide la franja central del último cuadro (40-65% de
  alto, donde cae la respuesta): 0.8% de tinta sin respuesta contra 6-8% con ella.
  `graba_curso._captura_floja` regraba una vez tras 90 s y `posproduce.sh` rechaza la clase.
  Y la copia donde se graba (`~/curso`) lleva SOLO los archivos de la lección: con README,
  `.gitignore`, `.db` y los `_cap_*.sh` a la vista, Claude narraba la plomería del curso.
- **VOZ DEL CURSO** (2-sep-2026): José creó `dq04Lc2stQGXZAglGFG7`, narrador de barrio
  (109 Hz, referente 111). Los ajustes se MIDEN: a speed 0.85 salía a 133 ppm, a 0.98 a
  151 (referente 154). El registro "llamativo y grosero de barrio aplicado a la ciencia"
  va en la ESCRITURA de la narración (¿qué pedo, banda? / cabrón / la caga), con el
  rigor técnico intacto y sin CTA directo. Las clases 1 y 2 se quedan con la voz vieja.
- **NADA DE PAREDES DE TEXTO SOBRE EL MISMO FONDO** (José 23-ago-2026: "todos tus videos se
  ven monótonos"). Medido: de 117 paneles, 71 (61%) eran texto sobre el MISMO degradado
  violeta y los 76 clips pagados solo se usaron 17 veces. La causa no era cada panel sino que
  todos compartían fondo. `autoedit/fondos.py` (`asigna_fondos`) le pone a cada panel un
  `fondo` — clip pagado del catálogo, foto de Codex o trama animada — alternando para que
  dos seguidos nunca se vean igual, con techo de ~45% en modo clip porque `OffthreadVideo`
  es lo más caro del render. `videos/_clips_pagados/catalogo.json` describe los 76 clips
  mirados frame a frame: 15 sirven de fondo y 13 traen texto quemado (esos jamás van detrás
  de un titular). Antes de dar un video por bueno, correr `fondos.diagnostico(paneles)`.
- **WHISPER NO SABE EL VOCABULARIO DEL CANAL** (22 errores quemados en 4 de 6 videos,
  23-ago-2026): salió "bad propagation" por backpropagation, "toque" por token, "Aletza" por
  Alexa, "fundación de activación" por función. El error se lee justo en el término que el
  video está enseñando. Revisar SIEMPRE el texto de `subs.ass` antes de entregar;
  `scratchpad/corrige_transcripciones.py` arregla palabras sueltas en `transcript.json` sin
  mover los tiempos, y re-ensamblar reusa los paneles ya renderizados.
- **PUERTA DE ENTREGA: `scratchpad/verifica_entrega.py`, y NO se puede saltar**
  (8-sep-2026, José: "deja todo listo para que estos fallos nunca vuelvan a pasar"). Tres
  videos llegaron a estar "listos" el mismo día — final CORRUPTO (300 MB sin `moov atom`),
  la pantalla de José legible dentro del metraje, y 40% del video congelado — y en los tres
  los logs decían OK. El verificador mide las diez cosas que fallaron: integridad del mp4,
  duración contra el edl (la llave es **`cuts`**, no `cortes` — leerla mal me hizo dar por
  bueno un descuadre), ensamblado contra la suma de sus segmentos, cuadros parados y luma
  por escena, área útil de la imagen, contenido ajeno encima de una captura, subtítulos
  contra el guion, vocabulario quemado, CTA directo y cama musical repetida.
  `publish.publish_to_downloads` lo EXIGE: publicar sin pasarlo lanza excepción
  (`AUTOEDIT_SIN_VERIFICAR=1` para saltárselo a propósito).
  Lo importante del diseño: **los umbrales dependen del `visual_type`**. Una captura de
  terminal sobre fondo negro es legítimamente oscura y casi quieta; un `kinetic_video`
  quieto y negro es el fallo. Con umbrales únicos el duelo marcaba 7 fallos siendo
  correcto, y un verificador que cría lobos se ignora — que es peor que no tenerlo.
- **WSL NO SE CAE POR WINDOWS: se queda sin memoria CONTIGUA** (8-sep-2026, tres muertes en
  dos días a media producción). Descartado por medición: Windows llevaba 43.9 h encendido
  sin reiniciar y la suspensión automática está en "nunca". Lo que hay en el journal cinco
  minutos antes de cada muerte es `page allocation failure: order:7` en
  `vmbus_alloc_ring → vmbus_open → hvs_probe` — el kernel del invitado no encuentra 512 KB
  CONTIGUOS para el canal Hyper-V que lo comunica con Windows (había 10 GB libres: es
  fragmentación, no falta de memoria), se corta el enlace y Windows apaga el VM con un
  shutdown limpio de systemd, que es justo lo que despista. Lo fragmentan los renders
  (gigabytes de cuadros 1080×1920) más los **12 contenedores de Docker** que arrancan solos
  en cada boot. Arreglos: `C:\Users\<user>\.wslconfig` con `pageReporting=false` (devolver
  páginas a Windows es lo que fragmenta el invitado), `memory=12GB`, `swap=8GB` y
  `vmIdleTimeout=-1`; y `docker stop $(docker ps -q)` antes de producir. Y como red de
  seguridad, la producción se relanza sola: `scratchpad/_astra/guardian_noticias.sh` y
  `produce_milenio.sh` detectan el final corrupto o ausente y reanudan.
- **EL SPEC DE UNA ESCENA SE ARMA EN UN SOLO SITIO** (8-sep-2026): `kinetic_video` se
  construía por duplicado en `generate.py` y en `scratchpad/rehacer_escena.py`, así que
  `stanzas` se añadió a uno solo y la escena se rehizo sin la llave nueva, sin un error.
  Ahora la arma `remotion_scenes.spec_kinetic_video` y ambos la llaman; las llaves
  opcionales van en `_KV_OPCIONALES`. Cualquier beat nuevo, igual: una sola función.
- Al APROBAR un video (juicio humano) → `/publicar` lo copia a Descargas. No copiar borradores.

## Entorno

WSL2 sin GPU (Whisper en CPU, compute_type int8). `.env` (gitignored): `GEMINI_API_KEY`,
`ELEVENLABS_API_KEY`, `DID_API_KEY`, `APIFY_TOKEN`. ffmpeg 6.1 de sistema. TTS validado:
`gemini-3.1-flash-tts-preview`; música validada: `lyria-3-clip-preview` (clips ~30s mp3);
video validado 20-jul-2026: `gemini-omni-flash-preview` (Interactions API; "Omni" reemplazó
a Veo en la app de Gemini desde I/O may-2026) con fallback `veo-3.1-fast-generate-preview`
(la familia veo-3.0 YA NO existe en la key).
En el venv: rembg+onnxruntime (recortes; modelo u2net en `~/.u2net/`) y yt-dlp.
Codex CLI (`~/.local/bin/codex`) autenticado; genera imágenes headless con `codex exec`.
Node 24 + npm; el proyecto Remotion instala con `npm install` dentro de `autoedit/remotion/`.
Ojo: `pkill -f autoedit-web` se mata a sí mismo (el patrón matchea la propia línea de
comando); usa `pkill -f uvicorn` o el PID.
