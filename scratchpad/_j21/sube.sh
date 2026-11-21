#!/usr/bin/env bash
# Programa las 14 piezas de la clase del 21-sep con el patrón del canal: dos por día,
# 19:00 y 20:00. El último hueco ocupado era 24-sep 19:00 (la última pieza del grabado
# del 20-sep), así que esta tanda arranca en 24-sep 20:00.
#
# TikTok corta a las ~4-5 subidas seguidas: 8 min entre cada una y 20 min de descanso
# después de la cuarta. Y el pegado del copy falla si la pestaña pierde el foco, así que
# AL FINAL hay que contar los "publicar: OK" contra las 14 (pasó el 20-sep: la cola
# terminó "bien" con dos piezas sin programar).
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\gpt21'
C='/mnt/c/Users/USUARIO/Downloads/gpt21'

sube () {  # <archivo> <copy> <fecha> <hora> <pausa_s>
  echo "######## $1  →  $3 $4   ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -10 || echo "FALLO $1"
  echo "--- pausa $5 s"
  sleep "$5"
}

sube j21_01_neurona_regresion.mp4        j21_01_copy_tiktok.txt 2026-09-24 20:00 480
sube j21_02_embeddings_rey_reina.mp4     j21_02_copy_tiktok.txt 2026-09-25 19:00 480
sube j21_03_siguiente_token.mp4          j21_03_copy_tiktok.txt 2026-09-25 20:00 480
sube j21_04_token_no_es_palabra.mp4      j21_04_copy_tiktok.txt 2026-09-26 19:00 1200
sube j21_05_salida_mas_cara.mp4          j21_05_copy_tiktok.txt 2026-09-26 20:00 480
sube j21_06_prompt_cafe.mp4              j21_06_copy_tiktok.txt 2026-09-27 19:00 480
sube j21_07_ventana_contexto.mp4         j21_07_copy_tiktok.txt 2026-09-27 20:00 480
sube j21_08_context_engineering.mp4      j21_08_copy_tiktok.txt 2026-09-28 19:00 1200
sube j21_09_rag.mp4                      j21_09_copy_tiktok.txt 2026-09-28 20:00 480
sube j21_10_entrenamiento_inferencia.mp4 j21_10_copy_tiktok.txt 2026-09-29 19:00 480
sube j21_11_ya_no_es_chat.mp4            j21_11_copy_tiktok.txt 2026-09-29 20:00 480
sube j21_12_agente_herramientas.mp4      j21_12_copy_tiktok.txt 2026-09-30 19:00 1200
sube j21_13_mcp.mp4                      j21_13_copy_tiktok.txt 2026-09-30 20:00 480
sube j21_14_skills.mp4                   j21_14_copy_tiktok.txt 2026-10-01 19:00 10
echo "######## FIN  ($(date '+%H:%M:%S'))"
