#!/usr/bin/env bash
# Produce lo que queda del arco: pro06 + los cinco de harneses, uno tras otro.
set -u
cd /home/jose/tiktok
while ps -eo args --no-headers | grep -qE "\.venv/bin/(autoedit|autoedit-gen)"; do sleep 30; done
echo "######## pro06"
.venv/bin/python scratchpad/producir_serie15.py pro06 2>&1 | tail -4
for n in h01 h02 h03 h04 h05; do
  echo "######## $n"
  .venv/bin/python scratchpad/producir_harneses.py "$n" 2>&1 | tail -4
done
echo "######## verificación final"
for f in videos/gen_pro_dos_ejemplos_final.mp4 videos/gen_h_*_final.mp4; do
  [ -e "$f" ] || continue
  echo -n "$(basename "$f"): "
  ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>&1
done
