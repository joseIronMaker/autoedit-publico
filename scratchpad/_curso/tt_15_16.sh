#!/usr/bin/env bash
# Reemplazo en TikTok de las clases 15 y 16 con la versión limpia (sin Chrome detrás).
# Toma los candados de pantalla y de TikTok Studio, así que espera si hay grabación.
set -u; cd /home/jose/tiktok; R=scratchpad/_curso/logs/V2.txt; V2="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
rep() {  # $1=clase  $2=fecha  $3=hora  $4=nombre base
  local c=$1 fecha=$2 hora=$3 base=$4 dia et pref
  dia=$(date -d "$fecha" +%-d); et="$dia sep, $hora"; pref=$(head -c 22 "$V2/${base}_copy.txt")
  timeout 500 .venv/bin/python scratchpad/borra_tiktok.py "$et" "$pref" || { echo "  $c: no se borró" >> "$R"; return 1; }
  sleep 8
  if timeout 500 .venv/bin/python scratchpad/borra_tiktok.py "$et" "$pref" --dry 2>&1 | grep -q "aqui pararia"; then
    echo "  $c: la vieja sigue tras borrar, NO subo" >> "$R"; return 1
  fi
  timeout 900 .venv/bin/python scratchpad/subir_tiktok.py subir "C:\\Users\\USUARIO\\Downloads\\curso_python_v2\\${base}.mp4" "$V2/${base}_copy.txt" "$fecha" "$hora" \
    && echo "  TikTok reemplazada $c (versión limpia) $(date +%H:%M)" >> "$R"
}
rep py15 2026-09-09 19:00 clase15_pygame
rep py16 2026-09-09 20:00 clase16_app_escritorio
