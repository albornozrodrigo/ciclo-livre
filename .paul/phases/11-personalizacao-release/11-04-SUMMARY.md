---
phase: 11-personalizacao-release
plan: 04
completed: 2026-10-23T21:40:00Z
duration: ~1h30
description: "Polimento visual: movimento, lobo da próxima fase, marca de hoje, média na linha, bloqueio com lobo"
type: Summary
about: "ciclo-livre"
---

# Phase 11 Plan 04: Polimento visual — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Movimento | PASS | Lobo: a cor desliza em 0,4s (ease-out) na troca de território e o lobo assenta com mola ao chegar na aba. Com "remover animações", troca seca. Usa RN `Animated`: com Reanimated 4, os worklets não carregam no Jest sem um resolver próprio, e o efeito é pequeno |
| AC-2 Telas | PASS com desvios | O lobo da próxima fase em Hoje aparece com o nome escrito e "em cerca de N dias", some com a menstruação atrasada e é lido depois de "Hoje" (S21 FE, claro e escuro). O calendário ganhou a marca de sol em hoje e na legenda. "média 29" fica na ponta da linha de referência, numa calha que cresce com a fonte (S21 FE). A tela de bloqueio ganhou lobo de sol e "Bloqueado" em Display. **Não feitos, por decisão:** o número principal da Análise em Display (o DESIGN.md reserva Display para o nome da tela e o dia do ciclo, e o piso do Impeccable recusa o template de "número gigante") e o interruptor em cápsula própria (o guia Android pede o controle nativo; o Switch do Material 3 já usa as cores do mundo) |
| AC-3 Qualidade | PASS | 832 testes, tsc e lint limpos. Impeccable finish review (8 itens) aplicado em fb770f0. A tela de bloqueio não foi vista no aparelho, porque exige a digital da pessoa; está coberta por testes |

## Observação
- Teste instável: `readZipEntry › lê ZIP com senha ZipCrypto` falhou 1 vez em 4 rodadas completas e passou isolado. Fica registrado para investigar; não foi silenciado.
