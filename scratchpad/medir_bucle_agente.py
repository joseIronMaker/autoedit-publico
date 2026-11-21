"""¿Cuántas vueltas da un agente por UNA tarea, y qué cuesta? Recibo del video ag02.

El diseño original decía "96 vueltas" y el crítico del workflow lo tumbó con aritmética:
hay eventos `token_count` DUPLICADOS (mismo total acumulado dos veces), así que contar
esos eventos infla el número. Aquí las vueltas se cuentan desde lo que el agente
REALMENTE hizo —las llamadas a herramienta de `response_items`— y los tokens se toman
del último `total_token_usage`, que ya es acumulado y no se suma a mano.

También separa el `wait` (sondear un proceso en segundo plano) del resto: 82 de 94
llamadas de aquella sesión eran eso, y llamarlas "vueltas de razonamiento" era falso.

PRIVACIDAD: no se vuelca el contenido de ningún mensaje ni ruta. Solo se cuentan eventos
y se agrupan por NOMBRE de herramienta.

    .venv/bin/python scratchpad/medir_bucle_agente.py [n_sesiones]
"""
import collections
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SESIONES = Path.home() / ".codex" / "sessions"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 40

# precios de lista de gpt-5-codex (USD por millón de tokens), declarados aquí porque el
# recibo tiene que poder recalcularse: entrada / entrada cacheada / salida
PRECIO_IN, PRECIO_CACHE, PRECIO_OUT = 1.25, 0.125, 10.0


def lee(p: Path) -> dict | None:
    llamadas = collections.Counter()
    ultimo_uso = None
    turnos_usuario = 0
    for linea in p.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            o = json.loads(linea)
        except Exception:  # noqa: BLE001
            continue
        tipo = o.get("type")
        if tipo == "event_msg" and (o.get("payload") or {}).get("type") == "token_count":
            info = (o["payload"].get("info") or {}).get("total_token_usage")
            if info:
                ultimo_uso = info          # es ACUMULADO: se toma el último, no se suma
        item = o.get("payload") if tipo == "response_item" else None
        if isinstance(item, dict):
            t = item.get("type")
            if t in ("function_call", "custom_tool_call", "local_shell_call"):
                nombre = item.get("name") or t
                llamadas[nombre] += 1
            elif t == "message" and item.get("role") == "user":
                turnos_usuario += 1
    if not ultimo_uso or not llamadas:
        return None
    tot = sum(llamadas.values())
    espera = sum(v for k, v in llamadas.items() if "wait" in k.lower())
    ent = ultimo_uso.get("input_tokens", 0)
    cache = ultimo_uso.get("cached_input_tokens", 0)
    sal = ultimo_uso.get("output_tokens", 0)
    frescos = max(0, ent - cache)
    costo = (frescos * PRECIO_IN + cache * PRECIO_CACHE + sal * PRECIO_OUT) / 1e6
    return {"llamadas": tot, "esperas": espera, "trabajo": tot - espera,
            "turnos_usuario": turnos_usuario, "entrada": ent, "cacheada": cache,
            "salida": sal, "costo_usd": round(costo, 4),
            "top": llamadas.most_common(5)}


def main() -> None:
    archivos = sorted(SESIONES.rglob("*.jsonl"), key=lambda p: p.stat().st_size,
                      reverse=True)[:N]
    sesiones = []
    for p in archivos:
        d = lee(p)
        if d:
            sesiones.append(d)
    sesiones.sort(key=lambda d: d["llamadas"], reverse=True)
    peor = sesiones[0]
    tot_llamadas = sum(s["llamadas"] for s in sesiones)
    tot_esperas = sum(s["esperas"] for s in sesiones)
    out = {"tema": "cuantas vueltas da un agente por una tarea y que cuesta",
           "herramienta": "Codex CLI (bitacoras reales de ~/.codex/sessions)",
           "sesiones_analizadas": len(sesiones),
           "precios_usd_por_millon": {"entrada": PRECIO_IN, "entrada_cacheada": PRECIO_CACHE,
                                      "salida": PRECIO_OUT},
           "agregado": {"llamadas": tot_llamadas, "esperas": tot_esperas,
                        "trabajo": tot_llamadas - tot_esperas,
                        "pct_espera": round(100.0 * tot_esperas / tot_llamadas, 1),
                        "costo_usd": round(sum(s["costo_usd"] for s in sesiones), 3)},
           "sesion_mas_larga": peor,
           "distribucion_llamadas": sorted(s["llamadas"] for s in sesiones)}
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/bucle_agente.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out["agregado"], ensure_ascii=False))
    print("la más larga:", json.dumps({k: peor[k] for k in
          ("llamadas", "esperas", "trabajo", "entrada", "salida", "costo_usd")}))
    print("→ mediciones/bucle_agente.json")


if __name__ == "__main__":
    main()
