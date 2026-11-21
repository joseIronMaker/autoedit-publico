#!/usr/bin/env bash
set -u; cd /home/jose/tiktok
L=scratchpad/_curso/logs
bash scratchpad/_curso/renarra.sh py07 py08 py11 py12 py13 py14 py15 py16 py17 py18 py19 py20 py21 >> "$L/renarra_lote2.log" 2>&1
bash scratchpad/_curso/produce_v2.sh py22 py23 py24 py25 py26 py27 py28 py29 py30 >> "$L/produce_lote3.log" 2>&1
.venv/bin/python scratchpad/_curso/audita_calendario.py >> "$L/AUDITORIA.txt" 2>&1
echo "=== CADENA COMPLETA $(date '+%d-%b %H:%M') ===" >> "$L/RENARRA.txt"
