#!/usr/bin/env bash
# Programa una serie en TikTok con el patrón de siempre, en orden y reanudable.
#   estudio/serie/sube_serie.sh <plan>     líneas «id AAAA-MM-DD HH:MM n»
# Tras cada subida lee el Studio y exige ver la fila PROGRAMADA a la hora pedida. Si aparece con otro
# estado u hora SE DETIENE sin tocar nada: el orden 1→N no se arregla encima. Si el hueco queda vacío
# (fallo limpio) espera 15 min y reintenta. 4 min entre subidas: TikTok corta tras 4-5 seguidas.
# Ventana: nada se programa a más de ahora + 239 h. La primera pieza que no cabe TERMINA la pasada
# (no se salta: el orden manda) y la siguiente pasada —cron cada 30 min— sigue desde ahí.
# Lo ya confirmado se apunta en subidas_hechas.txt y la siguiente pasada no vuelve a abrir el Studio por ello.
set -u; cd /home/jose/tiktok
export PATH="$PATH:/mnt/c/Windows/System32/WindowsPowerShell/v1.0:/mnt/c/Windows/System32"
exec 9>/tmp/sube_serie.lock
flock -n 9 || exit 0                     # ya hay una pasada corriendo
PY=.venv/bin/python
BAJ='C:\Users\USUARIO\Downloads'
HECHAS=estudio/serie/subidas_hechas.txt; touch "$HECHAS"
[ -f scratchpad/NO_PUBLICAR ] && { echo "NO_PUBLICAR presente"; exit 1; }
ALTO=estudio/serie/SUBIDA_DETENIDA     # lo que pide revisión humana para la cola hasta que se borre a mano
[ -f "$ALTO" ] && exit 0
alto() { echo "== $(date '+%d-%b %H:%M') $*"; echo "$(date '+%F %T') $*" > "$ALTO"; }
carpeta() { case "$1" in c*) echo como_aprende_una_maquina ;; a*) echo como_actua_una_maquina ;; esac; }
lista() { timeout 900 flock /tmp/tiktok_studio.lock $PY scratchpad/_j1010/lista_studio.py --max 8 2>/dev/null; }
apunta() { echo "$1 $2 $3 $(date '+%F %T')" >> "$HECHAS"; }
while read -r id fecha hora n <&3; do
  [ -z "$id" ] && continue
  grep -q "^$id $fecha $hora " "$HECHAS" && continue
  if [ $(( $(date -d "$fecha $hora" +%s) - $(date +%s) )) -gt $(( 239*3600 )) ]; then
    echo "== $(date '+%d-%b %H:%M') parte $n ($id, $fecha $hora) aún no cabe en 239 h: fin de la pasada"; break; fi
  copy="estudio/serie/$id/copy.txt"
  sub=$(carpeta "$id"); mp4="/mnt/c/Users/USUARIO/Downloads/$sub/$id.mp4"
  [ "$(stat -c%s "$mp4" 2>/dev/null)" = "$(stat -c%s "estudio/serie/$id/final.mp4")" ] || {
    alto "$id: el mp4 de Descargas no es el final.mp4 aprobado: DETENIDO"; break; }
  $PY estudio/kit_verifica.py "estudio/serie/$id/final.mp4" "$copy" || { alto "$id NO pasa la verificación: DETENIDO"; break; }
  inicio=$(head -1 "$copy" | cut -c1-28)
  esperado="$(LC_ALL=C date -d "$fecha" '+%-d %b' | tr 'A-Z' 'a-z'), $hora"
  ok=0
  for intento in 1 2 3; do
    if [ $(( $(date -d "$fecha $hora" +%s) - $(date +%s) )) -lt $(( 20*60 )) ]; then
      alto "$id: faltan <20 min para $fecha $hora: DETENIDO, replanear"; break 2; fi
    filas=$(lista)
    if echo "$filas" | grep -F "$inicio" | grep -q "PROGRAMADA | $esperado\|PUBLICADA | $esperado"; then
      echo "   $id ya está ($esperado): sigo"; apunta "$id" "$fecha" "$hora"; ok=1; break; fi
    if echo "$filas" | grep -qF "$inicio"; then
      alto "$id aparece con otro estado/hora: DETENIDO (revisar a mano): $(echo "$filas" | grep -F "$inicio")"; break 2; fi
    echo "######## parte $n ($id) → $fecha $hora (intento $intento, $(date '+%d-%b %H:%M:%S'))"
    timeout 1800 $PY scratchpad/subir_tiktok.py subir "$BAJ\\$sub\\$id.mp4" "$copy" "$fecha" "$hora" < /dev/null 2>&1 | tail -4
    sleep 45
    fila=$(lista | grep -F "$inicio")
    echo "   Studio dice: ${fila:-NO APARECE}"
    if echo "$fila" | grep -q "PROGRAMADA | $esperado"; then echo "   ✔ confirmada"; apunta "$id" "$fecha" "$hora"; ok=1; break; fi
    if [ -n "$fila" ]; then alto "DETENIDO en la parte $n ($id): fila rara, no se reintenta encima: $fila"; break 2; fi
    echo "   hueco vacío: reintento en 15 min"; sleep 900
  done
  [ "$ok" = 1 ] || { echo "== DETENIDO en la parte $n tras 3 intentos"; break; }
  sleep 240
done 3< "$1"
echo "== pasada fin $(date '+%d-%b %H:%M') · confirmadas $(wc -l < "$HECHAS")"
