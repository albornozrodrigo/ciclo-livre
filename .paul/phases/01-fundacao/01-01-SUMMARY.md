---
phase: 01-fundacao
plan: 01
completed: 2026-10-22T15:50:00Z
duration: ~3h (inclui o primeiro build nativo, de ~5 min)
description: "Casca de 5 abas com o tema Território do Ciclo, testes e dev build rodando no Galaxy S21 Ultra, com NativeWind 5 RC validado"
type: Summary
about: "ciclo-livre"
---

# Phase 1 Plan 01: Ferramentas, casca de navegação e tema — Summary

**O app abre no aparelho real com 5 abas em pt-BR, tema claro/escuro via Tailwind 4 e lobos SVG por território; NativeWind 5 RC funciona (com um ajuste no resolver do Metro).**

## What Was Built

| File | Purpose |
|------|---------|
| `src/global.css` | Tokens `@theme` + `:root` (água, tinta, territórios; variantes `-night`) |
| `src/constants/theme.ts` | `Palette` claro/escuro para cores usadas em JS (SVG, NativeTabs) |
| `src/components/ui/lobe.tsx` | Lobo SVG orgânico (3 formas), oculto para leitor de tela |
| `src/components/ui/screen.tsx` | Tela-base: lobo dominante + título display + chip + texto |
| `src/components/app-tabs.tsx` | NativeTabs Material: 5 gatilhos, ícones Material Symbols, rótulos sempre visíveis |
| `src/app/{index,calendario,analise,explorar,mais}.tsx` | Placeholders por território |
| `src/i18n/pt-BR.ts` | Textos das abas e telas |
| `src/__tests__/tabs.test.tsx` | 7 testes (cabeçalho, chip, lead, lobo oculto, ordem das abas) |
| `metro.config.js` | Correção do resolver (ver Deviations) |
| `PRODUCT.md`, `DESIGN.md` | Contexto Impeccable e sistema visual |

## Acceptance Criteria Results

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Testes rodando | PASS | `npm test`: 7/7 |
| AC-2 Sem resto do template | PASS | grep só encontra `md="explore"` (nome de ícone) |
| AC-3 Abas em pt-BR | PASS | Screenshot `evidencias/analise-light.png`: Hoje, Calendário, Análise, Explorar, Mais |
| AC-4 Tema claro/escuro | PASS | `analise-light.png` vs `analise-dark.png` (água creme ↔ noturna, texto suave adapta) |
| AC-5 Qualidade estática | PASS | `tsc` sem erros; `expo lint` exit 0; `expo export --platform android` OK |
| AC-6 Funciona no aparelho | PASS | `pidof app.ciclolivre` = 21303; logcat ReactNativeJS sem erros após a correção; NativeWind aplica classes (cor, tipografia, `rounded-full`, `dark:`) |

## Verification Results

```
npm test            → Tests: 7 passed, 7 total
npx tsc --noEmit    → (sem saída) TSC_OK
npx expo lint       → exit 0
expo run:android    → BUILD SUCCESSFUL in 5m 10s; instalado no SM-G998B (Android 15)
logcat ReactNativeJS (error|warn) → 0
```

## Deviations

| Deviation | Why | Impact |
|-----------|-----|--------|
| `react-native-svg` 15.16.0 adicionado | Lobos orgânicos exigem paths SVG | Dependência nativa; já no dev build |
| `PRODUCT.md` / `DESIGN.md` criados | Fluxo Impeccable obrigatório | Fonte da verdade visual |
| `eslint.config.js` criado por `npx expo lint` | Template SDK 58 não traz ESLint | Nenhum |
| `jest.config.js` próprio com `transformIgnorePatterns` para nativewind/react-native-css | Pacotes publicados em ESM | Nenhum |
| **`metro.config.js` alterado (estava em Boundaries)** | react-native-css 3.1.0-rc.0 redireciona `import "react-native"` para uma lista fixa sem `AssetRegistry` (RN 0.88). `expo-asset` quebrava (`getAssetByID of undefined`) ao carregar a fonte dos ícones `md` das abas — 5 erros, um por aba | Correção restrita: `expo-asset` e `expo-image` resolvem o react-native original. Revisitar quando sair react-native-css estável |
| `labelVisibilityMode="labeled"` nas abas | Material 3 pede rótulos visíveis com 3–5 destinos; o padrão escondia rótulos das abas inativas | Melhor leitura e alvo de toque |
| Checkpoint human-verify feito por screenshots no aparelho | Pessoa usuária pediu execução autônoma | North Star "O Mapa do Corpo" segue provisório até confirmação |

## Finish Review (impeccable-finish-reviewer)

Não bloqueante. Aplicado no UNIFY:
1. Contraste AA no escuro: coral-night #F0634F→#FF7A66 (4.31→5.37:1) e pond-night #2A93E8→#3AA6FF (4.20→5.28:1), conferido com cálculo WCAG.
2. DESIGN.md alinhado ao código: display 44sp/42; mapa fixo de território por aba documentado.
3. Chip "Em construção" virou cápsula de contorno e "etapa N" (não confunde com fase do ciclo; sol reservado a ações).
4. Título display em 1 linha com `adjustsFontSizeToFit` (fonte grande).
5. Comentário da invariante da barra de status.

Adiado: tokens repetidos em `@theme`/`:root`/`theme.ts` (teste de paridade ou remoção do `:root`); cápsula com chip redondo e sobreposição de lobos chegam com as primeiras ações reais (fase 2).

## Key Decisions

- **NativeWind 5 RC mantido** (sem fallback para 4.2.7): render validado no aparelho.
- Hoje = território sol (ação/"hoje"); coral fica reservado à menstruação.

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| verification-before-completion | ✓ | testes, tsc, lint, build e logcat rodados nesta sessão |
| impeccable | ✓ | direção + tokens; finish review rodado no UNIFY |
| test-driven-development | n/a | sem código em `src/domain` ou `src/db` neste plano |
| /code-review | pendente | no fechamento da fase 1 |

## Next

Plano 01-02: banco SQLite criptografado (SQLCipher) com chave no secure-store, executor de migrations e verificação de `cipher_version` (TDD).

---
*Completed: 2026-10-22*
