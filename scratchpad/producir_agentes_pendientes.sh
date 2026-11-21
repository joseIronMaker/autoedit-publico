#!/usr/bin/env bash
# Produce los tres videos nuevos de agentes, uno tras otro (Whisper en CPU: nunca en paralelo).
set -u
cd /home/jose/tiktok
# espera a que termine lo que ya está corriendo
while pgrep -f "autoedit /home|rehacer_escena.py|producir_serie15" >/dev/null; do sleep 30; done
for n in ag02 ag03 ag04; do
  echo "################ $n"
  .venv/bin/python scratchpad/producir_agentes.py "$n" 2>&1 | tail -6
done
echo "################ verificación"
for f in /mnt/c/Users/USUARIO/Downloads/agentes/*.mp4; do
  echo -n "$(basename "$f"): "
  ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>&1
done
