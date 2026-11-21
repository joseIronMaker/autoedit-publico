#!/usr/bin/env bash
# WSL se muere a media producción (fallo de asignación contigua en el canal vmbus que
# comunica el VM con Windows; ver CLAUDE.md). En vez de pelear con eso, el render se
# REANUDA solo: este guardián relanza el final del cybercab si falta o quedó corrupto.
# Pensado para cron:
#   @reboot sleep 45 && /bin/bash /home/jose/tiktok/scratchpad/_astra/guardian_noticias.sh
#   */10 * * * *      /bin/bash /home/jose/tiktok/scratchpad/_astra/guardian_noticias.sh
set -u
cd /home/jose/tiktok
L=scratchpad/_astra
R=$L/CADENA.txt
S=gen_cybercab_sin_volante
F="videos/${S}_final.mp4"

pgrep -f "autoedit.cli videos/$S" > /dev/null && exit 0        # ya está corriendo

if [ -f "$F" ] && ffprobe -v error -show_entries format=duration -of csv=p=0 "$F" > /dev/null 2>&1; then
  exit 0                                                        # ya está bueno
fi
if [ -f "$F" ]; then
  echo "  (guardián) final corrupto, lo borro $(date +%H:%M)" >> "$R"
  rm -f "$F"
fi

# el ensamblado tiene que existir y estar entero antes de renderizar
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/$S.mp4" 2>/dev/null) || exit 1
echo "=== (guardián) render del cybercab, ensamblado ${d}s $(date '+%d-%b %H:%M') ===" >> "$R"
# el audio no cambió desde que se calculó el edl: --render ahorra Whisper y Gemini
if .venv/bin/python -m autoedit.cli "videos/$S.mp4" --render >> "$L/guardian_cyber.log" 2>&1; then
  f=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
  echo "  ✔ FINAL cybercab: ${f}s  $(date +%H:%M)" >> "$R"
else
  echo "  ✘ render del cybercab falló $(date +%H:%M)" >> "$R"
fi
