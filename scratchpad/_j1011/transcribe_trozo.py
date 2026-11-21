"""Transcribe un TROZO del audio fuente [a, b) y escribe transcript_<a>.json con tiempos
absolutos. Para correr varios en paralelo: un faster-whisper solo ocupa ~2.4 núcleos."""
import json, sys
from pathlib import Path
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

AQUI = Path(__file__).resolve().parent
a, b, hilos = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3])
exec((AQUI / "transcribe_fuente.py").read_text().split("from faster_whisper")[0])  # PROMPT
audio = decode_audio(str(AQUI / "audio.wav"), sampling_rate=16000)[int(a * 16000):int(b * 16000)]
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=hilos)
segs, _ = m.transcribe(audio, language="es", word_timestamps=True, vad_filter=True,
                       initial_prompt=PROMPT)
out = []
for s in segs:
    out.append({"start": s.start + a, "end": s.end + a, "text": s.text,
                "words": [{"w": w.word, "s": w.start + a, "e": w.end + a} for w in (s.words or [])]})
    print(f"{s.start + a:7.1f} {s.end + a:7.1f} {s.text.strip()[:90]}", flush=True)
(AQUI / f"transcript_{int(a)}.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print("FIN", len(out), flush=True)
