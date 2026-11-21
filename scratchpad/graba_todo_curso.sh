#!/usr/bin/env bash
# Graba las terminales/ventanas REALES de cada clase, re-ensambla, quema subtítulos y
# entrega a Descargas. Una clase a la vez: solo hay un segundo monitor.
set -u
cd /home/jose/tiktok
L=/home/jose/tiktok/scratchpad/_curso/logs
DEST="/mnt/c/Users/USUARIO/Downloads/curso_python"
mkdir -p "$L" "$DEST"
R="$L/REALES.txt"
for c in "$@"; do
  echo "=== $c  $(date +%H:%M) ===" | tee -a "$R"
  slug=$(basename $(ls scratchpad/guiones_curso/${c}_*.json) .json)
  stem="gen_curso_${slug/_//}"
  stem=$(.venv/bin/python -c "
import json,glob
d=json.load(open(glob.glob('scratchpad/guiones_curso/${c}_*.json')[0]))
print('gen_'+d['slug'])")
  if timeout 3600 .venv/bin/python scratchpad/graba_curso.py "$c" > "$L/real_$c.log" 2>&1; then
    # los subtítulos se queman DESPUÉS: el re-ensamblado deja el mp4 base sin ellos
    # subtítulos y entrega EN PARALELO con la grabación de la clase siguiente: son CPU
    # pura y la grabación es esperar a la pantalla, así que no se estorban
    num=${c#py}
    nombre="clase${num}_$(echo $slug | sed "s/^${c}_//")"
    ( rm -f "videos/${stem}_final.mp4"
      if timeout 2400 .venv/bin/python -m autoedit.cli "videos/${stem}.mp4" --render \
           >> "$L/real_$c.log" 2>&1; then
        cp "videos/${stem}_final.mp4" "$DEST/$nombre.mp4"
        echo "  OK $nombre.mp4" >> "$R"
      else
        echo "  subtitulos FALLARON en $c" >> "$R"
      fi ) &
  else
    echo "  FALLÓ la grabación (ver real_$c.log)" | tee -a "$R"
    tail -3 "$L/real_$c.log" | sed 's/^/    /' | tee -a "$R"
  fi
done
wait
echo "=== fin  $(date +%H:%M) ===" | tee -a "$R"
