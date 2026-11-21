#!/usr/bin/env bash
# Mete las clases 7 y 8 al frente de la cola en cuanto la 10 esté entregada: sus huecos
# (5 sep) ya pasaron vacíos y el curso se ve en orden, así que van mañana antes de la 9.
set -u; cd /home/jose/tiktok; L=scratchpad/_curso/logs
for _ in $(seq 1 200); do
  grep -q "=== py11" "$L/RENARRA.txt" && break
  pgrep -f "cadena_curso.sh" > /dev/null || break
  sleep 60
done
pkill -f "[c]adena_curso.sh"; sleep 2
pkill -f "[r]enarra.sh py"; sleep 2; pkill -f "[a]utoedit-gen"; sleep 3
cat > scratchpad/_curso/cadena_curso.sh <<'INNER'
#!/usr/bin/env bash
set -u; cd /home/jose/tiktok
L=scratchpad/_curso/logs
bash scratchpad/_curso/renarra.sh py07 py08 py11 py12 py13 py14 py15 py16 py17 py18 py19 py20 py21 >> "$L/renarra_lote2.log" 2>&1
bash scratchpad/_curso/produce_v2.sh py22 py23 py24 py25 py26 py27 py28 py29 py30 >> "$L/produce_lote3.log" 2>&1
.venv/bin/python scratchpad/_curso/audita_calendario.py >> "$L/AUDITORIA.txt" 2>&1
echo "=== CADENA COMPLETA $(date '+%d-%b %H:%M') ===" >> "$L/RENARRA.txt"
INNER
echo "=== cola reordenada: 07 y 08 al frente $(date +%H:%M) ===" >> "$L/RENARRA.txt"
setsid nohup bash scratchpad/_curso/cadena_curso.sh >> "$L/cadena.log" 2>&1 < /dev/null &
