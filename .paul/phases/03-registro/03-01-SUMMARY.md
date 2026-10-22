---
phase: 03-registro
plan: 01
completed: 2026-10-22T19:40:00Z
duration: ~40min
description: "Catálogo de 46 categorias com rótulos próprios, regras de seleção/medição/nota/ordem e persistência por dia (migration v3), tudo em TDD"
type: Summary
about: "ciclo-livre"
---

# Phase 3 Plan 01: Catálogo e banco do registro — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Catálogo íntegro | PASS | `catalog.test.ts`: 46 categorias (≥40), ids/opções únicos, rótulo pt-BR para tudo, visibilidade por modo e método |
| AC-2 Regras | PASS | `rules.test.ts`: single/multi, faixas e casas decimais, nota ≤1000, ordem com ocultas e novas no fim |
| AC-3 Migration v3 + repo | PASS | `log-repo.test.ts` (node:sqlite): ida e volta, substituição, recusa de categoria/opção/single inválidos sem gravar, data malformada, aspas como dado, prefs |
| AC-4 Qualidade | PASS | 135 testes; tsc; lint; cobertura catalog.ts/rules.ts 100% |

## Decisions
- Rótulos em `src/i18n/pt-BR-tracking.ts`, redação própria (nada copiado).
- Validação do catálogo no repositório (o banco guarda ids livres; o código impede ids inválidos).
- Categorias de contracepção aparecem só para o método do perfil; gravidez só no modo Gravidez; calores em Perimenopausa.
- Intensidade da dor é categoria própria (no app de referência era Plus).

## Deviation
- `SqlExecutor.getAllAsync` adicionado (compatível com expo-sqlite).
