#!/usr/bin/env bash
# Pasada final por pieza: rellena huecos de Whisper, requema (vocabulario + tapas pixeladas),
# barrido OCR del quemado, y copia a Descargas\pcb_ia solo si verifica.py pasa Y el barrido
# da 0 sospechas.
cd /home/jose/tiktok/scratchpad/_j1011
PY=/home/jose/tiktok/.venv/bin/python
D=/mnt/c/Users/USUARIO/Downloads/pcb_ia
for id in "$@"; do
  $PY rellena.py "$id"
  $PY corta.py requemar "$id" 2>&1 | tr '\r' '\n' | grep -v "^frame="
  rm -f piezas/_ocr_${id}_*.png
  barrido=$($PY ocr_barrido.py "$id" 2>&1 | grep -v Warn); echo "$barrido"
  if ! echo "$barrido" | grep -q " 0 sospechas"; then
    echo "   ✗ $id tiene sospechas en el barrido: no se copia"
  elif $PY verifica.py "$id"; then
    cp "piezas/$id.mp4" "$D/" && cp "copys/${id%%_*}_copy_tiktok.txt" "$D/" && echo "   → Descargas: $id"
  else
    echo "   ✗ $id NO pasó verifica: no se copia"
  fi
done
echo "== FINAL FIN $* $(date +%T)"
