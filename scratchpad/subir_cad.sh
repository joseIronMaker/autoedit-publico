#!/usr/bin/env bash
# jose13 (pieza mecánica) y jose14 (planos de arquitectura), en los dos huecos siguientes.
# Cadencia del canal: 19:00 y 20:00. Última ranura ocupada: 30-ago 19:00.
# Primero el corto (1:52) y después el largo (2:48).
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\grabados'
C='/mnt/c/Users/USUARIO/Downloads/grabados'
sube () {
  echo "######## $1  →  $3 $4   ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -12 || echo "FALLO $1"
  echo "--- pausa $5 s"; sleep "$5"
}
sube jose13_cad_con_ia.mp4      jose13_copy_tiktok.txt 2026-08-30 20:00 480
sube jose14_planos_con_ia.mp4   jose14_copy_tiktok.txt 2026-08-31 19:00 10
echo "######## FIN  ($(date '+%H:%M:%S'))"

# jose15 (PCB con KiCad) — siguiente hueco tras el 31-ago 19:00
