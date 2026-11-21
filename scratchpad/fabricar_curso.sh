#!/usr/bin/env bash
# Cola del curso de Python: una clase a la vez, sigue aunque una falle.
set -u
cd /home/jose/tiktok
L=/home/jose/tiktok/scratchpad/_curso/logs
mkdir -p "$L"
R="$L/RESUMEN.txt"
for v in "$@"; do
  echo "=== $v  $(date +%H:%M) ===" | tee -a "$R"
  if timeout 3600 .venv/bin/python scratchpad/producir_curso.py "$v" > "$L/$v.log" 2>&1; then
    grep -E "^✔" "$L/$v.log" | tail -1 | sed 's/^/  /' | tee -a "$R"
  else
    echo "  FALLÓ (ver $v.log)" | tee -a "$R"
    tail -3 "$L/$v.log" | sed 's/^/    /' | tee -a "$R"
  fi
done
echo "=== fin  $(date +%H:%M) ===" | tee -a "$R"
