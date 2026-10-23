"""Gera as fontes SVG dos ícones do Ciclo Livre (mundo "Território do Ciclo") em assets/icons-src.
Rodar: python3 scripts/make-icons.py && sh scripts/render-icons.sh"""
import os

SH = [
    'M312 18C378 52 404 140 382 214C362 282 392 338 344 380C290 428 196 398 134 372C66 344 8 300 14 220C20 146 70 112 112 66C160 14 246 -16 312 18Z',
    'M58 40C130 -6 240 10 316 52C392 94 410 178 372 246C338 308 360 372 288 392C206 414 120 380 66 326C10 270 -14 186 12 122C26 88 30 58 58 40Z',
    'M200 8C284 4 380 60 392 150C402 226 340 262 350 330C360 398 270 410 200 388C124 364 30 380 10 300C-8 228 52 196 46 128C40 58 120 12 200 8Z',
]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons-src')

# Ícone adaptativo: tela de 108dp (1024 px); o recorte do launcher mostra só o centro de 72dp.
VISIBLE = (171, 171, 682, 682)  # x, y, largura, altura do centro visível


def lobe(i, x, y, s, fill, rot=0):
    return (
        f'<path d="{SH[i]}" fill="{fill}" '
        f'transform="translate({x} {y}) rotate({rot} {s / 2} {s / 2}) scale({s / 400})"/>'
    )


def svg(body, bg=None, crop=False):
    vb = ' '.join(map(str, VISIBLE)) if crop else '0 0 1024 1024'
    rect = f'<rect x="-100" y="-100" width="1224" height="1224" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="{vb}">{rect}{body}</svg>'


def territory(main, second, dot):
    """Um lobo domina e sai do quadro por dois lados (topo e esquerda); um segundo, menor, no canto oposto;
    o ponto de tinta ("você está aqui") dentro do lobo dominante."""
    return (
        lobe(0, 10, 10, 600, main)
        + lobe(2, 600, 600, 340, second)
        + (f'<circle cx="420" cy="420" r="50" fill="{dot}"/>' if dot else '')
    )


def notebook(ink):
    """Discreto: página com duas linhas, nada de lobo, anel ou cor de ciclo."""
    return (
        f'<rect x="352" y="312" width="320" height="400" rx="48" fill="none" stroke="{ink}" stroke-width="44"/>'
        f'<rect x="432" y="430" width="160" height="40" rx="20" fill="{ink}"/>'
        f'<rect x="432" y="530" width="160" height="40" rx="20" fill="{ink}"/>'
    )


ICONS = {
    'padrao': ('#F5F1E4', territory('#FF705D', '#F5E211', '#2C2E2A')),
    'noite': ('#151A17', territory('#D9A9F2', '#3aa6ff', '#F2EEE1')),
    'sol': ('#F5E211', territory('#FF705D', '#2BA0FF', '#2C2E2A')),
    'discreto': ('#D9D5C8', notebook('#2C2E2A')),
}

os.makedirs(OUT, exist_ok=True)
for name, (bg, fg) in ICONS.items():
    open(os.path.join(OUT, f'{name}-foreground.svg'), 'w').write(svg(fg))
    # Prévia e ícone legado: só o centro visível, como o launcher recorta.
    open(os.path.join(OUT, f'{name}-full.svg'), 'w').write(svg(fg, bg, crop=True))
# Monocromático (ícones temáticos e notificação): a silhueta de cada variante; o discreto tem o seu.
open(os.path.join(OUT, 'monochrome.svg'), 'w').write(svg(territory('#FFFFFF', '#FFFFFF', None)))
open(os.path.join(OUT, 'discreto-monochrome.svg'), 'w').write(svg(notebook('#FFFFFF')))
