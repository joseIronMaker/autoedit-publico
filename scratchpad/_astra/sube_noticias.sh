#!/usr/bin/env bash
# Sube y programa los videos de noticias. Patrón del canal: de noche, y sin pisar las
# clases del curso que ya ocupan 19:00 y 20:00 todos los días hasta el 16 de septiembre.
# TikTok corta a las ~4-5 subidas seguidas, así que van espaciadas.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\revision_noticias'
C='/mnt/c/Users/USUARIO/Downloads/revision_noticias'

sube () {  # <archivo> <copy> <fecha> <hora> <pausa_s> <stem>
  echo "######## $1  →  $3 $4   ($(date '+%H:%M:%S'))"
  # la puerta de entrega va AQUÍ, no en un paso aparte que se puede olvidar
  if ! .venv/bin/python scratchpad/verifica_entrega.py "$6"; then
    echo "NO SE SUBE $1: no pasa la verificación"; return 1
  fi
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -12 || echo "FALLO $1"
  echo "--- pausa $5 s"
  sleep "$5"
}

sube 2_duelo_codex.mp4 2_duelo_copy.txt     2026-09-09 19:30 480 gen_duelo_codex_astra
sube 3_cybercab.mp4    3_cybercab_copy.txt  2026-09-09 20:30 0   gen_cybercab_sin_volante
echo "######## los dos listos $(date '+%H:%M:%S')"
