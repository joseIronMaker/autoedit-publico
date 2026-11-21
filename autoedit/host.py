"""Anfitrión talking-head (hook / cierre): el ROSTRO REAL de José habla con su voz
clonada de ElevenLabs, vía la API de D-ID (lip-sync fonético realista).

- Foto del host: ``branding/host_jose.png`` (foto real editada, fondo neón de marca).
- Key en ``.env`` como ``DID_API_KEY`` (formato ``base64(email):secret``; se usa tal cual
  como ``Authorization: Basic <key>``).
- IMPORTANTE: usar SIEMPRE la API (esta ruta). La UI "Create with a photo / Photo Avatar"
  de D-ID Studio se cuelga indefinidamente. Ver memoria host-talking-avatar-arquitectura.

Costo: plan Lite ~$6/mes quita la marca de agua del trial y la cola de "baja prioridad"
(por eso en trial el render a veces tarda varios minutos).
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

_API = "https://api.d-id.com"


def _curl_json(args, timeout=120):
    out = subprocess.run(["curl", "-s", *args], capture_output=True, text=True, timeout=timeout).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        raise RuntimeError(f"Respuesta D-ID no-JSON: {out[:200]!r}")


def talking_host(voz_path, out_path, image_path=None, api_key=None,
                 poll_s=5, max_polls=180):
    """Genera al anfitrión (``image_path``) hablando el audio ``voz_path`` → ``out_path``
    (mp4 con lip-sync). Devuelve la ruta del mp4.

    ``voz_path`` acepta wav o mp3. ``api_key`` por defecto sale de ``DID_API_KEY``.
    """
    api_key = api_key or os.environ.get("DID_API_KEY")
    if not api_key:
        raise RuntimeError("Falta DID_API_KEY en el entorno/.env")
    image_path = str(image_path or "branding/host_jose.png")
    if not Path(image_path).exists():
        raise FileNotFoundError(f"No existe la foto del host: {image_path}")
    auth = f"Authorization: Basic {api_key}"

    img = _curl_json(["-X", "POST", f"{_API}/images", "-H", auth,
                      "-F", f"image=@{image_path}"]).get("url")
    aud = _curl_json(["-X", "POST", f"{_API}/audios", "-H", auth,
                      "-F", f"audio=@{voz_path}"]).get("url")
    if not img or not aud:
        raise RuntimeError("Falló la subida de foto/voz a D-ID (revisa DID_API_KEY)")

    body = json.dumps({
        "source_url": img,
        "script": {"type": "audio", "audio_url": aud},
        "config": {"stitch": True},
    })
    tid = _curl_json(["-X", "POST", f"{_API}/talks", "-H", auth,
                      "-H", "Content-Type: application/json", "-d", body]).get("id")
    if not tid:
        raise RuntimeError("D-ID no devolvió talk id")

    for _ in range(max_polls):
        st = _curl_json(["-H", auth, f"{_API}/talks/{tid}"])
        status = st.get("status")
        if status == "done":
            subprocess.run(["curl", "-s", "-o", str(out_path), st["result_url"]],
                           check=True, timeout=180)
            return str(out_path)
        if status in ("error", "rejected"):
            raise RuntimeError(f"D-ID talk falló: {json.dumps(st)[:200]}")
        time.sleep(poll_s)
    raise TimeoutError(
        "D-ID no terminó a tiempo (la cola del trial es lenta; el plan Lite $6 la elimina)")


if __name__ == "__main__":  # prueba rápida: python -m autoedit.host voz.wav salida.mp4
    import sys
    from dotenv import load_dotenv
    load_dotenv()
    voz, out = sys.argv[1], sys.argv[2]
    print(talking_host(voz, out))
