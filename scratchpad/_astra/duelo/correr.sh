#!/usr/bin/env bash
# Duelo real: el MISMO prompt a los dos modelos, cada uno en su carpeta limpia.
set -u; cd /home/jose/tiktok/scratchpad/_astra/duelo
for par in "astra:gpt-6-astra" "sol:gpt-5.6-sol"; do
  dir=${par%%:*}; modelo=${par##*:}
  echo "=== $dir ($modelo) — inicio $(date +%H:%M:%S)"
  ini=$(date +%s)
  ( cd "$dir" && cat PROMPT.txt | timeout 900 ~/.local/bin/codex exec -m "$modelo" \
      --skip-git-repo-check --sandbox workspace-write > salida.txt 2>&1 )
  fin=$(date +%s)
  echo "  tardó $((fin-ini))s · archivo: $(ls -la "$dir/juego.py" 2>/dev/null | awk '{print $5" bytes"}' || echo 'NO CREÓ juego.py')"
  echo "  líneas: $(wc -l < "$dir/juego.py" 2>/dev/null || echo 0)"
done
