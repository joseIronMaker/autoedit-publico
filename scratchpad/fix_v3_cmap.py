"""V3: la región de decisión salía en 'magma' (beige, fuera de la paleta neón) y sin
línea de frontera. Se pasa al MISMO lenguaje visual que el V1/V2 — región cian / región
magenta + frontera blanca — para que la CURVA se vea, que es todo el punto del video."""
import json
from pathlib import Path

gp = Path("videos/gen_dl_apilar_curvas.assets/guion.json")
g = json.loads(gp.read_text())
code = g["scenes"][3]["ml_demo"]["code"]
viejo = "ax.contourf(xx, yy, Z, levels=12, cmap='magma', alpha=0.7)"
nuevo = ("ax.contourf(xx, yy, Z, levels=[0,0.5,1.01], colors=[CYAN,MAG], alpha=0.45)\n"
         "ax.contour(xx, yy, Z, levels=[0.5], colors='white', linewidths=4)")
assert viejo in code, "no encontré la línea de contourf"
g["scenes"][3]["ml_demo"]["code"] = code.replace(viejo, nuevo)
gp.write_text(json.dumps(g, ensure_ascii=False, indent=1))
print("guion V3 actualizado (paleta de marca + frontera blanca)")
