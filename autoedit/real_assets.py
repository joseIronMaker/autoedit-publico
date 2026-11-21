"""Material REAL para recibos y b-roll (regla del canal: lo real se muestra real).

Herramientas, productos, sitios, leaderboards o personas REALES jamás se ilustran con
imagen IA: se capturan (screenshot con el Chrome del sistema), se buscan fotos reales
(Apify google-images-scraper) o se baja el video fuente (yt-dlp del venv).
"""
from __future__ import annotations

import json
import os
import subprocess
import urllib.request
from pathlib import Path

CHROME = "/usr/bin/google-chrome"
APIFY_ACTOR = "automation-lab~google-images-scraper"


def screenshot(url: str, out_png: Path, width: int = 1080, height: int = 1600,
               wait_ms: int = 4500) -> Path:
    """Screenshot real de una página con Chrome headless (el mismo de screen_demo)."""
    out_png = Path(out_png)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1", f"--window-size={width},{height}",
         f"--virtual-time-budget={wait_ms}", f"--screenshot={out_png}", url],
        check=True, timeout=90, capture_output=True,
    )
    if not out_png.exists():
        raise RuntimeError(f"screenshot falló para {url}")
    if _is_blank(out_png):
        # muro de pago / página vacía / archivo que no renderiza → un recibo en blanco
        # mata la credibilidad; que el llamador degrade (query_fotos o big_text)
        raise RuntimeError(f"screenshot en blanco para {url} (¿paywall/archivo?)")
    return out_png


def _is_blank(png: Path) -> bool:
    """True si la imagen es casi uniforme (una sola tinta): paywall/página vacía."""
    try:
        from PIL import Image

        im = Image.open(png).convert("L").resize((64, 96))
        px = list(im.getdata())
        lo, hi = min(px), max(px)
        # rango dinámico casi nulo = pantalla plana; o >97% de píxeles casi-blancos
        blancos = sum(1 for p in px if p > 244) / len(px)
        return (hi - lo) < 22 or blancos > 0.97
    except Exception:  # noqa: BLE001 — ante la duda, no bloquear
        return False


def fetch_photos(query: str, out_dir: Path, n: int = 3,
                 country: str = "mx", language: str = "es") -> list[Path]:
    """Fotos reales vía Apify (cobra por resultado: pide solo las necesarias)."""
    token = os.environ.get("APIFY_TOKEN")
    if not token:
        raise RuntimeError("APIFY_TOKEN no está en .env")
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    body = json.dumps({
        "queries": [query], "maxResultsPerQuery": n,
        "language": language, "country": country, "safeSearch": "moderate",
    }).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/run-sync-get-dataset-items?token={token}",
        data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=240) as r:
        items = json.loads(r.read().decode("utf-8"))
    saved: list[Path] = []
    for it in items if isinstance(items, list) else []:
        if len(saved) >= n:
            break
        url = it.get("imageUrl") or it.get("image") or it.get("original") or it.get("url")
        if not url or not str(url).startswith("http"):
            continue
        ext = ".jpg"
        low = str(url).split("?")[0].lower()
        for e in (".png", ".webp", ".jpeg", ".jpg"):
            if low.endswith(e):
                ext = e
                break
        dest = out_dir / f"{len(saved) + 1:02d}{ext}"
        try:
            req_i = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req_i, timeout=60) as ri:
                dest.write_bytes(ri.read())
            saved.append(dest)
        except Exception:  # noqa: BLE001 — foto caída: sigue con la siguiente
            continue
    if not saved:
        raise RuntimeError(f"Apify no devolvió fotos usables para {query!r}")
    return saved


def fetch_video(url: str, out_mp4: Path, max_h: int = 1080) -> Path:
    """Baja un video fuente (b-roll real) con el yt-dlp del venv."""
    out_mp4 = Path(out_mp4)
    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    ytdlp = Path(__file__).resolve().parent.parent / ".venv" / "bin" / "yt-dlp"
    subprocess.run(
        [str(ytdlp), "-f", f"bv*[height<={max_h}][ext=mp4]+ba[ext=m4a]/b[height<={max_h}]",
         "--merge-output-format", "mp4", "-o", str(out_mp4), url],
        check=True, timeout=600, capture_output=True,
    )
    if not out_mp4.exists():
        raise RuntimeError(f"yt-dlp no bajó {url}")
    return out_mp4
