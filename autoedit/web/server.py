from __future__ import annotations

import argparse
import json
import re
import shutil
import threading
from pathlib import Path
from typing import Callable

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

from ..config import load_config

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm"}
STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="autoedit")
ROOT = Path.cwd()
VIDEOS_DIR = ROOT / "videos"
SERIES_DIR = ROOT / "series"
TOPICS_DIR = ROOT / "topics"
CFG: dict = {}

_jobs: dict[str, dict] = {}
_lock = threading.Lock()


def _set_job(stem: str, step: str, detail: str = "") -> None:
    with _lock:
        _jobs[stem] = {"step": step, "detail": detail}


def _job(stem: str) -> dict | None:
    with _lock:
        return _jobs.get(stem)


def _busy(stem: str) -> bool:
    with _lock:
        job = _jobs.get(stem)
        return bool(job and job["step"] not in ("listo", "error"))


def _claim(stem: str, step: str, detail: str = "") -> bool:
    """Reserva atómica del job: elimina la carrera del doble clic (check y set juntos)."""
    with _lock:
        job = _jobs.get(stem)
        if job and job["step"] not in ("listo", "error"):
            return False
        _jobs[stem] = {"step": step, "detail": detail}
        return True


# ---------- Resolución de rutas (videos/ y series/<slug>/) ----------

def _video_dirs() -> list[Path]:
    dirs = [VIDEOS_DIR]
    if SERIES_DIR.exists():
        dirs += sorted(d for d in SERIES_DIR.iterdir() if d.is_dir())
    return dirs


def _locate_original(stem: str) -> Path | None:
    for d in _video_dirs():
        for ext in VIDEO_EXTS:
            for cand in (d / f"{stem}{ext}", d / f"{stem}{ext.upper()}"):
                if cand.exists():
                    return cand
    return None


def _locate_dir(stem: str) -> Path:
    orig = _locate_original(stem)
    if orig:
        return orig.parent
    for d in _video_dirs():
        if (d / f"{stem}_final.mp4").exists():
            return d
    return VIDEOS_DIR


def _find_video(stem: str) -> Path:
    p = _locate_original(stem)
    if not p:
        raise HTTPException(404, f"no existe el video {stem}")
    return p


def _workdir(stem: str) -> Path:
    return _locate_dir(stem) / f"{stem}.autoedit"


def _rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


def _read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):  # no existe o escritura en curso
        return None


def _all_stems() -> set[str]:
    """Todos los stems en uso (videos/ y series): garantiza nombres únicos globales."""
    stems: set[str] = set()
    for d in _video_dirs():
        if not d.exists():
            continue
        for p in d.iterdir():
            name = p.name
            if p.suffix.lower() in VIDEO_EXTS:
                stems.add(p.stem)
            if name.endswith("_final.mp4"):
                stems.add(name[: -len("_final.mp4")])
            if name.endswith((".autoedit", ".assets")):
                stems.add(name.rsplit(".", 1)[0])
    return stems


def _outputs(stem: str) -> list[dict]:
    d = _locate_dir(stem)
    wd = _workdir(stem)
    clips = (_read_json(wd / "clips.json") or {}).get("clips", [])
    out = []
    full = d / f"{stem}_final.mp4"
    if full.exists():
        out.append({"file": full.name, "path": _rel(full), "title": "Video completo",
                    "copys": _read_json(wd / "copys.json")})
    for k, c in enumerate(clips, 1):
        p = d / f"{stem}_clip{k}_final.mp4"
        if p.exists():
            out.append({"file": p.name, "path": _rel(p), "title": c.get("title", f"Clip {k}"),
                        "copys": _read_json(wd / f"copys_clip{k}.json")})
    return out


def _full_pipeline(video: Path, on_step: Callable[[str, str], None]) -> None:
    """Post-proceso de un video generado: transcribe, EDL, render y copys."""
    from .. import edl as edl_mod
    from .. import render as render_mod
    from .. import transcribe as transcribe_mod
    from ..copys import generate_copys, write_copys_md
    from ..model_router import ModelRouter

    wd = video.parent / f"{video.stem}.autoedit"
    wd.mkdir(exist_ok=True)
    on_step("subtitulando", "Whisper transcribe la voz")
    transcript = transcribe_mod.transcribe(video, wd, CFG)
    router = ModelRouter(CFG)
    on_step("subtitulando", "Gemini decide cortes y énfasis")
    edl_mod.build_edl(transcript, CFG, wd, router.available)
    on_step("renderizando", "cortes + subtítulos karaoke")
    render_mod.render(video, wd, CFG)
    if router.available:
        on_step("copys", "TikTok / Instagram / Facebook")
        write_copys_md(generate_copys(transcript["text"], router, CFG.get("branding", {}).get("handle", "")), wd / "copys.md", video.stem)


