---
phase: 11-personalizacao-release
plan: 02
completed: 2026-10-23T20:05:00Z
duration: ~2h30
description: "Ícone próprio, ícones alternativos (com modo discreto) e tema claro/escuro/sistema"
type: Summary
about: "ciclo-livre"
---

# Phase 11 Plan 02: Aparência — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Ícone próprio | PASS | Desenho do mundo "Território": um lobo domina e sai do quadro, segundo lobo no canto, ponto de tinta dentro. Fontes SVG em `assets/icons-src` (`scripts/make-icons.py`), PNG por AppKit (`scripts/render-icons.sh`). Adaptativo com monocromático; abertura clara (Território) e escura (Noite); ícones do template removidos. S21 FE: launcher e abertura com o ícone novo |
| AC-2 Ícones alternativos | PASS com limitação | Plugin `with-alternate-icons` (MainActivity habilitada sem LAUNCHER; 4 aliases) + módulo local `app-icon`, que troca ao sair do app (Home/Recentes) ou ao destruir a tela. S21 FE: Noite, Discreto ("Diário" no launcher, abertura neutra com caderno no Android 13+) e volta ao Território; deep link frio e intent do Health Connect funcionam com ícone alternativo. **Limitação do Android:** ao trocar, o app sai da lista de recentes e abre do começo na próxima vez (aviso na tela) |
| AC-3 Tema | PASS | `Appearance.setColorScheme`, salvo no SecureStore, aplicado por um import de boot antes do NativeWind. S21 FE: troca na hora sem voltar à primeira tela; vale ao reabrir; o conteúdo já abre escuro. A abertura do sistema segue o tema do celular (limitação: é desenhada antes do app) |
| AC-4 Qualidade | PASS | 808 testes, tsc e lint limpos. Impeccable (7 itens), /code-review (10), /cso diff (run `1792784741109-97e2e99f10f3f30d`: parcial, sem achados) |

## Desvios
- **expo-screen-capture removido.** No 11-01, bloquear DETECT_SCREEN_CAPTURE fez o app travar na abertura (a biblioteca registra um observador de prints ao carregar). Isso só apareceu ao abrir o app no build seguinte. A correção foi o módulo local `secure-window`, só com o FLAG_SECURE, e a permissão continua bloqueada. No aparelho, a captura sai em branco com a opção ligada e normal com ela desligada. Lição: depois de mexer em permissões, abrir o app, não só conferir o manifesto.
- Ícone redesenhado na revisão: o primeiro (três lobos em volta de um ponto) parecia flor/roseta.
- A notificação usa sempre o caderno neutro (discreto por padrão), não os lobos.

## Adiado
- Recentes e o cabeçalho das notificações continuam dizendo "Ciclo Livre" com o ícone discreto (limite do Android; está escrito na tela).
- Abertura escura quando o app está em "Escuro" e o celular em claro (só possível com tema de abertura por escolha no Android 13+, como no discreto) → 11-04, se valer a pena.
