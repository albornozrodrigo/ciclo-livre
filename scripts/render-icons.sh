#!/bin/sh
# Rasteriza assets/icons-src/*.svg com AppKit (macOS), mantendo transparência. Só gera o que o app usa.
set -e
cd "$(dirname "$0")/.."
SRC=assets/icons-src
OUT=assets/images/icons
mkdir -p "$OUT"
r() { swift scripts/svg2png.swift "$SRC/$1.svg" "$OUT/$2.png" "$3"; }
# Ícone padrão (camadas do adaptativo e legado) e abertura clara/escura.
r padrao-foreground padrao-foreground 1024
r noite-foreground noite-foreground 1024
r monochrome monochrome 1024
# Notificação: o caderno neutro (discreto por padrão).
r discreto-monochrome discreto-monochrome 1024
# Prévias da tela de Aparência (padrao-full também é o ícone legado).
for n in padrao noite sol discreto; do r "$n-full" "$n-full" 1024; done
# Camadas das variantes no tamanho xxxhdpi do ícone adaptativo (108dp × 4).
for n in noite sol discreto; do r "$n-foreground" "$n-foreground-432" 432; done
r monochrome monochrome-432 432
r discreto-monochrome discreto-monochrome-432 432
