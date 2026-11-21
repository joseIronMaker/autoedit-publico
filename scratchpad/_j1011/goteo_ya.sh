#!/usr/bin/env bash
# Igual que goteo.sh pero PROGRAMA TODO YA (José 16-oct: «súbelos ya»): WSL se cayó el 16-oct
# 13:17 a media espera y el goteo de 75 min antes se perdió dos horas. Una subida tras otra,
# 4 min entre ellas (TikTok corta tras ~4-5 seguidas).
# Si la subida falla y la fila NO aparece (fallo limpio: hueco vacío) espera 15 min y reintenta
# hasta 2 veces; si aparece con estado/hora distintos SE DETIENE (no se toca nada encima).
#   Uso: goteo_ya.sh <plan>   (líneas «id AAAA-MM-DD HH:MM n»)
set -u; cd /home/jose/tiktok
PY=.venv/bin/python
D='C:\Users\USUARIO\Downloads\pcb_ia_v2'
lista() { timeout 900 flock /tmp/tiktok_studio.lock $PY scratchpad/_j1010/lista_studio.py --max 6 2>/dev/null; }
while read -r id fecha hora n <&3; do
  [ -z "$id" ] && continue
  copy="scratchpad/_j1011/copys_v2/${id%%_*}_copy_tiktok.txt"
  inicio=$(head -1 "$copy" | cut -c1-28)
  esperado="$(LC_ALL=C date -d "$fecha" '+%-d %b' | tr 'A-Z' 'a-z'), $hora"
  ok=0
  for intento in 1 2 3; do
    if [ $(( $(date -d "$fecha $hora" +%s) - $(date +%s) )) -lt $(( 20*60 )) ]; then
      echo "== $id: faltan <20 min para $fecha $hora: DETENIDO, replanear"; break 2; fi
    filas=$(lista)
    if echo "$filas" | grep -F "$inicio" | grep -q "PROGRAMADA | $esperado\|PUBLICADA | $esperado"; then
      echo "   $id ya está ($esperado): sigo"; ok=1; break; fi
    if echo "$filas" | grep -qF "$inicio"; then
      echo "== $id aparece con otro estado/hora: DETENIDO (revisar a mano)"
      echo "$filas" | grep -F "$inicio"; break 2; fi
    echo "######## parte $n → $fecha $hora (intento $intento, $(date '+%d-%b %H:%M:%S'))"
    timeout 1800 $PY scratchpad/subir_tiktok.py subir "$D\\$id.mp4" "$copy" "$fecha" "$hora" < /dev/null 2>&1 | tail -4
    sleep 45
    fila=$(lista | grep -F "$inicio")
    echo "   Studio dice: ${fila:-NO APARECE}"
    if echo "$fila" | grep -q "PROGRAMADA | $esperado"; then echo "   ✔ confirmada"; ok=1; break; fi
    if [ -n "$fila" ]; then echo "== DETENIDO en la parte $n (fila rara; no se reintenta encima)"; break 2; fi
    echo "   hueco vacío: reintento en 15 min"; sleep 900
  done
  [ "$ok" = 1 ] || { echo "== DETENIDO en la parte $n tras 3 intentos"; break; }
  sleep 240
done 3< "$1"
echo "== GOTEO-YA FIN $(date '+%d-%b %H:%M')"
