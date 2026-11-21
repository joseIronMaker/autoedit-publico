"""Prepara una reparación QUIRÚRGICA de los videos ya producidos de la serie 2.

Toma el guion ARCHIVADO de cada video (el que ya pasó por el motor de hooks, para que
el video no cambie de cold-open), le aplica las correcciones del guion fuente y siembra
las firmas de caché: así el re-render solo rehace las escenas rotas y no vuelve a pagar
ElevenLabs, D-ID ni Omni en las que ya estaban bien.

    .venv/bin/python scratchpad/reparar_serie2.py            # solo reporta
    .venv/bin/python scratchpad/reparar_serie2.py --aplicar  # siembra las firmas
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from autoedit.generate import _normalizar_diagrama          # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
GUIONES = RAIZ / "scratchpad" / "guiones_serie2"
REPARADOS = RAIZ / "scratchpad" / "guiones_reparados"
MAX_COL_EDITOR = 43        # más largo que esto, el editor cortaba texto a la derecha
# defectos vistos a ojo en la tira de QC que ningún chequeo automático detecta
A_OJO = {   # (ln01, ln02, ln13 y ln15 ya verificados: fuera de la lista)
    # ln05 (backprop reescalado) ya verificado en la ronda 1
    # el beat terminal reventaba en Remotion (lines de texto vs objetos) y caía a
    # big_text: justo la tarjeta de texto plano que el canal no quiere
}


def firma_escena(scene: dict, theme: str) -> str:
    return hashlib.sha1(
        (json.dumps(scene, ensure_ascii=False, sort_keys=True) + str(theme)
         ).encode("utf-8")).hexdigest()


def correcciones(fuente: dict, arch: dict) -> dict:
    """Copia al guion archivado los bloques corregidos del guion fuente (por narración)."""
    por_narr = {s["narration"]: s for s in fuente["scenes"]}
    for pos, s in enumerate(arch["scenes"]):
        src = por_narr.get(s.get("narration"))
        if not src:
            continue                       # escena que el motor de hooks reescribió
        # Si la escena CAMBIÓ DE TIPO (p. ej. diagram de tarjetas → animación dibujada),
        # copiar bloques sueltos no basta: el guion archivado seguía siendo 'diagram' y
        # el re-render volvía a sacar las tarjetas (30-jul, ln04). Se reemplaza entera.
        if src.get("visual_type") != s.get("visual_type"):
            arch["scenes"][pos] = json.loads(json.dumps(src))
            continue
        for campo in ("diagram", "ml_demo", "custom_anim", "receipt", "kinetic_video",
                      "terminal", "kinetic", "big_text", "showcase", "host_top"):
            if campo in src and campo in s:
                s[campo] = json.loads(json.dumps(src[campo]))
        if s.get("visual_type") == "diagram" and s.get("diagram"):
            s["diagram"] = _normalizar_diagrama(s["diagram"])
    arch["hook_locked"] = True             # reparación: NO rediseñar el cold-open
    return arch


def main() -> None:
    aplicar = "--aplicar" in sys.argv
    REPARADOS.mkdir(exist_ok=True)
    total_rehacer = 0
    for gp in sorted(GUIONES.glob("ln*.json")):
        fuente = json.loads(gp.read_text(encoding="utf-8"))
        assets = RAIZ / "videos" / f"gen_{fuente['slug']}.assets"
        arch_p = assets / "guion.json"
        if not arch_p.exists():
            print(f"{gp.name[:4]}  (sin producir todavía)")
            continue
        arch = correcciones(fuente, json.loads(arch_p.read_text(encoding="utf-8")))
        viejo = json.loads(arch_p.read_text(encoding="utf-8"))
        theme = arch.get("theme")
        escenas = [s for s in arch["scenes"] if s.get("narration")]
        v_esc = [s for s in viejo["scenes"] if s.get("narration")]

        rehacer = [(i, m) for i, m in A_OJO.get(gp.name[:4], ())]
        for i, s in enumerate(escenas):
            if any(i == j for j, _ in rehacer):
                continue
            antes = v_esc[i] if i < len(v_esc) else {}
            if json.dumps(s, sort_keys=True) != json.dumps(antes, sort_keys=True):
                rehacer.append((i, "contenido corregido"))
                continue
            # (el corte de código a la derecha ya lo resuelve ml_demo._editor_size:
            #  encoge la letra hasta que la línea más larga cabe. Ya no hay que
            #  rehacer nada por eso — se dejó el umbral solo como referencia)
        total_rehacer += len(rehacer)
        det = ", ".join(f"escena {i + 1} ({m})" for i, m in rehacer) or "nada que rehacer"
        print(f"{gp.name[:4]}  {det}")

        if not aplicar:
            continue
        destino = REPARADOS / gp.name
        destino.write_text(json.dumps(arch, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
        if not rehacer:
            continue
        # voz ya pagada: firmada para que no se vuelva a sintetizar
        (assets / "voz.sha1").write_text(hashlib.sha1(
            "␟".join(s["narration"] for s in escenas).encode("utf-8")).hexdigest())
        idx_rehacer = {i for i, _ in rehacer}
        for i in idx_rehacer:
            # si cambió el prompt del clip Omni, el mp4 cacheado ya no sirve
            def _vp(sc):
                b = (sc or {}).get("kinetic_video") or (sc or {}).get("veo") or {}
                return b.get("veo_prompt") or b.get("prompt")
            if i < len(v_esc) and _vp(escenas[i]) != _vp(v_esc[i]):
                (assets / f"veo_{i}.mp4").unlink(missing_ok=True)
                print(f"      (borro veo_{i}.mp4: el prompt del clip cambió)")
        for i, s in enumerate(escenas):
            f = assets / f"seg_{i}.sha1"
            if i in idx_rehacer:
                f.unlink(missing_ok=True)          # cache miss → se vuelve a renderizar
            else:
                f.write_text(firma_escena(s, theme))
        (RAIZ / "videos" / f"gen_{fuente['slug']}.mp4").unlink(missing_ok=True)
        (RAIZ / "videos" / f"gen_{fuente['slug']}_final.mp4").unlink(missing_ok=True)

    print(f"\n{total_rehacer} escenas a rehacer"
          + ("" if aplicar else "  (corre con --aplicar para sembrar las firmas)"))


if __name__ == "__main__":
    main()
