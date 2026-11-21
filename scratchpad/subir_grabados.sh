#!/usr/bin/env bash
# Programa los 6 videos grabados por Jose siguiendo el patron del canal:
# dos por dia, 19:00 y 20:00. El ultimo hueco ocupado era 24-ago 19:00 (h05 de harneses),
# asi que esta tanda arranca en 24-ago 20:00.
# TikTok corta a las ~4-5 subidas seguidas: 8 min entre cada una y 20 min de descanso
# despues de la cuarta.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\grabados'
C='/mnt/c/Users/USUARIO/Downloads/grabados'

sube () {  # <archivo> <copy> <fecha> <hora> <pausa_s>
  echo "######## $1  →  $3 $4   ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -12 || echo "FALLO $1"
  echo "--- pausa $5 s"
  sleep "$5"
}

sube jose01_que_es_la_ia.mp4              jose01_copy_tiktok.txt 2026-08-24 20:00 480
sube jose02_ia_predictiva.mp4             jose02_copy_tiktok.txt 2026-08-25 19:00 480
sube jose03_ia_generativa.mp4             jose03_copy_tiktok.txt 2026-08-25 20:00 480
sube jose04_que_es_una_red_neuronal.mp4   jose04_copy_tiktok.txt 2026-08-26 19:00 1200
sube jose05_como_aprenden_las_redes.mp4   jose05_copy_tiktok.txt 2026-08-26 20:00 480
sube jose06_el_transformer.mp4            jose06_copy_tiktok.txt 2026-08-27 19:00 10
echo "######## FIN  ($(date '+%H:%M:%S'))"
