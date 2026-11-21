#!/usr/bin/env bash
# Sube EN ORDEN las pendientes de la clase que ya caben en la ventana de TikTok
# (ahora + 239 h) y, tras CADA subida, lee el Studio entero (lista_studio.py): la pieza
# solo se da por buena si aparece PROGRAMADA con la fecha exacta pedida. Si TikTok la
# movió a otra fecha (24-sep-2026: movió 12 en silencio y se publicaron fuera de orden),
# se borra en el acto y el script SE DETIENE: jamás se sigue subiendo con una fuera de sitio.
set -u
cd /home/jose/tiktok
PEND=scratchpad/_j21/pendientes.txt
D='C:\Users\USUARIO\Downloads\gpt21c'; C='/mnt/c/Users/USUARIO/Downloads/gpt21c'
tope=$(( $(date +%s) + 239*3600 )); k=0
while read -r id fecha hora n <&3; do
  [ "$(date -d "$fecha $hora" +%s)" -le "$tope" ] || { echo "== parte $n aún no cabe en la ventana: paro aquí (orden)"; break; }
  echo "######## parte $n → $fecha $hora ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$id.mp4" "$C/${id%%_*}_copy_tiktok.txt" "$fecha" "$hora" 2>&1 | tail -4
  sleep 45
  esperado="$(date -d "$fecha" '+%-d %b' | tr 'A-Z' 'a-z'), $hora"
  fila=$(timeout 900 .venv/bin/python scratchpad/_j21/lista_studio.py 2>/dev/null | grep -E "^parte $n \|")
  echo "   Studio dice: ${fila:-NO APARECE}"
  if echo "$fila" | grep -q "PROGRAMADA | $esperado"; then
    echo "   ✔ confirmada"; grep -v "^$id " "$PEND" > "$PEND.tmp" && mv "$PEND.tmp" "$PEND"
  else
    real=$(echo "$fila" | sed -E 's/.*\| ([0-9]{1,2} [a-z]{3}, [0-9]{2}:[0-9]{2}) \|.*/\1/')
    if [ -n "$fila" ]; then
      pref=$(head -c 60 scratchpad/_j21/copys_c/${id%%_*}_copy_tiktok.txt)
      echo "   ✗ fecha equivocada ($real): la borro"; timeout 600 .venv/bin/python scratchpad/borra_tiktok.py "$real" "$pref" 2>&1 | tail -2
    fi
    echo "== DETENIDO en la parte $n: no quedó donde debía"; break
  fi
  k=$((k+1)); if [ $((k % 4)) -eq 0 ]; then sleep 1200; else sleep 480; fi
done 3< <(cat "$PEND")
echo "== FIN ($(date '+%d-%b %H:%M')) · quedan $(wc -l < "$PEND") pendientes"
