#!/usr/bin/env python3
"""Repara el ARRANQUE de una pieza de «PCB con IA» sin volver a cortar ni a quemar nada.

Las partes 1-4 publicadas el 13/14-oct se quedaron en 3-5 vistas y en las que sí circularon
(CAD) la mayoría se iba en 0:01: abrían a media frase con la pantalla diminuta. Aquí cada
pieza abre con un gancho de ~3-6 s y luego entra ENTERA desde una frase limpia:

  · arriba (y 0→825): la placa 3D TERMINADA, recortada de p12 y ampliada, con titular;
  · abajo (y 825→1920): subtítulos + cara de José del instante del gancho, con su voz.

Todo sale de piezas ya barridas por OCR (las tapas de privacidad van dentro), así que no
hace falta otro barrido; el único texto nuevo es el titular.

Cada tramo entra por su PROPIO `-ss … -i` — nunca `split` de una sola entrada: el gancho
de p01 está en el segundo 125 y la pieza arranca en 0, y un split guardaría en RAM los
125 s de cuadros que el concat todavía no pide (la lección de los 15 GB del 30-ago).

    .venv/bin/python scratchpad/_j1011/gancho.py p01_pcb_con_ia_dimmer [--solo-gancho]
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
PIEZAS = AQUI / "piezas"
SALIDA = AQUI / "piezas_v2"
COPYS, COPYS2 = AQUI / "copys", AQUI / "copys_v2"
PLACA = PIEZAS / "p12_una_hora_ruteando.mp4"
WHOOSH = Path("/home/jose/tiktok/autoedit/assets/sfx/whoosh.mp3")
FUENTE = "/home/jose/.fonts/Anton-Regular.ttf"
SPEC = json.loads((AQUI / "ganchos.json").read_text(encoding="utf-8"))

# geometría de ESTA grabación: pantalla y 213→825, banda de subtítulos 825→1022, cara abajo
CORTE_SUP = 824                        # par: yuv420 no admite 825 (la banda empieza en 825)
LIENZO_3D = (780, 522, 145, 263)       # w, h, x, y del visor 3D dentro de la pantalla
ALTO_PLACA = 722                       # 780×522 → 1080×722, pegada al borde inferior (y 102→824)
AMARILLO, BLANCO = (255, 204, 0, 255), (255, 255, 255, 255)


def norm(w: str) -> str:
    return re.sub(r"[^\wáéíóúñü]", "", w.lower())


def busca(palabras: list[dict], frase: str) -> tuple[int, int]:
    """Índices (primera, última) de la frase exacta dentro de la lista de palabras."""
    # se compara la frase PEGADA, no palabra a palabra: Whisper deja tokens como «3 MIL 800»
    toks = [norm(w["word"]) for w in palabras]
    objetivo = "".join(norm(t) for t in frase.split())
    for i in range(len(toks)):
        acc = ""
        for j in range(i, len(toks)):
            acc += toks[j]
            if acc == objetivo and toks[i]:
                return i, j
            if not objetivo.startswith(acc):
                break
    raise SystemExit(f"no encuentro la frase: «{frase}»")


def tarjetas(ass: Path) -> list[tuple[float, float]]:
    def seg(t: str) -> float:
        h, m, x = t.split(":")
        return int(h) * 3600 + int(m) * 60 + float(x)
    return [(seg(l.split(",")[1]), seg(l.split(",")[2]))
            for l in ass.read_text(encoding="utf-8").splitlines() if l.startswith("Dialogue:")]


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)


def titular(texto: str, destino: Path) -> Path:
    """PNG 1080×825 transparente: degradado oscuro arriba + titular en 2 líneas (Anton)."""
    img = Image.new("RGBA", (1080, CORTE_SUP), (0, 0, 0, 0))
    grad = Image.new("L", (1, CORTE_SUP))
    for y in range(CORTE_SUP):        # negro sólido hasta 102 (sobre el relleno), luego se desvanece
        grad.putpixel((0, y), 235 if y < 140 else max(0, int(235 * (1 - (y - 140) / 330))))
    img.paste(Image.new("RGBA", (1080, CORTE_SUP), (0, 0, 0, 255)), (0, 0), grad.resize((1080, CORTE_SUP)))
    d = ImageDraw.Draw(img)
    lineas = texto.split("|")
    # el tamaño se ajusta a la línea más larga: 960 px útiles, tope 118
    tam = 118
    while tam > 60:
        f = ImageFont.truetype(FUENTE, tam)
        if max(d.textlength(l.replace("*", ""), font=f) for l in lineas) <= 960:
            break
        tam -= 4
    f = ImageFont.truetype(FUENTE, tam)
    y = 150                            # TikTok tapa ~0-130 con «Siguiendo | Para ti»
    for l in lineas:
        trozos = re.split(r"(\*[^*]+\*)", l)
        ancho = sum(d.textlength(t.strip("*"), font=f) for t in trozos)
        x = (1080 - ancho) / 2
        for t in trozos:
            if not t:
                continue
            color = AMARILLO if t.startswith("*") else BLANCO
            t = t.strip("*")
            d.text((x, y), t, font=f, fill=color, stroke_width=7, stroke_fill=(0, 0, 0, 255))
            x += d.textlength(t, font=f)
        y += int(tam * 1.12)
    img.save(destino)
    return destino


def copy_v2(pid: str, n: int, primera: str) -> Path:
    """Copy sin «PCB con IA, parte N:» delante (quien no vio la parte 1 se iba): la primera
    línea se entiende sola y la serie va al final, justo antes de la pregunta A-o-B."""
    viejo = (COPYS / f"{pid[:3]}_copy_tiktok.txt").read_text(encoding="utf-8").strip()
    lineas = viejo.split("\n")
    cuerpo, pregunta = "\n".join(lineas[1:-1]).strip(), lineas[-1].strip()
    nuevo = f"{primera}\n\n{cuerpo}\n\nParte {n} de 14 de la serie «PCB con IA».\n\n{pregunta}\n"
    COPYS2.mkdir(exist_ok=True)
    destino = COPYS2 / f"{pid[:3]}_copy_tiktok.txt"
    destino.write_text(nuevo, encoding="utf-8")
    return destino


def main() -> None:
    pid = sys.argv[1]
    s = SPEC[pid]
    n = int(pid[1:3])
    mp4 = PIEZAS / f"{pid}.mp4"
    palabras = json.loads((PIEZAS / f"{pid}_palabras.json").read_text(encoding="utf-8"))

    i, j = busca(palabras, s["gancho"])
    a = max(0.0, palabras[i]["start"] - 0.12)
    # el cuadro 0 es la PORTADA: si cae en la cola de la tarjeta anterior se ve «DIMMER.» o
    # «PLACA.» de otra frase. Se arranca justo donde empieza la tarjeta de la primera palabra.
    for ini, fin_ in tarjetas(PIEZAS / f"{pid}.ass"):
        if ini <= palabras[i]["start"] + 0.02 < fin_:
            a = ini + 0.01
            break
    fin = palabras[j]["end"]
    sig = palabras[j + 1]["start"] if j + 1 < len(palabras) else fin + 1
    b = min(fin + 0.35, max(fin + 0.05, sig - 0.03))
    dg = b - a
    t0 = 0.0
    if s["inicio"]:
        k, _ = busca(palabras, s["inicio"])
        t0 = max(0.0, palabras[k]["start"] - 0.08)
        # el subtítulo quemado va en grupos de ≤3 palabras: si la frase limpia cae a media
        # tarjeta, se veía «ENTONCES, nosotros…» sin oír «entonces». Se retrocede al inicio
        # de la tarjeta (a lo sumo dos palabras de muletilla, que sí se oyen y se leen igual).
        for ini, fin_ in tarjetas(PIEZAS / f"{pid}.ass"):
            if ini <= palabras[k]["start"] + 0.02 < fin_:
                t0 = max(0.0, min(t0, ini - 0.05))
                break
    total = dur(mp4)
    print(f"{pid}: gancho {a:.2f}-{b:.2f} ({dg:.1f}s) · pieza desde {t0:.2f} · "
          f"queda {dg + total - t0:.1f}s (antes {total:.1f}s)", flush=True)

    SALIDA.mkdir(exist_ok=True)
    png = titular(s["titular"], SALIDA / f"_{pid}_titular.png")
    copy = copy_v2(pid, n, s["copy1"])
    out = SALIDA / f"{pid}.mp4"
    tmp = SALIDA / f"_{pid}.tmp.mp4"
    w, h, x, y = LIENZO_3D
    fc = (
        f"[2:v]crop={w}:{h}:{x}:{y},scale=1080:{ALTO_PLACA},setsar=1,"
        f"pad=1080:{CORTE_SUP}:0:{CORTE_SUP - ALTO_PLACA}:black,format=yuv420p[placa];"
        f"[3:v]format=rgba[tit];"   # sin fundido: el cuadro 0 es la portada
        f"[placa][tit]overlay=0:0:shortest=1[sup];"
        f"[0:v]crop=1080:{1920 - CORTE_SUP}:0:{CORTE_SUP},setsar=1[inf];"
        f"[sup][inf]vstack=inputs=2,fps=30,format=yuv420p,setsar=1,setpts=PTS-STARTPTS[gv];"
        f"[0:a]aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.04,"
        f"afade=t=out:st={dg - 0.08:.3f}:d=0.08,asetpts=PTS-STARTPTS[ga];"
        f"[1:v]fps=30,format=yuv420p,setsar=1,setpts=PTS-STARTPTS[pv];"
        f"[1:a]aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.04,asetpts=PTS-STARTPTS[pa];"
        f"[gv][ga][pv][pa]concat=n=2:v=1:a=1[v][mezcla];"
        f"[4:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.55,"
        f"adelay={int((dg - 0.18) * 1000)}|{int((dg - 0.18) * 1000)}[wh];"
        f"[mezcla][wh]amix=inputs=2:duration=first:normalize=0[aud]"
    )
    cmd = ["ffmpeg", "-v", "error", "-stats", "-y",
           "-ss", f"{a:.3f}", "-t", f"{dg:.3f}", "-i", str(mp4),
           "-ss", f"{t0:.3f}", "-i", str(mp4),
           "-ss", str(s["placa"]), "-t", f"{dg:.3f}", "-i", str(PLACA),
           "-loop", "1", "-framerate", "30", "-t", f"{dg:.3f}", "-i", str(png),
           "-i", str(WHOOSH),
           "-filter_complex", fc, "-map", "[v]", "-map", "[aud]",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart"]
    if "--solo-gancho" in sys.argv:
        cmd += ["-t", f"{dg + 4:.2f}"]
    subprocess.run(cmd + [str(tmp)], check=True)
    tmp.replace(out)                   # nunca dejar un mp4 a medio escribir con el nombre final
    esperado = dg + total - t0
    real = dur(out)
    estado = "OK" if "--solo-gancho" in sys.argv or abs(real - esperado) < 0.4 else "DESCUADRE"
    print(f"{estado} {out.name}: {real:.1f}s (esperado {esperado:.1f}) · copy → {copy.name}", flush=True)
    json.dump({"a": a, "b": b, "t0": t0, "dur": real}, open(SALIDA / f"_{pid}.json", "w"))


if __name__ == "__main__":
    main()
