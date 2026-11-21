#!/usr/bin/env bash
# Los cuatro grabados EN EL ORDEN DE JOSÉ, que él codificó renombrando los archivos:
#   jose9 (los 3 problemas) → jose010 (etapa agéntica) → jose011 (qué es un agente)
#   → jose12 (tres formas de ChatGPT)
# Los copys conservan MI numeración vieja, así que el emparejamiento va por CONTENIDO,
# verificado por duración: 173s, 91s, 146s y 370s.
# Cadencia del canal: 19:00 y 20:00. Última ranura ocupada: 28-ago 19:00 (jose08).
set -u
cd /home/jose/tiktok
D='C:\Users\USUARIO\Downloads\grabados'
C='/mnt/c/Users/USUARIO/Downloads/grabados'
sube () {  # <archivo> <copy> <fecha> <hora> <pausa>
  echo "######## $1  →  $3 $4   ($(date '+%H:%M:%S'))"
  timeout 2700 .venv/bin/python scratchpad/subir_tiktok.py subir "$D\\$1" "$C/$2" "$3" "$4" \
    2>&1 | tail -12 || echo "FALLO $1"
  echo "--- pausa $5 s"; sleep "$5"
}
sube jose9_tres_problemas_ia.mp4     jose10_copy_tiktok.txt 2026-08-28 20:00 480
sube jose010_etapa_agentica.mp4      jose12_copy_tiktok.txt 2026-08-29 19:00 480
sube jose011_que_es_un_agente.mp4    jose11_copy_tiktok.txt 2026-08-29 20:00 1200
sube jose12_tres_formas_chatgpt.mp4  jose09_copy_tiktok.txt 2026-08-30 19:00 10
echo "######## FIN  ($(date '+%H:%M:%S'))"
