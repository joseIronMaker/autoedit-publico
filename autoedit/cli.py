from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

from .config import load_config


def _make_copys(workdir: Path, cfg: dict, video_stem: str) -> None:
    """Genera copys (TikTok/IG/FB) para el video completo y cada clip."""
    from .copys import generate_copys, write_copys_md
    from .model_router import ModelRouter

    router = ModelRouter(cfg)
    if not router.available:
        print("aviso: sin GEMINI_API_KEY, no se generan copys.")
        return

    transcript = json.loads((workdir / "transcript.json").read_text(encoding="utf-8"))
    words = transcript["words"]

    print("→ Generando copys (TikTok/IG/FB)…")
    out = write_copys_md(generate_copys(transcript["text"], router, cfg.get("branding", {}).get("handle", "")),
                         workdir / "copys.md", video_stem)
    print(f"✔ {out}")

    clips_file = workdir / "clips.json"
    if clips_file.exists():
        clips = json.loads(clips_file.read_text(encoding="utf-8"))["clips"]
        for k, c in enumerate(clips, 1):
            text = " ".join(w["word"] for w in words[c["first_word"]: c["last_word"] + 1])
            out = write_copys_md(generate_copys(text, router, cfg.get("branding", {}).get("handle", "")),
                                 workdir / f"copys_clip{k}.md", c["title"])
            print(f"✔ {out}")


def main() -> None:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

    p = argparse.ArgumentParser(
        prog="autoedit",
        description="Edita un video hablado: corta silencios/muletillas, quema subtítulos, "
                    "propone clips y genera copys.",
    )
    p.add_argument("video", type=Path, help="video grabado (mp4/mov)")
    p.add_argument("--render", action="store_true",
                   help="renderizar usando el edl.json (y clips.json) ya revisados")
    p.add_argument("--auto", action="store_true",
                   help="todo de un tirón, sin pausa de revisión")
    p.add_argument("--clips", action="store_true",
                   help="además del video completo, proponer y renderizar clips cortos")
    p.add_argument("--no-llm", action="store_true",
                   help="no usar Gemini: solo cortes por silencio, sin clips ni copys")
    p.add_argument("--config", type=Path, default=None, help="ruta a config.yaml alternativo")
    p.add_argument("--whisper-model", default=None,
                   help="override del modelo Whisper (tiny/base/small/medium)")
    args = p.parse_args()

    if not args.video.exists():
        sys.exit(f"No existe el archivo: {args.video}")

    cfg = load_config(args.config)
    workdir = args.video.parent / f"{args.video.stem}.autoedit"
    workdir.mkdir(exist_ok=True)

    from . import clips as clips_mod
    from . import edl as edl_mod
    from . import render as render_mod
    from . import transcribe as transcribe_mod

    if args.render:
        if not (workdir / "edl.json").exists():
            sys.exit("No hay edl.json; corre primero sin --render.")
        try:
            render_mod.render(args.video, workdir, cfg)
        except RuntimeError as e:
            sys.exit(f"Error: {e}")
        if not args.no_llm:
            _make_copys(workdir, cfg, args.video.stem)
        return

    transcript = transcribe_mod.transcribe(args.video, workdir, cfg, args.whisper_model)
    if not transcript["words"]:
        sys.exit("No se detectó voz en el video.")

    use_llm = not args.no_llm
    if use_llm:
        from .model_router import ModelRouter

        if not ModelRouter(cfg).available:
            print("aviso: GEMINI_API_KEY no configurada → modo solo-silencios (--no-llm).")
            use_llm = False

    plan = edl_mod.build_edl(transcript, cfg, workdir, use_llm)
    edl_mod.print_edl_summary(plan)

    if args.clips and use_llm:
        clip_list = clips_mod.propose_clips(transcript, cfg, workdir)
        clips_mod.print_clips_summary(clip_list)

    if args.auto:
        try:
            render_mod.render(args.video, workdir, cfg)
        except RuntimeError as e:
            sys.exit(f"Error: {e}")
        if use_llm:
            _make_copys(workdir, cfg, args.video.stem)
    else:
        print(f"\nRevisa/edita {workdir / 'edl.json'}"
              + (f" y {workdir / 'clips.json'}" if args.clips and use_llm else "")
              + " y luego corre:")
        print(f"  autoedit {args.video} --render")


if __name__ == "__main__":
    main()