# ---------- Videos ----------

@app.get("/api/videos")
def list_videos() -> dict:
    items, seen = [], set()
    for p in sorted(VIDEOS_DIR.iterdir()) if VIDEOS_DIR.exists() else []:
        if p.suffix.lower() not in VIDEO_EXTS or p.stem.endswith("_final"):
            continue
        stem = p.stem
        seen.add(stem)
        items.append({
            "stem": stem, "file": p.name, "path": _rel(p),
            "analyzed": (VIDEOS_DIR / f"{stem}.autoedit" / "edl.json").exists(),
            "rendered": (VIDEOS_DIR / f"{stem}_final.mp4").exists(),
            "cleaned": False, "job": _job(stem),
        })
    for p in sorted(VIDEOS_DIR.glob("*_final.mp4")) if VIDEOS_DIR.exists() else []:
        stem = p.name[: -len("_final.mp4")]
        if stem not in seen and "_clip" not in stem:
            items.append({"stem": stem, "file": p.name, "path": _rel(p), "analyzed": True,
                          "rendered": True, "cleaned": True, "job": _job(stem)})
    return {"videos": items, "gen": _job("gen")}


@app.post("/api/upload")
def upload(file: UploadFile = File(...)) -> dict:
    name = Path(file.filename or "video.mp4").name
    suffix = Path(name).suffix.lower()
    if suffix not in VIDEO_EXTS:
        raise HTTPException(400, f"formato no soportado: {suffix}")
    stem = re.sub(r"[^\w\-]", "_", Path(name).stem).strip("_") or "video"
    dest = VIDEOS_DIR / f"{stem}{suffix}"
    i = 1
    while dest.exists():
        dest = VIDEOS_DIR / f"{stem}_{i}{suffix}"
        i += 1
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"stem": dest.stem, "file": dest.name}


@app.get("/api/video/{stem}")
def video_detail(stem: str) -> dict:
    cleaned = False
    video = _locate_original(stem)
    if not video:
        final = _locate_dir(stem) / f"{stem}_final.mp4"
        if not final.exists():
            raise HTTPException(404, f"no existe el video {stem}")
        video, cleaned = final, True
    wd = _workdir(stem)
    transcript = _read_json(wd / "transcript.json")
    return {
        "stem": stem,
        "file": video.name,
        "path": _rel(video),
        "cleaned": cleaned,
        "job": _job(stem),
        "transcript": {
            "text": transcript["text"],
            "duration": transcript["duration"],
            "n_words": len(transcript["words"]),
        } if transcript else None,
        "edl": _read_json(wd / "edl.json"),
        "clips": (_read_json(wd / "clips.json") or {}).get("clips", []),
        "outputs": _outputs(stem),
        "junk_mb": _junk_mb(stem) if (_locate_dir(stem) / f"{stem}_final.mp4").exists() else 0,
        "is_generated": stem.startswith("gen_"),
    }


@app.post("/api/analyze/{stem}")
def analyze(stem: str, opts: dict = Body(default={})) -> dict:
    video = _find_video(stem)
    if not _claim(stem, "transcribiendo", "en cola"):
        raise HTTPException(409, "ya hay un proceso corriendo para este video")

    want_clips = bool(opts.get("clips", True))

    def work() -> None:
        try:
            from .. import clips as clips_mod
            from .. import edl as edl_mod
            from .. import transcribe as transcribe_mod
            from ..model_router import ModelRouter

            wd = video.parent / f"{stem}.autoedit"
            wd.mkdir(exist_ok=True)
            _set_job(stem, "transcribiendo", "Whisper local, la primera vez tarda más")
            transcript = transcribe_mod.transcribe(video, wd, CFG)
            if not transcript["words"]:
                _set_job(stem, "error", "no se detectó voz en el video")
                return
            use_llm = ModelRouter(CFG).available
            _set_job(stem, "analizando", "Gemini decide cortes y énfasis")
            edl_mod.build_edl(transcript, CFG, wd, use_llm)
            if want_clips and use_llm:
                _set_job(stem, "buscando clips", "Gemini propone clips autocontenidos")
                clips_mod.propose_clips(transcript, CFG, wd)
            _set_job(stem, "listo")
        except Exception as e:  # noqa: BLE001 — el error viaja al frontend
            _set_job(stem, "error", str(e))

    threading.Thread(target=work, daemon=True).start()
    return {"ok": True}


