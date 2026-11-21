#!/usr/bin/env bash
# Graba, acelera y alinea cada capítulo. Reanudable: salta lo que ya esté hecho.
# Dos a la vez con 4 hilos: alinear con 8 en serie tardaría casi una hora.
set -u; cd /home/jose/tiktok
PY=.venv/bin/python
uno() {
  d=estudio/serie/$1
  [ -s "$d/palabras.json" ] && { echo "$1 ya estaba"; return; }
  # guion_voz.txt: mismo texto con nombres escritos como se pronuncian. Lo que se alinea es guion.txt.
  fuente="$d/guion.txt"; [ -s "$d/guion_voz.txt" ] && fuente="$d/guion_voz.txt"
  [ -s "$d/voz.wav" ] || $PY estudio/voces/narra.py "$fuente" "$d/voz.wav" || { echo "$1 FALLÓ TTS"; return; }
  ffmpeg -y -loglevel error -i "$d/voz.wav" -af atempo=1.08 -ar 24000 "$d/voz_108.wav"
  HILOS=4 $PY estudio/kit_alinea.py "$d/guion.txt" "$d/voz.wav" "$d/palabras.json" 2>&1 | grep -E 'palabras,|VOZ SE ACABA' | sed "s/^/$1: /"
}
export -f uno; export PY
ls -d estudio/serie/${1:-c}[0-9]* | xargs -n1 basename | grep -v c08 | xargs -P 2 -I{} bash -c 'uno {}'
echo "VOCES FIN"
