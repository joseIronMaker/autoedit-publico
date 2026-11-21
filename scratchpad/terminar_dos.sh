#!/usr/bin/env bash
# Cierra los dos videos pendientes, uno tras otro (Whisper en CPU: no en paralelo).
set -u
cd /home/jose/tiktok
echo "######## ag01 · render final"
.venv/bin/autoedit /home/jose/tiktok/videos/gen_ag_que_escribio_de_verdad.mp4 --auto 2>&1 | tail -4

echo "######## pro04 · voz de las escenas reescritas"
.venv/bin/python /tmp/claude-1000/-home-jose-tiktok/a07764de-5f8e-44d0-a023-92d200ab26f2/scratchpad/voz_pro04.py 2>&1 | tail -3
for i in 2 3 6; do
  .venv/bin/python scratchpad/rehacer_escena.py gen_pro_cinco_nombres "$i" 2>&1 | grep -E "^escena|✔" | tail -2
done
echo "######## pro04 · render final"
.venv/bin/autoedit /home/jose/tiktok/videos/gen_pro_cinco_nombres.mp4 --auto 2>&1 | tail -4

echo "######## verificación"
for v in gen_ag_que_escribio_de_verdad gen_pro_cinco_nombres; do
  echo -n "$v: "
  ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${v}_final.mp4" 2>&1
done
