#!/usr/bin/env bash
# Por pieza: (re)corta si falta, tapas por OCR del crudo, requema con tapas y vocabulario,
# barrido OCR del final. Uso: post.sh id [id ...]
cd /home/jose/tiktok/scratchpad/_j1011
PY=/home/jose/tiktok/.venv/bin/python
for id in "$@"; do
  [ -f "piezas/${id}.mp4" ] || $PY corta.py "$id" 2>&1 | tr '\r' '\n' | grep -v "^frame="
  $PY tapas_ocr.py "$id" 2>&1 | grep -v Warn
  $PY corta.py requemar "$id" 2>&1 | tr '\r' '\n' | grep -v "^frame="
  rm -f piezas/_ocr_${id}_*.png
  $PY ocr_barrido.py "$id" 2>&1 | grep -v Warn
done
echo "== POST FIN $* $(date +%T)"
