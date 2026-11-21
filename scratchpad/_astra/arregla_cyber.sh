#!/usr/bin/env bash
# Los 3 clips del cybercab duran 4.5s y sus escenas 20-33s: sin bucle el video se queda
# 71s (40%) en un cuadro congelado, y el de la escena 2 congela en NEGRO (luma 6).
# Con OffthreadVideo loop las tres escenas se mueven todo el tiempo.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt; S=gen_cybercab_sin_volante
for _ in $(seq 1 360); do pgrep -f "arregla.sh" > /dev/null || break; sleep 20; done
echo "=== cybercab: clips en bucle $(date +%H:%M) ===" >> "$R"
for i in 0 2 5; do
  if ! .venv/bin/python scratchpad/rehacer_escena.py "$S" "$i" --sin-ensamblar >> "$L/arregla_cyber.log" 2>&1; then
    echo "  cybercab escena $i FALLÓ" >> "$R"; exit 1; fi
  echo "  cybercab escena $i rehecha $(date +%H:%M)" >> "$R"
done
.venv/bin/python scratchpad/rehacer_escena.py "$S" --solo-ensamblar >> "$L/arregla_cyber.log" 2>&1 \
  || { echo "  cybercab ensamblado FALLÓ" >> "$R"; exit 1; }
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/$S.mp4")
modo=--render
.venv/bin/python -c "import sys;sys.exit(0 if abs($d-177.482)<0.05 else 1)" || modo=--auto
echo "  cybercab ensamblado ${d}s → $modo" >> "$R"
rm -f "videos/${S}_final.mp4"
if .venv/bin/python -m autoedit.cli "videos/$S.mp4" $modo >> "$L/final_cyber.log" 2>&1; then
  f=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${S}_final.mp4")
  echo "  FINAL cybercab: ${f}s  $(date +%H:%M)" >> "$R"
else echo "  FINAL cybercab FALLÓ" >> "$R"; fi
