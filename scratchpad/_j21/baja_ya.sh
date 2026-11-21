#!/usr/bin/env bash
# Baja de inmediato las partes que TikTok movió a HOY y publicó fuera de orden.
# Primero como PUBLICADA (sin etiqueta de reloj); si sigue programada, como programada.
cd /home/jose/tiktok
for n in 20 28 30 23 25 27 29 21 22 24 26 31; do
  pref=$(head -c 60 scratchpad/_j21/copys_c/c${n}_copy_tiktok.txt | sed 's/[[:space:]]*$//')
  echo "#### parte $n ($(date +%H:%M:%S))"
  timeout 600 .venv/bin/python scratchpad/borra_publicada.py "$pref" --max-vistas 800 2>&1 | tail -3
  timeout 600 .venv/bin/python scratchpad/borra_tiktok.py "24 sep, 20:00" "$pref" 2>&1 | tail -2
  timeout 600 .venv/bin/python scratchpad/borra_tiktok.py "24 sep, 19:00" "$pref" 2>&1 | tail -2
done
echo "#### FIN ($(date +%H:%M:%S))"
