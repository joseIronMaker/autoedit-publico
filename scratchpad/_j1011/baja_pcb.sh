#!/usr/bin/env bash
# (15-oct 22h: p5 y p6 ya salieron a su hora → van con las publicadas)
# Baja la serie «PCB con IA» VIEJA que no se distribuyó (José, 15-oct-2026: «repara y
# resube… y baja lo que no sirve»). Programadas p7-p14 por su etiqueta de fecha y hora;
# publicadas p1-p6 por prefijo ASCII (≥40 car.) con tope de 10 vistas. Espaciado 2 min
# entre borrados: nada de ráfagas de bot. Toca SOLO filas «PCB con IA, parte N:».
set -u; cd /home/jose/tiktok
PY=.venv/bin/python
n=7
for slot in "16 oct, 19:00" "16 oct, 20:00" "17 oct, 19:00" \
            "17 oct, 20:00" "18 oct, 19:00" "18 oct, 20:00" "19 oct, 19:00" "19 oct, 20:00"; do
  echo "######## programada parte $n ($slot) $(date +%T)"
  timeout 900 $PY scratchpad/borra_tiktok.py "$slot" "PCB con IA, parte $n" --jose-lo-pidio < /dev/null 2>&1 | tail -4
  n=$((n+1)); sleep 120
done
while IFS= read -r pref <&3; do
  [ -z "$pref" ] && continue
  echo "######## publicada: $pref $(date +%T)"
  timeout 900 $PY scratchpad/borra_publicada.py "$pref" --max-vistas 10 --jose-lo-pidio < /dev/null 2>&1 | tail -4
  sleep 120
done 3<<'L'
PCB con IA, parte 1: Claude Code diseando una placa
PCB con IA, parte 2: through-hole contra SMD, las dos formas
PCB con IA, parte 3: lo que la IA necesita saber antes
PCB con IA, parte 4: no s cmo conectar la IA a EasyEDA
PCB con IA, parte 5: la opcin oficial para conectar Claude Code
PCB con IA, parte 6: qu es una skill, explicado con pozole
L
echo "######## verificación $(date +%T)"
timeout 900 flock /tmp/tiktok_studio.lock $PY scratchpad/_j1010/lista_studio.py --max 6 2>/dev/null \
  | grep "PCB con IA, parte [0-9]*:" || echo "   ✔ ninguna fila vieja de «PCB con IA» en el Studio"
echo "== BAJA FIN $(date +%T)"
