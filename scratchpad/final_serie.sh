#!/usr/bin/env bash
# Rama B sobre los videos parcheados: transcribe → EDL → subtítulos/render → copys.
# Deja <stem>_final.mp4 listo para publicar.
set -u
cd /home/jose/tiktok
for stem in "$@"; do
  echo "########## RAMA B: $stem"
  .venv/bin/autoedit "videos/${stem}.mp4" --auto 2>&1 | tail -14
  d=$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 \
      "videos/${stem}_final.mp4" 2>/dev/null)
  echo "==> ${stem}_final.mp4  ${d}s"
done
echo "RAMA B COMPLETA"
