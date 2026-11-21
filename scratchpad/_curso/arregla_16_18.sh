#!/usr/bin/env bash
set -u; cd /home/jose/tiktok; R=scratchpad/_curso/logs/V2.txt; V2="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
# 10 sep 20:00 quedó VACÍO: la 18 se borró y no llegó a subirse. Solo hay que subirla.
timeout 900 .venv/bin/python scratchpad/subir_tiktok.py subir \
  'C:\Users\USUARIO\Downloads\curso_python_v2\clase18_guardar_datos.mp4' \
  "$V2/clase18_guardar_datos_copy.txt" 2026-09-10 20:00 \
  && echo "  TikTok subida py18 (hueco vacío) $(date +%H:%M)" >> "$R"
# 9 sep 20:00 sigue con la clase 16 vieja
bash scratchpad/_curso/reemplaza_tiktok.sh py16 && echo "  TikTok reemplazada py16 $(date +%H:%M)" >> "$R"
