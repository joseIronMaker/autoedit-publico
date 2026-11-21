"""¿A cuántas cosas le dijiste que sí a tu agente, y a cuántas que no? Recibo del video ag01.

Cuenta las reglas de permiso REALES de esta máquina. El crítico del workflow tumbó la
versión anterior de este dato por tres motivos, y los tres están corregidos aquí:
  - decía "148" y ese es solo el archivo del proyecto; hay un SEGUNDO settings.local.json
    global con 24 reglas más. El total es 172.
  - decía "permisos sobre mis archivos" y el desglose real es otra cosa: la mayoría son
    comandos de shell, y 52 son de leer páginas web.
  - decía "cero prohibiciones" como si fuera un cero mostrable. No lo es: la clave `deny`
    NO EXISTE en ninguno de los dos archivos. Es una ausencia, y así hay que decirlo.

PRIVACIDAD: se cuentan reglas y se agrupan por herramienta. NUNCA se vuelca el texto de
las reglas, que trae rutas y comandos del proyecto de José.

    .venv/bin/python scratchpad/medir_permisos.py
"""
import collections
import json
from pathlib import Path

ARCHIVOS = [Path("/home/jose/tiktok/.claude/settings.local.json"),
            Path.home() / ".claude" / "settings.local.json"]


def main() -> None:
    out = {"tema": "cuantas veces le dije que si a mi agente y cuantas que no",
           "archivos": [], "por_herramienta": {}, "totales": {}}
    por_tool = collections.Counter()
    allow = deny = ask = 0
    for p in ARCHIVOS:
        if not p.exists():
            continue
        perm = json.loads(p.read_text(encoding="utf-8")).get("permissions", {})
        allow += len(perm.get("allow", []))
        deny += len(perm.get("deny", []))
        ask += len(perm.get("ask", []))
        for regla in perm.get("allow", []):
            por_tool[regla.split("(")[0]] += 1
        out["archivos"].append({
            "ruta": str(p).replace(str(Path.home()), "~"),
            "allow": len(perm.get("allow", [])),
            "claves_presentes": sorted(perm.keys()),
            "tiene_deny": "deny" in perm})
    # las de MCP se agrupan: son 10 reglas de una sola integracion, no 10 decisiones
    agrupado = collections.Counter()
    for k, v in por_tool.items():
        agrupado["MCP (navegador)" if k.startswith("mcp__") else k] += v
    out["por_herramienta"] = dict(agrupado.most_common())
    out["totales"] = {"allow": allow, "deny": deny, "ask": ask,
                      "deny_existe_la_clave": any(a["tiene_deny"] for a in out["archivos"])}
    Path("mediciones").mkdir(exist_ok=True)
    Path("mediciones/permisos_agente.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out["totales"], ensure_ascii=False))
    print(json.dumps(out["por_herramienta"], ensure_ascii=False))
    print("→ mediciones/permisos_agente.json")


if __name__ == "__main__":
    main()
