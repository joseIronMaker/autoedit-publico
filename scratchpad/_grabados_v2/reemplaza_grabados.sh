#!/usr/bin/env bash
# Reemplaza en TikTok un grabado programado por su versión nueva: borra el programado
# (filtrando con el buscador, que es lo único fiable con la lista virtualizada) y sube el
# nuevo en el MISMO hueco. Si el borrado no se logra, NO sube: dos en el mismo hueco es peor.
set -u; cd /home/jose/tiktok
G=scratchpad/_grabados_v2; D="/mnt/c/Users/USUARIO/Downloads/grabados_v2"
W='C:\Users\USUARIO\Downloads\grabados_v2'; R=$G/SUBIDAS.txt
declare -A NOMBRE=( [12]=jose12_tres_formas_chatgpt [13]=jose13_cad_con_ia [14]=jose14_planos_con_ia
                    [15]=jose15_pcb_con_ia [16]=jose16_brazo_robotico_con_ia [17]=jose17_simulacion_robot_con_ia )
for n in "$@"; do
  linea=$(grep "^$n|" $G/SLOTS.txt) || { echo "  jose$n: sin hueco anotado" >> "$R"; continue; }
  fecha=$(echo "$linea"|cut -d'|' -f2); hora=$(echo "$linea"|cut -d'|' -f3); texto=$(echo "$linea"|cut -d'|' -f4)
  dia=$(date -d "$fecha" +%-d); etiqueta="$dia sep, $hora"; base=${NOMBRE[$n]}
  [ -f "$D/$base.mp4" ] || { echo "  jose$n: no hay video nuevo, lo salto" >> "$R"; continue; }
  echo "--- jose$n → $fecha $hora ($(date +%H:%M))" >> "$R"
  if ! timeout 400 .venv/bin/python scratchpad/borra_tiktok.py "$etiqueta" "$texto" \
        --slot-unico --buscar "$texto" >> "$G/tt_$n.log" 2>&1; then
    echo "    no se borró el viejo: NO subo" >> "$R"; continue; fi
  sleep 8
  ok=0
  for k in 1 2 3; do
    if timeout 900 .venv/bin/python scratchpad/subir_tiktok.py subir "$W\\$base.mp4" \
         "$D/${base}_copy.txt" "$fecha" "$hora" >> "$G/tt_$n.log" 2>&1; then ok=1; break; fi
    echo "    subida falló (intento $k/3)" >> "$R"; sleep 60
  done
  [ $ok = 1 ] && echo "    OK programado" >> "$R" || echo "    HUECO VACÍO en $fecha $hora" >> "$R"
  sleep 20
done
