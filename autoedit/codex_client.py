"""Delegación a Codex CLI (OpenAI) — imágenes y código de animación.

Codex corre headless (``codex exec``) con el plan ChatGPT de José: generar imágenes
por aquí tiene costo marginal cero (no gasta créditos de Gemini). También está
registrado como servidor MCP de Claude Code (``codex mcp-server``).

Si codex no está instalado o falla, el llamador degrada a Gemini (model_router).
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


# Razonamiento EXTRA ALTO en todo lo que se delega (mandato de José, 3-ago-2026).
# El crítico de guiones y el código de animaciones son trabajo de criterio, no de
# volumen: vale la pena el tiempo extra por respuesta.
ESFUERZO = "xhigh"
# xhigh piensa mucho más: con el timeout viejo de 420 s se pasaba y caía a Gemini,
# justo lo que se quería evitar (medido 6-ago-2026). Cada animación se cachea por
# escena, así que el costo en tiempo es una sola vez.


def codex_available() -> bool:
    return shutil.which("codex") is not None


def codex_image(prompt: str, out_png: Path, timeout: int = 900) -> Path:
    """Genera UNA imagen con la herramienta de imágenes de codex y la deja en out_png.

    Trabaja en un directorio TEMPORAL propio y copia al final. Antes corría con `-C` sobre
    la carpeta destino y, como la instrucción le pide "no crees ningún otro archivo",
    codex se ponía a limpiar los PNG ajenos: dos generaciones en paralelo sobre el mismo
    `*.assets` se borraban la una a la otra (medido 24-ago-2026 generando las 14 fotos de
    jose07/jose08 con agentes en paralelo). El síntoma es silencioso: la imagen se genera
    bien y desaparece segundos después.
    """
    import shutil
    import tempfile

    out_png = Path(out_png).resolve()
    out_png.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="codeximg_") as tmp:
        trabajo = Path(tmp)
        instruction = (
            "Usa tu herramienta de generación de imágenes para crear UNA imagen con este "
            f"prompt: {prompt}\n"
            f"Guarda el PNG resultante EXACTAMENTE como {out_png.name} en el directorio de "
            "trabajo actual. No crees ningún otro archivo. Si no tienes herramienta de "
            "imágenes disponible, responde exactamente NO_IMAGE_TOOL."
        )
        r = subprocess.run(
            ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write",
             "-c", f"model_reasoning_effort={ESFUERZO}",
             "-C", str(trabajo), instruction],
            capture_output=True, text=True, timeout=timeout,
        )
        generado = trabajo / out_png.name
        if not generado.exists():
            # a veces lo nombra distinto: si hay UN solo png en el temporal, ese es
            pngs = sorted(trabajo.glob("*.png"))
            if len(pngs) == 1:
                generado = pngs[0]
            else:
                tail = ((r.stdout or "") + (r.stderr or ""))[-300:]
                raise RuntimeError(f"codex no produjo la imagen: {tail}")
        shutil.copy2(generado, out_png)
    return out_png


def codex_code(prompt: str, work_dir: Path, timeout: int = 1200) -> str:
    """Pide a Codex el código de una animación y devuelve el .py que escribió.

    El mandato de José es delegar a Codex TAMBIÉN el código de animaciones (plan
    ChatGPT = costo 0 y escribe mejor código que el router de texto). Hasta el
    30-jul solo las imágenes pasaban por aquí; las animaciones las escribía Gemini.
    """
    work_dir = Path(work_dir).resolve()
    work_dir.mkdir(parents=True, exist_ok=True)
    destino = work_dir / "anim.py"
    destino.unlink(missing_ok=True)
    instruction = (
        f"{prompt}\n\n"
        f"Escribe el resultado EXACTAMENTE en un archivo llamado {destino.name} en el "
        "directorio de trabajo actual: solo el código Python pedido, sin explicaciones, "
        "sin bloques markdown y sin ningún otro archivo. No ejecutes nada."
    )
    subprocess.run(
        ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write",
         "-c", f"model_reasoning_effort={ESFUERZO}",
         "-C", str(work_dir), instruction],
        capture_output=True, text=True, timeout=timeout,
    )
    if not destino.exists():
        raise RuntimeError("codex no escribió anim.py")
    code = destino.read_text(encoding="utf-8").strip()
    destino.unlink(missing_ok=True)
    if "def draw" not in code:
        raise RuntimeError("el código de codex no define draw()")
    return code


def codex_json(prompt: str, work_dir: Path, timeout: int = 600) -> dict:
    """Pide a Codex una respuesta ESTRUCTURADA y devuelve el JSON que escribió.

    Codex escribe a un archivo (no a stdout) porque su salida trae logs de sesión.
    Se usa para el crítico de guiones (``autoedit/critico.py``): Claude escribe,
    Codex juzga, Claude corrige. Mandato de José, 3-ago-2026.
    """
    import json as _json

    work_dir = Path(work_dir).resolve()
    work_dir.mkdir(parents=True, exist_ok=True)
    destino = work_dir / "veredicto.json"
    destino.unlink(missing_ok=True)
    instruction = (
        f"{prompt}\n\n"
        f"Escribe tu respuesta EXCLUSIVAMENTE como JSON válido en un archivo llamado "
        f"{destino.name} en el directorio de trabajo actual. Sin markdown, sin ```json, "
        f"sin explicaciones fuera del archivo. No crees ningún otro archivo."
    )
    subprocess.run(
        ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write",
         "-c", f"model_reasoning_effort={ESFUERZO}",
         "-C", str(work_dir), instruction],
        capture_output=True, text=True, timeout=timeout,
    )
    if not destino.exists():
        raise RuntimeError("codex no escribió veredicto.json")
    txt = destino.read_text(encoding="utf-8").strip()
    destino.unlink(missing_ok=True)
    if txt.startswith("```"):                      # por si igual lo envuelve
        txt = txt.split("```")[1].lstrip("json").strip()
    try:
        return _json.loads(txt)
    except _json.JSONDecodeError:
        # Codex a veces deja una coma colgando antes de } o ], o comentarios //.
        # Se limpia en vez de tirar toda la respuesta (medido 8-ago-2026).
        import re as _re
        limpio = _re.sub(r"//[^\n]*", "", txt)
        limpio = _re.sub(r",(\s*[}\]])", r"\1", limpio)
        try:
            return _json.loads(limpio)
        except _json.JSONDecodeError:
            i, j = limpio.find("{"), limpio.rfind("}")
            if i >= 0 and j > i:
                return _json.loads(_re.sub(r",(\s*[}\]])", r"\1", limpio[i:j + 1]))
            raise
