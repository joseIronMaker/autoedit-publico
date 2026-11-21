# autoedit — tu estudio de video automático

Dos formas de producir un video listo para TikTok/Reels:

- **Rama B — editas lo que grabas:** subes un video hablando a cámara → Whisper local lo
  transcribe, Gemini decide qué cortar (silencios, muletillas, tomas repetidas), qué
  enfatizar y qué clips cortos extraer; tú revisas el plan 2 minutos y ffmpeg renderiza
  con subtítulos karaoke quemados + copys por red. Costo: **~$0.01–0.03/video**.
- **Rama A — se genera solo desde un tema:** escribes un tema → Gemini escribe el guion
  (hook incluido), genera la voz (TTS) y una imagen por escena, y ffmpeg lo anima con
  Ken Burns a 1080×1920. El video generado entra al mismo flujo de la Rama B para
  recibir subtítulos y copys. Costo: **~$0.15–0.30/video** (imágenes + TTS).

```
video.mp4 ─► Whisper local ─► Gemini ─► TÚ (revisas) ─► ffmpeg ─► video_final.mp4
             (palabras +      (cortes,   switches en     (cortes +   clips_final.mp4
              timestamps)      énfasis,   la web o        subtítulos  copys por red
                               clips)     edl.json)       + zooms)
```

## Interfaz web (recomendado)

```bash
cd ~/tiktok && source .venv/bin/activate
autoedit-web            # → http://localhost:8765
```

Desde el navegador:
1. **⬆ Subir video** (o deja el archivo en esta carpeta y aparece solo).
2. **Analizar** — transcribe y genera el plan de edición; checkbox para proponer clips.
   El progreso se ve en vivo (transcribiendo → analizando → buscando clips).
3. **Revisar cortes** — cada corte trae su rango y motivo; apaga con el switch los que
   no quieras. Los cambios se guardan al renderizar.
4. **Renderizar** — video completo + clips + copys.
5. **Resultados** — preview de cada video, pestañas TikTok/IG/FB y botón 📋 para copiar
   el copy al publicar.

Opciones: `autoedit-web --port 8080 --dir /otra/carpeta`.

**Generar un video con IA (Rama A):** en el panel "✨ Generar video con IA" escribe el
tema (p. ej. *"3 formas de usar NotebookLM para estudiar"*) y pulsa Generar. Verás el
progreso escena por escena; al terminar aparece `gen_<tema>.mp4` en la lista — pásale
**Analizar → Renderizar** como a cualquier video para los subtítulos y copys. El guion,
las imágenes y la voz quedan en `gen_<tema>.assets/`. También por CLI:
`autoedit-gen "tu tema" [--scenes 4]`. Cuando la narración explica pasos, listas o
comparaciones, Gemini elige escenas de **diagrama animado** (renderizadas por código:
cajas numeradas, flujos con flechas, ✗ vs ✓) en lugar de imagen.

