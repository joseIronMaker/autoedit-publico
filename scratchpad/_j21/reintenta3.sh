#!/usr/bin/env bash
# Reintento de las tres que TikTok dejó en "seguimos revisando": una por una, con pausa
# larga entre ellas (fallaron justo en la 2ª-4ª subida seguida de la tanda).
set -u; cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\gpt21c'; C='/mnt/c/Users/USUARIO/Downloads/gpt21c'
sube () { echo "######## $1  →  $2 $3   ($(date '+%H:%M:%S'))"; timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1.mp4" "$C/${1%%_*}_copy_tiktok.txt" "$2" "$3" 2>&1 | tail -6 || echo "FALLO $1"; echo "--- pausa $4 s"; sleep "$4"; }
sube c20_entrenamiento_inferencia_alineacion 2026-10-04 19:00 900
sube c21_ya_no_es_chat_ciclo_agentico        2026-10-04 20:00 900
sube c22_herramientas_function_calling       2026-10-05 19:00 10
echo "######## FIN ($(date '+%H:%M:%S')) · OK: $(grep -c 'publicar: OK' scratchpad/_j21/reintenta3.log) de 3"
