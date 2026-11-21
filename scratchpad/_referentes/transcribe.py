"""Transcribe los referentes con timestamps por palabra y mide ritmo de la voz."""
import json, pathlib, statistics
from faster_whisper import WhisperModel
base = pathlib.Path(__file__).parent
m = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=8)
for f in sorted((base / "fuente").glob("r*.mp4")):
    segs, info = m.transcribe(str(f), language="es", word_timestamps=True, vad_filter=False)
    palabras, texto = [], []
    for s in segs:
        texto.append(s.text.strip())
        for w in s.words or []:
            palabras.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
    durs = [p["e"] - p["s"] for p in palabras]
    gaps = [b["s"] - a["e"] for a, b in zip(palabras, palabras[1:])]
    pausas = [g for g in gaps if g > 0.15]
    habla = palabras[-1]["e"] - palabras[0]["s"] if palabras else 0
    r = {"id": f.stem, "duracion": info.duration, "palabras": len(palabras),
         "ppm": round(len(palabras) / habla * 60, 1) if habla else 0,
         "pausas>150ms": len(pausas),
         "pausa_mediana_ms": round(statistics.median(pausas) * 1000) if pausas else 0,
         "pausa_max_ms": round(max(pausas) * 1000) if pausas else 0,
         "primera_palabra_s": palabras[0]["s"] if palabras else None,
         "texto": " ".join(texto), "words": palabras}
    (base / f"{f.stem}.json").write_text(json.dumps(r, ensure_ascii=False, indent=1))
    print({k: v for k, v in r.items() if k not in ("texto", "words")}, flush=True)
print("FIN")
