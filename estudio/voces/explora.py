"""Lista la biblioteca de voces en español del TTS de Gemini."""
import json, os, pathlib
from dotenv import load_dotenv
from google import genai
raiz = pathlib.Path(__file__).resolve().parents[2]
load_dotenv(raiz / ".env")
c = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
todas, tok = [], None
while True:
    kw = {"page_size": 1000, "gender": ["female"]}
    if tok: kw["page_token"] = tok
    r = c.voices.list(**kw)
    todas += r.voices or []
    tok = r.next_page_token
    if not tok: break
print("voces femeninas:", len(todas))
es = [v for v in todas if str(getattr(v, "language_code", "")).lower().startswith("es")]
print("en español:", len(es))
campos = {}
for v in es:
    d = v.model_dump(exclude_none=True) if hasattr(v, "model_dump") else vars(v)
    d.pop("sample_audio", None)
    campos[d.get("id")] = d
pathlib.Path(__file__).with_name("biblioteca_es.json").write_text(json.dumps(list(campos.values()), ensure_ascii=False, indent=1, default=str), encoding="utf-8")
from collections import Counter
print(Counter((d.get("language_code"), d.get("accent")) for d in campos.values()).most_common(20))
for d in list(campos.values())[:40]:
    print(d.get("id"), "|", d.get("display_name"), "|", d.get("language_code"), "|", d.get("accent"), "|", d.get("pitch"), "|", (d.get("description") or "")[:110], "|", d.get("contexts"))
