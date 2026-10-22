---
phase: 04-previsao
plan: 01
completed: 2026-10-22T21:40:00Z
duration: ~50min
description: "Motor de previsão local e puro: menstruações, ciclos, previsão com incerteza, ovulação por temperatura/teste/muco/calendário, fases, confiança, atraso e dor — 100% linhas, 96% ramos"
type: Summary
about: "ciclo-livre"
---

# Phase 4 Plan 01: Motor de previsão — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Menstruações | PASS | `periods.test.ts` (7) |
| AC-2 Ciclos e estatística | PASS | `stats.test.ts` (7): implausíveis fora, últimos 6, desvio |
| AC-3 Ovulação | PASS | `ovulation.test.ts`: 3-sobre-6 (0,2 °C, só 2 altas, falhas de medição, empate, <6 medições, recorte), muco, teste, prioridade, fase lútea medida. RED provado: sem implementação e com a regra mutada (0,2→0) |
| AC-4 Previsão | PASS | `model.test.ts`: próxima ±margem, duração média, semente, horizonte ilimitado, atraso |
| AC-5 Fase/dia | PASS | 10 casos de `dayInfo` (passado, atual, previsto), antes do 1º registro → null; gravidez em semanas |
| AC-6 Confiança | PASS | low/medium/high |
| AC-7 Dor | PASS | `pain.test.ts` |
| AC-8 Qualidade | PASS | cobertura `src/domain/cycle`: 100% linhas, 96,3% ramos; tsc; lint |

## Decisions
- Previsão de dor: **mais da metade** dos ciclos (com 2 ciclos, uma ocorrência isolada não vira previsão). Plano ajustado.
- Margem da previsão = desvio-padrão arredondado para cima, entre 1 e 7 dias (2 sem dados).
- Atraso: se a data esperada passou, "próxima" = hoje e `late = true` (a UI diz que está atrasada, sem inventar data).
- Janela fértil ovulação −5/+1; fase lútea 14 por padrão, ou a média medida por temperatura (7–20 dias).

## Notes
- Dois erros nos meus próprios testes foram pegos ao recalcular à mão antes de implementar (semana gestacional e limiar da dor).
- Testes de fase lútea e atraso foram escritos depois do código (caracterização), para cobrir ramos.
