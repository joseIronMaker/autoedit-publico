#!/usr/bin/env python3
"""Puerta de entrega: NINGÚN video se sube sin pasar por aquí.

Cada comprobación de este archivo existe porque un video roto llegó a estar listo para
publicarse y los logs decían OK. Fecha y caso al lado de cada una. Si alguna falla, el
video NO se entrega: se arregla y se vuelve a correr.

    .venv/bin/python scratchpad/verifica_entrega.py gen_astra_milenio
    .venv/bin/python scratchpad/verifica_entrega.py --todos          # los tres de noticias

Salida: una línea por comprobación, y código 1 si alguna es un FALLO.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import yaml

RAIZ = Path(__file__).resolve().parent.parent
VIDEOS = RAIZ / "videos"

# --- umbrales, todos medidos sobre fallos reales ---------------------------------------
PARADO = 0.35          # diff medio entre cuadros a 80x76 gris (regla del proyecto)
MAX_PARADO_ESCENA = 0.60   # el cierre del duelo iba al 0.84 con el clip congelado
MAX_PARADO_VIDEO = 0.45
LUMA_MINIMA = 20.0     # la escena 2 del cybercab congelaba en negro: luma 6
LUMA_AVISO = 28.0
AREA_MINIMA = 0.45     # el 16:9 verticalizado dejaba la imagen real en 0.32 del alto
SUBS_MINIMO = 0.62     # difflib entre lo dicho y lo escrito (render_seguro usa el mismo)

# LOS UMBRALES DEPENDEN DEL TIPO DE ESCENA, o el verificador cría lobos y se ignora: una
# captura de terminal sobre fondo negro es LEGÍTIMAMENTE oscura y casi quieta (el duelo
# marcaba 7 fallos siendo correcto), mientras que un kinetic_video quieto y negro es
# exactamente el fallo del 8-sep. Lo que se revisa por tipo:
#   mira_luz   — ¿tiene sentido exigir que se vea algo? (no en una terminal)
#   mira_mov   — ¿tiene que moverse? (una captura avanza a su ritmo, no al mío)
#   mira_area  — ¿debe llenar el cuadro? (solo donde el fondo es video o foto)
REGLAS = {
    "kinetic_video": {"mira_luz": True,  "mira_mov": True,  "mira_area": True,  "tope_mov": 0.60},
    "image":         {"mira_luz": True,  "mira_mov": True,  "mira_area": True,  "tope_mov": 0.70},
    "veo":           {"mira_luz": True,  "mira_mov": True,  "mira_area": True,  "tope_mov": 0.60},
    "receipt":       {"mira_luz": False, "mira_mov": True,  "mira_area": False, "tope_mov": 0.90},
    "custom":        {"mira_luz": False, "mira_mov": True,  "mira_area": False, "tope_mov": 0.85},
    "diagram":       {"mira_luz": False, "mira_mov": True,  "mira_area": False, "tope_mov": 0.85},
    "kinetic":       {"mira_luz": False, "mira_mov": True,  "mira_area": False, "tope_mov": 0.85},
    "big_text":      {"mira_luz": False, "mira_mov": True,  "mira_area": False, "tope_mov": 0.90},
    # capturas reales: su ritmo lo pone lo grabado, y screen_demo._verifica_captura ya
    # rechaza las tres fallas mudas (pocos cuadros, congelada, en blanco)
    "terminal":      {"mira_luz": False, "mira_mov": False, "mira_area": False, "tope_mov": 1.0},
    "mascota":       {"mira_luz": False, "mira_mov": False, "mira_area": False, "tope_mov": 1.0},
    "screen_demo":   {"mira_luz": False, "mira_mov": False, "mira_area": False, "tope_mov": 1.0},
    "host":          {"mira_luz": False, "mira_mov": False, "mira_area": False, "tope_mov": 1.0},
}
POR_DEFECTO = {"mira_luz": False, "mira_mov": True, "mira_area": False, "tope_mov": 0.90}


def _tipos_de_escena(stem: str) -> list[str]:
    """visual_type de cada escena, en orden, leído del guion que se produjo."""
    g = VIDEOS / f"{stem}.assets" / "guion.json"
    if not g.exists():
        return []
    return [e.get("visual_type", "?") for e in
            json.loads(g.read_text(encoding="utf-8")).get("scenes", [])]

CTA_PROHIBIDO = re.compile(
    r"\b(gu[áa]rdalo|gu[áa]rdate|s[íi]gueme|s[íi]gueme ya|suscr[íi]bete|dale like|"
    r"comenta|dame follow|comp[áa]rtelo)\b", re.I)


class Reporte:
    def __init__(self) -> None:
        self.fallos: list[str] = []
        self.avisos: list[str] = []

    def ok(self, texto: str) -> None:
        print(f"  \033[32m✔\033[0m {texto}")

    def aviso(self, texto: str) -> None:
        print(f"  \033[33m·\033[0m {texto}")
        self.avisos.append(texto)

    def fallo(self, texto: str) -> None:
        print(f"  \033[31m✘ FALLO\033[0m {texto}")
        self.fallos.append(texto)


def _dur(p: Path) -> float | None:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


def _gris(p: Path, t: float, w: int = 80, h: int = 76) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(p), "-frames:v", "1",
         "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.uint8)
    return a.astype(float) if a.size == w * h else np.array([])


# =======================================================================================
# 1. INTEGRIDAD — el final se cortó a media escritura tres veces (7 y 8-sep-2026): el mp4
#    de 300 MB existía y pesaba, pero sin `moov atom` no se abre. El log decía "listo".
# =======================================================================================
def chk_integridad(rep: Reporte, final: Path) -> bool:
    if not final.exists():
        rep.fallo(f"no existe {final.name}")
        return False
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "stream=codec_type,duration", "-of", "csv=p=0", str(final)],
                       capture_output=True, text=True)
    if r.returncode != 0 or "moov atom not found" in (r.stderr or ""):
        rep.fallo(f"{final.name} está CORRUPTO (render cortado a media escritura)")
        return False
    tipos = {ln.split(",")[0] for ln in r.stdout.strip().splitlines() if ln}
    if not {"video", "audio"} <= tipos:
        rep.fallo(f"{final.name} no trae video+audio (tiene: {sorted(tipos)})")
        return False
    rep.ok(f"integridad: {final.name} abre, {_dur(final):.1f}s con video y audio")
    return True


# =======================================================================================
# 2. DURACIÓN vs EDL — la clase 29 salió en 13.8s de 72.6 porque `--render` reusó un edl
#    viejo. OJO: la llave del JSON es `cuts`, no `cortes` (leerla mal me hizo dar por
#    bueno un descuadre el 8-sep).
# =======================================================================================
def chk_duracion(rep: Reporte, stem: str) -> None:
    ens, final = VIDEOS / f"{stem}.mp4", VIDEOS / f"{stem}_final.mp4"
    edl_p = VIDEOS / f"{stem}.autoedit" / "edl.json"
    d_ens, d_fin = _dur(ens), _dur(final)
    if d_ens is None or d_fin is None:
        rep.fallo("no puedo medir ensamblado o final")
        return
    if not edl_p.exists():
        rep.aviso("sin edl.json: no puedo cuadrar la duración")
        return
    edl = json.loads(edl_p.read_text(encoding="utf-8"))
    cortes = [c for c in edl.get("cuts", []) if not c.get("disabled")]
    fuera = sum(c["end"] - c["start"] for c in cortes)
    esperado = d_ens - fuera
    if abs(edl.get("duration", d_ens) - d_ens) > 0.5:
        rep.fallo(f"el edl se calculó sobre otro ensamblado "
                  f"({edl.get('duration'):.1f}s contra {d_ens:.1f}s): corre --auto, no --render")
        return
    if abs(d_fin - esperado) > 1.0:
        rep.fallo(f"duración descuadrada: final {d_fin:.1f}s, esperado {esperado:.1f}s "
                  f"({d_ens:.1f}s menos {fuera:.1f}s de {len(cortes)} cortes)")
        return
    rep.ok(f"duración: {d_fin:.1f}s = {d_ens:.1f}s menos {fuera:.1f}s de silencio "
           f"({len(cortes)} cortes)")


# =======================================================================================
# 3. ENSAMBLADO — dos ensamblados en paralelo se pisaban y el video salía con UNA escena
#    (1-sep-2026), con el log diciendo "✔ ensamblado".
# =======================================================================================
def chk_ensamblado(rep: Reporte, stem: str) -> None:
    assets = VIDEOS / f"{stem}.assets"
    segs = sorted(assets.glob("seg_*.mp4"))
    if not segs:
        rep.aviso("sin segmentos sueltos: no puedo cuadrar el ensamblado")
        return
    suma = sum(_dur(s) or 0 for s in segs)
    d = _dur(VIDEOS / f"{stem}.mp4") or 0
    if abs(d - suma) > 2.0:
        rep.fallo(f"el ensamblado ({d:.1f}s) no cuadra con sus {len(segs)} escenas "
                  f"({suma:.1f}s): faltan escenas")
        return
    rep.ok(f"ensamblado: {d:.1f}s = las {len(segs)} escenas ({suma:.1f}s)")


# =======================================================================================
# 4. PANELES CONGELADOS — un clip de 4.5s en una escena de 30 se queda en el ÚLTIMO
#    CUADRO: 71s de 177 (40%) del cybercab eran una foto fija. Nadie avisa.
# 5. ESCENAS NEGRAS — y si ese último cuadro es negro (luma 6), son 26s de nada.
# =======================================================================================
def chk_escenas(rep: Reporte, stem: str) -> None:
    assets = VIDEOS / f"{stem}.assets"
    segs = sorted(assets.glob("seg_*.mp4"), key=lambda p: int(p.stem.split("_")[1]))
    if not segs:
        rep.aviso("sin segmentos: no reviso congelado ni negros por escena")
        return
    tipos = _tipos_de_escena(stem)
    revisadas, total_par, total_n = 0, 0.0, 0
    for seg in segs:
        i = int(seg.stem.split("_")[1])
        tipo = tipos[i] if i < len(tipos) else "?"
        regla = REGLAS.get(tipo, POR_DEFECTO)
        d = _dur(seg) or 0
        if d < 1:
            continue
        prev, difs, lums = None, [], []
        t = 0.5
        while t < d - 0.3:
            a = _gris(seg, t)
            if a.size == 0:
                break
            lums.append(a.mean())
            if prev is not None:
                difs.append(np.abs(a - prev).mean())
            prev = a
            t += 0.7
        if not difs:
            continue
        par = float((np.array(difs) < PARADO).mean())
        luz = float(np.mean(lums))
        if regla["mira_mov"]:
            total_par += par * len(difs)
            total_n += len(difs)
            revisadas += 1
            if par > regla["tope_mov"]:
                rep.fallo(f"escena {i} ({tipo}): {par*100:.0f}% de cuadros PARADOS en "
                          f"{d:.0f}s (tope {regla['tope_mov']*100:.0f}%) — ¿el clip de "
                          f"fondo dura menos que la escena?")
        if regla["mira_luz"]:
            if luz < LUMA_MINIMA:
                rep.fallo(f"escena {i} ({tipo}): prácticamente NEGRA (luma {luz:.1f} de 255)")
            elif luz < LUMA_AVISO:
                rep.aviso(f"escena {i} ({tipo}): muy oscura (luma {luz:.1f})")
    if total_n:
        glob = total_par / total_n
        if glob > MAX_PARADO_VIDEO:
            rep.fallo(f"las {revisadas} escenas que deben moverse van {glob*100:.0f}% "
                      f"paradas (tope {MAX_PARADO_VIDEO*100:.0f}%)")
        else:
            rep.ok(f"movimiento: {glob*100:.0f}% parado en las {revisadas} escenas que "
                   f"deben moverse (las capturas no cuentan)")
    else:
        rep.ok("movimiento: este video es todo capturas reales, su ritmo lo pone lo grabado")


# =======================================================================================
# 6. ÁREA ÚTIL — un 16:9 verticalizado con relleno deja la imagen REAL en un tercio del
#    alto (cybercab, 8-sep). Se mide contando las filas CON detalle: el relleno
#    desenfocado tiene desviación baja, la imagen nítida no.
# =======================================================================================
def chk_area(rep: Reporte, stem: str) -> None:
    """Cuánto del alto ocupa la imagen con detalle, por escena de fondo visual.

    AVISO Y NO FALLO, a propósito. El defecto real (un 16:9 verticalizado deja la imagen
    en un tercio del alto) y una composición legítimamente oscura dan la MISMA cifra:
    medido, el clip viejo con relleno da 34% y el clip pagado del enjambre —puntos
    blancos sobre negro, a cuadro completo y perfectamente válido— da 39%. Ninguna
    estadística de píxeles los separa, así que aquí se mide, se deja la hoja de contactos
    y decide el ojo. Bloquear con esto sería criar lobos.
    """
    assets = VIDEOS / f"{stem}.assets"
    tipos = _tipos_de_escena(stem)
    candidatas = [i for i, t in enumerate(tipos) if REGLAS.get(t, POR_DEFECTO)["mira_area"]]
    if not candidatas:
        return
    bajas = []
    for i in candidatas:
        seg = assets / f"seg_{i}.mp4"
        d = _dur(seg) or 0
        if not seg.exists() or d < 3:
            continue
        fracs = []
        for t in np.linspace(d * 0.15, d * 0.85, 5):
            raw = subprocess.run(
                ["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(seg), "-frames:v", "1",
                 "-vf", "scale=120:214", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                capture_output=True).stdout
            a = np.frombuffer(raw, dtype=np.uint8)
            if a.size != 120 * 214:
                continue
            img = a.reshape(214, 120).astype(float)
            det = np.abs(np.diff(img, axis=1)).mean(axis=1)
            ref = np.percentile(det, 90)          # relativo: sirve en metraje nocturno
            fracs.append(float((det > max(0.25 * ref, 0.6)).mean()))
        if not fracs:
            continue
        frac = float(np.median(fracs))
        if frac < AREA_MINIMA:
            bajas.append((i, tipos[i], frac))
    if bajas:
        hoja = _hoja_de_contactos(stem, [i for i, _, _ in bajas])
        detalle = ", ".join(f"escena {i} ({t}) {f*100:.0f}%" for i, t, f in bajas)
        rep.aviso(f"poca imagen con detalle: {detalle}. Puede ser un 16:9 con relleno o una "
                  f"composición oscura a propósito — MÍRALO: {hoja}")
    else:
        rep.ok("encuadre: todas las escenas de fondo visual llenan el cuadro")


def _hoja_de_contactos(stem: str, escenas: list[int]) -> str:
    """Tira de cuadros de las escenas dudosas, para mirarlas en vez de creerle a un número."""
    assets = VIDEOS / f"{stem}.assets"
    salida = assets / "_revisar.jpg"
    tmp = assets / "_rev_tmp"
    tmp.mkdir(exist_ok=True)
    n = 0
    for i in escenas:
        seg = assets / f"seg_{i}.mp4"
        d = _dur(seg) or 0
        for t in np.linspace(d * 0.2, d * 0.8, 3):
            subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(seg),
                            "-frames:v", "1", "-vf", "scale=240:-1",
                            str(tmp / f"c_{n:02d}.jpg"), "-y"], capture_output=True)
            n += 1
    if n:
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(tmp / "c_%02d.jpg"),
                        "-filter_complex", f"tile={n}x1:margin=4:padding=3:color=0x101014",
                        "-frames:v", "1", str(salida), "-y"], capture_output=True)
    for f in tmp.glob("*.jpg"):
        f.unlink()
    tmp.rmdir()
    return str(salida)


# =======================================================================================
# 7. FUGA DE PANTALLA — el duelo llevaba una línea de MI conversación con José encima de
#    la ventana del juego (7-sep). Regla: una captura tiene que empezar EN el borde de su
#    ventana; si la barra de título aparece más abajo, lo de arriba es pantalla ajena.
# =======================================================================================
def chk_fuga(rep: Reporte, stem: str) -> None:
    assets = VIDEOS / f"{stem}.assets"
    caps = sorted(assets.glob("cap_*.mp4"))
    caps = [c for c in caps if "_orig" not in c.stem]
    if not caps:
        return
    for cap in caps:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v",
                            "-show_entries", "stream=width,height", "-of", "csv=p=0", str(cap)],
                           capture_output=True, text=True).stdout.strip()
        try:
            w, h = (int(x) for x in r.split(",")[:2])
        except ValueError:
            continue
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", "3", "-i", str(cap), "-frames:v", "1",
             "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
        a = np.frombuffer(raw, dtype=np.uint8)
        if a.size != w * h:
            continue
        img = a.reshape(h, w).astype(float)
        filas = img[:60].mean(axis=1) if h > 60 else img.mean(axis=1)
        barra = next((y for y, v in enumerate(filas) if v > 200), None)
        if barra is None:
            continue                     # ventana sin barra clara: no aplica la regla
        arriba = img[:barra]
        if barra > 3 and arriba.size and arriba.max() > 120:
            rep.fallo(f"{cap.name}: hay contenido AJENO en las {barra} filas de arriba "
                      f"(la barra de la ventana empieza en y={barra}) — ¿se coló la pantalla?")
        else:
            rep.ok(f"{cap.name}: recortada al borde de su ventana (barra en y={barra})")


# =======================================================================================
# 8. SUBTÍTULOS — voz nueva con subtítulos viejos (clase 12) y "ARNEZ" quemado cuatro
#    veces justo en la palabra que el video enseñaba (8-sep).
# =======================================================================================
def chk_subtitulos(rep: Reporte, stem: str) -> None:
    subs = VIDEOS / f"{stem}.autoedit" / "subs_full.ass"
    guion_p = VIDEOS / f"{stem}.assets" / "guion.json"
    if not subs.exists() or not guion_p.exists():
        rep.aviso("sin subs_full.ass o sin guion: no comparo subtítulos")
        return
    dicho = " ".join(e.get("narration", "") for e in
                     json.loads(guion_p.read_text(encoding="utf-8")).get("scenes", []))
    lineas = [ln.split(",", 9)[-1] for ln in subs.read_text(encoding="utf-8").splitlines()
              if ln.startswith("Dialogue:")]
    escrito = re.sub(r"\{[^}]*\}", " ", " ".join(lineas))
    norm = lambda s: re.sub(r"[^a-záéíóúñü ]", " ", s.lower()).split()
    r = difflib.SequenceMatcher(None, norm(dicho), norm(escrito)).ratio()
    if r < SUBS_MINIMO:
        rep.fallo(f"los subtítulos no dicen lo que dice la voz (parecido {r:.2f}, "
                  f"mínimo {SUBS_MINIMO}): ¿edl o transcripción viejos?")
    else:
        rep.ok(f"subtítulos: coinciden con el guion al {r:.2f}")

    cfg = yaml.safe_load((RAIZ / "config.yaml").read_text(encoding="utf-8"))
    malas = (cfg.get("whisper") or {}).get("correcciones") or {}
    # Solo se buscan las reglas que cambian LETRAS ("cerres" -> "erres"). Las que solo
    # arreglan mayúsculas ("epoch ai" -> "Epoch AI") no se pueden comprobar aquí: los
    # subtítulos van en mayúsculas por diseño, así que el texto correcto y el incorrecto
    # se ven igual y la comprobación daba un falso positivo sobre un video correcto.
    quemadas = [malo for malo, bueno in malas.items()
                if malo.lower() != str(bueno).lower()
                and re.search(rf"\b{re.escape(malo)}\b", escrito, re.I)]
    if quemadas:
        rep.fallo(f"errores de vocabulario QUEMADOS en los subtítulos: {quemadas} "
                  f"(están en config.whisper.correcciones y no se aplicaron)")


# =======================================================================================
# 9. CTA DIRECTO — TikTok penaliza el imperativo (−15%); es mandato de José desde julio.
# =======================================================================================
def chk_cta(rep: Reporte, stem: str) -> None:
    textos = []
    g = VIDEOS / f"{stem}.assets" / "guion.json"
    if g.exists():
        textos += [e.get("narration", "") for e in
                   json.loads(g.read_text(encoding="utf-8")).get("scenes", [])]
    copy = VIDEOS / f"{stem}.autoedit" / "copy_tiktok.txt"
    if copy.exists():
        textos.append(copy.read_text(encoding="utf-8"))
    encontrados = sorted({m.group(0).lower() for t in textos
                          for m in CTA_PROHIBIDO.finditer(t)})
    if encontrados:
        rep.fallo(f"CTA directo en narración o copy: {encontrados}")
    else:
        rep.ok("CTA implícito: sin imperativos prohibidos")


# =======================================================================================
# 10. CAMA MUSICAL — 15 videos seguidos con el mismo bed_techno (José, 8-sep: "cámbiale a
#     tu pinche canción"). Cada video debe traer la suya y no repetir la del anterior.
# =======================================================================================
def chk_musica(rep: Reporte, stem: str) -> None:
    propia = VIDEOS / f"{stem}.assets" / "music.m4a"
    if not propia.exists():
        # aviso y no fallo: el video no está ROTO, solo suena como los otros quince. Los
        # producidos antes del 8-sep no la tienen y no vale re-renderizarlos por eso.
        rep.aviso("sin cama propia: usa la global (generate.music_generated ya está en true "
                  "para los nuevos)")
        return
    mio = hashlib.md5(propia.read_bytes()).hexdigest()
    iguales = [p.parent.name for p in VIDEOS.glob("gen_*.assets/music.m4a")
               if p != propia and hashlib.md5(p.read_bytes()).hexdigest() == mio]
    if iguales:
        rep.fallo(f"la cama es IDÉNTICA a la de {iguales[:3]}: 15 videos con la misma "
                  f"canción fue queja de José el 8-sep")
    else:
        rep.ok(f"música: cama propia ({propia.stat().st_size//1024} KB), distinta a las demás")


def revisa(stem: str) -> bool:
    print(f"\n\033[1m=== {stem} ===\033[0m")
    rep = Reporte()
    final = VIDEOS / f"{stem}_final.mp4"
    if chk_integridad(rep, final):
        chk_duracion(rep, stem)
        chk_ensamblado(rep, stem)
        chk_escenas(rep, stem)
        chk_area(rep, stem)
        chk_fuga(rep, stem)
        chk_subtitulos(rep, stem)
        chk_cta(rep, stem)
        chk_musica(rep, stem)
    if rep.fallos:
        print(f"\n  \033[31m{len(rep.fallos)} FALLO(S): este video NO se entrega.\033[0m")
    else:
        print(f"\n  \033[32mAPTO para entregar\033[0m"
              + (f" ({len(rep.avisos)} aviso(s) que conviene mirar)" if rep.avisos else ""))
    return not rep.fallos


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("stems", nargs="*")
    ap.add_argument("--todos", action="store_true",
                    help="los tres videos de noticias")
    a = ap.parse_args()
    stems = a.stems or ([] if not a.todos else
                        ["gen_astra_milenio", "gen_duelo_codex_astra",
                         "gen_cybercab_sin_volante"])
    if not stems:
        ap.error("dime qué stem revisar, o --todos")
    sys.exit(0 if all([revisa(s) for s in stems]) else 1)


if __name__ == "__main__":
    main()
