#!/usr/bin/env bash
# Espera a que acaben los barridos de privacidad (reescriben mp4), rehace las 9 piezas
# cuyo límite caía a media palabra (+ c02, a la que el VAD se comió 7,7 s de subtítulos),
# requema las 5 que solo necesitan el diccionario nuevo, vuelve a pasar el barrido sobre
# las tocadas y verifica las 31.
set -u
cd /home/jose/tiktok
while pgrep -f "tapa_ruta2d[.]py" > /dev/null; do sleep 30; done
echo "== barridos terminados ($(date +%H:%M))"
REH_A="c02_deep_learning_como_aprende c03_dataset_casas_regresion c04_entrenar_70_30_optimizador c06_limpieza_de_datos c07_comparar_modelos"
REH_B="c09_transformador_atencion c10_embeddings_siguiente_token c12_tokenizador c13_salida_mas_cara"
for id in $REH_A $REH_B; do rm -f scratchpad/_j21/piezas/$id*.mp4 scratchpad/_j21/piezas/$id.ass scratchpad/_j21/piezas/${id}_palabras.json; done
.venv/bin/python scratchpad/_j21/corta.py $REH_A > scratchpad/_j21/rehace_A.log 2>&1 &
.venv/bin/python scratchpad/_j21/corta.py $REH_B > scratchpad/_j21/rehace_B.log 2>&1 &
REQ="c17_quemar_tokens c19_bases_vectoriales_rag c29_claude_md c30_subagentes_orquestador c31_arquitectura_final_cierre"
.venv/bin/python scratchpad/_j21/corta.py requemar $REQ > scratchpad/_j21/requema.log 2>&1
wait
echo "== rehechas: $(grep -hc '✔' scratchpad/_j21/rehace_A.log scratchpad/_j21/rehace_B.log | paste -sd+ | bc) de 9; requemadas: $(grep -c '✔' scratchpad/_j21/requema.log) de 5 ($(date +%H:%M))"
.venv/bin/python scratchpad/_j21/tapa_ruta2d.py $REH_A $REH_B $REQ 2>&1 | grep -E "tramos|tapado"
echo "== verificación"
.venv/bin/python scratchpad/_j21/verifica.py 2>&1 | tail -40
echo "== FIN ($(date +%H:%M))"
