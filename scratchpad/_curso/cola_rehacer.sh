#!/usr/bin/env bash
# Las cinco que quedaron atrás durante la cola buena:
#   py01 py02 — se entregaron ANTES del recorte automático de la terminal
#   py15 py16 py17 — la ventana del juego/app se buscaba por región (salía el escritorio
#                    de Windows con la barra de tareas) y ahora se busca por TÍTULO
set -u
cd /home/jose/tiktok
L=scratchpad/_curso/logs
DEST="/mnt/c/Users/USUARIO/Downloads/curso_python"
R="$L/REHACER.txt"
echo "=== inicio $(date +%H:%M) ===" >> "$R"
stem_de() { .venv/bin/python -c "
import json,glob
print('gen_'+json.load(open(glob.glob('scratchpad/guiones_curso/$1_*.json')[0]))['slug'])"; }

for c in "$@"; do
  stem=$(stem_de "$c"); num=${c#py}
  nom="clase${num}_$(basename $(ls scratchpad/guiones_curso/${c}_*.json) .json | sed "s/^${c}_//")"
  echo "=== $c  $(date +%H:%M) ===" >> "$R"
  log="$L/reh_$c.log"; : > "$log"
  # las escenas de Claude EDITAN de verdad los archivos del curso (es su gracia), así que
  # el demo se restaura desde git antes de cada clase: si no, ventana.py acaba siendo otra
  # app con otro título y la grabadora no encuentra la ventana
  git checkout -- scratchpad/_curso/demo/ 2>/dev/null
  if timeout 3600 .venv/bin/python scratchpad/graba_curso.py "$c" >> "$log" 2>&1; then
    ( rm -f "videos/${stem}_final.mp4"
      if timeout 2400 .venv/bin/python -m autoedit.cli "videos/${stem}.mp4" --render >> "$log" 2>&1; then
        cp "videos/${stem}_final.mp4" "$DEST/$nom.mp4"
        echo "  OK $nom.mp4  $(date +%H:%M)" >> "$R"
      else
        echo "  render FALLÓ en $c" >> "$R"
      fi ) &
    while [ "$(jobs -rp | wc -l)" -ge 2 ]; do wait -n; done
  else
    echo "  GRABACIÓN falló en $c" >> "$R"; tail -4 "$log" | sed 's/^/    /' >> "$R"
  fi
done
wait
echo "=== fin $(date +%H:%M) ===" >> "$R"
.venv/bin/python scratchpad/_curso/verifica_ensamblado.py >> "$R" 2>&1
.venv/bin/python scratchpad/_curso/verifica_entrega.py >> "$R" 2>&1
