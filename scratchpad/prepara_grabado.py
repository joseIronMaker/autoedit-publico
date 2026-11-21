"""Pre-proceso de una grabación de José ANTES de editarla.

Hace dos cosas que tienen que pasar sobre el archivo fuente, no en el ensamblado, para
que la transcripción y los tiempos del guion nazcan ya correctos:

1. PARCHE DE AUDIO: si a la grabación se le cayó el audio un tramo (le pasó al llm.mp4
   entre 121.8 y 123.6 s, con él hablando), se rellena con su voz de ElevenLabs. El texto
   se escribe a mano leyendo lo que dice antes y después del hueco; nunca se inventa un
   dato, solo se reconstruye la frase.
2. VELOCIDAD: sube el ritmo sin cambiar el tono (`atempo` preserva el pitch). Los videos
   grabados salen a ~4 min y el canal mide mejor más cortos.

    .venv/bin/python scratchpad/prepara_grabado.py <stem> --hueco 121.8 123.6 \
        --texto "lo que dijo" --velocidad 1.08
"""
import argparse
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))


def sh(cmd):
    subprocess.run(cmd, check=True)


def dur(p: Path) -> float:
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True).stdout.strip())


def voz(texto: str, destino: Path) -> Path:
    """Genera el parche con la voz clonada y lo deja en wav 48 kHz."""
    from dotenv import load_dotenv
    load_dotenv(RAIZ / ".env")
    from autoedit.config import load_config
    from autoedit.model_router import ModelRouter

    router = ModelRouter(load_config())
    pcm = router._tts_elevenlabs(texto)          # PCM s16le 24 kHz mono
    crudo = destino.with_suffix(".pcm")
    crudo.write_bytes(pcm)
    sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1",
        "-i", str(crudo), "-ar", "48000", "-ac", "2", str(destino)])
    crudo.unlink(missing_ok=True)
    return destino


def parchea(src: Path, ini: float, fin: float, wav: Path, out: Path) -> Path:
    """Sustituye [ini, fin) de la pista de audio por `wav`, calzado a esa duración.

    El video no se toca: se remplaza SOLO el audio, así que la boca sigue donde estaba.
    El parche se estira o encoge con atempo para caber exacto en el hueco.
    """
    hueco = fin - ini
    factor = dur(wav) / hueco                     # >1 = hay que acelerar el parche
    # Guardarraíl estrecho a propósito: la voz clonada habla más lento que José, y a
    # factor 1.9 el parche sale de ardilla. Si no entra, se reescribe el texto.
    if not 0.85 <= factor <= 1.35:
        sys.exit(f"el parche dura {dur(wav):.2f}s para un hueco de {hueco:.2f}s "
                 f"(factor {factor:.2f}): reescribe el texto "
                 f"(~{int(len(texto_ref) / factor)} caracteres)" if False else
                 f"(factor {factor:.2f}): reescribe el texto más corto o más largo")
    # adelay quiere milisegundos enteros; el crossfade de 60 ms evita el clic de empalme
    filtro = (
        f"[0:a]volume=1[orig];"
        f"[orig]asplit=2[a1][a3];"
        f"[a1]atrim=0:{ini},asetpts=N/SR/TB[pre];"
        f"[a3]atrim={fin},asetpts=N/SR/TB[post];"
        f"[1:a]atempo={factor:.6f},asetpts=N/SR/TB,"
        f"afade=t=in:st=0:d=0.06,afade=t=out:st={max(0.0, hueco-0.06):.3f}:d=0.06[patch];"
        f"[pre][patch][post]concat=n=3:v=0:a=1[a]"
    )
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-i", str(wav),
        "-filter_complex", filtro, "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(out)])
    print(f"  · parche de {dur(wav):.2f}s calzado en {hueco:.2f}s (atempo {factor:.3f})")
    return out


