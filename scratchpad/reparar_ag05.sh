#!/usr/bin/env bash
# Rehace las 3 escenas que degradaron a texto sobre negro en ag05 y re-renderiza.
set -u
cd /home/jose/tiktok
while ps -eo args --no-headers | grep -qE "\.venv/bin/(autoedit|autoedit-gen)|rehacer_escena\.py"; do sleep 30; done
for i in 0 2 4; do
  echo "######## ag05 escena $i"
  .venv/bin/python scratchpad/rehacer_escena.py gen_ag_el_bucle "$i" 2>&1 | grep -E "^escena|✔|aviso" | tail -3
done
echo "######## ag05 render final"
.venv/bin/autoedit /home/jose/tiktok/videos/gen_ag_el_bucle.mp4 --auto 2>&1 | tail -3
cp videos/gen_ag_el_bucle_final.mp4 "/mnt/c/Users/USUARIO/Downloads/agentes/ag05_el_bucle.mp4"
cp scratchpad/copys_manuales_agentes/ag05.txt "/mnt/c/Users/USUARIO/Downloads/agentes/ag05_copy_tiktok.txt"
echo "######## listo"
ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_ag_el_bucle_final.mp4
