#!/usr/bin/env bash
# Cybercab con los clips reencuadrados: las 3 escenas de video, ensamblado y final.
# Espera al re-render de astra para no pelear por CPU.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt; S=gen_cybercab_sin_volante
for _ in $(seq 1 200); do pgrep -f "cli videos/gen_astra_arnes" > /dev/null || break; sleep 20; done
echo "=== cybercab: clips a pantalla completa $(date +%H:%M) ===" >> "$R"
for i in 0 2 5; do
  if ! .venv/bin/python scratchpad/rehacer_escena.py "$S" "$i" --sin-ensamblar >> "$L/cierra_cyber.log" 2>&1; then
    echo "  cybercab escena $i FALLÓ" >> "$R"; exit 1; fi
  echo "  cybercab escena $i ok $(date +%H:%M)" >> "$R"
done
.venv/bin/python scratchpad/rehacer_escena.py "$S" --solo-ensamblar >> "$L/cierra_cyber.log" 2>&1 \
  || { echo "  cybercab ensamblado FALLÓ" >> "$R"; exit 1; }
.venv/bin/python scratchpad/_curso/verifica_ensamblado.py "$S" >> "$R" 2>&1 || true
rm -f "videos/${S}_final.mp4"
if .venv/bin/python -m autoedit.cli "videos/$S.mp4" --auto >> "$L/cierra_cyber_final.log" 2>&1; then
  f=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${S}_final.mp4")
  echo "  ✔ FINAL cybercab: ${f}s  $(date +%H:%M)" >> "$R"
  echo "=== LOS TRES LISTOS $(date +%H:%M) ===" >> "$R"
else echo "  ✘ FINAL cybercab FALLÓ" >> "$R"; fi
