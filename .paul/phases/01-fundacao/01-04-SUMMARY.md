---
phase: 01-fundacao
plan: 04
completed: 2026-10-22T17:30:00Z
duration: ~45min
description: "Correções do /code-review e /cso: conexão vazada fechada, chave única sob concorrência, erase resiliente, saída da tela de erro e recusa de banco de versão mais nova"
type: Summary
about: "ciclo-livre"
---

# Phase 1 Plan 04: Correções de fechamento — Summary

## Review triage (/code-review high 2b58ddf..HEAD)

| # | Achado | Veredito | Ação |
|---|--------|----------|------|
| 1 | Banco preso se a chave sumir | Válido (cenário de backup **incorreto**: regras do expo-secure-store só incluem `sharedpref`, o banco não vai para a nuvem) | AppError ganhou "Apagar dados e começar de novo" (AC-6) |
| 2 | Erase falho deixa conexão fechada | Válido | `finally { reopen() }` + toast de falha |
| 3 | Conexão vazada quando onInit falha | Válido (confirmado em `SQLiteModule.kt`: cache com `addRef`) | `initOrClose` |
| 4 | Corrida check-then-set da chave | Válido | single-flight por store |
| 5 | Toque duplo abre dois diálogos | Válido (o teste pegou que `useState` não basta) | trava síncrona com `useRef` |
| 6 | StatusBar escura na AppError | Válido | `StatusBar style="auto"` na AppError |
| 7 | Estado "erased" morto / iOS | Válido em parte (iOS fora da v1) | Removido o estado morto |
| 8 | user_version mais novo | Válido | `runMigrations` recusa |
| 9 | Banco em claro preexistente | Coberto pelo #1 | — |
| 10 | Tokens triplicados | Já adiado | Deferred |

## /cso (run 1792689461015-bbc63683353846f4)
Parcial; **nenhum finding comprovado no escopo avaliado**. Lacunas: dependências (sem OSV), plugin expo do `.claude` não inspecionado.

## Acceptance Criteria

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 initOrClose | PASS | database.test.ts (3 novos) |
| AC-2 chave única | PASS | key.test.ts (concorrência) |
| AC-3 erase resiliente | PASS | mais.test.tsx (toast de falha); `finally` no hook |
| AC-4 toque duplo | PASS | privacy-section.test.tsx |
| AC-5 versão mais nova | PASS | migrations.test.ts |
| AC-6 sair da tela de erro | PASS | app-error.test.tsx (2 novos); S21 FE: banco corrompido com bytes aleatórios → AppError (`evidencias/fe-apperror.png`) → recomeçar → banco novo cifrado, sem erros (`fe-recovered.png`) |
| AC-7 sem estado morto | PASS | PrivacySection sem status de sucesso |

Verificação: 50 testes, tsc e lint limpos; regressão do apagar-tudo normal no S21 FE OK.

---
*Completed: 2026-10-22*
