#!/usr/bin/env bash
# Espera a que una clase quede entregada por produce_v2 y le corre perrito (si tiene) + QC + TikTok.
set -u; cd /home/jose/tiktok; c=$1; n=${c#py}; V2="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
until grep -q "OK clase${n}_" scratchpad/_curso/logs/V2.txt; do sleep 45; done
stem=$(.venv/bin/python -c "import json,glob;print('gen_'+json.load(open(glob.glob('scratchpad/guiones_curso/${c}_*.json')[0]))['slug'])")
if .venv/bin/python scratchpad/pon_perrito.py "$c" > scratchpad/_curso/logs/perro_$c.log 2>&1; then
  rm -f videos/${stem}_final.mp4; .venv/bin/python -m autoedit.cli videos/$stem.mp4 --render >> scratchpad/_curso/logs/perro_$c.log 2>&1 && cp videos/${stem}_final.mp4 "$V2/$(ls "$V2" | grep -m1 "^clase${n}_.*mp4$")" && echo "  perrito puesto $c" >> scratchpad/_curso/logs/V2.txt
fi
bash scratchpad/_curso/posproduce.sh "$c" > scratchpad/_curso/logs/pos_$c.log 2>&1
