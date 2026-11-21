#!/usr/bin/env bash
# Reconstruye piezas de «PCB con IA» con el arranque nuevo (gancho.py), 3 a la vez.
# Sin argumentos: las 14. Con argumentos: solo esas (prefijos p01 p02 …).
cd /home/jose/tiktok
todas=$(python3 -c "import json;print('\n'.join(k for k in json.load(open('scratchpad/_j1011/ganchos.json')) if k[0]=='p'))")
if [ $# -gt 0 ]; then todas=$(echo "$todas" | grep -E "^($(echo "$@" | tr ' ' '|'))_"); fi
# `|| true`: si una pieza falla, xargs NO debe abandonar las demás (un código 255 o una
# señal en un hijo lo detiene entero — pasó el 15-oct al cortar tres a mano)
echo "$todas" | xargs -P 3 -I{} sh -c '.venv/bin/python scratchpad/_j1011/gancho.py {} 2>&1 | tr "\r" "\n" | grep -v "^frame=" | tail -2 || true'
echo "== V2 FIN $(date +%T)"
