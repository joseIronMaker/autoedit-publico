from __future__ import annotations

from pathlib import Path

# Estilo viral 2026 (Hormozi/Submagic): display pesada MAYÚSCULAS, contorno grueso + sombra,
# palabra ACTIVA resaltada en amarillo, aparición con rebote. Colores ASS en formato BGR.
ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{size},&H00{base},&H00{base},&H00{outline_color},&H90000000,{bold},0,0,0,100,100,0,0,1,{outline},{shadow},2,60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def _ts(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int(seconds % 3600 // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _esc(text: str, upper: bool) -> str:
    text = text.replace("{", "(").replace("}", ")").replace("\\", "")
    return text.upper() if upper else text


def _group_words(words: list[dict], scfg: dict) -> list[list[dict]]:
    groups: list[list[dict]] = []
    cur: list[dict] = []
    for w in words:
        prev_word = cur[-1]["word"].rstrip() if cur else ""
        prev_sentence_end = prev_word.endswith((".", "!", "?", "…", ":"))
        if cur and (
            len(cur) >= scfg["max_words"]
            or w["start"] - cur[-1]["end"] > scfg["max_gap"]
            or w["end"] - cur[0]["start"] > scfg["max_duration"]
            or w.get("cut_start")   # frontera de corte del EDL = grupo nuevo siempre
            or prev_sentence_end    # tras punto/signo final = oración nueva = grupo nuevo
        ):
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    return groups


def build_ass(words: list[dict], width: int, height: int, cfg: dict, out_path: Path) -> Path:
    """Genera subtítulos ASS estilo viral: la palabra que se dice se ilumina en amarillo,
    aparición con rebote. `words` con timestamps YA remapeados; cada palabra puede traer emphasis.
    """
    scfg = cfg["subtitles"]
    # compat: acepta claves nuevas (base/highlight) o las viejas (secondary/primary)
    base = scfg.get("base_color", scfg.get("secondary_color", "FFFFFF"))
    hl = scfg.get("highlight_color", scfg.get("primary_color", "04C2F7"))
    upper = scfg.get("uppercase", False)
    pop = scfg.get("pop", False)

    header = ASS_HEADER.format(
        width=width, height=height,
        font=scfg["font"], size=int(height * scfg["size_ratio"]),
        base=base, outline_color=scfg["outline_color"],
        bold=-1 if scfg.get("bold") else 0,
        outline=scfg["outline"], shadow=scfg.get("shadow", 1),
        margin_v=int(height * scfg["margin_v_ratio"]),
    )

    lines: list[str] = []
    groups = _group_words(words, scfg)
    for gi, group in enumerate(groups):
        line_start = group[0]["start"]
        end = group[-1]["end"] + 0.10
        # NUNCA solapar con el siguiente grupo: el texto encimado sale como "basura"
        # (dos líneas de karaoke a la vez en la frontera de escena/grupo). El fin de este
        # grupo se recorta para terminar antes de que empiece el próximo.
        if gi + 1 < len(groups):
            end = min(end, groups[gi + 1][0]["start"] - 0.02)
        if end <= line_start:
            end = line_start + 0.20
        # aparición: fade + rebote sutil de escala de toda la línea
        prefix = "{\\fad(50,40)"
        if pop:
            prefix += "\\fscx100\\fscy100\\t(0,110,\\fscx108\\fscy108)\\t(110,220,\\fscx100\\fscy100)"
        prefix += "}"

        parts: list[str] = []
        for w in group:
            ws = max(0, int((w["start"] - line_start) * 1000))
            we = max(ws + 40, int((w["end"] - line_start) * 1000))
            token = _esc(w["word"], upper)
            if w.get("emphasis"):
                # keyword: siempre amarilla + un punto más grande
                parts.append(f"{{\\1c&H{hl}&\\fscx106\\fscy106}}{token}{{\\1c&H{base}&\\fscx100\\fscy100}}")
            else:
                # palabra normal: blanca; se ilumina en amarillo mientras se dice, luego vuelve
                parts.append(
                    f"{{\\1c&H{base}&\\t({ws},{ws+70},\\1c&H{hl}&)\\t({we},{we+110},\\1c&H{base}&)}}{token}"
                )
        text = prefix + " ".join(parts)
        lines.append(f"Dialogue: 0,{_ts(line_start)},{_ts(end)},Cap,,0,0,0,,{text}")

    out_path.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return out_path
