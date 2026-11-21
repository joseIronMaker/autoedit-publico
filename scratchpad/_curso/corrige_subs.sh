#!/usr/bin/env bash
# Corrige el vocabulario mal transcrito de una clase YA ensamblada y rehace solo el final.
# No vuelve a pasar Whisper: aplica las reglas de config (whisper.correcciones) sobre el
# transcript.json que ya existe —los tiempos se conservan— y re-renderiza con --render.
set -u; cd /home/jose/tiktok
L=scratchpad/_curso/logs; DEST="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"
for c in "$@"; do
  g=$(ls scratchpad/guiones_curso/${c}_*.json)
  slug=$(.venv/bin/python -c "import json;print(json.load(open('$g'))['slug'])"); stem="gen_$slug"; num=${c#py}
  nom="clase${num}_${slug#curso_${c}_}"
  echo "=== $c corrigiendo subtítulos $(date +%H:%M) ===" >> "$L/RENARRA.txt"
  .venv/bin/python - "$stem" <<'PY' >> "$L/RENARRA.txt" 2>&1
import json, sys, yaml
from pathlib import Path
sys.path.insert(0, "/home/jose/tiktok")
from autoedit.transcribe import _corrige_vocabulario
from autoedit.util import write_json_atomic
stem = sys.argv[1]
reglas = yaml.safe_load(open("/home/jose/tiktok/config.yaml"))["whisper"].get("correcciones") or {}
p = Path(f"/home/jose/tiktok/videos/{stem}.autoedit/transcript.json")
d = json.loads(p.read_text(encoding="utf-8"))
antes = len(d["words"])
d["words"] = _corrige_vocabulario(d["words"], reglas)
d["text"] = " ".join(w["word"] for w in d["words"])
write_json_atomic(p, d)
print(f"  vocabulario corregido: {antes} → {len(d['words'])} palabras")
PY
  rm -f "videos/${stem}_final.mp4"
  if ! .venv/bin/python -m autoedit.cli "videos/$stem.mp4" --render > "$L/subs_$c.log" 2>&1; then
    echo "  RENDER falló" >> "$L/RENARRA.txt"; tail -3 "$L/subs_$c.log" | sed 's/^/    /' >> "$L/RENARRA.txt"; continue; fi
  cp "videos/${stem}_final.mp4" "$DEST/$nom.mp4"
  .venv/bin/python -c "import json;print(json.load(open('videos/$stem.autoedit/copys.json'))['tiktok'].strip())" > "$DEST/${nom}_copy.txt"
  echo "  OK $nom.mp4 (subtítulos corregidos) $(date +%H:%M)" >> "$L/RENARRA.txt"
  bash scratchpad/_curso/posproduce.sh "$c" >> "$L/subs_post_$c.log" 2>&1 || echo "  posproducción falló" >> "$L/RENARRA.txt"
done
