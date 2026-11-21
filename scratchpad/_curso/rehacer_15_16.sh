#!/usr/bin/env bash
set -u; cd /home/jose/tiktok; R=scratchpad/_curso/logs/V2.txt; V2="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"; V1="/mnt/c/Users/USUARIO/Downloads/curso_python"
rep() {  # clase stem base fecha hora copy_de_la_programada
  local c=$1 stem=$2 base=$3 fecha=$4 hora=$5 fuente=$6 dia et pref
  bash scratchpad/_curso/render_seguro.sh "$stem" || { echo "  $c: render malo, NO entrego" >> "$R"; return 1; }
  cp "videos/${stem}_final.mp4" "$V2/${base}.mp4"
  .venv/bin/python -c "import json;print(json.load(open('videos/$stem.autoedit/copys.json'))['tiktok'].strip())" > "$V2/${base}_copy.txt"
  echo "  render bueno $c $(date +%H:%M)" >> "$R"
  dia=$(date -d "$fecha" +%-d); et="$dia sep, $hora"; pref=$(head -c 22 "$fuente")
  timeout 500 .venv/bin/python scratchpad/borra_tiktok.py "$et" "$pref" --slot-unico || { echo "  $c: no se borró" >> "$R"; return 1; }
  sleep 8
  timeout 500 .venv/bin/python scratchpad/borra_tiktok.py "$et" "$pref" --slot-unico --dry 2>&1 | grep -q "aqui pararia" && { echo "  $c: la vieja sigue, NO subo" >> "$R"; return 1; }
  timeout 900 .venv/bin/python scratchpad/subir_tiktok.py subir "C:\\Users\\USUARIO\\Downloads\\curso_python_v2\\${base}.mp4" "$V2/${base}_copy.txt" "$fecha" "$hora" \
    && echo "  TikTok reemplazada $c (render completo) $(date +%H:%M)" >> "$R"
}
rep py15 gen_curso_py15_pygame clase15_pygame 2026-09-09 19:00 "$V2/clase15_pygame_copy.txt"
rep py16 gen_curso_py16_app_escritorio clase16_app_escritorio 2026-09-09 20:00 "$V1/clase16_app_escritorio_copy.txt"
