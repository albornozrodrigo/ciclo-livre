#!/bin/sh
# Rasteriza assets/icons-src/*.svg com AppKit (macOS), mantendo transparência.
set -e
cd "$(dirname "$0")/.."
SRC=assets/icons-src
OUT=assets/images/icons
mkdir -p "$OUT"
for f in "$SRC"/*.svg; do
  n=$(basename "$f" .svg)
  swift scripts/svg2png.swift "$f" "$OUT/$n.png" 1024
done
# Camadas das variantes no tamanho xxxhdpi do ícone adaptativo (108dp × 4).
for n in noite sol discreto; do
  swift scripts/svg2png.swift "$SRC/$n-foreground.svg" "$OUT/$n-foreground-432.png" 432
done
swift scripts/svg2png.swift "$SRC/monochrome.svg" "$OUT/monochrome-432.png" 432
