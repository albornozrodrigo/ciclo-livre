"""Gera as fontes SVG dos ícones do Ciclo Livre (mundo "Território do Ciclo") em assets/icons-src.
Rodar: python3 scripts/make-icons.py && sh scripts/render-icons.sh"""
import os

SH = [
    'M312 18C378 52 404 140 382 214C362 282 392 338 344 380C290 428 196 398 134 372C66 344 8 300 14 220C20 146 70 112 112 66C160 14 246 -16 312 18Z',
    'M58 40C130 -6 240 10 316 52C392 94 410 178 372 246C338 308 360 372 288 392C206 414 120 380 66 326C10 270 -14 186 12 122C26 88 30 58 58 40Z',
    'M200 8C284 4 380 60 392 150C402 226 340 262 350 330C360 398 270 410 200 388C124 364 30 380 10 300C-8 228 52 196 46 128C40 58 120 12 200 8Z',
]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons-src')
DY = 36  # centraliza o grupo na zona segura do ícone adaptativo


def lobe(i, x, y, s, fill):
    return f'<path d="{SH[i]}" fill="{fill}" transform="translate({x} {y + DY}) scale({s / 400})"/>'


def svg(body, bg=None):
    rect = f'<rect width="1024" height="1024" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">{rect}{body}</svg>'


def lobes(a, b, c, dot):
    return lobe(2, 250, 232, 330, a) + lobe(1, 446, 300, 330, b) + lobe(0, 330, 470, 250, c) + (
        f'<circle cx="566" cy="{520 + DY}" r="44" fill="{dot}"/>' if dot else ''
    )


ICONS = {
    'padrao': ('#F5F1E4', lobes('#FF705D', '#8ED462', '#F5E211', '#2C2E2A')),
    'noite': ('#151A17', lobes('#ff7a66', '#D9A9F2', '#3aa6ff', '#F2EEE1')),
    'sol': ('#F5E211', lobes('#FF705D', '#2BA0FF', '#F5F1E4', '#2C2E2A')),
    # Discreto: sem cor de fase nem lobos; nada sugere ciclo na tela inicial.
    'discreto': (
        '#D9D5C8',
        '<circle cx="512" cy="512" r="210" fill="none" stroke="#2C2E2A" stroke-width="56"/><circle cx="512" cy="512" r="62" fill="#2C2E2A"/>',
    ),
}

os.makedirs(OUT, exist_ok=True)
for name, (bg, fg) in ICONS.items():
    open(os.path.join(OUT, f'{name}-foreground.svg'), 'w').write(svg(fg))
    open(os.path.join(OUT, f'{name}-full.svg'), 'w').write(svg(fg, bg))
open(os.path.join(OUT, 'monochrome.svg'), 'w').write(svg(lobes('#FFFFFF', '#FFFFFF', '#FFFFFF', None)))
open(os.path.join(OUT, 'background.svg'), 'w').write(svg('', ICONS['padrao'][0]))
