"""Puerta de entrega del motor nuevo. Mide lo que ya nos falló y sale con error si algo no cuadra.

python estudio/kit_verifica.py <final.mp4> <copy.txt>
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

mp4, copy = sys.argv[1], Path(sys.argv[2]).read_text(encoding="utf-8")
malo = []
p = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration,size", "-of", "json", mp4]))
v = next(s for s in p["streams"] if s["codec_type"] == "video")
a = [s for s in p["streams"] if s["codec_type"] == "audio"]
dur = float(p["format"]["duration"])
if (v["width"], v["height"]) != (1080, 1920): malo.append(f"resolución {v['width']}x{v['height']}")
if not a: malo.append("sin audio")
err = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-f", "null", "-"], capture_output=True, text=True).stderr
if err.strip(): malo.append("no decodifica limpio: " + err[:120])
b = subprocess.check_output(["ffmpeg", "-v", "error", "-i", mp4, "-vf", "fps=10,scale=80:142,format=gray", "-f", "rawvideo", "-"])
x = np.frombuffer(b, np.uint8).reshape(-1, 142, 80).astype(np.float32)
d = np.abs(np.diff(x, axis=0)).mean(axis=(1, 2))
par = 100 * (d < .35).mean()
racha = max(map(len, "".join("1" if q < .35 else "0" for q in d).split("0"))) / 10
ini = d[:30].mean()
if par > 25: malo.append(f"{par:.0f}% de cuadros parados (r6: 17%)")
if racha > 2.2: malo.append(f"tramo parado de {racha} s")
if (d[:30] < .35).mean() > .2: malo.append("el arranque está parado")
s = subprocess.run(["ffmpeg", "-hide_banner", "-i", mp4, "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
L = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", s)[-1])
if not -15.5 < L < -12.5: malo.append(f"{L} LUFS")
y = np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", mp4, "-ac", "1", "-ar", "8000", "-f", "f32le", "-"]), np.float32)
fin = 20 * np.log10(max(float(np.sqrt((y[-400:] ** 2).mean())), 1e-6))
if fin > -38: malo.append(f"el audio no se apaga al final ({fin:.0f} dB): se oirá como corte")
for w in ("guárdalo", "guardalo", "sígueme", "sigueme", "comenta", "dale like", "síguenos"):
    if w in copy.lower(): malo.append(f"CTA directo en el copy: {w}")
if "?" not in copy: malo.append("el copy no trae pregunta")
print(f"{Path(mp4).parent.name}: {dur:.1f} s | parados {par:.1f}% | mediana {np.median(d):.2f} | 3 s {ini:.2f} | racha {racha} s | {L} LUFS | final {fin:.0f} dB")
if malo:
    print("  ✗ " + "\n  ✗ ".join(malo)); sys.exit(1)
print("  ✔ pasa")
