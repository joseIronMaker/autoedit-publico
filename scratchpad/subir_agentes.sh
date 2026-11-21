#!/usr/bin/env bash
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\agentes'
C=scratchpad/copys_manuales_agentes
subir () {
  echo "######## $1  $3 $4"
  timeout 2400 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" || echo "FALLO $1"
  echo "--- pausa 6 min"; sleep 360
}
subir ag01_le_dije_que_si_172_veces.mp4 ag01.txt 2026-08-17 20:00
subir ag02_ochenta_y_dos_esperas.mp4    ag02.txt 2026-08-18 19:00
subir ag03_le_vacie_la_memoria.mp4      ag03.txt 2026-08-18 20:00
echo "######## FIN"
