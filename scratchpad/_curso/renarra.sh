#!/usr/bin/env bash
# Rehace la VOZ de una clase ya producida y recompone el video SIN volver a grabar la
# terminal: las capturas (cap_N.mp4) son lo caro y lo frágil (sesión real de Claude, DPI,
# ventanas de WSLg), y no dependen de las palabras. Cambia la narración → nueva locución →
# cada escena se recompone al ritmo de la voz nueva.
#   uso: renarra.sh py09 [py10 ...]
set -u; cd /home/jose/tiktok; export PYTHONUNBUFFERED=1
L=scratchpad/_curso/logs; R="$L/RENARRA.txt"; DEST="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
for c in "$@"; do
  g=$(ls scratchpad/guiones_curso/${c}_*.json)
  slug=$(.venv/bin/python -c "import json;print(json.load(open('$g'))['slug'])"); stem="gen_$slug"; num=${c#py}
  nom="clase${num}_${slug#curso_${c}_}"; A="videos/$stem.assets"
  echo "=== $c  $(date +%H:%M) ===" >> "$R"
  if [ ! -d "$A" ]; then echo "  sin assets: esta clase no está producida" >> "$R"; continue; fi
  .venv/bin/python -c "import sys; sys.path.insert(0,\"scratchpad\"); from editor_grabados import mata_chrome_huerfano as m; m()" >/dev/null 2>&1
  tema=$(.venv/bin/python -c "import json;print(json.load(open('$g'))['tema'])")
  # BORRAR EL ENSAMBLADO ANTES DE GENERAR. autoedit-gen NO sobrescribe un video que ya
  # existe: le pone `_1` al nombre (unicidad global de stems). Con el mp4 en su sitio, la
  # voz nueva se escribía en `<stem>_1.assets` y el resto del pipeline seguía recomponiendo
  # la carpeta VIEJA — la clase se entregaba con el audio de antes y todos los pasos decían
  # OK (5-sep-2026). Sin el mp4, la carpeta de assets se reusa tal cual y las capturas
  # sobreviven; la voz se invalida sola porque la firma incluye el texto.
  rm -f "videos/$stem.mp4"
  # restos de un intento abortado ANTES de este: si se quedan, la guarda de abajo los
  # confunde con una generación desviada y frena una clase que iba bien (py17, 6-sep)
  rm -rf "videos/${stem}_1.assets" "videos/${stem}_1.mp4"
  if ! timeout 7200 .venv/bin/autoedit-gen "$tema" --guion "$g" --dir videos > "$L/renarra_gen_$c.log" 2>&1; then
    echo "  GENERACIÓN falló" >> "$R"; tail -4 "$L/renarra_gen_$c.log" | sed 's/^/    /' >> "$R"; continue; fi
  if [ -d "videos/${stem}_1.assets" ]; then
    echo "  ABORTO: se generó en ${stem}_1 (el mp4 viejo seguía ahí)" >> "$R"; continue; fi
  if ! .venv/bin/python scratchpad/_curso/firma_voz.py "$c" "$stem" >> "$R" 2>&1; then
    echo "  ABORTO: la locución no corresponde a la narración nueva" >> "$R"; continue; fi
  # recomponer cada escena que YA tiene captura grabada, al ritmo de la voz nueva
  n=0
  for cap in "$A"/cap_*.mp4; do
    [ -e "$cap" ] || continue
    i=$(basename "$cap" .mp4); i=${i#cap_}
    .venv/bin/python scratchpad/rehacer_escena.py "$stem" "$i" --sin-ensamblar >> "$L/renarra_cap_$c.log" 2>&1 \
      && n=$((n+1)) || echo "  escena $i no se recompuso" >> "$R"
  done
  echo "  capturas reusadas: $n" >> "$R"
  .venv/bin/python scratchpad/pon_perrito.py "$c" >> "$L/renarra_cap_$c.log" 2>&1 || true
  .venv/bin/python scratchpad/rehacer_escena.py "$stem" --solo-ensamblar >> "$L/renarra_cap_$c.log" 2>&1
  if ! bash scratchpad/_curso/render_seguro.sh "$stem" > "$L/renarra_sub_$c.log" 2>&1; then
    echo "  RENDER malo (corta de más o falló)" >> "$R"; continue; fi
  cp "videos/${stem}_final.mp4" "$DEST/$nom.mp4"
  .venv/bin/python -c "import json;print(json.load(open('videos/$stem.autoedit/copys.json'))['tiktok'].strip())" > "$DEST/${nom}_copy.txt"
  echo "  OK $nom.mp4  $(date +%H:%M)" >> "$R"
  bash scratchpad/_curso/posproduce.sh "$c" >> "$L/renarra_post_$c.log" 2>&1 || echo "  posproducción falló" >> "$R"
done
echo "=== fin $(date +%H:%M) ===" >> "$R"
