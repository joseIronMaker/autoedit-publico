#!/usr/bin/env bash
# TODAS las clases, con la captura de terminal ya corregida (DPI por monitor: antes se
# grababan dos tercios de la ventana y el código salía cortado por la derecha).
set -u
cd /home/jose/tiktok
L=scratchpad/_curso/logs
DEST="/mnt/c/Users/USUARIO/Downloads/curso_python"
R="$L/TODO.txt"
echo "=== inicio $(date +%H:%M) ===" >> "$R"
PERRITO="py03 py07"      # las únicas a las que les faltaba la foto en el guion de assets
stem_de() { .venv/bin/python -c "
import json,glob
print('gen_'+json.load(open(glob.glob('scratchpad/guiones_curso/$1_*.json')[0]))['slug'])"; }

for c in "$@"; do
  stem=$(stem_de "$c"); num=${c#py}
  nom="clase${num}_$(basename $(ls scratchpad/guiones_curso/${c}_*.json) .json | sed "s/^${c}_//")"
  echo "=== $c  $(date +%H:%M) ===" >> "$R"
  log="$L/todo_$c.log"; : > "$log"
  case " $PERRITO " in *" $c "*)
    .venv/bin/python scratchpad/pon_perrito.py "$c" --sin-ensamblar >> "$log" 2>&1 \
      || echo "  perrito falló" >> "$R" ;;
  esac
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
    echo "  GRABACIÓN falló" >> "$R"; tail -3 "$log" | sed 's/^/    /' >> "$R"
  fi
done
wait
echo "=== fin $(date +%H:%M) ===" >> "$R"
.venv/bin/python scratchpad/_curso/verifica_entrega.py >> "$R" 2>&1
