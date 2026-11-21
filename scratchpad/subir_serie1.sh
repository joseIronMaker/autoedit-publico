#!/usr/bin/env bash
# Programa los 5 videos que faltan de la serie 1 (el s01 ya quedo a mano).
# Cadencia pedida por Jose: uno hoy a las 20:00 y luego dos por dia, 19:00 y 20:00.
# TikTok corta a las ~4-5 subidas seguidas, por eso van espaciados 6 minutos.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\serie1'
C=scratchpad/copys_manuales_serie1

subir () {  # <archivo> <copy> <fecha> <hora>
  echo "######## $1  $3 $4"
  timeout 1800 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    || echo "FALLO $1"
  echo "--- pausa de 6 min (TikTok corta a las ~4-5 seguidas)"
  sleep 360
}

subir s02_espanol_cuesta_mas.mp4   s02.txt 2026-08-14 19:00
subir s03_donde_pones_el_dato.mp4  s03.txt 2026-08-14 20:00
subir s04_chatbot_no_sabe_de_ti.mp4 s04.txt 2026-08-15 19:00
subir s05_fine_tuning_no_era.mp4   s05.txt 2026-08-15 20:00
subir s06_detector_te_acuso.mp4    s06.txt 2026-08-16 19:00
echo "######## FIN"
