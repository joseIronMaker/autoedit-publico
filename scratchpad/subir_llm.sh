#!/usr/bin/env bash
# Los dos videos de LLM, siguiendo la cadencia del canal (19:00 y 20:00).
# La última ranura ocupada era 27-ago 19:00 (jose06), así que entran en 27-20:00 y 28-19:00.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\grabados'
C='/mnt/c/Users/USUARIO/Downloads/grabados'
sube () {  # <archivo> <copy> <fecha> <hora>
  echo "######## $1  →  $3 $4   ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -12 || echo "FALLO $1"
  echo "--- pausa 8 min"; sleep 480
}
sube jose07_que_es_un_llm.mp4        jose07_copy_tiktok.txt 2026-08-27 20:00
sube jose08_como_responde_un_llm.mp4 jose08_copy_tiktok.txt 2026-08-28 19:00
echo "######## FIN  ($(date '+%H:%M:%S'))"
