#!/usr/bin/env bash
# Serie 3 SIN CARA, voz David C. Un video a la vez.
set -u
cd /home/jose/tiktok
L=/home/jose/tiktok/scratchpad/logs_serie3
mkdir -p "$L"
R="$L/RESUMEN.txt"
: > "$R"
for v in "$@"; do
  echo "=== $v  $(date +%H:%M) ===" | tee -a "$R"
  if timeout 5400 .venv/bin/python scratchpad/producir_serie3.py "$v" > "$L/$v.log" 2>&1; then
    d=$(grep -oP 'Renderizando .*, \K[0-9.]+(?=s)' "$L/$v.log" | tail -1)
    echo "  OK  (${d:-?}s)" | tee -a "$R"
  else
    echo "  FALLÓ (ver $v.log)" | tee -a "$R"
    tail -4 "$L/$v.log" | sed 's/^/    /' | tee -a "$R"
  fi
done
echo "=== fin  $(date +%H:%M) ===" | tee -a "$R"
