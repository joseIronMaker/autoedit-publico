#!/usr/bin/env bash
# Relanza la producción del curso si no está corriendo. Lo llama cron cada 10 minutos y al
# arrancar la máquina: WSL se ha reiniciado dos veces a media tanda y cada corte costaba
# horas. produce_v2 es reanudable, así que relanzar es barato.
set -u; cd /home/jose/tiktok
L=scratchpad/_curso/logs; R="$L/V2.txt"
pgrep -f "produce_v2.sh py" > /dev/null && exit 0
# el re-narrado (voz nueva) también produce videos y usa el mismo Chrome y los
# mismos temporales: dos producciones a la vez se pisan (el video sale con una escena)
pgrep -f "renarra.sh py" > /dev/null && exit 0
pgrep -f "cadena_curso.sh" > /dev/null && exit 0
# ¿queda algo por hacer?
faltan=""
for n in $(seq 20 30); do
  [ -f "/mnt/c/Users/USUARIO/Downloads/curso_python_v2/clase${n}_"*.mp4 ] 2>/dev/null || faltan="$faltan py$n"
done
[ -z "$faltan" ] && exit 0
echo "=== guardián relanza:$faltan  $(date '+%d-%b %H:%M') ===" >> "$R"
setsid nohup bash scratchpad/_curso/produce_v2.sh $faltan >> "$L/guardian_run.log" 2>&1 < /dev/null &
