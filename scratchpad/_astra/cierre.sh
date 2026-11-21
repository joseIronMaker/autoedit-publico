#!/usr/bin/env bash
# Cierre de la noche, TODO en fila: dos renders de Remotion a la vez revientan el tope de
# 20 minutos (pasó dos veces hoy con las escenas de recibo).
#   1. espera a la cadena en curso
#   2. rehace la escena 3 de Astra con el recibo ya reducido
#   3. re-ensambla y re-renderiza el final de Astra
#   4. produce el video del duelo
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
for _ in $(seq 1 400); do pgrep -f "^bash scratchpad/_astra/cadena_astra" > /dev/null || break; sleep 30; done
echo "=== cierre: empieza $(date +%H:%M) ===" >> "$R"
if .venv/bin/python scratchpad/rehacer_escena.py gen_astra_arnes 3 --sin-ensamblar >> "$L/re_astra.log" 2>&1; then
  echo "  escena 3 rehecha $(date +%H:%M)" >> "$R"
  .venv/bin/python scratchpad/rehacer_escena.py gen_astra_arnes --solo-ensamblar >> "$L/re_astra.log" 2>&1
  rm -f videos/gen_astra_arnes_final.mp4
  if .venv/bin/python -m autoedit.cli videos/gen_astra_arnes.mp4 --auto >> "$L/final_gen_astra_arnes.log" 2>&1; then
    echo "  FINAL astra con recibos legibles: $(ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_astra_arnes_final.mp4)s $(date +%H:%M)" >> "$R"
  else echo "  FINAL astra FALLÓ" >> "$R"; fi
else echo "  escena 3 FALLÓ otra vez" >> "$R"; fi
bash scratchpad/_astra/cadena_duelo.sh
