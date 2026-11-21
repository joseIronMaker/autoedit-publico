#!/usr/bin/env bash
# Render final de un capítulo: un render a la vez, une la mezcla y verifica.
#   estudio/kit_termina.sh c01_error
set -u; cd /home/jose/tiktok/estudio
P=$1; ID=${P%%_*}; UP=$(echo "$ID" | tr a-z A-Z); D=serie/$P
# KIT_SOLO_AUDIO=1: la imagen ya está bien y solo cambió la mezcla, no se vuelve a renderizar.
[ -n "${KIT_SOLO_AUDIO:-}" ] || ( flock 9
  # Límite de 25 min: el 2-nov un render del c11 se colgó en el penúltimo cuadro y bloqueó la cola 21 min.
  cd remotion && timeout 1500 ./node_modules/.bin/remotion render "src/serie/$ID/index.ts" "$UP" "out/$ID.mp4" --browser-executable=/usr/bin/google-chrome --concurrency=6 --muted --crf=15 --pixel-format=yuv420p --log=error
) 9>/tmp/estudio_render.lock || { echo "$P: FALLÓ EL RENDER"; exit 1; }
ffmpeg -y -v error -i "remotion/out/$ID.mp4" -i "$D/mezcla.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "$D/final.mp4" || exit 1
cd .. && .venv/bin/python estudio/kit_verifica.py "estudio/$D/final.mp4" "estudio/$D/copy.txt" || exit 1
# Una oreja más: palabras comidas, frases interrumpidas. José encontró ese fallo antes que yo en el capítulo 1.
.venv/bin/python estudio/kit_escucha.py "estudio/$D/mezcla.wav" "estudio/$D/guion.txt" | tee "estudio/$D/escucha_final.txt"
