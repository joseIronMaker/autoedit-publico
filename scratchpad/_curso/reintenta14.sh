#!/usr/bin/env bash
# Mientras la API de Claude devuelva 529, la clase 14 se reintenta cada 20 min (máx. 6).
set -u; cd /home/jose/tiktok; S=gen_curso_py14_piedra_papel_tijera; R=scratchpad/_curso/logs/V2.txt; V2="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
while pgrep -f "fix14.sh" >/dev/null; do sleep 30; done
for k in 1 2 3 4 5 6; do
  grep -q "TikTok reemplazada py14" $R && exit 0
  sleep 1200
  { .venv/bin/python scratchpad/graba_curso.py py14 --solo 0 && rm -f videos/${S}_final.mp4 && .venv/bin/python -m autoedit.cli videos/$S.mp4 --render && cp videos/${S}_final.mp4 "$V2/clase14_piedra_papel_tijera.mp4" && echo "  corregida py14 (reintento $k) $(date +%H:%M)" >> $R && bash scratchpad/_curso/posproduce.sh py14; } >> scratchpad/_curso/logs/fix14.log 2>&1
done
