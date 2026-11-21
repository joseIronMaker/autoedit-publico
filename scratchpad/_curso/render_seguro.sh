#!/usr/bin/env bash
# Render final de una clase ELIGIENDO bien: si el ensamblado cambió de duración desde que
# se calculó el edl.json, `--render` recorta donde no debe (clase 15: 102 s → 70 s, sin el
# pong). En ese caso se rehace con --auto, que recalcula transcripción y cortes.
set -u; cd /home/jose/tiktok; stem=$1
A=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/$stem.mp4")
T="videos/$stem.autoedit/transcript.json"
fin=$(.venv/bin/python -c "
import json,sys
try:
    s=json.load(open('$T')).get('segments') or []
    print(f\"{s[-1]['end']:.1f}\" if s else 0)
except Exception: print(0)")
modo=--render
.venv/bin/python -c "
a=float('$A'); t=float('$fin')
import sys; sys.exit(0 if t and abs(a-t) < max(3.0, a*0.05) else 1)" || modo=--auto
# …y la duración NO basta: re-narrar una clase con otras palabras da casi los mismos
# segundos, así que `--render` reusaba la transcripción vieja y los subtítulos decían una
# cosa mientras la voz decía otra (clase 9, 5-sep). Se compara el TEXTO.
.venv/bin/python -c "
import difflib, json, sys, unicodedata, re
def norm(t):
    t = unicodedata.normalize('NFKD', t.lower())
    t = ''.join(c for c in t if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9 ]', ' ', re.sub(r'\s+', ' ', t)).strip()
try:
    tr = json.load(open('$T'))
    dicho = norm(' '.join(s.get('text','') for s in (tr.get('segments') or [])))[:160]
    g = json.load(open('videos/$stem.assets/guion.json'))
    esc = g.get('scenes') or g.get('escenas') or []
    escrito = norm(esc[0].get('narration') or esc[0].get('narracion') or '')[:160]
except Exception:
    sys.exit(1)
r = difflib.SequenceMatcher(None, dicho, escrito).ratio()
print(f'  transcripción vs guion: {r:.2f}')
sys.exit(0 if r > 0.62 else 1)" || modo=--auto
echo "  $stem: ensamblado ${A}s · transcripción hasta ${fin}s → $modo"
rm -f "videos/${stem}_final.mp4"
.venv/bin/python -m autoedit.cli "videos/$stem.mp4" $modo
F=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "videos/${stem}_final.mp4")
.venv/bin/python -c "
a=float('$A'); f=float('$F')
print(f'  final {f:.1f}s = {100*f/a:.0f}% del ensamblado')
import sys; sys.exit(0 if f > a*0.80 else 1)" || { echo "  ← el final corta demasiado: NO entrego"; exit 1; }
