#!/usr/bin/env bash
# Programa las 28 clases restantes del curso, dos por día a las 19:00 y 20:00.
# TikTok corta a las ~4-5 subidas seguidas, así que van con pausa entre ellas y una
# pausa larga cada cuatro. Si una falla, se apunta y se sigue con la siguiente.
set -u
cd /home/jose/tiktok
L=scratchpad/_curso/logs
R="$L/SUBIDAS.txt"
WIN='C:\Users\USUARIO\Downloads\curso_python'
DEST="/mnt/c/Users/USUARIO/Downloads/curso_python"
echo "=== inicio $(date +%H:%M) ===" >> "$R"
n=0
while IFS=$'\t' read -r -u 3 mp4 txt fecha hora; do
  [ -z "$mp4" ] && continue
  n=$((n + 1))
  echo "--- $mp4 → $fecha $hora  ($(date +%H:%M))" >> "$R"
  if timeout 900 .venv/bin/python scratchpad/subir_tiktok.py subir \
       "$WIN\\$mp4" "$DEST/$txt" "$fecha" "$hora" < /dev/null >> "$L/sub_${mp4%.mp4}.log" 2>&1; then
    echo "    OK" >> "$R"
  else
    echo "    FALLÓ (ver sub_${mp4%.mp4}.log)" >> "$R"
    tail -3 "$L/sub_${mp4%.mp4}.log" | sed 's/^/      /' >> "$R"
  fi
  if [ $((n % 4)) -eq 0 ]; then
    echo "    (pausa larga: TikTok corta a las ~4-5 seguidas)" >> "$R"
    sleep 900
  else
    sleep 120
  fi
# el fichero del plan DEBE acabar en salto de línea: `read` no entrega la última línea
# si no lo lleva, y la clase 30 se quedó sin subir sin que nada fallara
done 3< <(cat "${PLAN:-scratchpad/_curso/plan_subida.txt}"; echo)
echo "=== fin $(date +%H:%M) ===" >> "$R"
