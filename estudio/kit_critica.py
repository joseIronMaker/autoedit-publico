"""Crítica de un colega: Gemini 4 Argon ve la pieza junto a un referente y dice qué falla.

python estudio/kit_critica.py <video.mp4> [referente.mp4] [salida.json]
"""
import pathlib, sys, time
from google.genai import types
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from config import CFG, RAIZ as raiz, cliente
c = cliente()
video = sys.argv[1]
ref = sys.argv[2] if len(sys.argv) > 2 else str(raiz / "scratchpad/_referentes/fuente/r6.mp4")
sal = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else pathlib.Path(video).with_suffix(".critica.json")

def sube(p):
    f = c.files.upload(file=p)
    while f.state and f.state.name == "PROCESSING":
        time.sleep(3); f = c.files.get(name=f.name)
    return f

a, b = sube(ref), sube(video)
PROMPT = """Eres un director de animación exigente. El VIDEO 1 es el listón de calidad (viral en TikTok, cientos de miles de vistas).
El VIDEO 2 es nuestra pieza. No queremos copiar el 1: queremos el mismo nivel con ideas propias.
Velo y óyelo completo. Sé específico, con marcas de tiempo. No halagues: lo útil es lo que falla.
Responde solo JSON:
{"nivel_vs_listón_0a10":n, "primer_segundo":"¿detiene el pulgar? por qué", "momentos_que_funcionan":[{"t":"","que":""}],
 "momentos_donde_se_iria":[{"t":"","por_que":"","arreglo":""}], "ritmo_visual":"", "sincronia_voz_imagen":[{"t":"","problema":""}],
 "legibilidad_en_celular":[{"t":"","problema":""}], "sonido":{"musica":"","efectos":"","mezcla":"","problemas":[{"t":"","que":""}]},
 "guion":{"claridad":"","afirmaciones_dudosas":[""],"final":""}, "tres_cambios_de_mayor_impacto":["","",""]}"""
r = c.models.generate_content(model=CFG["critica"], contents=["VIDEO 1 (listón):", a, "VIDEO 2 (nuestra pieza):", b, PROMPT],
    config=types.GenerateContentConfig(response_mime_type="application/json"))
sal.write_text(r.text, encoding="utf-8")
print(r.text)
for f in (a, b):
    try: c.files.delete(name=f.name)
    except Exception: pass
