"""Una toma de narración: python estudio/voces/narra.py <guion.txt> <salida.wav> [estilo]"""
import base64, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from config import CFG, cliente

txt = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").strip()
estilo = sys.argv[3] if len(sys.argv) > 3 else CFG["voz_estilo"]
c = cliente()                          # guardado: un cliente temporal se cierra antes de la petición
r = c.interactions.create(model=CFG["tts"], input=[{"type": "user_input", "content": [{"type": "text", "text": txt,
    "annotations": [{"type": "speech_metadata", "style": estilo}]}]}],
    response_format={"type": "audio"}, generation_config={"speech_config": [{"voice": CFG["voz"]}]})
pathlib.Path(sys.argv[2]).write_bytes(base64.b64decode(r.output_audio.data))
