#!/usr/bin/env bash
# La verdad del taller en un comando:  bash estado.sh
# Existe porque dos veces le reporte a Jose que algo estaba corriendo sin verificarlo
# (17-ago-2026). Esto no pregunta, mide.
cd /home/jose/tiktok

echo "═══ PRODUCIENDO AHORA ═══"
ps -eo pid,etime,args --no-headers 2>/dev/null \
  | grep -E "\.venv/bin/(autoedit|autoedit-gen|python scratchpad/producir)" \
  | grep -v grep \
  | sed -E 's|/home/jose/tiktok/\.venv/bin/||; s|--dir [^ ]+||' \
  | cut -c1-150 || true
if ! ps -eo args --no-headers | grep -qE "\.venv/bin/autoedit"; then
  echo "  (nada)"
fi

echo
echo "═══ COLAS VIVAS ═══"
ps -eo pid,etime,args --no-headers | grep -E "producir_.*\.sh|terminar_dos\.sh" \
  | grep -v grep | awk '{print "  pid "$1"  "$2"  "$3" "$4}' || true
ps -eo args --no-headers | grep -qE "producir_.*\.sh" || echo "  (ninguna)"

echo
echo "═══ ESPERAS ATORADAS (se esperan a si mismas) ═══"
atoradas=$(ps -eo pid,etime,args --no-headers | grep -E "until ! pgrep|while pgrep" \
  | grep -v grep | grep -v estado.sh | wc -l)
if [ "$atoradas" -gt 0 ]; then
  ps -eo pid,etime,args --no-headers | grep -E "until ! pgrep|while pgrep" \
    | grep -v grep | grep -v estado.sh | awk '{print "  ⚠ pid "$1"  lleva "$2}'
  echo "  → matalas con: kill <pid>"
else
  echo "  (ninguna)"
fi

echo
echo "═══ VIDEOS TERMINADOS (mp4 final valido) ═══"
for f in videos/*_final.mp4; do
  [ -e "$f" ] || continue
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null)
  [ -z "$d" ] && { echo "  ✗ $(basename "$f")  CORRUPTO"; continue; }
  printf "  ✔ %-46s %5.1fs   %s\n" "$(basename "$f" _final.mp4)" "$d" \
    "$(date -r "$f" +%H:%M)"
done

echo
echo "═══ ENTREGADOS A DESCARGAS ═══"
for d in agentes serie15 serie1 serire_5; do
  n=$(ls "/mnt/c/Users/USUARIO/Downloads/$d"/*.mp4 2>/dev/null | wc -l)
  [ "$n" -gt 0 ] && echo "  $d: $n video(s)"
done

echo
echo "═══ GUIONES ESCRITOS SIN PRODUCIR ═══"
for g in scratchpad/guiones_agentes/*.json scratchpad/guiones_serie15/*.json \
         scratchpad/guiones_harneses/*.json; do
  [ -e "$g" ] || continue
  slug=$(python3 -c "import json,sys;print(json.load(open('$g'))['slug'])" 2>/dev/null)
  [ -z "$slug" ] && continue
  [ -e "videos/gen_${slug}_final.mp4" ] || echo "  · $(basename "$g")"
done