**Series / cursos:** en el panel "📚 Series" escribes el título (p. ej. *"Curso de
prompt engineering"*) y cuántos videos; Gemini arma el temario en orden pedagógico y
con ▶ la cola genera los videos uno a uno — cada uno sale ya **subtitulado y con
copys** (generación + análisis + render automáticos). Puedes detener con ⏸ y retomar
después: los ya listos no se repiten. El temario vive en `series/<slug>.json`.

**Vista de serie, descargas y limpieza:** click en una serie del sidebar → vista con
cada lección: video reproducible, **⬇ Descargar** (cae a tu carpeta de descargas de
Windows), pestañas de copys con 📋 copiar, y **🧹 limpiar material de origen** (por video
o serie completa): borra el crudo sin subtítulos, las imágenes/voces de las escenas y
los intermedios, conservando SIEMPRE el video final y los copys — muestra los MB antes
de borrar y pide confirmación. Un video limpiado sigue visible en la lista (badge
"listo") con su final y copys.

**Temas del día:** el panel "📰 Temas del día" tiene el agente de tendencias — busca en
la web (búsqueda de Google integrada en Gemini) qué pasó en IA relevante para público
general hispano y propone 5 temas con hook y fuente. Botón 🔄 para buscarlos al momento,
y el **interruptor activa el modo diario**: cada mañana (~8:00, con el servidor
corriendo) busca solo. El botón ✨ de cada tema lo carga en el generador. Se guardan en
`topics/<fecha>.json`.

## Línea de comandos

```bash
autoedit mi_video.mp4 --clips     # 1. analizar (transcripción + EDL + clips)
# 2. revisar mi_video.autoedit/edl.json y clips.json
autoedit mi_video.mp4 --render    # 3. renderizar + copys

autoedit mi_video.mp4 --clips --auto   # todo de un tirón, sin pausa de revisión
autoedit mi_video.mp4 --no-llm         # sin Gemini: solo corta silencios
autoedit mi_video.mp4 --whisper-model base   # transcripción más rápida (menos precisa)
```

## Estructura de carpetas

```
videos/            ← videos sueltos: los que subes/grabas y los generados individuales
series/<slug>/     ← cada serie con su temario (serie.json), videos, análisis y copys
topics/            ← temas del día del agente + su configuración
```

Eliminar desde la web: **🗑 Eliminar** en la vista de un video (borra todo lo suyo) o de
una serie (borra la carpeta completa). **🧹 Limpiar origen** borra solo lo regenerable y
conserva el final y los copys.

## Archivos que produce

| Archivo | Qué es |
|---|---|
| `video_final.mp4` | video completo editado y subtitulado |
| `video_clipN_final.mp4` | cada clip corto autocontenido |
| `video.autoedit/transcript.json` | transcripción con timestamps por palabra |
| `video.autoedit/edl.json` | plan de edición (cortes + énfasis) — editable |
| `video.autoedit/clips.json` | rangos y títulos de los clips — editable |
| `video.autoedit/copys*.md/.json` | copys por red, del completo y de cada clip |

Para desactivar un corte a mano en `edl.json`: agrégale `"disabled": true` (o bórralo).

## Setup desde cero

```bash
cd ~/tiktok
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python -e .
cp .env.example .env        # y pega tu GEMINI_API_KEY (aistudio.google.com)
```

Requiere `ffmpeg` en el sistema. La primera transcripción descarga el modelo de Whisper
(~460 MB, una sola vez). Nota WSL: `python3-venv` del sistema no está instalado; por eso
se usa `uv` (está en `~/.local/bin`).

## Configuración (`config.yaml`)

| Sección | Clave | Qué controla |
|---|---|---|
| `gemini` | `model` / `fallbacks` | modelo pineado + respaldos (regla ModelRouter: ningún modelo se hardcodea en código) |
| `whisper` | `model` | precisión vs velocidad de transcripción (`small` recomendado en CPU) |
| `edit` | `min_silence` | segundos de silencio para cortar (menor = más agresivo) |
| `subtitles` | `size_ratio`, `margin_v_ratio` | tamaño y altura de los subtítulos (margin menor = más abajo; no bajar de ~0.18: la UI de TikTok tapa) |
| `subtitles` | `primary/emphasis_color` | colores en formato **BGR** hex |
| `zoom` | `enabled`, `factor` | zoom sutil alternado por tramo (efecto jump-cut) |
| `clips` | `min_len`, `max_len`, `max_clips` | duración y cantidad de clips propuestos |

## Problemas comunes

- **"GEMINI_API_KEY no configurada"** → falta el `.env` o la key; sin ella funciona en
  modo `--no-llm` (solo silencios, sin clips ni copys).
- **Modelo de Gemini deprecado** → cambia `gemini.model` en `config.yaml`; el código
  prueba los `fallbacks` automáticamente.
- **Subtítulos desincronizados en habla muy rápida** → sube `whisper.model` a `medium`,
  o (upgrade futuro) integrar WhisperX para alineación forzada.
- **El video final termina abrupto** → Gemini probablemente cortó una frase final
  incompleta; apaga ese corte y re-renderiza (segundos, no re-analiza).

## Roadmap (del plan maestro)

- Recorte de franjas negras / relleno 9:16 real (videos letterboxeados).
- Publicación por API (TikTok Content Posting + Meta Graph) — requiere revisión de apps,
  2–6 semanas; iniciar trámite cuanto antes. Mientras: publicar a mano con los copys.
- Rama A: videos faceless por código (Remotion + Gemini TTS — TTS ya validado con esta key).
- Esquema de experimentos: registrar hook/pilar/duración por video y cruzar con métricas.
