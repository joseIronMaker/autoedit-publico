#!/usr/bin/env bash
set -u; cd /home/jose/tiktok; S=gen_curso_py14_piedra_papel_tijera; R=scratchpad/_curso/logs/V2.txt; V2="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
sleep 300   # que a la API se le pase el 529
{ .venv/bin/python scratchpad/graba_curso.py py14 --solo 0 && rm -f videos/${S}_final.mp4 && .venv/bin/python -m autoedit.cli videos/$S.mp4 --render && cp videos/${S}_final.mp4 "$V2/clase14_piedra_papel_tijera.mp4" && echo "  corregida py14 (Claude regrabado) $(date +%H:%M)" >> $R && bash scratchpad/_curso/posproduce.sh py14; } > scratchpad/_curso/logs/fix14.log 2>&1
