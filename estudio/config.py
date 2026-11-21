"""Cliente de Gemini y modelos del motor nuevo: una sola puerta, leída de config.yaml."""
import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parents[1]
load_dotenv(RAIZ / ".env")
CFG = yaml.safe_load((RAIZ / "config.yaml").read_text(encoding="utf-8"))["estudio"]


def cliente():
    from google import genai
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])
