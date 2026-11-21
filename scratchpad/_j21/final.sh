#!/usr/bin/env bash
# Última pasada: rehace c02 (sin prompt, fin en «aprendió») y c04 (fin en «aquí»),
# requema las editadas a mano, re-barre privacidad en las rehechas, copia y lanza la
# tanda 1. Esperas por PID, nunca por pgrep (el cuelgue de 9 h de hoy).
set -u
cd /home/jose/tiktok
for id in c02_deep_learning_como_aprende c04_entrenar_70_30_optimizador; do rm -f scratchpad/_j21/piezas/$id*.mp4 scratchpad/_j21/piezas/$id.ass scratchpad/_j21/piezas/${id}_palabras.json; done
.venv/bin/python scratchpad/_j21/corta.py c02_deep_learning_como_aprende > scratchpad/_j21/final_c02.log 2>&1 & P1=$!
.venv/bin/python scratchpad/_j21/corta.py c04_entrenar_70_30_optimizador > scratchpad/_j21/final_c04.log 2>&1 & P2=$!
.venv/bin/python scratchpad/_j21/corta.py requemar c05_metricas_epocas c06_limpieza_de_datos c09_transformador_atencion c10_embeddings_siguiente_token c13_salida_mas_cara c29_claude_md c30_subagentes_orquestador c31_arquitectura_final_cierre > scratchpad/_j21/final_req.log 2>&1
wait $P1 $P2
echo "== rehechas $(grep -hc '✔' scratchpad/_j21/final_c02.log scratchpad/_j21/final_c04.log | paste -sd+ | bc) de 2 · requemadas $(grep -c '✔' scratchpad/_j21/final_req.log) de 8 ($(date +%H:%M))"
.venv/bin/python scratchpad/_j21/tapa_ruta2d.py c02_deep_learning_como_aprende c04_entrenar_70_30_optimizador c05_metricas_epocas 2>&1 | grep -E "tramos|tapado|s  x="
.venv/bin/python scratchpad/_j21/verifica.py 2>&1 | grep -E "FALLO|✔|SUBS"
for id in c02_deep_learning_como_aprende c04_entrenar_70_30_optimizador c05_metricas_epocas c06_limpieza_de_datos c09_transformador_atencion c10_embeddings_siguiente_token c13_salida_mas_cara c29_claude_md c30_subagentes_orquestador c31_arquitectura_final_cierre; do cp scratchpad/_j21/piezas/$id.mp4 "/mnt/c/Users/USUARIO/Downloads/gpt21c/"; done
echo "== copiadas; lanzo tanda 1 ($(date +%H:%M))"
bash scratchpad/_j21/sube_c.sh 1 > scratchpad/_j21/subida_c1.log 2>&1
echo "== tanda 1: $(grep -c 'publicar: OK' scratchpad/_j21/subida_c1.log) de 17 programadas ($(date +%H:%M))"
echo "== FIN"
