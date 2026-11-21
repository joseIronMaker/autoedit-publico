#!/usr/bin/env bash
# Rehace las escenas 0 y 3 del duelo con las capturas ya recortadas (sin regrabar ni
# re-gastar voz) y vuelve a montar el final. Espera al render del cybercab: dos ffmpeg
# grandes a la vez solo se estorban.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
for _ in $(seq 1 240); do pgrep -f "autoedit videos/gen_cybercab" > /dev/null || break; sleep 20; done
echo "=== duelo: recorte de fuga $(date +%H:%M) ===" >> "$R"
for i in 0 3; do
  if ! .venv/bin/python scratchpad/rehacer_escena.py gen_duelo_codex_astra "$i" --sin-ensamblar >> "$L/repara_duelo.log" 2>&1; then
    echo "  escena $i FALLÓ" >> "$R"; exit 1; fi
  echo "  escena $i rehecha $(date +%H:%M)" >> "$R"
done
.venv/bin/python scratchpad/rehacer_escena.py gen_duelo_codex_astra --solo-ensamblar >> "$L/repara_duelo.log" 2>&1 \
  || { echo "  ensamblado FALLÓ" >> "$R"; exit 1; }
.venv/bin/python scratchpad/_curso/verifica_ensamblado.py gen_duelo_codex_astra >> "$R" 2>&1 || true
rm -f videos/gen_duelo_codex_astra_final.mp4
if .venv/bin/python -m autoedit.cli videos/gen_duelo_codex_astra.mp4 --auto >> "$L/final_duelo2.log" 2>&1; then
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_duelo_codex_astra_final.mp4)
  echo "  FINAL duelo sin fuga: ${d}s  $(date +%H:%M)" >> "$R"
else
  echo "  FINAL duelo FALLÓ" >> "$R"; fi
