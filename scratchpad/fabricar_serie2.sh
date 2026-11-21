#!/usr/bin/env bash
# Produce la serie 2 completa, un video a la vez, con la voz validada el 27-jul
# (eleven_multilingual_v2 + single_take). Cada video deja su log aparte para poder
# revisar QC/duración/copy después sin tener que seguir la corrida en vivo.
#
#   bash scratchpad/fabricar_serie2.sh ln02 ln03 ...   (o sin args = ln02..ln19)
set -u
cd /home/jose/tiktok
LOGS=scratchpad/logs_serie2
mkdir -p "$LOGS"

if [ $# -gt 0 ]; then
  LISTA=("$@")
else
  LISTA=(ln02 ln03 ln04 ln05 ln06 ln07 ln08 ln09 ln10 \
         ln11 ln12 ln13 ln14 ln15 ln16 ln17 ln18 ln19)
fi

for v in "${LISTA[@]}"; do
  echo "=== $v  $(date +%H:%M) ==="
  # el mp4 base se borra para forzar regeneración con la voz nueva; los .assets se
  # conservan a propósito: los clips de Omni y las imágenes de codex se reusan (exists())
  stem=$(.venv/bin/python -c "
import json,glob,sys
p=glob.glob('scratchpad/guiones_serie2/${v}*.json')[0]
print('gen_'+json.load(open(p))['slug'])")
  rm -f "videos/${stem}.mp4" "videos/${stem}_final.mp4"
  if .venv/bin/python scratchpad/producir_serie2.py "$v" > "$LOGS/$v.log" 2>&1; then
    echo "  OK  $(grep -o '([0-9.]*s)' "$LOGS/$v.log" | tail -1)"
  else
    echo "  FALLÓ — ver $LOGS/$v.log"
  fi
done
echo "=== fin  $(date +%H:%M) ==="
