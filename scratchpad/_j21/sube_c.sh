#!/usr/bin/env bash
# Programa las piezas de la clase completa (c01..c31) con el patrón del canal: dos por
# día, 19:00 y 20:00, desde el primer hueco libre (24-sep 20:00). TikTok solo deja
# programar ~10 días adelante, así que se sube por TANDAS: `sube_c.sh 1` programa las
# primeras 17 (hasta el 2-oct); `sube_c.sh 2` se corre más adelante con el resto.
#
# TikTok corta a las ~4-5 subidas seguidas: 8 min entre cada una y 20 min de descanso
# después de cada cuarta. Y el pegado del copy falla si la pestaña pierde el foco: AL
# FINAL contar los "publicar: OK" contra las piezas de la tanda (20-sep: la cola acabó
# "bien" con dos sin programar).
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\gpt21c'
C='/mnt/c/Users/USUARIO/Downloads/gpt21c'
TANDA="${1:-1}"

sube () {  # <id> <fecha> <hora> <pausa_s>
  echo "######## $1  →  $2 $3   ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1.mp4" "$C/${1%%_*}_copy_tiktok.txt" "$2" "$3" \
    2>&1 | tail -10 || echo "FALLO $1"
  echo "--- pausa $4 s"
  sleep "$4"
}

if [ "$TANDA" = "1" ]; then
sube c01_que_es_la_ia                        2026-09-24 20:00 480
sube c02_deep_learning_como_aprende          2026-09-25 19:00 480
sube c03_dataset_casas_regresion             2026-09-25 20:00 480
sube c04_entrenar_70_30_optimizador          2026-09-26 19:00 1200
sube c05_metricas_epocas                     2026-09-26 20:00 480
sube c06_limpieza_de_datos                   2026-09-27 19:00 480
sube c07_comparar_modelos                    2026-09-27 20:00 480
sube c08_neurona_y_capas                     2026-09-28 19:00 1200
sube c09_transformador_atencion              2026-09-28 20:00 480
sube c10_embeddings_siguiente_token          2026-09-29 19:00 480
sube c11_generacion_temperatura_kv           2026-09-29 20:00 480
sube c12_tokenizador                         2026-09-30 19:00 1200
sube c13_salida_mas_cara                     2026-09-30 20:00 480
sube c14_prompt_cafe                         2026-10-01 19:00 480
sube c15_ventana_contexto                    2026-10-01 20:00 480
sube c16_ai_studio_tokens                    2026-10-02 19:00 1200
sube c17_quemar_tokens                       2026-10-02 20:00 10
else
sube c18_context_engineering_vectores        2026-10-03 19:00 480
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
fi
echo "######## FIN tanda $TANDA ($(date '+%H:%M:%S'))"
