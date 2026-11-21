#!/usr/bin/env bash
# Rehace SOLO la escena 4 de ag01 (la definicion de agente que estaba incompleta) y
# vuelve a renderizar. Espera a que ag05 termine: Whisper en CPU, nunca dos a la vez.
set -u
cd /home/jose/tiktok
while ps -eo args --no-headers | grep -qE "\.venv/bin/(autoedit|autoedit-gen)"; do sleep 30; done
echo "######## ag01 · voz de la escena corregida"
.venv/bin/python - <<'PY'
import json, sys
from pathlib import Path
RAIZ = Path("/home/jose/tiktok"); sys.path.insert(0, str(RAIZ))
from dotenv import load_dotenv
load_dotenv(RAIZ / ".env")
from autoedit import generate as gen
from autoedit.config import load_config
from autoedit.model_router import ModelRouter
assets = RAIZ / "videos" / "gen_ag_que_escribio_de_verdad.assets"
g = json.loads((assets / "guion.json").read_text(encoding="utf-8"))
cfg = load_config(); gcfg = cfg.get("generate", cfg)
d = gen._wav_from_pcm(ModelRouter(cfg).generate_tts(g["scenes"][3]["narration"],
                                                    gcfg.get("tts_style", "")),
                      assets / "scene_3.wav")
(assets / "seg_3.sha1").unlink(missing_ok=True)
(assets / "voz.sha1").unlink(missing_ok=True)
print(f"  escena 3: {d:.2f}s")
PY
.venv/bin/python scratchpad/rehacer_escena.py gen_ag_que_escribio_de_verdad 3 2>&1 | tail -3
.venv/bin/autoedit /home/jose/tiktok/videos/gen_ag_que_escribio_de_verdad.mp4 --auto 2>&1 | tail -3
cp videos/gen_ag_que_escribio_de_verdad_final.mp4 \
   "/mnt/c/Users/USUARIO/Downloads/agentes/ag01_que_escribio_de_verdad.mp4"
cp scratchpad/copys_manuales_agentes/ag01.txt \
   "/mnt/c/Users/USUARIO/Downloads/agentes/ag01_copy_tiktok.txt"
echo "######## listo"
ffprobe -v error -show_entries format=duration -of csv=p=0 videos/gen_ag_que_escribio_de_verdad_final.mp4
