#!/usr/bin/env bash
# TODO lo que falta del curso v2, en un solo proceso desprendido (setsid) para que no
# muera cuando se cierra la sesión de Claude Code — ya pasó dos veces.
set -u; cd /home/jose/tiktok; R=scratchpad/_curso/logs/V2.txt
echo "=== arranque desprendido $(date +%H:%M) ===" >> "$R"
bash scratchpad/_curso/rehacer_15_16.sh >> scratchpad/_curso/logs/rehacer_15_16.log 2>&1
bash scratchpad/_curso/produce_v2.sh py17 py18 py19 py20 py21 py22 py23 py24 py25 py26 py27 py28 py29 py30
echo "=== TODO TERMINADO $(date +%H:%M) ===" >> "$R"