@app.put("/api/edl/{stem}")
def save_edl(stem: str, edl: dict = Body(...)) -> dict:
    wd = _workdir(stem)
    if not (wd / "edl.json").exists():
        raise HTTPException(404, "no hay edl.json; analiza primero")
    current = _read_json(wd / "edl.json") or {}
    current["cuts"] = edl.get("cuts", current.get("cuts", []))
    (wd / "edl.json").write_text(
        json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return {"ok": True}


@app.post("/api/render/{stem}")
def do_render(stem: str) -> dict:
    video = _find_video(stem)
    wd = video.parent / f"{stem}.autoedit"
    if not (wd / "edl.json").exists():
        raise HTTPException(404, "no hay edl.json; analiza primero")
    if not _claim(stem, "renderizando", "en cola"):
        raise HTTPException(409, "ya hay un proceso corriendo para este video")

    def work() -> None:
        try:
            from .. import render as render_mod
            from ..copys import generate_copys, write_copys_md
            from ..model_router import ModelRouter

            _set_job(stem, "renderizando", "ffmpeg: cortes + subtítulos + clips")
            render_mod.render(video, wd, CFG)

            router = ModelRouter(CFG)
            if router.available:
                _set_job(stem, "generando copys", "TikTok / Instagram / Facebook")
                transcript = _read_json(wd / "transcript.json") or {}
                words = transcript.get("words", [])
                write_copys_md(generate_copys(transcript.get("text", ""), router, CFG.get("branding", {}).get("handle", "")),
                               wd / "copys.md", stem)
                clips = (_read_json(wd / "clips.json") or {}).get("clips", [])
                for k, c in enumerate(clips, 1):
                    text = " ".join(
                        w["word"] for w in words[c["first_word"]: c["last_word"] + 1]
                    )
                    write_copys_md(generate_copys(text, router, CFG.get("branding", {}).get("handle", "")),
                                   wd / f"copys_clip{k}.md", c.get("title", ""))
            _set_job(stem, "listo")
        except Exception as e:  # noqa: BLE001
            _set_job(stem, "error", str(e))

    threading.Thread(target=work, daemon=True).start()
    return {"ok": True}


@app.post("/api/generate")
def generate(opts: dict = Body(...)) -> dict:
    tema = (opts.get("tema") or "").strip()
    modo = "largo" if opts.get("modo") == "largo" else "corto"
    if not tema:
        raise HTTPException(400, "falta el tema del video")
    if not _claim("gen", "guion", "Gemini escribe el guion"):
        raise HTTPException(409, "ya hay un video generándose")

    def work() -> None:
        try:
            from ..generate import generate_video

            out = generate_video(
                tema, VIDEOS_DIR, CFG,
                on_step=lambda step, detail: _set_job("gen", step, detail),
                avoid_stems=_all_stems(), modo=modo,
            )
            # ciclo completo: el video sale ya subtitulado y con copys
            _set_job(out.stem, "en proceso", "generándose")
            try:
                _full_pipeline(out, lambda step, detail: _set_job("gen", step, detail))
                _log_experiment(out.stem, None)
            finally:
                _set_job(out.stem, "listo")
            _set_job("gen", "listo", out.stem)
        except Exception as e:  # noqa: BLE001
            _set_job("gen", "error", str(e))

    threading.Thread(target=work, daemon=True).start()
    return {"ok": True}


# ---------- Limpieza de material de origen ----------

def _tree_size(path: Path) -> int:
    try:
        if path.is_file():
            return path.stat().st_size
        if path.is_dir():
            total = 0
            for f in path.rglob("*"):
                try:
                    if f.is_file():
                        total += f.stat().st_size
                except OSError:  # borrado en paralelo por una limpieza
                    pass
            return total
    except OSError:
        pass
    return 0


def _junk_paths(stem: str) -> list[Path]:
    """Lo regenerable de un video que YA tiene final. Nunca el final, los copys ni el
    guion.json (metadata de experimentos: hook_tipo, keyword)."""
    d = _locate_dir(stem)
    wd = d / f"{stem}.autoedit"
    assets = d / f"{stem}.assets"
    paths: list[Path] = []
    if assets.exists():
        paths += [p for p in assets.iterdir() if p.name != "guion.json"]
    if stem.startswith("gen_"):  # el material grabado por José nunca se toca
        for ext in VIDEO_EXTS:
            p = d / f"{stem}{ext}"
            if p.exists():
                paths.append(p)
    if wd.exists():
        paths += [p for p in wd.iterdir() if not p.name.startswith("copys")]
    return [p for p in paths if p.exists()]


def _junk_mb(stem: str) -> float:
    return round(sum(_tree_size(p) for p in _junk_paths(stem)) / 1e6, 1)


@app.post("/api/clean/{stem}")
def clean(stem: str) -> dict:
    if _busy(stem) or _busy("series"):
        raise HTTPException(409, "hay un proceso corriendo; limpia cuando termine")
    if not (_locate_dir(stem) / f"{stem}_final.mp4").exists():
        raise HTTPException(409, "no hay video final; no se limpia el origen sin él")
    freed = 0
    for p in _junk_paths(stem):
        freed += _tree_size(p)
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        else:
            p.unlink(missing_ok=True)
    return {"ok": True, "freed_mb": round(freed / 1e6, 1)}


@app.delete("/api/video/{stem}")
def delete_video(stem: str) -> dict:
    """Elimina TODO lo de un video: crudo, finales, clips, análisis, assets."""
    if _busy(stem):
        raise HTTPException(409, "hay un proceso corriendo para este video")
    d = _locate_dir(stem)
    targets = [d / f"{stem}.autoedit", d / f"{stem}.assets", d / f"{stem}_final.mp4"]
    targets += list(d.glob(f"{stem}_clip*_final.mp4"))
    for ext in VIDEO_EXTS:
        targets += [d / f"{stem}{ext}", d / f"{stem}{ext.upper()}"]
    freed = 0
    for p in targets:
        if not p.exists():
            continue
        freed += _tree_size(p)
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        else:
            p.unlink(missing_ok=True)
    return {"ok": True, "freed_mb": round(freed / 1e6, 1)}


# ---------- Series ----------

_series_stop: set[str] = set()


@app.get("/api/series")
def series_list() -> dict:
    series = []
    if SERIES_DIR.exists():
        for sj in sorted(SERIES_DIR.glob("*/serie.json")):
            s = _read_json(sj)
            if not s:
                continue
            sdir = sj.parent
            for it in s["items"]:
                stem = it.get("video")
                if stem:
                    final = sdir / f"{stem}_final.mp4"
                    it["final"] = final.name if final.exists() else None
                    it["final_path"] = _rel(final) if final.exists() else None
                    it["final_mb"] = round(final.stat().st_size / 1e6, 1) if final.exists() else 0
                    it["copys"] = _read_json(sdir / f"{stem}.autoedit" / "copys.json")
                    it["junk_mb"] = _junk_mb(stem)
            series.append(s)
    return {"series": series, "job": _job("series")}


@app.post("/api/series")
def series_create(opts: dict = Body(...)) -> dict:
    titulo = (opts.get("titulo") or "").strip()
    if not titulo:
        raise HTTPException(400, "falta el título de la serie")
    # n opcional (mandato de José): sin número, el temario decide cuántos videos
    # necesita el tema (3-8); con número explícito, se respeta
    n_raw = opts.get("n")
    n = max(2, min(12, int(n_raw))) if n_raw else None
    auto = bool(opts.get("auto"))
    modo = "largo" if opts.get("modo") == "largo" else "corto"
    if auto and _busy("series"):
        raise HTTPException(409, "ya hay una serie generándose; crea sin auto o espera")
    from ..series import create_series

    series = create_series(titulo, n, CFG, SERIES_DIR, modo=modo)
    if auto:
        _launch_series(series["slug"])
    return {**series, "auto_started": auto}


def _launch_series(slug: str) -> None:
    from ..util import write_json_atomic

    sdir = SERIES_DIR / slug
    path = sdir / "serie.json"
    data = _read_json(path)
    if not data:
        raise HTTPException(404, "no existe esa serie")
    if not _claim("series", "arrancando", data.get("titulo", slug)):
        raise HTTPException(409, "ya hay una serie generándose")
    _series_stop.discard(slug)

    def work() -> None:
        from ..generate import generate_video

        total = len(data["items"])
        try:
            for idx, item in enumerate(data["items"]):
                if slug in _series_stop:
                    _set_job("series", "listo", "detenida por el usuario")
                    return
                if item["status"] == "listo":
                    continue
                item["status"] = "generando"
                write_json_atomic(path, data)
                prefix = f"video {idx + 1}/{total}"
                out = None
                try:
                    brief = (f"Video {idx + 1} de la serie «{data['titulo']}»: {item['tema']}. "
                             f"{item.get('descripcion', '')} Debe funcionar autocontenido.")
                    out = generate_video(
                        brief, sdir, CFG,
                        on_step=lambda s, d: _set_job("series", f"{prefix} · {s}", d),
                        avoid_stems=_all_stems(), modo=data.get("modo", "corto"),
                    )
                    # bloquea el stem: nadie puede analizar/borrar el video a medio proceso
                    _set_job(out.stem, "en serie", "procesándose dentro de la serie")
                    _full_pipeline(out, lambda s, d: _set_job("series", f"{prefix} · {s}", d))
                    item["status"] = "listo"
                    item["video"] = out.stem
                    _log_experiment(out.stem, slug)
                except Exception as e:  # noqa: BLE001 — la serie sigue con el siguiente
                    item["status"] = "error"
                    item["error"] = str(e)
                finally:
                    if out is not None:
                        _set_job(out.stem, "listo")
                write_json_atomic(path, data)
            done = sum(1 for i in data["items"] if i["status"] == "listo")
            # limpieza automática del material de origen de la serie terminada
            _set_job("series", "limpiando", "borrando material de origen")
            freed = 0.0
            for it in data["items"]:
                stem = it.get("video")
                if it["status"] == "listo" and stem:
                    for p in _junk_paths(stem):
                        freed += _tree_size(p) / 1e6
                        if p.is_dir():
                            shutil.rmtree(p, ignore_errors=True)
                        else:
                            p.unlink(missing_ok=True)
            _set_job("series", "listo",
                     f"{done}/{total} videos · {freed:.0f} MB de origen limpiados")
        except Exception as e:  # noqa: BLE001
            _set_job("series", "error", str(e))

    threading.Thread(target=work, daemon=True).start()


@app.post("/api/series/{slug}/start")
def series_start(slug: str) -> dict:
    _launch_series(slug)
    return {"ok": True}


@app.post("/api/series/{slug}/stop")
def series_stop(slug: str) -> dict:
    _series_stop.add(slug)
    return {"ok": True}


@app.delete("/api/series/{slug}")
def delete_series(slug: str) -> dict:
    """Elimina la serie completa: carpeta con temario, videos, análisis y copys."""
    if _busy("series"):
        raise HTTPException(409, "hay una serie generándose; detenla primero")
    sdir = SERIES_DIR / slug
    if not sdir.is_dir():
        raise HTTPException(404, "no existe esa serie")
    freed = _tree_size(sdir)
    shutil.rmtree(sdir, ignore_errors=True)
    return {"ok": True, "freed_mb": round(freed / 1e6, 1)}


def _log_experiment(stem: str, serie: str | None) -> None:
    """Registro §7 del plan maestro: cada video generado es un experimento.
    Las métricas (views, saves, completion…) se completan al cerrar el bucle de analítica."""
    try:
        import subprocess
        from datetime import date

        d = _locate_dir(stem)
        guion = _read_json(d / f"{stem}.assets" / "guion.json") or {}
        final = d / f"{stem}_final.mp4"
        dur = None
        if final.exists():
            out = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", str(final)],
                capture_output=True, text=True, timeout=30,
            ).stdout.strip()
            dur = round(float(out), 1) if out else None
        rec = {
            "video_id": stem, "fecha": date.today().isoformat(),
            "hora_publicacion": None, "red": None, "rama": "A_codigo",
            "pilar": None, "hook_tipo": guion.get("hook_tipo"),
            "duracion_seg": dur, "keyword_principal": guion.get("keyword"),
            "tema": guion.get("tema") or guion.get("title"), "serie": serie,
            "hipotesis": None,
            "resultados": {"views": None, "likes": None, "comments": None,
                           "shares": None, "saves": None, "completion_pct": None,
                           "watch_time_avg": None, "fuente_trafico_fyp_pct": None},
        }
        with (ROOT / "experiments.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception as e:  # noqa: BLE001 — el registro nunca tumba la generación
        print(f"aviso: no se registró el experimento de {stem}: {e}")


@app.get("/api/costs")
def costs() -> dict:
    """Gasto real acumulado en la API de Gemini (de usage.jsonl del ModelRouter)."""
    from datetime import date

    from ..model_router import USAGE_PATH

    today = date.today().isoformat()
    t = tt = 0.0
    if USAGE_PATH.exists():
        for line in USAGE_PATH.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            tt += r.get("cost_usd", 0)
            if str(r.get("ts", "")).startswith(today):
                t += r.get("cost_usd", 0)
    return {"today_usd": round(t, 3), "total_usd": round(tt, 3)}


# ---------- Agente de temas ----------

def _agent_state() -> dict:
    return _read_json(TOPICS_DIR / "agent.json") or {"enabled": False, "hour": 8}


def _run_topics_search() -> None:
    from datetime import date

    from ..topics import find_topics

    today = date.today().isoformat()
    from ..util import write_json_atomic

    try:
        _set_job("topics", "buscando", "Gemini busca en la web qué pasó en IA")
        topics = find_topics(CFG, today)
        write_json_atomic(TOPICS_DIR / f"{today}.json", topics)
        _set_job("topics", "listo", f"{len(topics)} temas propuestos")
    except Exception as e:  # noqa: BLE001
        _set_job("topics", "error", str(e))


@app.get("/api/topics")
def topics_today() -> dict:
    from datetime import date

    today = date.today().isoformat()
    return {
        "agent": _agent_state(),
        "date": today,
        "today": _read_json(TOPICS_DIR / f"{today}.json") or [],
        "job": _job("topics"),
    }


@app.post("/api/topics/refresh")
def topics_refresh() -> dict:
    if not _claim("topics", "buscando", "en cola"):
        raise HTTPException(409, "ya se están buscando temas")
    threading.Thread(target=_run_topics_search, daemon=True).start()
    return {"ok": True}


@app.post("/api/topics/agent")
def topics_agent(opts: dict = Body(...)) -> dict:
    from ..util import write_json_atomic

    state = {**_agent_state(), "enabled": bool(opts.get("enabled"))}
    write_json_atomic(TOPICS_DIR / "agent.json", state)
    return state


def _daily_agent_loop() -> None:
    """Si el agente está activado, busca temas una vez al día a partir de la hora configurada."""
    import time
    from datetime import date, datetime

    while True:
        try:
            st = _agent_state()
            today_file = TOPICS_DIR / f"{date.today().isoformat()}.json"
            if (st.get("enabled") and not today_file.exists()
                    and datetime.now().hour >= st.get("hour", 8) and not _busy("topics")):
                _run_topics_search()
        except Exception:  # noqa: BLE001 — el loop nunca muere
            pass
        time.sleep(600)


def main() -> None:
    global ROOT, CFG, VIDEOS_DIR, SERIES_DIR, TOPICS_DIR
    p = argparse.ArgumentParser(prog="autoedit-web", description="Interfaz web local de autoedit")
    p.add_argument("--dir", type=Path, default=Path.cwd(), help="carpeta raíz del proyecto")
    p.add_argument("--port", type=int, default=8765)
    args = p.parse_args()

    ROOT = args.dir.resolve()
    VIDEOS_DIR = ROOT / "videos"
    SERIES_DIR = ROOT / "series"
    TOPICS_DIR = ROOT / "topics"
    for d in (VIDEOS_DIR, SERIES_DIR, TOPICS_DIR):
        d.mkdir(exist_ok=True)
    threading.Thread(target=_daily_agent_loop, daemon=True).start()
    pkg_root = Path(__file__).resolve().parent.parent.parent
    load_dotenv(pkg_root / ".env")
    cfg_path = ROOT / "config.yaml"
    CFG = load_config(cfg_path if cfg_path.exists() else None)

    app.mount("/files", StaticFiles(directory=ROOT), name="files")
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    import uvicorn

    print(f"\n  autoedit web → http://localhost:{args.port}  (proyecto en {ROOT})\n")
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
