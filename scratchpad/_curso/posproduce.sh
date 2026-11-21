#!/usr/bin/env bash
# Después de producir una clase v2: QC visual de SUS escenas (cuadro vacío, escritorio de
# Windows, letra chica) y, solo si pasa, reemplazo de la programada vieja en TikTok.
#   uso: posproduce.sh py05
set -u; cd /home/jose/tiktok; c=$1; L=scratchpad/_curso/logs; R="$L/V2.txt"
stem=$(.venv/bin/python -c "import json,glob;print('gen_'+json.load(open(glob.glob('scratchpad/guiones_curso/${c}_*.json')[0]))['slug'])")
if .venv/bin/python - "$stem" >> "$L/qc_$c.log" 2>&1 <<'PY'
import sys, json, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
stem = sys.argv[1]; assets = Path("videos")/f"{stem}.assets"
def cuadros(mp4, n=5):
    dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nk=1:nw=1",str(mp4)]).strip())
    with tempfile.TemporaryDirectory() as td:
        for k in range(n):
            png = Path(td)/f"{k}.png"; subprocess.run(["ffmpeg","-v","error","-ss",f"{dur*(k+1)/(n+1):.2f}","-i",str(mp4),"-frames:v","1",str(png)],check=False,timeout=120)
            if png.exists(): yield np.asarray(Image.open(png).convert("L"), dtype=np.int16)
g = json.loads((assets/"guion.json").read_text(encoding="utf-8")); malas = []
for i, esc in enumerate(g["scenes"]):
    seg = assets/f"seg_{i}.mp4"
    if not seg.exists(): malas.append(f"e{i}: falta seg"); continue
    fs = list(cuadros(seg))
    if not fs: malas.append(f"e{i}: sin cuadros"); continue
    tinta = max(100.0*float((a>90).mean()) for a in fs)
    if tinta < 0.3: malas.append(f"e{i}: cuadro vacío ({tinta:.2f}%)")
    cap = assets/f"cap_{i}.mp4"
    if cap.exists():
        anc = int(subprocess.check_output(["ffprobe","-v","error","-select_streams","v","-show_entries","stream=width","-of","default=nk=1:nw=1",str(cap)],text=True).strip())
        prim = next(cuadros(cap, 1), None)
        oscura = prim is not None and float(np.median(prim)) < 90
        if oscura and anc > 780: malas.append(f"e{i}: letra chica ({anc}px)")
        if oscura and any(float((a[int(a.shape[0]*0.93):,:]>70).mean())>0.25 for a in cuadros(cap, 5)): malas.append(f"e{i}: barra de Windows")
        # sesión de Claude que no contestó (529 Overloaded): la franja central queda vacía
        # (medido: 0.8% de tinta contra 6-8% cuando hay respuesta)
        if "claude " in ((esc.get("captura") or {}).get("cmd", "")):
            # la respuesta llega al FINAL de la captura: se mira el último cuadro, no el del medio
            with tempfile.TemporaryDirectory() as td:
                png = Path(td)/"u.png"; subprocess.run(["ffmpeg","-v","error","-sseof","-0.5","-i",str(cap),"-frames:v","1",str(png)],check=False,timeout=120)
                ult = [np.asarray(Image.open(png).convert("L"), dtype=np.int16)] if png.exists() else []
            if ult:
                h = ult[-1].shape[0]; fr = ult[-1][int(h*0.40):int(h*0.65), :]
                if float((fr > 90).mean()) < 0.025: malas.append(f"e{i}: Claude sin respuesta (¿529?)")
print("QC", stem, "→", malas or "ok"); sys.exit(1 if malas else 0)
PY
then echo "  QC ok $c" >> "$R"; bash scratchpad/_curso/reemplaza_tiktok.sh "$c" >> "$L/tt_v2_$c.log" 2>&1 && echo "  TikTok reemplazada $c $(date +%H:%M)" >> "$R" || echo "  TikTok NO reemplazada $c (ver tt_v2_$c.log)" >> "$R"
else echo "  QC FALLÓ $c: $(tail -1 $L/qc_$c.log)" >> "$R"; fi
