#!/usr/bin/env bash
# Programa cada noche las piezas de la clase que YA entran en la ventana de TikTok.
# Medido 23/24-sep-2026: TikTok acepta hasta AHORA + 240 h exactas; más allá redirige
# como si hubiera ido bien y descarta el post (el script dice "publicar: OK" y no está).
# Por eso una pieza solo se da por hecha cuando APARECE en el calendario (lista_completa),
# no por el log. Corre por cron a las 21:05; si WSL estaba apagado, el siguiente día la
# ventana sigue abierta (las piezas van con 10 días de margen, se pierde uno como mucho).
set -u
cd /home/jose/tiktok
# corre cada hora: el candado evita que dos pasadas se pisen (la verificación del
# calendario llega al final y hasta entonces la pieza sigue en pendientes)
exec 9>/tmp/programa_pendientes.lock; flock -n 9 || exit 0
PEND=scratchpad/_j21/pendientes.txt; LOG=scratchpad/_j21/pendientes.log
D='C:\Users\USUARIO\Downloads\gpt21c'; C='/mnt/c/Users/USUARIO/Downloads/gpt21c'
[ -s "$PEND" ] || { crontab -l 2>/dev/null | grep -v programa_pendientes.sh | crontab -; exit 0; }
ahora=$(date +%s); tope=$((ahora + 239*3600))            # 239 h: una de margen
subidas=0
while read -r id fecha hora n; do
  [ "$(date -d "$fecha $hora" +%s)" -le "$tope" ] || continue
  echo "######## $id → $fecha $hora ($(date '+%d-%b %H:%M'))" >> "$LOG"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$id.mp4" "$C/${id%%_*}_copy_tiktok.txt" "$fecha" "$hora" 2>&1 | tail -6 >> "$LOG"
  subidas=$((subidas+1)); sleep 480
done < "$PEND"
[ "$subidas" -gt 0 ] || exit 0
# la verdad es el calendario: se quitan de pendientes solo las que aparecen con su fecha
sleep 60
timeout 900 .venv/bin/python scratchpad/_j21/lista_completa.py 2>/dev/null | grep -E "^parte" > /tmp/partes_en_tiktok.txt
while read -r id fecha hora n; do
  d=$(date -d "$fecha" '+%-d %b' | sed 's/Sep/sep/; s/Oct/oct/')
  if grep -qE "^parte $n -> $d, $hora$" /tmp/partes_en_tiktok.txt; then
    echo "  ✔ parte $n confirmada en el calendario ($d, $hora)" >> "$LOG"
    grep -v "^$id " "$PEND" > "$PEND.tmp" && mv "$PEND.tmp" "$PEND"
  else
    echo "  ✗ parte $n NO aparece en el calendario: queda pendiente" >> "$LOG"
  fi
done < <(cat "$PEND")
echo "== quedan $(wc -l < "$PEND") pendientes ($(date '+%d-%b %H:%M'))" >> "$LOG"
