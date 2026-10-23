---
phase: 11-personalizacao-release
plan: 03
completed: 2026-10-23T21:00:00Z
duration: ~1h30
description: "Polimento funcional: pendências S acumuladas nas fases 1–10"
type: Summary
about: "ciclo-livre"
---

# Phase 11 Plan 03: Polimento funcional — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Registro e calendário | PASS | O erro da medição fica acima do campo (teste de ordem; S21 FE com o teclado aberto). Os dias do calendário têm 49,3–49,7dp no S21 FE, que tem 360dp de largura; antes eram 46,3–46,7dp |
| AC-2 Dados | PASS | Análise, PDF e chat leem o banco uma vez e tiram os sinais com `signalsFromAnalysis`, a fonte única que `getCycleSignals` também usa. Sem limite de data: a Análise mostra o histórico inteiro e as médias dependem dele. A restauração de tags já não usava `lastInsertRowId` (corrigido antes). Leituras cortadas porque o banco fechou contam como cancelamento (`logUnlessClosed` em 10 pontos). A ordem de Personalizar foi para o domínio (`orderForEditing`). Há teste de paridade dos tokens, que falha quando uma cor diverge. `writeMeta` passou a ser único |
| AC-3 Notificações e Health Connect | PARCIAL | "Apagar o que veio do Health Connect" funciona com confirmação, não age com o app bloqueado, mantém as edições e o que a pessoa apagou de propósito, e volta aos 30 dias na próxima leitura. A Análise avisa quando temperaturas do ciclo atual vieram do Health Connect. **Canal SECRET não implementado:** o Android ignora a visibilidade que o app pede para o canal (no S21 FE, os dois canais ficam em -1000, "sem substituição"). Mudar por notificação exigiria patch no nativo do expo-notifications. A proteção continua sendo as notificações discretas, ligadas por padrão |
| AC-4 Qualidade | PASS | 826 testes, tsc e lint limpos. /code-review com 8 achados, corrigidos em eefdf79 |

## Desvios
- O aviso de temperatura importada foi para a Análise e não para Hoje. A temperatura só confirma a ovulação dias depois, quando Hoje já mostra a janela do ciclo seguinte.
