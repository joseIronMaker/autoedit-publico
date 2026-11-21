#!/usr/bin/env bash
# Rehace escenas de una clase v2 (sin regenerar voz), re-ensambla, re-quema subtítulos y
# vuelve a dejarla en Descargas/curso_python_v2.   uso: cierra_v2.sh py03 <stem> <esc...>
set -u; cd /home/jose/tiktok; c=$1; stem=$2; shift 2
L=scratchpad/_curso/logs; DEST="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"; num=${c#py}
for i in "$@"; do .venv/bin/python scratchpad/rehacer_escena.py "$stem" "$i" --sin-ensamblar >> "$L/v2_fix_$c.log" 2>&1 || { echo "  rehacer e$i falló" >> "$L/V2.txt"; exit 1; }; done
.venv/bin/python scratchpad/rehacer_escena.py "$stem" --solo-ensamblar >> "$L/v2_fix_$c.log" 2>&1 || exit 1
rm -f "videos/${stem}_final.mp4"; .venv/bin/python -m autoedit.cli "videos/$stem.mp4" --render >> "$L/v2_fix_$c.log" 2>&1 || exit 1
nom=$(ls "$DEST" | grep -m1 "^clase${num}_.*mp4$"); cp "videos/${stem}_final.mp4" "$DEST/$nom"; echo "  OK (tesis sobre clip) $nom $(date +%H:%M)" >> "$L/V2.txt"
