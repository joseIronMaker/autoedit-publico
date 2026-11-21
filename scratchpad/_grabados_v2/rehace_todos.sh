#!/usr/bin/env bash
# Reconstruye los grabados con la narración nueva (chistes) y los deja listos en Descargas.
# No sube: eso va aparte, para revisar antes.
set -u; cd /home/jose/tiktok
G=scratchpad/_grabados_v2; D="/mnt/c/Users/USUARIO/Downloads/grabados_v2"; R=$G/REHACE.txt
declare -A NOMBRE=( [12]=jose12_tres_formas_chatgpt [13]=jose13_cad_con_ia [14]=jose14_planos_con_ia
                    [15]=jose15_pcb_con_ia [16]=jose16_brazo_robotico_con_ia [17]=jose17_simulacion_robot_con_ia )
echo "=== rehace $(date '+%d-%b %H:%M') ===" >> "$R"
for n in "$@"; do
  corte=$(awk -v n="$n" '$1==n{print $2}' $G/CORTES.txt)
  [ -z "$corte" ] && { echo "  jose$n: sin corte anotado, lo salto" >> "$R"; continue; }
  echo "--- jose$n (corte ${corte}s) $(date +%H:%M)" >> "$R"
  if ! bash $G/rehace.sh "$n" "$corte" >> "$G/rehace_$n.log" 2>&1; then
    echo "    montaje falló" >> "$R"; tail -3 "$G/rehace_$n.log" | sed 's/^/      /' >> "$R"; continue; fi
  rm -f "$G/jose${n}b_final.mp4"
  if ! .venv/bin/python -m autoedit.cli "$G/jose${n}b.mp4" --auto >> "$G/rehace_$n.log" 2>&1; then
    echo "    subtítulos/render fallaron" >> "$R"; continue; fi
  cp "$G/jose${n}b_final.mp4" "$D/${NOMBRE[$n]}.mp4"
  .venv/bin/python -c "import json;print(json.load(open('$G/jose${n}b.autoedit/copys.json'))['tiktok'].strip())" > "$D/${NOMBRE[$n]}_copy.txt"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$G/jose${n}b_final.mp4")
  echo "    OK ${NOMBRE[$n]}.mp4  ${dur}s  $(date +%H:%M)" >> "$R"
done
echo "=== fin $(date '+%d-%b %H:%M') ===" >> "$R"
