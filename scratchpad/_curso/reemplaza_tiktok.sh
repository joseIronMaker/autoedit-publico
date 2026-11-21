#!/usr/bin/env bash
# Reemplaza en TikTok la clase programada vieja por la v2: borra la programada (por fecha,
# hora y comienzo del copy viejo, con guardas) y sube la nueva en el mismo hueco.
#   uso: reemplaza_tiktok.sh py05
set -u; cd /home/jose/tiktok; c=$1; num=${c#py}
V1="/mnt/c/Users/USUARIO/Downloads/curso_python"; V2="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
nom=$(ls "$V2" | grep -m1 "^clase${num}_.*\.mp4$"); base=${nom%.mp4}
linea=$(grep "^${base}.mp4" scratchpad/_curso/plan_subida.txt); fecha=$(echo "$linea" | cut -f3); hora=$(echo "$linea" | cut -f4)
[ "$c" = py03 ] && { fecha=2026-09-03; hora=19:00; }; [ "$c" = py04 ] && { fecha=2026-09-03; hora=20:00; }
dia=$(date -d "$fecha" +%-d); etiqueta="$dia sep, $hora"
prefijo=$(head -c 22 "$V1/${base}_copy.txt")
echo "→ $c: borrar '$etiqueta' que empieza por '$prefijo' y subir $nom"
# el hueco puede estar VACÍO (un borrado anterior que sí funcionó y una subida que no):
# eso NO es un fallo, es justo el caso en que hay que subir sin borrar nada
salida=$(timeout 400 .venv/bin/python scratchpad/borra_tiktok.py "$etiqueta" "$prefijo" --slot-unico 2>&1); rc=$?
echo "$salida" | tail -4 | sed 's/^/  /'
if [ $rc -ne 0 ]; then
  if echo "$salida" | grep -q "ni al final de la lista"; then
    echo "  hueco vacío: subo sin borrar"
  elif echo "$salida" | grep -q "opciones Eliminar: 0"; then
    # la lista es VIRTUALIZADA: al abrir el menú de una fila lejana se re-dibuja, salta al
    # principio y cierra el desplegable. Filtrando con el buscador queda UNA fila y no hay
    # scroll que perder (clases 16 y 22, 6-sep).
    echo "  el menú se cerró por el scroll: reintento filtrando con el buscador"
    salida=$(timeout 400 .venv/bin/python scratchpad/borra_tiktok.py "$etiqueta" "$prefijo" \
             --slot-unico --buscar "$(head -c 28 "$V1/${base}_copy.txt")" 2>&1); rc=$?
    echo "$salida" | tail -3 | sed 's/^/    /'
    [ $rc -ne 0 ] && { echo "  no se borró ni con el buscador: NO subo"; exit 1; }
  else
    echo "  no se borró: NO subo"; exit 1
  fi
fi
sleep 6
# VERIFICAR que ya no está antes de subir: en la clase 9 el borrado dijo "listo" y la
# programada vieja seguía ahí, y al subir la nueva quedaron DOS en el mismo hueco
if timeout 400 .venv/bin/python scratchpad/borra_tiktok.py "$etiqueta" "$prefijo" --slot-unico --dry 2>&1 | grep -q "aqui pararia"; then
  echo "  la programada vieja SIGUE ahí tras borrar: NO subo (evito duplicado)"; exit 1
fi
# si la subida falla DESPUÉS de haber borrado, el hueco queda VACÍO (le pasó a la 18):
# se reintenta tres veces antes de rendirse
for k in 1 2 3; do
  timeout 900 .venv/bin/python scratchpad/subir_tiktok.py subir "C:\\Users\\USUARIO\\Downloads\\curso_python_v2\\$nom" "$V2/${base}_copy.txt" "$fecha" "$hora" | grep -E "descripcion|programacion|OK programado|Traceback" && exit 0
  echo "  subida falló (intento $k/3)"; sleep 60
done
echo "  HUECO VACÍO en $fecha $hora: la subida falló tres veces"; exit 1
