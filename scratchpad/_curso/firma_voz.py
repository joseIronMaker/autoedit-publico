#!/usr/bin/env python3
"""¿La locución que hay en disco corresponde a la narración del guion?

Existe porque el fallo fue MUDO: `autoedit-gen` no sobrescribe un video ya generado, le
pone `_1` al nombre — así que la voz nueva se escribía en una carpeta nueva y el resto del
pipeline seguía recomponiendo la vieja, diciendo OK en cada paso (5-sep-2026).
Devuelve 0 si coinciden.
"""
import hashlib
import json
import sys
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[2]


def firma(clase: str) -> str:
    cfg = yaml.safe_load((RAIZ / "config.yaml").read_text(encoding="utf-8"))
    ec = (cfg.get("tts") or {}).get("elevenlabs") or {}
    g = json.loads(sorted((RAIZ / "scratchpad/guiones_curso").glob(f"{clase}_*.json"))[0]
                   .read_text(encoding="utf-8"))
    narr = [s.get("narracion") or s.get("narration") or "" for s in g["scenes"]]
    return hashlib.sha1(("␟".join(narr) + "␟" + str(ec.get("voice_id", ""))
                         + str(ec.get("model_id", ""))).encode("utf-8")).hexdigest()


def main() -> None:
    clase, stem = sys.argv[1], sys.argv[2]
    f = RAIZ / "videos" / f"{stem}.assets" / "voz.sha1"
    tiene = f.read_text().strip() if f.exists() else ""
    esperada = firma(clase)
    if tiene == esperada:
        print(f"  voz ✔ corresponde a la narración de {clase}")
        return
    print(f"  voz ✘ NO corresponde: en disco {tiene[:12] or '(nada)'}, guion {esperada[:12]}")
    sys.exit(1)


if __name__ == "__main__":
    main()
