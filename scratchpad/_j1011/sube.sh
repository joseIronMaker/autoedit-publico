#!/usr/bin/env bash
# Sube EN ORDEN las partes de «PCB con IA» (patrón 19:00 / 20:00) desde Descargas\pcb_ia y,
# tras cada una, lee el Studio: si la fila no aparece PROGRAMADA con la fecha exacta, SE
# DETIENE (no se arregla sola, no se borra nada). Uso: sube.sh <lista>  (id fecha hora n)
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\pcb_ia'
while read -r id fecha hora n <&3; do
  [ -z "$id" ] && continue
  echo "######## parte $n → $fecha $hora ($(date '+%H:%M:%S'))"
  ok=0
  for intento in 1 2 3; do
    timeout 1800 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$id.mp4" "scratchpad/_j1011/copys/${id%%_*}_copy_tiktok.txt" "$fecha" "$hora" < /dev/null 2>&1 | tail -4
    sleep 45
    esperado="$(LC_ALL=C date -d "$fecha" '+%-d %b' | tr 'A-Z' 'a-z'), $hora"
    fila=$(timeout 600 flock /tmp/tiktok_studio.lock .venv/bin/python scratchpad/_j1010/lista_studio.py --max 2 2>/dev/null | grep "PCB con IA, parte $n:")
    echo "   Studio dice: ${fila:-NO APARECE}"
    if echo "$fila" | grep -q "PROGRAMADA | $esperado"; then echo "   ✔ confirmada"; ok=1; break; fi
    # fila presente pero mal fechada = DETENERSE (no se reintenta encima, no se borra)
    [ -n "$fila" ] && break
    echo "   no apareció: vuelvo a mirar en 15 min antes de reintentar"; sleep 900
    fila=$(timeout 600 flock /tmp/tiktok_studio.lock .venv/bin/python scratchpad/_j1010/lista_studio.py --max 2 2>/dev/null | grep "PCB con IA, parte $n:")
    if echo "$fila" | grep -q "PROGRAMADA | $esperado"; then echo "   ✔ confirmada (tardó en aparecer)"; ok=1; break; fi
    [ -n "$fila" ] && { echo "   Studio dice: $fila"; break; }
  done
  [ $ok -eq 1 ] || { echo "== DETENIDO en la parte $n"; break; }
  sleep 480
done 3< "$1"
echo "== FIN ($(date '+%H:%M'))"
