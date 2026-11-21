#!/usr/bin/env bash
# Astra v2 (Problema del Milenio) a las 20:30: 19:30 es del Cybercab y 19:00/20:00 del curso.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\revision_noticias'
C='/mnt/c/Users/USUARIO/Downloads/revision_noticias'
echo "######## 4_astra_milenio.mp4  →  2026-09-09 20:30   ($(date '+%H:%M:%S'))"
timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir \
  "$D\\4_astra_milenio.mp4" "$C/4_astra_copy.txt" 2026-09-09 20:30 2>&1 | tail -15
echo "######## terminado $(date '+%H:%M:%S')"
