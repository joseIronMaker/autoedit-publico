#!/usr/bin/env bash
# pro06 murio porque sus dos screen_demo pelearon el Chrome con una subida a TikTok
# (19-ago-2026). Se reintenta cuando no haya NI produccion NI subida en curso.
set -u
cd /home/jose/tiktok
while ps -eo args --no-headers \
      | grep -qE "\.venv/bin/(autoedit|autoedit-gen)|subir_tiktok\.py"; do sleep 60; done
echo "######## pro06 (reintento, navegador libre)"
.venv/bin/python scratchpad/producir_serie15.py pro06 2>&1 | tail -8
ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_pro_dos_ejemplos_final.mp4 2>&1
