---
phase: 05-analise
plan: 02
completed: 2026-10-22T23:59:00Z
duration: ~1h30
description: "Tela Análise: números do ciclo com base declarada, barras com faixa coral da menstruação, histórico, sintomas por fase, temperatura e medições; véu da barra de status nas abas"
type: Summary
about: "ciclo-livre"
---

# Phase 5 Plan 02: Tela Análise — Summary

| AC | Status | Evidence |
|----|--------|----------|
| Números, barras, histórico | PASS | `analise.test.tsx` (9), `bar-chart.test.tsx` (6); S21 FE: 29 dias · 28–30 dias · 3 dias, "Com base em 2 ciclos completos", barras 28/30 com faixa coral |
| Sintomas, temperatura, medições | PASS | testes de tela; aparelho: texto "Nenhum sintoma registrado…" com 2 ciclos completos, BBT vazio, peso 64,5 kg sem média repetida |
| Acessibilidade | PASS | resumo do gráfico, barras com estado selecionado, rótulo em live region, linhas com um foco só; árvore conferida via uiautomator |
| Claro/escuro | PASS | capturas no aparelho (topo e rolado) |
| Qualidade | PASS | 374 testes, tsc, lint, detector `[]` |

## Achados no aparelho
- Tocar uma barra deixava as duas em tinta → só a tocada (TDD).
- Ao rolar, o texto passava sob os ícones da barra de status e, no escuro, os ícones ficavam escuros sobre fundo escuro → véu em `water` após o lobo e barra de status por aba em foco (TDD em `screen.test.tsx`).
- Menstruação enterrada no fim do grupo Ciclo após personalizar em outro modo → `orderCategories` encaixa ao lado do vizinho padrão (commit c30a99f, TDD).

## Finish review (Impeccable) — aplicado
1. DESIGN.md: estatística, gráficos, linhas de histórico/sintoma, véu da barra de status; tabulares também nos valores grandes.
2. Barra destacada explicada em texto ("· último ciclo completo"), live region, `selected` nos alvos.
3. "Com base em N ciclos completos" visível (+ "Fica mais preciso…" com menos de 3).
4. Texto de sintomas certo quando já há ciclos suficientes.
5. Valor antes do rótulo, `28–30 dias`, tabulares.
6. Faixa coral da menstruação na base das barras, com legenda escrita (teto "território dentro do dado").
7. Linhas do histórico e de sintoma com um foco só.
8. Ritmo: seções a 32dp, títulos a 16dp. Notas: véu entra a 75% do lobo; média escondida com 1 registro.
Não aplicado: "média 29" na ponta da linha de referência; número principal em Display; movimento.

## /code-review de fechamento da fase 5 (84f530a..HEAD)
| # | Achado | Veredito | Ação |
|---|--------|----------|------|
| 1 | Resumo usava durações implausíveis (≠ previsão) | Válido | `isPlausibleCycle` compartilhado; resumo e barras filtram (TDD) |
| 2 | Estados neutros (corrimento normal, energia boa) como sintomas | Válido | exclusão por opção (TDD) |
| 3 | `orderCategories` põe categoria sem preferência acima da 1ª escolhida | Recusado | intencional: categoria de outro modo volta ao lado da vizinha padrão; personalizar salva preferência de todas as visíveis |
| 4 | Total de ciclos dos sintomas contava todo o histórico | Válido | até 12 e desde o 1º ciclo com sintoma (TDD) |
| 5 | Histórico mostrava duração estendida da menstruação em andamento | Válido | dias registrados; semente = "início informado no cadastro" (TDD) |
| 6 | Menstruação média de outra janela/padrão do cadastro | Válido | só registradas e terminadas, mesma janela; null esconde (TDD) |
| 7 | Seleção da barra inválida após dados mudarem | Válido | volta para a destacada (TDD) |
| 8 | Erro no cálculo virava rejeição sem log | Válido | `.catch` |
| 9 | Leitura dupla/integral no foco da Análise | Válido, adiado | perf: unificar leitura e limitar por data |
| 10 | Checagem `hidden` redundante | Válido | removida |
