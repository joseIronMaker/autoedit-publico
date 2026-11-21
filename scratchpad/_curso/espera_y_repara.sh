#!/usr/bin/env bash
# Espera a que la cadena termine y entonces repara las clases con defecto conocido.
# Va POR FUERA del script de la cadena: editar un .sh mientras bash lo está ejecutando
# desplaza el offset de lectura y la siguiente línea sale partida.
set -u; cd /home/jose/tiktok
for _ in $(seq 1 2000); do
  pgrep -f "^bash scratchpad/_curso/cadena" > /dev/null || break
  sleep 60
done
bash scratchpad/_curso/repara.sh
