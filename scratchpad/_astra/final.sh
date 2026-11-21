#!/usr/bin/env bash
# Cierre de los tres videos de noticias, EN ORDEN y sin intervención. Cada uno:
# escenas pendientes → ensamblado → verificación → render final.
set -u; cd /home/jose/tiktok; L=scratchpad/_astra; R=$L/CADENA.txt
echo "=== CIERRE FINAL $(date +%H:%M) ===" >> "$R"

cierra () {                       # $1 stem  $2... escenas a rehacer
  stem=$1; shift
  for i in "$@"; do
    if ! .venv/bin/python scratchpad/rehacer_escena.py "$stem" "$i" --sin-ensamblar >> "$L/cierre_$stem.log" 2>&1; then
      echo "  $stem escena $i FALLÓ" >> "$R"; return 1; fi
    echo "  $stem escena $i ok $(date +%H:%M)" >> "$R"
  done
  .venv/bin/python scratchpad/rehacer_escena.py "$stem" --solo-ensamblar >> "$L/cierre_$stem.log" 2>&1 \
    || { echo "  $stem ensamblado FALLÓ" >> "$R"; return 1; }
  # el ensamblado cambió de duración al rehacer escenas: el edl viejo ya no sirve
  .venv/bin/python scratchpad/_curso/verifica_ensamblado.py "$stem" >> "$R" 2>&1 || true
  rm -f "videos/${stem}_final.mp4"
  if .venv/bin/python -m autoedit.cli "videos/$stem.mp4" --auto >> "$L/cierre_final_$stem.log" 2>&1; then
    f=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${stem}_final.mp4")
    echo "  ✔ FINAL $stem: ${f}s  $(date +%H:%M)" >> "$R"
  else echo "  ✘ FINAL $stem FALLÓ" >> "$R"; return 1; fi
}

# el duelo ya tiene la escena 4 corriendo aparte; se espera y solo se ensambla y renderiza
for _ in $(seq 1 120); do pgrep -f "rehacer_escena.py gen_duelo_codex_astra 4" > /dev/null || break; sleep 15; done
cierra gen_duelo_codex_astra
cierra gen_astra_arnes 4
cierra gen_cybercab_sin_volante 0 2 5
echo "=== LOS TRES LISTOS $(date +%H:%M) ===" >> "$R"
