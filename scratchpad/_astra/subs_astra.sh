#!/usr/bin/env bash
# Whisper escribió "Arnez" 4 veces y "arnés" es EL término que el video enseña. El
# transcript ya está corregido (los tiempos no se movieron), así que basta --render:
# reusa el edl y no vuelve a pasar Whisper ni Gemini.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
for _ in $(seq 1 360); do pgrep -f "_astra/final.sh" > /dev/null || break; sleep 20; done
echo "=== astra: subtítulos corregidos (Arnez -> arnés) $(date +%H:%M) ===" >> "$R"
rm -f videos/gen_astra_arnes_final.mp4
if .venv/bin/python -m autoedit.cli videos/gen_astra_arnes.mp4 --render >> "$L/subs_astra.log" 2>&1; then
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_astra_arnes_final.mp4)
  n=$(grep -c "ARNÉS" videos/gen_astra_arnes.autoedit/subs_full.ass || true)
  echo "  ✔ FINAL astra con subtítulos buenos: ${d}s · ARNÉS ×$n  $(date +%H:%M)" >> "$R"
else echo "  ✘ astra re-render FALLÓ" >> "$R"; fi
