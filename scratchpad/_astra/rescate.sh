#!/usr/bin/env bash
# El final del Cybercab quedó a medio escribir cuando murió la sesión: se rehace DESPUÉS
# de que el cierre termine (Astra + duelo), porque dos renders a la vez se estorban.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
for _ in $(seq 1 900); do pgrep -f "^bash scratchpad/_astra/cierre" > /dev/null || break; sleep 30; done
echo "=== rescate cybercab $(date +%H:%M) ===" >> "$R"
rm -f videos/gen_cybercab_sin_volante_final.mp4
if .venv/bin/python -m autoedit.cli videos/gen_cybercab_sin_volante.mp4 --auto >> "$L/final_cybercab.log" 2>&1; then
  echo "  FINAL cybercab: $(ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_cybercab_sin_volante_final.mp4)s $(date +%H:%M)" >> "$R"
else echo "  FINAL cybercab FALLÓ" >> "$R"; fi
