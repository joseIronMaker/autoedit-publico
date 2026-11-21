"""Parche quirúrgico de la serie Deep Learning: mete la conexión práctica
('esto es para esto') y cambia tarjetas de solo texto por showcase.

Re-renderiza SOLO las escenas tocadas. Los segmentos host (D-ID) se REUSAN
tal cual: cero gasto de D-ID. Uso:

    .venv/bin/python scratchpad/patch_serie.py <stem> [<stem> ...]
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

from autoedit.config import load_config

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from autoedit.diagrams import THEMES
from autoedit import generate as G, host_layout
from autoedit.model_router import ModelRouter

ROOT = Path("videos")
PATCHES = json.loads(Path("scratchpad/patches_serie.json").read_text())


def dur_of(p: Path) -> float:
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nk=1:nw=1", str(p)]).strip())


def shrink(img: Path, side: int = 1280) -> None:
    """WSL2: el raster por software de Remotion se ahoga con PNG de 3 MB."""
    from PIL import Image

    with Image.open(img) as im:
        if max(im.size) <= side:
            return
        im = im.convert("RGBA")
        im.thumbnail((side, side), Image.LANCZOS)
        im.save(img, optimize=True)
    print(f"    reducida a {side}px: {img.name}")


def tts(scene: dict, voz: Path, cfg: dict, gcfg: dict, router: ModelRouter) -> float:
    """Misma curva de voz por beat que generate.py (config tts.elevenlabs.by_beat)."""
    ec = (cfg.get("tts") or {}).get("elevenlabs") or {}
    curva = (ec.get("by_beat") or {}).get(str(scene.get("beat_type") or ""), {})
    pcm = router.generate_tts(scene["narration"], gcfg.get("tts_style", ""),
                              overrides=curva or None)
    pausa_def = {"hook": 0.45, "tesis": 0.35}.get(str(scene.get("beat_type") or ""), 0.0)
    pausa = float(scene.get("pause_after") or pausa_def)
    if pausa > 0:
        pcm += b"\x00" * (int(24000 * min(pausa, 1.5)) * 2)
    return G._wav_from_pcm(pcm, voz) + 0.3


def render_scene(scene: dict, idx: int, voz: Path, dur: float,
                 seg: Path, assets: Path, gcfg: dict, router: ModelRouter) -> None:
    vt = scene.get("visual_type")
    seg.unlink(missing_ok=True)
    if vt == "ml_demo":
        from autoedit import ml_demo

        ml_demo.render_ml_demo_scene(scene["ml_demo"], voz, dur, seg, gcfg)
    elif vt == "showcase":
        from autoedit.remotion_scenes import render_remotion_scene, stage_asset

        items_out = []
        for j, it in enumerate((scene["showcase"].get("items") or [])[:4]):
            img = assets / f"showcase_{idx}_{j}.png"
            if not img.exists():
                prompt = f"{it.get('image_prompt', it.get('label', ''))}. {G._IMG_STYLE}"
                try:
                    from autoedit.codex_client import codex_available, codex_image

                    if not codex_available():
                        raise RuntimeError("codex no disponible")
                    print(f"    imagen {j} con codex ($0)...", flush=True)
                    codex_image(prompt, img)
                except Exception as e:  # noqa: BLE001
                    print(f"    codex falló ({e}); uso Gemini")
                    img.write_bytes(router.generate_image(prompt))
                shrink(img)
            items_out.append({"label": it.get("label", ""), "image": stage_asset(img)})
        render_remotion_scene({"type": "showcase", "items": items_out},
                              voz, dur, seg, gcfg)
    else:
        raise SystemExit(f"visual_type no soportado por el parche: {vt}")
    if not seg.exists():
        raise SystemExit(f"no se generó {seg}")


def patch(stem: str, cfg: dict) -> None:
    assets = ROOT / f"{stem}.assets"
    gj = assets / "guion.json"
    guion = json.loads(gj.read_text())
    gcfg = dict(cfg["generate"])
    tn = list(THEMES.keys())
    gcfg["theme"] = tn[sum(map(ord, stem)) % len(tn)]
    router = ModelRouter(cfg)

    # ONLY=ml_demo → re-renderiza solo ese tipo de escena (2ª pasada tras arreglar el
    # layout de ml_demo, sin volver a pagar voz ni imágenes)
    only = [t for t in os.environ.get("ONLY", "").split(",") if t]
    print(f"\n=== {stem} (tema {gcfg['theme']})", flush=True)
    tocadas = 0
    for p in PATCHES[stem]:
        idx = p["scene"]
        scene = guion["scenes"][idx]
        voz = assets / f"scene_{idx}.wav"
        vt_actual = p.get("showcase") and "showcase" or scene.get("visual_type")
        if only and vt_actual not in only:
            print(f"  escena {idx}: omitida ({vt_actual})", flush=True)
            continue
        tocadas += 1

        if p.get("showcase"):
            scene["visual_type"] = "showcase"
            scene["showcase"] = p["showcase"]
            scene.pop("diagram", None)

        nueva = p.get("narration")
        if nueva and nueva != scene.get("narration"):
            scene["narration"] = nueva
            print(f"  escena {idx}: nueva voz ({len(nueva)} chars)", flush=True)
            dur = tts(scene, voz, cfg, gcfg, router)
        else:
            dur = dur_of(voz) + 0.3   # voz REUSADA (sin gasto de ElevenLabs)
            print(f"  escena {idx}: voz reusada", flush=True)

        print(f"  escena {idx}: render {scene['visual_type']} ({dur:.1f}s)", flush=True)
        render_scene(scene, idx, voz, dur, assets / f"seg_{idx}.mp4",
                     assets, gcfg, router)

    gj.write_text(json.dumps(guion, ensure_ascii=False, indent=1))
    if not tocadas:
        print("  nada que re-ensamblar", flush=True)
        return

    segs = [assets / f"seg_{i}.mp4" for i in range(len(guion["scenes"]))]
    faltan = [s.name for s in segs if not s.exists()]
    if faltan:
        raise SystemExit(f"faltan segmentos: {faltan}")
    out = ROOT / f"{stem}.mp4"
    G._assemble(segs, out, gcfg)
    sfx = Path("autoedit/assets/sfx/whoosh.mp3")
    host_layout.continuous_base_audio(
        out, segs, sfx_path=sfx if gcfg.get("sfx") else None,
        sfx_gain=float(gcfg.get("sfx_gain", 0.32)))
    print(f"  ENSAMBLADO {out} ({dur_of(out):.1f}s)", flush=True)


if __name__ == "__main__":
    cfg = load_config()
    for stem in sys.argv[1:]:
        patch(stem, cfg)
