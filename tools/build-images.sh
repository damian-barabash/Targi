#!/usr/bin/env bash
# assets/photos/*.jpg (masters, not shipped) -> public/img/<name>-<w>.webp
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/img
for src in assets/photos/*.jpg; do
  name=$(basename "$src" .jpg)
  for w in 800 1600; do
    out="public/img/$name-$w.webp"
    [ "$out" -nt "$src" ] && continue
    cwebp -quiet -q 76 -resize "$w" 0 -metadata none "$src" -o "$out"
  done
done
echo "images: $(ls public/img/*.webp | wc -l | tr -d ' ') files, $(du -sh public/img | cut -f1)"
