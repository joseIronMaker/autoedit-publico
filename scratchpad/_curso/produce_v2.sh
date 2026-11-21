#!/usr/bin/env bash
# Produce una clase DESDE CERO con la voz nueva y el guion rediseñado:
#   autoedit-gen (voz + animaciones + diagramas) → capturas reales → subtítulos y copys
#   → Descargas/curso_python_v2. NO sube a TikTok: José revisa antes.
set -u; cd /home/jose/tiktok; export PYTHONUNBUFFERED=1
L=scratchpad/_curso/logs; R="$L/V2.txt"; DEST="/mnt/c/Users/USUARIO/Downloads/curso_python_v2"; mkdir -p "$DEST"
for c in "$@"; do
  g=$(ls scratchpad/guiones_curso/${c}_*.json)
  slug=$(.venv/bin/python -c "import json;print(json.load(open('$g'))['slug'])"); stem="gen_$slug"; num=${c#py}
  nom="clase${num}_${slug#curso_${c}_}"
  echo "=== $c  $(date +%H:%M) ===" >> "$R"
  git checkout -- scratchpad/_curso/demo/ 2>/dev/null
  .venv/bin/python -c "import sys; sys.path.insert(0,\"scratchpad\"); from editor_grabados import mata_chrome_huerfano as m; print(\"chrome huérfanos matados:\", m())" >> "$L/v2_gen_$c.log" 2>&1
  tema=$(.venv/bin/python -c "import json;print(json.load(open('$g'))['tema'])")
  # REANUDABLE: si el ensamblado ya existe, la generación (voz + animaciones) está hecha.
  # WSL se ha reiniciado dos veces a media tanda y repetirla cuesta media hora por clase.
  # …pero solo si la locución que hay en disco corresponde a la narración ACTUAL: si el
  # guion se reescribió, ese ensamblado trae la voz vieja y saltarse la generación entrega
  # la clase de antes diciendo OK en cada paso
  if [ -f "videos/$stem.mp4" ] && .venv/bin/python scratchpad/_curso/firma_voz.py "$c" "$stem" > /dev/null 2>&1; then
    echo "  (ensamblado ya existía y la voz corresponde; salto la generación)" >> "$R"
  else
    # autoedit-gen NO sobrescribe: con el mp4 presente escribiría en `<stem>_1.assets`
    rm -f "videos/$stem.mp4"
    if ! timeout 7200 .venv/bin/autoedit-gen "$tema" --guion "$g" --dir videos > "$L/v2_gen_$c.log" 2>&1; then
       echo "  GENERACIÓN falló" >> "$R"; tail -4 "$L/v2_gen_$c.log" | sed 's/^/    /' >> "$R"; continue; fi
    if ! .venv/bin/python scratchpad/_curso/firma_voz.py "$c" "$stem" >> "$R" 2>&1; then
       echo "  ABORTO: la locución no corresponde a la narración" >> "$R"; continue; fi
  fi
  if ! timeout 3600 .venv/bin/python scratchpad/graba_curso.py "$c" > "$L/v2_cap_$c.log" 2>&1; then
     echo "  CAPTURAS fallaron" >> "$R"; tail -4 "$L/v2_cap_$c.log" | sed 's/^/    /' >> "$R"; continue; fi
  # el perrito: las escenas `mascota` van como FOTO en placas (PIL), no como beat de Remotion —
  # ese beat se colgó 9 min en la clase 6 y además dibuja el robot pixel, no al perrito
  .venv/bin/python scratchpad/pon_perrito.py "$c" >> "$L/v2_cap_$c.log" 2>&1 || true
  if ! bash scratchpad/_curso/render_seguro.sh "$stem" > "$L/v2_sub_$c.log" 2>&1; then
     echo "  RENDER malo (corta de más o falló)" >> "$R"; continue; fi
  cp "videos/${stem}_final.mp4" "$DEST/$nom.mp4"
  .venv/bin/python -c "import json;print(json.load(open('videos/$stem.autoedit/copys.json'))['tiktok'].strip())" > "$DEST/${nom}_copy.txt"
  echo "  OK $nom.mp4  $(date +%H:%M)" >> "$R"
  bash scratchpad/_curso/posproduce.sh "$c"     # QC visual y, si pasa, reemplazo en TikTok
done
echo "=== fin $(date +%H:%M) ===" >> "$R"
# auditoría final: cada paso informa por separado y puede mentir (el borrado dice "listo"
# sin borrar; la subida falla tras borrar y deja el hueco VACÍO). Esto lee el calendario
# entero y compara la DURACIÓN de cada fila con la del archivo v2.
.venv/bin/python scratchpad/_curso/audita_calendario.py >> "$L/AUDITORIA.txt" 2>&1
