#!/usr/bin/env bash
# Tanda 2 de la clase (c18..c31, 3-oct → 9-oct). TikTok no deja programar más de ~10 días
# adelante, así que se sube a partir del 30-sep. Corre cada 30 min desde cron y solo
# actúa cuando ya es la fecha y no hay marcador: si WSL estaba apagado a esa hora, se
# dispara en el siguiente arranque en vez de perderse (cron no recupera tareas).
cd /home/jose/tiktok
MARCA=scratchpad/_j21/.tanda2_hecha
[ -f "$MARCA" ] && exit 0
[ "$(date +%s)" -ge "$(date -d '2026-09-30 03:00' +%s)" ] || exit 0
touch "$MARCA"
bash scratchpad/_j21/sube_c.sh 2 > scratchpad/_j21/subida_c2.log 2>&1
echo "tanda 2: $(grep -c 'publicar: OK' scratchpad/_j21/subida_c2.log) de 14 ($(date))" >> scratchpad/_j21/subida_c2.resumen
crontab -l 2>/dev/null | grep -v tanda2_cron.sh | crontab -
