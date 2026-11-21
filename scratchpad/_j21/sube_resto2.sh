#!/usr/bin/env bash
# c19..c31 hoy mismo: TikTok aceptó programar c18 al 3-oct (10,5 días adelante), así que
# el "límite de 10 días" era un supuesto mío sin medir. Las últimas llegan al 9-oct (16
# días): si alguna falla, ahí se mide el límite real.
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\gpt21c'
C='/mnt/c/Users/USUARIO/Downloads/gpt21c'
sube () { echo "######## $1  →  $2 $3   ($(date '+%H:%M:%S'))"; timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1.mp4" "$C/${1%%_*}_copy_tiktok.txt" "$2" "$3" 2>&1 | tail -10 || echo "FALLO $1"; echo "--- pausa $4 s"; sleep "$4"; }
sube c19_bases_vectoriales_rag               2026-10-03 20:00 480
sube c20_entrenamiento_inferencia_alineacion 2026-10-04 19:00 480
sube c21_ya_no_es_chat_ciclo_agentico        2026-10-04 20:00 1200
sube c22_herramientas_function_calling       2026-10-05 19:00 480
sube c23_construir_agente_claude             2026-10-05 20:00 480
sube c24_leer_codigo_agente                  2026-10-06 19:00 480
sube c25_agente_iva_clima                    2026-10-06 20:00 1200
sube c26_agente_chicles_ruso                 2026-10-07 19:00 480
sube c27_mcp                                 2026-10-07 20:00 480
sube c28_skills                              2026-10-08 19:00 480
sube c29_claude_md                           2026-10-08 20:00 1200
sube c30_subagentes_orquestador              2026-10-09 19:00 480
sube c31_arquitectura_final_cierre           2026-10-09 20:00 10
echo "######## FIN ($(date '+%H:%M:%S')) · OK: $(grep -c 'publicar: OK' scratchpad/_j21/subida_c2.log) de 13"
