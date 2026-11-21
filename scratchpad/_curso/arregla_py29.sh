#!/usr/bin/env bash
# La 29 se entregaba en 13.8 s de 72.6: el ensamblado estaba bien, lo que estaba viejo era
# el `edl.json` (los cortes por silencio se habían calculado sobre OTRA versión del video).
# --render lo reusa; hace falta --auto para recalcular transcripción y cortes.
set -u
cd /home/jose/tiktok
L=scratchpad/_curso/logs
DEST="/mnt/c/Users/USUARIO/Downloads/curso_python"
R="$L/REHACER.txt"
while pgrep -f "cola_rehacer.sh" > /dev/null; do sleep 20; done
echo "=== py29 (edl recalculado)  $(date +%H:%M) ===" >> "$R"
rm -f videos/gen_curso_py29_git_final.mp4 videos/gen_curso_py29_git.autoedit/edl.json
if timeout 2400 .venv/bin/python -m autoedit.cli videos/gen_curso_py29_git.mp4 --auto \
     > "$L/py29_auto.log" 2>&1; then
  cp videos/gen_curso_py29_git_final.mp4 "$DEST/clase29_git.mp4"
  echo "  OK clase29_git.mp4  $(date +%H:%M)" >> "$R"
else
  echo "  py29 FALLÓ" >> "$R"; tail -4 "$L/py29_auto.log" | sed 's/^/    /' >> "$R"
fi
.venv/bin/python scratchpad/_curso/verifica_entrega.py >> "$R" 2>&1
echo "=== TODO VERIFICADO $(date +%H:%M) ===" >> "$R"
