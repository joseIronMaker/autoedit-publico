#!/usr/bin/env bash
# Produce el video del duelo DESPUÉS de que termine la otra cadena: graba pantalla y no
# puede compartir la máquina con dos renders de Remotion ni con otra grabación.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt; G=scratchpad/guiones_astra/a02_duelo_codex.json
for _ in $(seq 1 400); do pgrep -f "^bash scratchpad/_astra/cadena_astra.sh" > /dev/null || break; sleep 30; done
echo "=== duelo: empieza $(date +%H:%M) ===" >> "$R"
tema=$(.venv/bin/python -c "import json;print(json.load(open('$G'))['tema'])")
rm -f videos/gen_duelo_codex_astra.mp4
if ! timeout 7200 .venv/bin/autoedit-gen "$tema" --guion "$G" --dir videos > "$L/gen_a02.log" 2>&1; then
  echo "  duelo: GENERACIÓN falló" >> "$R"; tail -3 "$L/gen_a02.log" | sed 's/^/    /' >> "$R"; exit 1; fi
if ! timeout 3600 .venv/bin/python scratchpad/_astra/graba_duelo.py "$G" > "$L/cap_a02.log" 2>&1; then
  echo "  duelo: CAPTURAS fallaron" >> "$R"; tail -3 "$L/cap_a02.log" | sed 's/^/    /' >> "$R"; exit 1; fi
rm -f videos/gen_duelo_codex_astra_final.mp4
if .venv/bin/python -m autoedit.cli videos/gen_duelo_codex_astra.mp4 --auto >> "$L/final_duelo.log" 2>&1; then
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_duelo_codex_astra_final.mp4)
  echo "  FINAL duelo: ${d}s  $(date +%H:%M)" >> "$R"
else
  echo "  FINAL duelo FALLÓ" >> "$R"; fi
