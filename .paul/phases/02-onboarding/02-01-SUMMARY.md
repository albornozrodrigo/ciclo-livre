---
phase: 02-onboarding
plan: 01
completed: 2026-10-22T18:00:00Z
duration: ~30min
description: "Perfil e modos: validação pura com TDD, migration v2 com CHECKs e repositório com SQL parametrizado"
type: Summary
about: "ciclo-livre"
---

# Phase 2 Plan 01: Modelo de perfil — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Validação | PASS | `src/domain/__tests__/profile.test.ts` (27 casos): padrões, 18+ pelo ano, 100 anos, datas (futuro, >365d, inválidas), faixas, menstruação < ciclo, campos por modo e limpeza dos campos de outros modos, erros acumulados |
| AC-2 Migration v2 | PASS | `profile-repo.test.ts`: banco recusa id≠1, modo inválido, ciclo fora da faixa, data malformada |
| AC-3 Repositório | PASS | ida e volta com nulos; upsert de linha única; texto com aspas tratado como dado |
| AC-4 Qualidade | PASS | 68 testes; tsc; lint; cobertura profile.ts 97.8% linhas / dates.ts 93.8% |

## Decisions
- Idade pelo **ano** de nascimento (como o app de referência): quem completa 18 no ano atual entra. Data completa seria mais exata, mas coleta mais dado pessoal do que o necessário.
- Datas como texto ISO `AAAA-MM-DD`, aritmética em dias UTC (sem fuso).
- Campos de um modo (data prevista, há quanto tempo tenta) são limpos fora dele.

## Deviation
- `SqlExecutor.runAsync` adicionado (compatível com expo-sqlite) para escrita parametrizada.
