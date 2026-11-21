#!/usr/bin/env bash
# Programa las 7 piezas restantes del grabado del 20-sep siguiendo el patrón del canal:
# dos por día, 19:00 y 20:00. Las dos primeras ya salieron hoy (22:00 y 22:30) y el
# último hueco ocupado antes era 19-sep 20:00, así que esta tanda arranca el 21.
#
# TikTok corta a las ~4-5 subidas seguidas (primero manda a /upload/unavailable): 8 min
# entre cada una y 20 min de descanso después de la cuarta.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\gpt20'
C='/mnt/c/Users/USUARIO/Downloads/gpt20'

sube () {  # <archivo> <copy> <fecha> <hora> <pausa_s>
  echo "######## $1  →  $3 $4   ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -10 || echo "FALLO $1"
  echo "--- pausa $5 s"
  sleep "$5"
}

sube j20_03_karpathy_nanogpt.mp4     j20_03_copy_tiktok.txt 2026-09-21 19:00 480
sube j20_04_con_que_se_entrena.mp4   j20_04_copy_tiktok.txt 2026-09-21 20:00 480
sube j20_05_300_lineas.mp4           j20_05_copy_tiktok.txt 2026-09-22 19:00 480
sube j20_06_la_atencion.mp4          j20_06_copy_tiktok.txt 2026-09-22 20:00 1200
sube j20_07_claude_entrena.mp4       j20_07_copy_tiktok.txt 2026-09-23 19:00 480
sube j20_08_sin_internet.mp4         j20_08_copy_tiktok.txt 2026-09-23 20:00 480
sube j20_09_solo_completa.mp4        j20_09_copy_tiktok.txt 2026-09-24 19:00 10
echo "######## FIN  ($(date '+%H:%M:%S'))"
