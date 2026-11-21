"""Alinea el guion con la voz: tiempo exacto de CADA palabra del guion (no de lo que Whisper creyó oír).

python estudio/kit_alinea.py estudio/<pieza>/guion.txt estudio/<pieza>/voz.wav estudio/<pieza>/palabras.json
"""
import difflib, json, os, re, sys, unicodedata
from pathlib import Path
from faster_whisper import WhisperModel

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))

guion = Path(sys.argv[1]).read_text(encoding="utf-8").split()
m = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=int(os.environ.get("HILOS", 8)))
# SIN initial_prompt: con el guion como prompt Whisper alucina los primeros 30 s y apila esas palabras.
segs, _ = m.transcribe(sys.argv[2], language="es", word_timestamps=True, condition_on_previous_text=False)
oido = [w for s in segs for w in (s.words or [])]
a, b = [norm(x) for x in guion], [norm(w.word) for w in oido]
res = [None] * len(guion)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1):
            res[i1 + k] = (oido[j1 + k].start, oido[j1 + k].end)
    elif tag == "replace" and j2 > j1:          # p. ej. «dos mil trece» → «2013»: reparte el tramo
        ini, fin = oido[j1].start, oido[j2 - 1].end
        for k in range(i2 - i1):
            res[i1 + k] = (ini + (fin - ini) * k / (i2 - i1), ini + (fin - ini) * (k + 1) / (i2 - i1))
huecos = [i for i, r in enumerate(res) if r is None]
for i in huecos:                                  # lo que Whisper no oyó: interpola entre vecinos
    p = next((res[k][1] for k in range(i - 1, -1, -1) if res[k]), 0.0)
    n = next((res[k][0] for k in range(i + 1, len(res)) if res[k]), p + .3)
    res[i] = (p, n)
out = [{"w": g, "s": round(r[0], 3), "e": round(r[1], 3)} for g, r in zip(guion, res)]
Path(sys.argv[3]).write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
print(f"{len(out)} palabras, {len(huecos)} interpoladas, oídas {len(oido)}")
# El TTS puede comerse la última frase, y lo interpolado la disfraza de palabras con tiempo.
# Medido el 2-nov-2026 en a01: el guion terminaba 2.1 s después que la voz real.
import subprocess
import numpy as np
x = np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", sys.argv[2], "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]), np.float32)
e = np.array([np.sqrt((x[i:i + 1600] ** 2).mean()) for i in range(0, len(x) - 1600, 1600)])
fin_voz = (np.where(e > .01)[0][-1] + 1) / 10
if out[-1]["e"] - fin_voz > .8:
    Path(sys.argv[3]).unlink()
    raise SystemExit(f"LA VOZ SE ACABA ANTES QUE EL GUION: voz {fin_voz:.1f} s, guion {out[-1]['e']:.1f} s. Regrabar.")
linea, t0 = [], None
for x in out:
    t0 = x["s"] if t0 is None else t0
    linea.append(x["w"])
    if x["w"][-1] in ".:?" or x["w"].endswith("..."):
        print(f"{t0:6.2f}-{x['e']:6.2f}  {' '.join(linea)}"); linea, t0 = [], None
