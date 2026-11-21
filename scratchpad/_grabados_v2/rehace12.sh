#!/usr/bin/env bash
# jose12 va aparte: su original NO es "cara al principio y pantalla después" como los otros
# cinco, sino un COMPUESTO VERTICAL —cara arriba (y<894), pantalla abajo— durante los 370 s.
# Cortar por tiempo nunca le quitaba la cara. Aquí se recorta la franja de pantalla y se
# monta sobre un fondo desenfocado de sí misma.
# Además el final (310-370 s) es el informe de ventas de un cliente REAL con cifras: el
# timelapse se detiene antes, y el cold-open sale de la página de la pastelería (282-290 s),
# que es el tercer caso de uso y no compromete a nadie.
set -eu; cd /home/jose/tiktok; G=scratchpad/_grabados_v2
SRC=$(ls /mnt/c/Users/USUARIO/Downloads/grabados/jose12_*.mp4 | head -1)
FIN=308        # hasta aquí llega el material utilizable (después: informe del cliente)
HOOK=282       # arranque del cold-open (la web de la pastelería)
CORTE_Y=894    # borde entre la cara y la pantalla, medido en cuatro cuadros
ALTO=$((1920 - CORTE_Y))
VOZ=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $G/jose12.wav)
# 1) fuente sin cara: franja de pantalla centrada sobre fondo desenfocado de sí misma
#    (el desenfoque se hace en pequeño y se amplía: un gblur grande sobre 1080x1920 es 50×
#    más lento y se ve igual)
Y=$(( (1920 - ALTO) / 2 ))
ffmpeg -v error -t $FIN -i "$SRC" -filter_complex \
  "[0:v]crop=1080:${ALTO}:0:${CORTE_Y},split=2[a][b];\
   [b]scale=136:129,gblur=sigma=5,scale=1080:1920:flags=bicubic,setsar=1[bg];\
   [bg][a]overlay=0:${Y}[v]" -map "[v]" -an \
  -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p $G/j12_sincara.mp4 -y
# 2) cold-open: 8 s de la pastelería
ffmpeg -v error -ss $HOOK -t 8 -i $G/j12_sincara.mp4 -an \
  -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p $G/j12_res.mp4 -y
# 3) timelapse: lo anterior al cold-open, estirado a lo que dura la voz menos esos 8 s
R=$(.venv/bin/python -c "print(f\"{float('$HOOK')/(float('$VOZ')-8):.5f}\")")
ffmpeg -v error -t $HOOK -i $G/j12_sincara.mp4 -an -vf "setpts=PTS/$R" \
  -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p $G/j12_tl.mp4 -y
printf "file '%s'\n" "$PWD/$G/j12_res.mp4" "$PWD/$G/j12_tl.mp4" > $G/j12_concat.txt
ffmpeg -v error -f concat -safe 0 -i $G/j12_concat.txt -i $G/jose12.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest $G/jose12b.mp4 -y
echo "jose12: voz ${VOZ}s · timelapse ${HOOK}s a ${R}× → $(ffprobe -v error -show_entries format=duration -of csv=p=0 $G/jose12b.mp4)s"
