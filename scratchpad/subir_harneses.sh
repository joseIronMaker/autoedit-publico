#!/usr/bin/env bash
# Programa los 5 de harneses. Espaciados 6 min: TikTok corta a las ~4-5 subidas seguidas.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\harneses'
C='/mnt/c/Users/USUARIO/Downloads/harneses'

sube () {  # <archivo> <copy> <fecha> <hora>
  echo "######## $1  $3 $4"
  timeout 1800 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -3 || echo "FALLO $1"
  sleep 360
}

sube h01_manos_en_tu_maquina.mp4      h01_copy_tiktok.txt 2026-08-21 20:00
sube "h02_el_archivo_que_le_enseña.mp4" h02_copy_tiktok.txt 2026-08-22 20:00
sube h03_no_deja_que_rompa.mp4        h03_copy_tiktok.txt 2026-08-23 19:00
sube h04_cual_para_que.mp4            h04_copy_tiktok.txt 2026-08-23 20:00
sube h05_lo_que_aprendi.mp4           h05_copy_tiktok.txt 2026-08-24 19:00
echo "######## terminado"
