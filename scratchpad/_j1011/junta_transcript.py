"""Une transcript.parcial.json (0-684) y los transcript_<a>.json de los trozos en
transcript.json, ordenado y sin solapes (si dos trozos cubren lo mismo, gana el que
empieza antes)."""
import json
from pathlib import Path
AQUI = Path(__file__).resolve().parent
segs = json.loads((AQUI / "transcript.parcial.json").read_text(encoding="utf-8"))
for p in sorted(AQUI.glob("transcript_*.json"), key=lambda p: int(p.stem.split("_")[1])):
    a = int(p.stem.split("_")[1])
    segs = [s for s in segs if s["start"] < a] + json.loads(p.read_text(encoding="utf-8"))
segs.sort(key=lambda s: s["start"])
(AQUI / "transcript.json").write_text(json.dumps(segs, ensure_ascii=False), encoding="utf-8")
print(len(segs), "segmentos, cubren hasta", round(segs[-1]["end"]), "·",
      sorted(int(p.stem.split("_")[1]) for p in AQUI.glob("transcript_*.json")))
