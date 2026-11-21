#!/usr/bin/env bash
# Resube «PCB con IA» reparada (piezas_v2) POR GOTEO: cada pieza se sube ~75 min antes de su
# hora, no las 14 de golpe — el 12-oct se subieron en 3 h por automatización y las cuatro
# publicadas se quedaron en 3-5 vistas (15-oct-2026). Antes de cada subida:
#   · si en el Studio sigue alguna fila VIEJA («PCB con IA, parte N:») no sube nada: sería un
#     duplicado del mismo metraje;
#   · si la pieza ya aparece programada con su hora, se la salta (reanudable).
# Tras subir, lee el Studio: si la fila no sale PROGRAMADA con fecha y hora exactas, SE DETIENE.
#   Uso: goteo.sh <plan>   (líneas «id AAAA-MM-DD HH:MM n»)
set -u; cd /home/jose/tiktok
PY=.venv/bin/python
D='C:\Users\USUARIO\Downloads\pcb_ia_v2'
lista() { timeout 900 flock /tmp/tiktok_studio.lock $PY scratchpad/_j1010/lista_studio.py --max 6 2>/dev/null; }
while read -r id fecha hora n <&3; do
  [ -z "$id" ] && continue
  copy="scratchpad/_j1011/copys_v2/${id%%_*}_copy_tiktok.txt"
  inicio=$(head -1 "$copy" | cut -c1-28)
  esperado="$(LC_ALL=C date -d "$fecha" '+%-d %b' | tr 'A-Z' 'a-z'), $hora"
  sube_a=$(( $(date -d "$fecha $hora" +%s) - 75*60 ))
  ahora=$(date +%s)
  if [ "$ahora" -gt $(( sube_a + 45*60 )) ]; then
    echo "== $id: ya no da tiempo para $fecha $hora (faltan <30 min): DETENIDO, replanear"; break; fi
  [ "$ahora" -lt "$sube_a" ] && { echo "… $id espera hasta $(date -d @$sube_a '+%d-%b %H:%M')"; sleep $(( sube_a - ahora )); }
  filas=$(lista)
  if echo "$filas" | grep -q "PCB con IA, parte [0-9]*:"; then
    echo "== $id: siguen filas VIEJAS de «PCB con IA» en el Studio; no subo un duplicado. DETENIDO"
    echo "$filas" | grep "PCB con IA, parte" | head -3; break; fi
  if echo "$filas" | grep -F "$inicio" | grep -q "PROGRAMADA | $esperado\|PUBLICADA | $esperado"; then
    echo "   $id ya está ($esperado): sigo"; continue; fi
  echo "######## parte $n → $fecha $hora ($(date '+%d-%b %H:%M:%S'))"
  timeout 1800 $PY scratchpad/subir_tiktok.py subir "$D\\$id.mp4" "$copy" "$fecha" "$hora" < /dev/null 2>&1 | tail -4
  sleep 45
  fila=$(lista | grep -F "$inicio")
  echo "   Studio dice: ${fila:-NO APARECE}"
  if echo "$fila" | grep -q "PROGRAMADA | $esperado"; then echo "   ✔ confirmada"
  else echo "== DETENIDO en la parte $n (revisar a mano; no se reintenta encima)"; break; fi
done 3< "$1"
echo "== GOTEO FIN $(date '+%d-%b %H:%M')"
