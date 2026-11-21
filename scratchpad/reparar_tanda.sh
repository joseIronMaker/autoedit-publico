#!/usr/bin/env bash
# Re-render QUIRÚRGICO de la serie 2: solo las escenas con defecto.
# Las firmas las siembra scratchpad/reparar_serie2.py --aplicar (voz, D-ID y Omni se reusan).
set -u
cd /home/jose/tiktok
LOGS=/home/jose/tiktok/scratchpad/logs_serie2
mkdir -p "$LOGS"
RES="$LOGS/REPARACION.txt"
: > "$RES"
for ln in "$@"; do
  echo "=== $ln  $(date +%H:%M) ===" | tee -a "$RES"
  if timeout 5400 .venv/bin/python scratchpad/producir_serie2.py "$ln" --reparar \
       > "$LOGS/rep_$ln.log" 2>&1; then
    d=$(grep -oP 'duración final: \K[0-9.]+' "$LOGS/rep_$ln.log" | tail -1)
    echo "  OK  (${d:-?}s)" | tee -a "$RES"
  else
    echo "  FALLÓ (ver rep_$ln.log)" | tee -a "$RES"
    tail -5 "$LOGS/rep_$ln.log" | sed 's/^/    /' | tee -a "$RES"
  fi
done
echo "=== fin  $(date +%H:%M) ===" | tee -a "$RES"
