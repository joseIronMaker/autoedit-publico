#!/usr/bin/env bash
# Sube EN ORDEN las partes 3-5 (patrón 19:00 / 20:00) y tras cada una lee el Studio: si la
# fila no aparece PROGRAMADA con la fecha exacta, SE DETIENE (no se arregla solo, no se borra).
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\freecad_mcp'
while read -r id fecha hora n <&3; do
  echo "######## parte $n → $fecha $hora ($(date '+%H:%M:%S'))"
  timeout 1800 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$id.mp4" "scratchpad/_j1010/copys/${id%%_*}_copy_tiktok.txt" "$fecha" "$hora" < /dev/null 2>&1 | tail -4
  sleep 45
  esperado="$(LC_ALL=C date -d "$fecha" '+%-d %b' | tr 'A-Z' 'a-z'), $hora"
  fila=$(timeout 600 flock /tmp/tiktok_studio.lock .venv/bin/python scratchpad/_j1010/lista_studio.py --max 2 2>/dev/null | grep "CAD con IA, parte $n:")
  echo "   Studio dice: ${fila:-NO APARECE}"
  if echo "$fila" | grep -q "PROGRAMADA | $esperado"; then echo "   ✔ confirmada"; else echo "== DETENIDO en la parte $n"; break; fi
  sleep 480
done 3< <(printf '%s\n' "f03_prompt_trece_imagenes 2026-10-11 20:00 3" "f04_claude_arma_la_trituradora 2026-10-12 19:00 4" "f05_resultado_ensamble 2026-10-12 20:00 5")
echo "== FIN ($(date '+%H:%M'))"
