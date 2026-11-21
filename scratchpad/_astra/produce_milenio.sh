#!/usr/bin/env bash
# Astra v2: el video del Problema del Milenio. Reemplaza al de "el arnés", que José vetó
# ("está horrible, tus animaciones del asco, benchmarks nada"). Cambios de fondo:
#   · CERO animaciones dibujadas: recibos reales + fotos editoriales de Codex
#   · voz eleven_v3 (5.19 semitonos de variación contra 3.42 de v2 — "ya no tiene emociones")
#   · cama propia por video con Lyria (llevaba 15 videos con el mismo bed_techno)
# Pensado para relanzarse solo si WSL se cae a media producción.
set -u
cd /home/jose/tiktok
L=scratchpad/_astra
R=$L/CADENA.txt
G=scratchpad/guiones_astra/a04_astra_milenio.json
S=gen_astra_milenio

pgrep -f "autoedit-gen .*a04_astra_milenio" > /dev/null && exit 0
pgrep -f "autoedit.cli videos/$S" > /dev/null && exit 0

if [ -f "videos/${S}_final.mp4" ] && ffprobe -v error -show_entries format=duration \
     -of csv=p=0 "videos/${S}_final.mp4" > /dev/null 2>&1; then
  exit 0                                             # ya está terminado
fi

if [ ! -f "videos/$S.mp4" ]; then
  echo "=== astra v2 (milenio): generación $(date '+%d-%b %H:%M') ===" >> "$R"
  tema=$(.venv/bin/python -c "import json;print(json.load(open('$G'))['tema'])")
  rm -f "videos/$S.mp4"                              # autoedit-gen le pondría _1 si existe
  if ! timeout 7200 .venv/bin/autoedit-gen "$tema" --guion "$G" --dir videos \
       > "$L/gen_milenio.log" 2>&1; then
    echo "  ✘ generación FALLÓ" >> "$R"; tail -4 "$L/gen_milenio.log" | sed 's/^/    /' >> "$R"; exit 1
  fi
  if [ -d "videos/${S}_1.assets" ]; then
    echo "  ✘ ABORTO: se generó en ${S}_1 (el stem ya existía)" >> "$R"; exit 1
  fi
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/$S.mp4")
  echo "  ensamblado ${d}s $(date +%H:%M)" >> "$R"
  .venv/bin/python scratchpad/_curso/verifica_ensamblado.py "$S" >> "$R" 2>&1 || true
fi

rm -f "videos/${S}_final.mp4"
if .venv/bin/python -m autoedit.cli "videos/$S.mp4" --auto >> "$L/final_milenio.log" 2>&1; then
  f=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${S}_final.mp4")
  echo "  ✔ FINAL astra milenio: ${f}s  $(date +%H:%M)" >> "$R"
else
  echo "  ✘ FINAL astra milenio FALLÓ" >> "$R"
fi
