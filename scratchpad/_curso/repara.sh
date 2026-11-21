#!/usr/bin/env bash
# Repasada final: arregla las clases que quedaron con un defecto conocido y las reemplaza.
#  - pendientes_subs.txt   → vocabulario mal transcrito ("a la gente"): corrige y re-renderiza
#  - pendientes_render.txt → Whisper perdió narración (hotwords): re-transcribe y re-renderiza
set -u; cd /home/jose/tiktok; L=scratchpad/_curso/logs
echo "=== REPARACIÓN $(date '+%d-%b %H:%M') ===" >> "$L/RENARRA.txt"
rena=$(cat scratchpad/_curso/pendientes_renarra.txt 2>/dev/null)
[ -n "$rena" ] && bash scratchpad/_curso/renarra.sh $rena
subs=$(cat scratchpad/_curso/pendientes_subs.txt 2>/dev/null)
rend=$(cat scratchpad/_curso/pendientes_render.txt 2>/dev/null)
[ -n "$rend" ] && bash scratchpad/_curso/rehace_final.sh $rend
[ -n "$subs" ] && bash scratchpad/_curso/corrige_subs.sh $subs
.venv/bin/python scratchpad/_curso/revisa_vocabulario.py >> "$L/RENARRA.txt" 2>&1
# El reemplazo en TikTok falla de vez en cuando (el menú abre y la opción Eliminar no
# aparece): la guarda evita el duplicado, pero el hueco se queda con la versión vieja.
# Se relee el CALENDARIO —que es la verdad, no el log— y se reintenta cada hueco malo.
for vuelta in 1 2; do
  malos=$(.venv/bin/python scratchpad/_curso/audita_calendario.py | tee -a "$L/AUDITORIA.txt" \
          | grep "^A CORREGIR:" | sed 's/A CORREGIR://' | tr ' ' '\n' | sed 's/(.*//' \
          | grep -E '^py[0-9]+$')
  [ -z "$malos" ] && break
  echo "  huecos a corregir (vuelta $vuelta): $(echo $malos)" >> "$L/RENARRA.txt"
  for c in $malos; do
    bash scratchpad/_curso/reemplaza_tiktok.sh "$c" >> "$L/tt_repara_$c.log" 2>&1 \
      && echo "    $c reemplazada" >> "$L/RENARRA.txt" \
      || echo "    $c NO se pudo reemplazar" >> "$L/RENARRA.txt"
    sleep 30
  done
done
.venv/bin/python scratchpad/_curso/audita_calendario.py >> "$L/AUDITORIA.txt" 2>&1
echo "=== REPARACIÓN LISTA $(date '+%d-%b %H:%M') ===" >> "$L/RENARRA.txt"
