#!/usr/bin/env bash
# Reparación de los dos videos de noticias, sin regrabar ni re-gastar voz:
#  · duelo escenas 0 y 3: capturas recortadas (se veía la terminal de José encima)
#  · duelo y astra escena 4: la tesis con clip en bucle y frases repartidas (estaba
#    congelada 84% del tiempo: el clip dura 4 s y la escena 27)
# Espera al render del cybercab: dos ffmpeg grandes solo se estorban.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
for _ in $(seq 1 240); do pgrep -f "autoedit videos/gen_cybercab" > /dev/null || break; sleep 20; done
.venv/bin/python - <<'PY' >> "$R" 2>&1 || true
import sys; sys.path.insert(0, 'scratchpad')
from editor_grabados import mata_chrome_huerfano
mata_chrome_huerfano()
PY
echo "=== arreglo astra+duelo $(date +%H:%M) ===" >> "$R"

arregla () {           # $1 stem  $2 duracion previa del ensamblado  $3... escenas
  stem=$1; prev=$2; shift 2
  for i in "$@"; do
    if ! .venv/bin/python scratchpad/rehacer_escena.py "$stem" "$i" --sin-ensamblar >> "$L/arregla_$stem.log" 2>&1; then
      echo "  $stem escena $i FALLÓ" >> "$R"; return 1; fi
    echo "  $stem escena $i rehecha $(date +%H:%M)" >> "$R"
  done
  .venv/bin/python scratchpad/rehacer_escena.py "$stem" --solo-ensamblar >> "$L/arregla_$stem.log" 2>&1 \
    || { echo "  $stem ensamblado FALLÓ" >> "$R"; return 1; }
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/$stem.mp4")
  # si el ensamblado dura lo mismo, el edl y la transcripción siguen valiendo: --render
  # ahorra Whisper y Gemini. Si cambió, hay que recalcularlos.
  modo=--render
  .venv/bin/python -c "import sys;sys.exit(0 if abs($d-$prev)<0.05 else 1)" || modo=--auto
  echo "  $stem ensamblado ${d}s (antes $prev) → $modo" >> "$R"
  rm -f "videos/${stem}_final.mp4"
  if .venv/bin/python -m autoedit.cli "videos/$stem.mp4" $modo >> "$L/final_$stem.log" 2>&1; then
    f=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${stem}_final.mp4")
    echo "  FINAL $stem: ${f}s  $(date +%H:%M)" >> "$R"
  else echo "  FINAL $stem FALLÓ" >> "$R"; return 1; fi
}

arregla gen_duelo_codex_astra 103.300000 0 3 4
arregla gen_astra_arnes       123.281000 4
echo "=== arreglo terminado $(date +%H:%M) ===" >> "$R"
