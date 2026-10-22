---
phase: 04-previsao
plan: 02
completed: 2026-10-22T22:10:00Z
duration: ~40min
description: "Hoje mostra a fase de hoje (lobo e chip na cor do território, com nome), dia do ciclo, próxima menstruação com margem, janela fértil, dor, confiança e aviso; gravidez em semanas"
type: Summary
about: "ciclo-livre"
---

# Phase 4 Plan 02: Hoje com o ciclo — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Entradas do ciclo | PASS | `cycle-repo.test.ts` (fluxo sem escape, temperatura, muco, testes, dor) |
| AC-2 Hoje mostra o ciclo | PASS | `today.test.ts` (7 casos puros) + `hoje.test.tsx` (SQLite real); aparelho: "Fase folicular · Dia 11 do ciclo · Próxima menstruação em 21 dias · entre 10 e 14 de nov." e gravidez "20 semanas e 0 dias" |
| AC-3 Atualiza ao voltar | PASS | `useFocusEffect` |
| AC-4 Qualidade | PASS | testes, tsc, lint, detector |

## Decisions / fixes no aparelho
- "Registrar hoje" ficou abaixo da dobra com o ciclo → movido para logo depois do essencial (fase, dia, próxima).
- Ponto duplicado em datas abreviadas ("nov..") → frase sem ponto final.
- Tipo `CycleSignals` movido para o domínio (o domínio não depende do banco).
