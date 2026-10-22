---
phase: 02-onboarding
plan: 03
completed: 2026-10-22T18:55:00Z
duration: ~45min
description: "Trocar modo e editar dados do ciclo em Mais, livres e validados; snackbar Material no lugar do toast"
type: Summary
about: "ciclo-livre"
---

# Phase 2 Plan 03: Perfil editável — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Seção "Seu perfil" | PASS | `mais.test.tsx`; `evidencias/mais-perfil.png` |
| AC-2 Trocar modo | PASS | `profile-edit.test.tsx` (modo atual marcado; perimenopausa; gravidez pede data; tentar pede faixa); aparelho Período→Gravidez |
| AC-3 Dados do ciclo | PASS | testes (duração, "não lembro", falha avisada); aparelho 28→31 dias |
| AC-4 Snackbar | PASS | `snackbar.test.tsx` (live region, 4s, substitui); acima do banco, sobrevive ao apagar |
| AC-5 Rotas | PASS | `root-navigator.test.tsx`: `/perfil/*` só com perfil |
| AC-6 Aparelho + qualidade | PASS | persistência após reabrir; 136 testes, tsc, lint, detector |

## Decisions
- Hook `useProfileEditor` concentra rascunho + validação + salvar/snackbar/voltar (telas só renderizam).
- Token `line`/`line-night` (hex) para divisórias; DESIGN.md registra que o modificador `/NN` não funciona no NativeWind 5 RC.
- Mais perdeu o chip "Em construção" (já tem conteúdo); `phase` virou opcional nas telas.

## Deferred
- Duplicação de tokens (`@theme`/`:root`/`theme.ts`) segue aberta e agora inclui `line`.

## /code-review de fechamento da fase 2 (705c807..HEAD)

| # | Achado | Veredito | Ação |
|---|--------|----------|------|
| 1 | Edição travada quando data salva envelhece | Válido | `validateProfileEdit` ignora erros só-de-tempo em campos não mexidos (TDD) |
| 2 | 17 anos passam (idade só pelo ano) | Válido — decisão | Regra conservadora: idade garantida = anoAtual − anoNasc − 1 ≥ 18; texto "18 anos completos" |
| 3 | Ano futuro → mensagem de menor de idade | Válido | `out_of_range` (TDD) |
| 4 | Respostas de ramo abandonado salvas | Válido (privacidade) | `toProfileInput` só guarda o que o fluxo do modo perguntou (TDD) |
| 5 | "Corrigir" para passo fora do fluxo | Válido | `fixStepFor` cai na escolha de modo (TDD) |
| 6 | "Corrigir" empilha telas | Válido | `router.dismissTo` |
| 7 | `router.back()` sem tela anterior | Válido | `canGoBack` senão `replace('/mais')` (TDD) |
| 8 | Campos duplicados | Válido | `CycleLengthsFields`, `DueDateField` |
| 9 | "hoje" repetido | Válido | `todayIso()` |
| 10 | `coverage/` commitado | Válido | `.gitignore` + removido do índice |

Verificação: 146 testes, tsc, lint; S21 FE sem erros após o refactor.