def corta(src: Path, huecos: list[tuple[float, float]], out: Path, dis: float = 0.14) -> Path:
    """Quita tramos del video Y del audio, empalmando con una disolvencia corta.

    Se usa cuando a la grabación se le cayó el audio pero la frase queda COMPLETA sin ese
    tramo: rellenar con voz sintética ahí sería inventar palabras que José no dijo. El
    corte a secas se notaría como un brinco de la cara; `xfade` de ~4 frames lo esconde.
    """
    total = dur(src)
    huecos = sorted(huecos)
    trozos = []
    cursor = 0.0
    for ini, fin in huecos:
        if ini > cursor:
            trozos.append((cursor, ini))
        cursor = fin
    if cursor < total:
        trozos.append((cursor, total))
    if len(trozos) < 2:
        sys.exit("nada que cortar")

    v, a_, partes = [], [], []
    for i, (s0, s1) in enumerate(trozos):
        v.append(f"[0:v]trim={s0}:{s1},setpts=N/FRAME_RATE/TB[v{i}]")
        a_.append(f"[0:a]atrim={s0}:{s1},asetpts=N/SR/TB[a{i}]")
    partes += v + a_

    # encadenado: cada xfade se solapa `dis`, así que la duración acumulada le resta dis
    acum = trozos[0][1] - trozos[0][0]
    vprev, aprev = "v0", "a0"
    for i in range(1, len(trozos)):
        off = acum - dis
        partes.append(f"[{vprev}][v{i}]xfade=transition=fade:duration={dis}:offset={off:.4f}[vx{i}]")
        partes.append(f"[{aprev}][a{i}]acrossfade=d={dis}:c1=tri:c2=tri[ax{i}]")
        vprev, aprev = f"vx{i}", f"ax{i}"
        acum += (trozos[i][1] - trozos[i][0]) - dis

    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
        "-filter_complex", ";".join(partes), "-map", f"[{vprev}]", "-map", f"[{aprev}]",
        "-r", "30", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", str(out)])
    quitado = sum(f - i for i, f in huecos)
    print(f"  · {len(huecos)} tramos quitados ({quitado:.2f}s) con disolvencia de {dis*1000:.0f} ms")
    return out


def acelera(src: Path, factor: float, out: Path) -> Path:
    """Sube el ritmo del video y del audio a la vez (atempo NO cambia el tono)."""
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
        "-filter_complex", f"[0:v]setpts=PTS/{factor}[v];[0:a]atempo={factor}[a]",
        "-map", "[v]", "-map", "[a]", "-r", "30",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", str(out)])
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("stem")
    ap.add_argument("--hueco", nargs=2, type=float, metavar=("INI", "FIN"))
    ap.add_argument("--texto", help="lo que dice José en el hueco, reconstruido del contexto")
    ap.add_argument("--velocidad", type=float, default=1.0)
    ap.add_argument("--corta", nargs="+", metavar="INI:FIN",
                    help="tramos a quitar (audio muerto donde la frase queda completa sin él)")
    a = ap.parse_args()

    src = RAIZ / f"{a.stem}.mp4"
    original = RAIZ / f"{a.stem}_original.mp4"
    # el original se aparta la PRIMERA vez; a partir de ahí siempre se parte de él, para
    # que reintentar el parche no vaya encadenando re-encodes sobre re-encodes
    if not original.exists():
        if not src.exists():
            sys.exit(f"no existe {src}")
        src.replace(original)
        print(f"→ original guardado en {original.name}")
    actual = original
    tmp = RAIZ / "scratchpad" / f"_{a.stem}_tmp.mp4"

    print(f"→ {a.stem}: {dur(actual):.1f}s")
    if a.hueco:
        if not a.texto:
            sys.exit("--hueco necesita --texto")
        wav = RAIZ / "scratchpad" / f"_{a.stem}_parche.wav"
        voz(a.texto, wav)
        actual = parchea(actual, a.hueco[0], a.hueco[1], wav, tmp)

    if a.corta:
        pares = [tuple(float(x) for x in t.split(":")) for t in a.corta]
        antes = dur(actual)
        salida = RAIZ / "scratchpad" / f"_{a.stem}_corte.mp4"
        actual = corta(actual, pares, salida)
        print(f"  · corte: {antes:.1f}s → {dur(actual):.1f}s")

    if abs(a.velocidad - 1.0) > 1e-3:
        antes = dur(actual)
        salida = RAIZ / "scratchpad" / f"_{a.stem}_vel.mp4"
        actual = acelera(actual, a.velocidad, salida)
        print(f"  · velocidad ×{a.velocidad}: {antes:.1f}s → {dur(actual):.1f}s")

    if actual != original:
        subprocess.run(["cp", str(actual), str(src)], check=True)
    else:
        subprocess.run(["cp", str(original), str(src)], check=True)
    print(f"→ listo: {src.name} ({dur(src):.1f}s). Ahora toca re-transcribir.")


if __name__ == "__main__":
    main()
