#!/usr/bin/env bash
# Graba ~30s de TU voz para clonarla con XTTS-v2. Corre:  bash grabar_voz.sh
# Habla natural y con ENERGÍA (como en tus videos). Lee el guion sugerido o improvisa.
OUT=branding/voz_ref.wav
mkdir -p branding
echo "════════════════════════════════════════════════════════"
echo "  🎙️  GRABANDO 32 SEGUNDOS — EMPIEZA A HABLAR YA"
echo "  Lee natural y con energía. Ejemplo de guion:"
echo "  ─────────────────────────────────────────────"
echo "  \"Hola, soy José, ingeniero de inteligencia artificial."
echo "   En este canal te traduzco la IA para que la uses hoy"
echo "   mismo. Sin tecnicismos, con ejemplos reales y trucos"
echo "   que puedes aplicar de inmediato en tu trabajo. Si te"
echo "   gusta la IA práctica y sin rodeos, quédate: aquí vas"
echo "   a aprender a sacarle el máximo a ChatGPT y mucho más.\""
echo "════════════════════════════════════════════════════════"
ffmpeg -hide_banner -loglevel error -f pulse -i RDPSource -ac 1 -ar 48000 -t 32 -y "$OUT"
echo ""
echo "✔ guardado: $OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" | awk '{printf "   duración: %.1fs\n",$1}'
echo "   Ahora dime 'listo' y sigo con la clonación."
