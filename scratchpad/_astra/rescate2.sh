#!/usr/bin/env bash
# Cierra el Cybercab: rehace la escena del clip nocturno (salía casi negra, luma 17;
# corregida la exposición sube a 26), re-ensambla y renderiza el final —que se había
# quedado a medio escribir cuando murió la sesión.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
for _ in $(seq 1 900); do pgrep -f "^bash scratchpad/_astra/cierre" > /dev/null || break; sleep 30; done
echo "=== cybercab: cierre $(date +%H:%M) ===" >> "$R"
if .venv/bin/python scratchpad/rehacer_escena.py gen_cybercab_sin_volante 2 --sin-ensamblar >> "$L/re_cyber.log" 2>&1; then
  echo "  escena nocturna rehecha $(date +%H:%M)" >> "$R"
else
  echo "  escena nocturna FALLÓ (sigo con la original)" >> "$R"
fi
.venv/bin/python scratchpad/rehacer_escena.py gen_cybercab_sin_volante --solo-ensamblar >> "$L/re_cyber.log" 2>&1
rm -f videos/gen_cybercab_sin_volante_final.mp4
if .venv/bin/python -m autoedit.cli videos/gen_cybercab_sin_volante.mp4 --auto >> "$L/final_cybercab.log" 2>&1; then
  echo "  FINAL cybercab: $(ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_cybercab_sin_volante_final.mp4)s $(date +%H:%M)" >> "$R"
else
  echo "  FINAL cybercab FALLÓ" >> "$R"
fi
