---
phase: 02-onboarding
plan: 02
completed: 2026-10-22T18:50:00Z
duration: ~2h30 (inclui 2 rebuilds nativos)
description: "Onboarding de primeiro uso com rotas protegidas, fluxo por modo e controles acessíveis, provado no S21 FE em claro/escuro e fonte 1.3×"
type: Summary
about: "ciclo-livre"
---

# Phase 2 Plan 02: Onboarding — Summary

**Primeira abertura → 4 a 6 perguntas (por modo) → perfil salvo no banco criptografado → abas. Reabrir vai direto às abas; Back na aba inicial sai do app; "apagar tudo" volta ao onboarding.**

## Acceptance Criteria

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Passos por modo | PASS | `src/domain/__tests__/onboarding.test.ts` (5 modos + sem modo) |
| AC-2 Rotas protegidas | PASS | `root-navigator.test.tsx` (renderRouter: guarda e deep links); no aparelho Back não volta ao onboarding |
| AC-3 Componentes | PASS c/ desvios | `ui-controls.test.tsx`, `date-field.test.tsx`; ver Deviations |
| AC-4 Salvar e entrar | PASS | `onboarding-done.test.tsx` (salva validado, corrige no passo certo, falha avisada) |
| AC-5 Aparelho | PASS | Modo Período (claro, 1.0×) e Gravidez (escuro, 1.3×) completos no RQCRC00WJMV; banco v2 cifrado; `evidencias/` |
| AC-6 Qualidade | PASS | testes, tsc, lint, detector `[]`, finish review aplicado |

## Bugs achados no aparelho (todos corrigidos com teste quando havia comportamento)
1. **Crash** ao abrir o seletor de data: `design: 'material'` exige tema Material Components (o Expo gera AppCompat) → seletor padrão + teste de regressão.
2. Teclado cobria o botão (edge-to-edge): `KeyboardAvoidingView` `padding`.
3. Ícones escuros da barra de status sobre fundo escuro nos passos sem lobo → `StatusBar auto` + teste.
4. Fonte 1.3×: texto de apoio da boas-vindas saía do lobo → movido para a água.
5. Fonte 1.3× + teclado: progresso sob a barra de status → recuo da área segura no contêiner.
6. Segmentos de progresso restantes invisíveis: `bg-ink/15` (opacidade) não funciona no NativeWind 5 RC → contorno.
7. API depreciada `onChange` do datetimepicker → `onValueChange`.

## Deviations
| Deviation | Why |
|-----------|-----|
| Seleção = tinta cheia + check de sol (plano dizia cor do território) | Cores de território significam fases do ciclo; usar em escolhas quebraria "cor = fase" |
| Seletor de data padrão do Android, tingido por plugin `with-android-accent` (plano dizia Material 3) | Crash do MaterialDatePicker com tema AppCompat |
| Passos sem lobo; títulos 32sp (headline) e boas-vindas 56sp (hero); primária 56dp | Decisão de design registrada no DESIGN.md (exceção para telas de pergunta/formulário) |
| Primária desabilitada vira contorno tracejado | Sol translúcido ilegível no escuro (finish review) |
| Splash na paleta (água claro/escuro) | Estava com o azul do template |

## Finish review
Aplicados: progresso, barra de status, erro de idade fecha teclado, falha ao salvar avisada, DESIGN.md, desabilitado legível, acento dos diálogos, nota "não lembro" no fim. Não aplicado: chip "cruza para a esquerda" e movimento (fase 11/polimento).
