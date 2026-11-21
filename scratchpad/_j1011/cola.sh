#!/usr/bin/env bash
# Renderiza en orden las partes 2-14, una a la vez, después de que termine la 1.
cd /home/jose/tiktok/scratchpad/_j1011
while kill -0 "$1" 2>/dev/null; do sleep 10; done
for id in $(/home/jose/tiktok/.venv/bin/python -c "import json;print(' '.join(p['id'] for p in json.load(open('piezas.json'))[1:]))"); do
  [ -f "piezas/$id.mp4" ] && { echo "== $id ya existe"; continue; }
  /home/jose/tiktok/.venv/bin/python corta.py "$id" 2>&1 | tr '\r' '\n' | grep -v "^frame=" 
done
echo "== COLA FIN $(date +%T)"
