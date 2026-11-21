#!/usr/bin/env bash
# Baja las 14 piezas programadas el 22-sep (José las vetó: había que dividir la clase
# entera por temas, no elegir momentos). Cada borrado pasa por las tres guardas de
# borra_tiktok.py (programada + fecha exacta + cero vistas + copy que empieza igual).
cd /home/jose/tiktok
b () { echo "#### $1 | $2  ($(date +%H:%M:%S))"; timeout 600 .venv/bin/python scratchpad/borra_tiktok.py "$1" "$2" 2>&1 | tail -3; sleep 20; }
b "24 sep, 20:00" "Todo el mundo repite"
b "25 sep, 19:00" "Cómo puede una máquina saber"
b "25 sep, 20:00" "Salgo a la calle"
b "26 sep, 19:00" "Un token no es una palabra"
b "26 sep, 20:00" "Por qué lo que la IA ESCRIBE"
b "27 sep, 19:00" "Le di cien pesos"
b "27 sep, 20:00" "Tu conversación con la IA tiene un presupuesto"
b "28 sep, 19:00" "Todo el mundo habla de prompt engineering"
b "28 sep, 20:00" "Si la ventana de contexto se llena"
b "29 sep, 19:00" "Entrenamiento e inferencia"
b "29 sep, 20:00" "Esta es la parte que a mí me cambió"
b "30 sep, 19:00" "Yo nunca le dije cuál herramienta"
b "30 sep, 20:00" "Si cada quien conecta sus herramientas"
b "1 oct, 19:00" "Le instalé a Claude una skill"
echo "#### FIN ($(date +%H:%M:%S))"
