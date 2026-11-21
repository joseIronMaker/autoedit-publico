"""¿Cuántas veces se le vació la memoria al agente, y quién la vació? Recibo del video ag03.

El diseño original decía "15 compactaciones automáticas" y el crítico lo tumbó: el conteo
real de marcadores en el JSONL da 12, y las 3 de diferencia salían de un heurístico con
dos umbrales ajustados hasta que el número cuadrara. Aquí no hay heurístico: se cuentan
los marcadores que el propio archivo escribe, y se SEPARA quién disparó cada corte —el
usuario con /compact, o el sistema al llenarse. Esa separación es el hallazgo honesto y
además es mejor titular.

PRIVACIDAD: no se lee ni se vuelca el contenido de ningún mensaje. Solo se cuentan
marcadores y se leen los contadores de tokens.

    .venv/bin/python scratchpad/medir_memoria_agente.py [ruta.jsonl]
"""
import json
import sys
from pathlib import Path

PROY = Path.home() / ".claude" / "projects" / "-home-jose-tiktok"


def sesion_mas_grande() -> Path:
    cand = sorted(PROY.glob("*.jsonl"), key=lambda p: p.stat().st_size, reverse=True)
    if not cand:
        sys.exit("no encuentro sesiones de Claude Code")
    return cand[0]


def main() -> None:
    p = Path(sys.argv[1]) if len(sys.argv) > 1 else sesion_mas_grande()
    manuales = automaticos = turnos = 0
    picos = []
    ctx = 0
    for linea in p.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            o = json.loads(linea)
        except Exception:  # noqa: BLE001
            continue
        # el resumen de compactacion viene marcado por el propio archivo
        if o.get("isCompactSummary"):
            automaticos += 1
            picos.append(ctx)
            ctx = 0
            continue
        txt = json.dumps(o.get("message", {}), ensure_ascii=False)[:400]
        if "command-name>/compact" in txt:
            manuales += 1
            automaticos = max(0, automaticos - 1)   # ese corte lo pedi yo, no se lleno
        u = (o.get("message") or {}).get("usage") or {}
        if u:
            turnos += 1
            ctx = max(ctx, (u.get("input_tokens", 0) or 0)
                      + (u.get("cache_read_input_tokens", 0) or 0)
                      + (u.get("cache_creation_input_tokens", 0) or 0))
    out = {"tema": "cuantas veces se vacio la memoria del agente y quien la vacio",
           "sesion": p.name, "bytes": p.stat().st_size, "turnos_con_uso": turnos,
           "cortes": {"totales": automaticos + manuales,
                      "los_pedi_yo": manuales, "se_lleno_sola": automaticos},
           "pico_de_contexto": max(picos) if picos else ctx,
           "picos_por_corte": picos}
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/memoria_agente.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: out[k] for k in ("sesion", "turnos_con_uso", "cortes",
                                          "pico_de_contexto")}, ensure_ascii=False))
    print("→ mediciones/memoria_agente.json")


if __name__ == "__main__":
    main()
