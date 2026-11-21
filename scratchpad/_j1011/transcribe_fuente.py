"""Transcripción completa del fuente (VAD + palabras) para planear cortes y temas."""
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PROMPT = ("Sesión de trabajo con Claude Code y EasyEDA: diseño de una placa PCB de un dimmer "
          "de corriente alterna de 127 V. Esquemático, PCB, huella, footprint, pistas, ruteo, "
          "TRIAC, optoacoplador, cruce por cero, ESP32, Arduino, resistencia, capacitor, "
          "Gerber, JLCPCB, MCP, bridge, API, Opus, Codex, agente, prompt.")

from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=8)
segs, info = m.transcribe(str(AQUI / "audio.wav"), language="es", word_timestamps=True,
                          vad_filter=True, initial_prompt=PROMPT)
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text,
                "words": [{"w": w.word, "s": w.start, "e": w.end} for w in (s.words or [])]})
    print(f"{s.start:7.1f} {s.end:7.1f} {s.text.strip()[:90]}", flush=True)
    if len(out) % 25 == 0:      # parcial: si WSL se cae, no se pierde todo
        (AQUI / "transcript.parcial.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
(AQUI / "transcript.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print("FIN", len(out), flush=True)
