#!/usr/bin/env bash
# Rehace SOLO el final (subtítulos + música) de una clase ya ensamblada, lo entrega a
# Descargas y lo reemplaza en TikTok. Para cuando el ensamblado está bien pero el render
# salió con la transcripción vieja.
set -u; cd /home/jose/tiktok
L=scratchpad/_curso/logs; DEST="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
for c in "$@"; do
  g=$(ls scratchpad/guiones_curso/${c}_*.json)
  slug=$(.venv/bin/python -c "import json;print(json.load(open('$g'))['slug'])"); stem="gen_$slug"; num=${c#py}
  nom="clase${num}_${slug#curso_${c}_}"
  echo "=== $c rehaciendo final $(date +%H:%M) ===" >> "$L/RENARRA.txt"
  if ! bash scratchpad/_curso/render_seguro.sh "$stem" > "$L/refinal_$c.log" 2>&1; then
    echo "  RENDER malo" >> "$L/RENARRA.txt"; tail -3 "$L/refinal_$c.log" | sed 's/^/    /' >> "$L/RENARRA.txt"; continue; fi
  cp "videos/${stem}_final.mp4" "$DEST/$nom.mp4"
  .venv/bin/python -c "import json;print(json.load(open('videos/$stem.autoedit/copys.json'))['tiktok'].strip())" > "$DEST/${nom}_copy.txt"
  echo "  OK $nom.mp4  $(date +%H:%M)" >> "$L/RENARRA.txt"
  bash scratchpad/_curso/posproduce.sh "$c" >> "$L/refinal_post_$c.log" 2>&1 || echo "  posproducción falló" >> "$L/RENARRA.txt"
done
