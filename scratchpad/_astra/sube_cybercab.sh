#!/usr/bin/env bash
# Cybercab a las 19:30 de mañana: el hueco bueno quedó libre porque el duelo acabó en
# 22:30 por el fallo del picker de hora. Las 19:00 y 20:00 son del curso (clases 15 y 16).
# La puerta de entrega va DENTRO, para que no se pueda subir algo que no pasó.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\revision_noticias'
C='/mnt/c/Users/USUARIO/Downloads/revision_noticias'

if ! .venv/bin/python scratchpad/verifica_entrega.py gen_cybercab_sin_volante; then
  echo "NO SE SUBE: el cybercab no pasa la verificación"; exit 1
fi

echo "######## 3_cybercab.mp4  →  2026-09-09 19:30   ($(date '+%H:%M:%S'))"
timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir \
  "$D\\3_cybercab.mp4" "$C/3_cybercab_copy.txt" 2026-09-09 19:30 2>&1 | tail -15
echo "######## terminado $(date '+%H:%M:%S')"
