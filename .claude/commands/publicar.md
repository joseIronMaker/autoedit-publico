---
description: Copia un video YA APROBADO a Descargas de Windows, listo para subir (mp4 + copy.md).
argument-hint: <numero> <titulo>  (o el nombre del _final.mp4)
---
Publica a Descargas un video **ya aprobado por José** (este comando es el "hook" de copia:
solo se corre cuando el video está aprobado, no automáticamente en cada render).

## Proceso
1. Identifica el `_final.mp4` aprobado (en `videos/`) y su número en la serie + título.
2. Copia con el helper del plugin:
   ```bash
   source .venv/bin/activate
   python -m autoedit.publish "videos/<stem>_final.mp4" <numero> "<Título del video>"
   ```
   o desde Python: `from autoedit.publish import publish_to_downloads; publish_to_downloads(final_mp4, numero, titulo, descripcion, hook)`.
3. Esto crea `Descargas/videos/NN_titulo/` con:
   - `NN_titulo.mp4` (el video)
   - `copy.md` (título, hook, descripción y los copys por plataforma TikTok/IG/FB de la Rama B, tomados del `.autoedit/copys.json`).
4. Confirma la ruta creada y lista su contenido.

## Notas
- Descargas se autodetecta (usuario real de Windows en `/mnt/c/Users/*/Downloads`).
- Si el `_final.mp4` no trae copys (se renderizó con `--no-llm`), corre antes `autoedit <video>.mp4 --render` (con LLM) o copia el `copys.json` de la versión previa a su `.autoedit/`.
- Actualiza el `status` del item en `series/<slug>/serie.json` a `publicado` tras copiar.
