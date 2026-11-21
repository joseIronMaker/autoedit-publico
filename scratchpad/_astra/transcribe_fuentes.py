#!/usr/bin/env python3
"""Transcribe los videos de referencia para saber QUÉ afirman, con tiempos.

No es para copiarlos: es para tener la lista de afirmaciones y poder verificar cada una
contra la fuente oficial antes de escribir nada (mandato de José: "no quiero cosas falsas").
"""
import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel

D = Path("/mnt/c/Users/USUARIO/Downloads")
SAL = Path("/home/jose/tiktok/scratchpad/_astra")
FUENTES = {
    "astra": "YTDown.com_YouTube_GPT-6-ASTRA-YA-ESTA-AQUI-La-nueva-BESTIA_Media_8hrEjr9iUVU_001_1080p.mp4",
    "cybercab": "YTDown.com_YouTube_The-Future-Has-Arrived-Cybercab_Media_grdt05okn3Q_001_1080p.mp4",
}

m = WhisperModel("small", device="cpu", compute_type="int8")
for nombre, archivo in FUENTES.items():
    print(f"→ {nombre}", flush=True)
    segs, info = m.transcribe(str(D / archivo), vad_filter=True)
    trozos = [{"t": round(s.start, 1), "texto": s.text.strip()} for s in segs]
    (SAL / f"{nombre}.json").write_text(
        json.dumps({"idioma": info.language, "duracion": round(info.duration, 1),
                    "segmentos": trozos}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  {len(trozos)} segmentos · {info.language} · {info.duration:.0f}s", flush=True)
