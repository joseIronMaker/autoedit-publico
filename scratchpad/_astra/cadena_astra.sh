#!/usr/bin/env bash
# Termina los videos de Astra y Cybercab EN FILA: dos renders de Remotion a la vez se
# estorban y uno de los dos revienta el tope de 20 minutos (pasó con la escena 0 hoy).
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
echo "=== cadena $(date '+%d-%b %H:%M') ===" >> "$R"
# 1) esperar a que acabe la generación del Cybercab
for _ in $(seq 1 240); do pgrep -f "[a]utoedit-gen" > /dev/null || break; sleep 30; done
echo "  cybercab generado $(date +%H:%M)" >> "$R"
# 2) rehacer las dos escenas de recibo del video de Astra, ya sin competencia
for i in 0 3; do
  .venv/bin/python scratchpad/rehacer_escena.py gen_astra_arnes "$i" --sin-ensamblar >> "$L/re_astra.log" 2>&1 \
    && echo "  escena $i rehecha $(date +%H:%M)" >> "$R" || echo "  escena $i FALLÓ" >> "$R"
done
.venv/bin/python scratchpad/rehacer_escena.py gen_astra_arnes --solo-ensamblar >> "$L/re_astra.log" 2>&1
# 3) finales de los dos, uno detrás de otro
for stem in gen_astra_arnes gen_cybercab_sin_volante; do
  [ -f "videos/$stem.mp4" ] || { echo "  $stem: sin ensamblado" >> "$R"; continue; }
  rm -f "videos/${stem}_final.mp4"
  if .venv/bin/python -m autoedit.cli "videos/$stem.mp4" --auto >> "$L/final_$stem.log" 2>&1; then
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${stem}_final.mp4")
    echo "  FINAL $stem: ${d}s  $(date +%H:%M)" >> "$R"
  else
    echo "  FINAL $stem FALLÓ" >> "$R"
  fi
done
echo "=== cadena lista $(date '+%d-%b %H:%M') ===" >> "$R"
