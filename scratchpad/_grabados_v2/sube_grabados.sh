#!/usr/bin/env bash
# Sube los seis grabados rehechos con el patrón del canal: dos por día, 19:00 y 20:00,
# a partir del 17 de septiembre (el curso ocupa hasta el 16). Orden cronológico original.
set -u; cd /home/jose/tiktok
D="/mnt/c/Users/USUARIO/Downloads/grabados_v2"; W='C:\Users\USUARIO\Downloads\grabados_v2'
R=scratchpad/_grabados_v2/SUBIDAS.txt; G=scratchpad/_grabados_v2
echo "=== inicio $(date +%H:%M) ===" >> "$R"
PLAN="13:jose13_cad_con_ia:2026-09-17:20:00
14:jose14_planos_con_ia:2026-09-18:19:00
15:jose15_pcb_con_ia:2026-09-18:20:00
16:jose16_brazo_robotico_con_ia:2026-09-19:19:00
17:jose17_simulacion_robot_con_ia:2026-09-19:20:00"
n=0
while IFS=: read -r -u 3 num base fecha hh mm; do
  [ -z "${num:-}" ] && continue
  hora="$hh:$mm"; n=$((n+1))
  # espera a que el render de esa pieza esté (la 12 puede seguir renderizando)
  for _ in $(seq 1 120); do
    [ -f "$D/$base.mp4" ] && ffprobe -v error -show_entries format=duration -of csv=p=0 "$D/$base.mp4" >/dev/null 2>&1 && break
    f="$G/jose${num}b_final.mp4"
    if ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" >/dev/null 2>&1; then
      cp "$f" "$D/$base.mp4"
      .venv/bin/python -c "import json;print(json.load(open('$G/jose${num}b.autoedit/copys.json'))['tiktok'].strip())" > "$D/${base}_copy.txt"
      break
    fi
    sleep 30
  done
  if [ ! -f "$D/$base.mp4" ]; then echo "  jose$num: sin render, lo salto" >> "$R"; continue; fi
  echo "--- jose$num → $fecha $hora  ($(date +%H:%M))" >> "$R"
  ok=0
  for k in 1 2 3; do
    if timeout 900 .venv/bin/python scratchpad/subir_tiktok.py subir "$W\\$base.mp4" "$D/${base}_copy.txt" "$fecha" "$hora" < /dev/null >> "$G/sub_$num.log" 2>&1; then ok=1; break; fi
    echo "    intento $k/3 falló" >> "$R"; sleep 60
  done
  [ "$ok" = 1 ] && echo "    OK" >> "$R" || echo "    FALLÓ las 3 veces" >> "$R"
  # TikTok corta a las ~4-5 seguidas
  [ $((n % 4)) -eq 0 ] && sleep 900 || sleep 120
done 3<<< "$PLAN"
echo "=== fin $(date +%H:%M) ===" >> "$R"
