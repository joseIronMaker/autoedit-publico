#!/usr/bin/env bash
# Los clips del cybercab llevaban la imagen real en una franja de 32% de alto (el resto,
# relleno oscuro) — lo contrario de "que se vea más la conducción autónoma". Se rehacen
# con recorte 1:1 (56% del alto) sobre fondo desenfocado del mismo plano, y montando
# VARIOS planos limpios: el promo de Tesla corta cada 1-2 s, así que un tramo largo
# cruza cortes. Los cortes salen de `select=gt(scene,0.2)` sobre el fuente.
set -eu; cd /home/jose/tiktok
SRC="/mnt/c/Users/USUARIO/Downloads/YTDown.com_YouTube_The-Future-Has-Arrived-Cybercab_Media_grdt05okn3Q_001_1080p.mp4"
D=scratchpad/_astra/cybercab; T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

pieza () {   # $1 salida  $2 inicio  $3 duracion  $4 brillo
  ffmpeg -v error -ss "$2" -t "$3" -i "$SRC" -filter_complex "\
[0:v]split=2[bg][fg];\
[bg]crop=607:1080:656:0,scale=136:240,gblur=sigma=5,scale=1080:1920,eq=brightness=0.02:contrast=0.95:saturation=0.7[b];\
[fg]crop=1080:1080:420:0,eq=brightness=$4:contrast=1.12:saturation=1.06[f];\
[b][f]overlay=0:(H-h)/2:format=auto,format=yuv420p" \
    -an -c:v libx264 -preset medium -crf 19 -r 30 -g 30 "$1" -y
}

monta () {   # $1 destino  $2... "inicio:dur:brillo"
  dest=$1; shift; n=0; : > "$T/lista.txt"
  for spec in "$@"; do
    IFS=: read -r ini dur bri <<< "$spec"
    pieza "$T/p$n.mp4" "$ini" "$dur" "$bri"
    echo "file '$T/p$n.mp4'" >> "$T/lista.txt"; n=$((n+1))
  done
  ffmpeg -v error -f concat -safe 0 -i "$T/lista.txt" -c copy "$dest" -y
  echo "  $(basename "$dest"): $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$dest")s de $n planos"
}

# escena 0 (hook "búscale el volante"): dos interiores donde SE VE que no hay volante
monta $D/sin_volante.mp4   15.3:3.5:0.10  36.9:1.7:0.12
# escena 2 (el contrapunto honesto): conducción nocturna por la ciudad, plano largo limpio
monta $D/ciudad_noche.mp4  40.6:4.2:0.14   9.1:0.9:0.06
# escena 5 (tesis "gana el que se fabrica"): el coche en la calle con gente, y el atardecer
monta $D/calle_dia.mp4     29.8:1.2:0.06  31.9:0.8:0.06  33.5:0.7:0.06  34.9:0.9:0.06  7.8:1.2:0.10
