#!/usr/bin/env bash
# Rehace un grabado en el formato nuevo: SIN José, abriendo por el RESULTADO y luego la IA
# haciéndolo, con la voz nueva y tono alarmista.
#   uso: rehace.sh <n> <segundo_donde_acaba_jose>
set -eu; cd /home/jose/tiktok; G=scratchpad/_grabados_v2
n=$1; corte=$2
SRC=$(ls /mnt/c/Users/USUARIO/Downloads/grabados/jose${n}_*.mp4 | head -1)
# 1) voz nueva
.venv/bin/python - "$n" <<'PY'
import os, sys, json, urllib.request, subprocess
from pathlib import Path
from dotenv import load_dotenv; load_dotenv("/home/jose/tiktok/.env")
n = sys.argv[1]; G = Path("/home/jose/tiktok/scratchpad/_grabados_v2")
txt = (G / f"jose{n}.txt").read_text(encoding="utf-8").strip()
body = json.dumps({"text": txt, "model_id": "eleven_multilingual_v2",
    "voice_settings": {"stability": 0.45, "similarity_boost": 1.0, "style": 0.35, "speed": 0.98}}).encode()
req = urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/dq04Lc2stQGXZAglGFG7?output_format=mp3_44100_128",
    data=body, method="POST", headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
(G / f"jose{n}.mp3").write_bytes(urllib.request.urlopen(req, timeout=300).read())
subprocess.run(["ffmpeg","-v","error","-i",str(G/f"jose{n}.mp3"),"-ac","1","-ar","48000",str(G/f"jose{n}.wav"),"-y"],check=True)
PY
VOZ=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $G/jose$n.wav)
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
# 2) solo la parte de PANTALLA (después de José)
.venv/bin/python -c "print(f'{float('$DUR')-float('$corte'):.2f}')" > /tmp/_pant
PANT=$(cat /tmp/_pant)
# 3) cold open = los últimos 8 s (el resultado) · resto = la pantalla estirada a la voz
ffmpeg -v error -ss $(.venv/bin/python -c "print(float('$DUR')-8)") -t 8 -i "$SRC" -an \
  -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p $G/j${n}_res.mp4 -y
R=$(.venv/bin/python -c "print(f\"{float('$PANT')/(float('$VOZ')-8):.5f}\")")
ffmpeg -v error -ss $corte -i "$SRC" -an -vf "setpts=PTS/$R" \
  -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p $G/j${n}_tl.mp4 -y
printf "file '%s'\n" "$PWD/$G/j${n}_res.mp4" "$PWD/$G/j${n}_tl.mp4" > $G/j${n}_concat.txt
ffmpeg -v error -f concat -safe 0 -i $G/j${n}_concat.txt -i $G/jose$n.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest $G/jose${n}b.mp4 -y
echo "jose$n: voz ${VOZ}s · pantalla ${PANT}s a ${R}× → $(ffprobe -v error -show_entries format=duration -of csv=p=0 $G/jose${n}b.mp4)s"
