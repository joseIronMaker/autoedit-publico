from __future__ import annotations

import json
import os
from pathlib import Path


def write_json_atomic(path: Path, data) -> None:
    """Escritura atómica: nunca deja un JSON a medias aunque alguien lo lea al instante."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)
