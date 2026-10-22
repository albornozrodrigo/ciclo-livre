---
phase: 04-previsao
plan: 03
completed: 2026-10-22T22:20:00Z
duration: ~40min
description: "Calendário mensal sem limite de horizonte com fases reais e previstas, ovulação, hoje e dias registrados; nomes acessíveis completos e legenda escrita"
type: Summary
about: "ciclo-livre"
---

# Phase 4 Plan 03: Calendário — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Grade do mês | PASS | `calendar.test.ts` (semanas domingo–sábado, fora do mês, fases real/prevista, ovulação, hoje, registro, sem modelo, horizonte, fevereiro de 4 semanas) |
| AC-2 Tela | PASS | `calendario.test.tsx` (título, legenda, nome acessível com fase e registro, toque abre registro, 24 meses à frente, futuro não abre); aparelho: dia 13 → registro de 13/10; novembro com menstruação prevista 12–16 |
| AC-3 Qualidade | PASS | 320 testes, tsc, lint, detector |

## Fixes no aparelho
- `capitalize` virava "Outubro De 2026" → só a primeira letra.
- Anel da ovulação sumia sob o contorno previsto → camada própria.
- "Próximo mês" quebrava em duas linhas → botões flexíveis.
- Ponto da legenda saía grande; células mais altas para o ponto não encostar no anel.

## Notes
- Em telas de 360dp a célula fica ~46dp de largura (abaixo de 48dp); altura 64dp. Revisar em aparelho pequeno.
- Semente do onboarding aparece como menstruação real (foi informada pela pessoa).

## Finish review (Impeccable) — aplicado
1. Honestidade: "Próxima menstruação: **por volta de** N dias"; confiança alta sem "firme".
2. WCAG 1.4.11: previsto = cor cheia + tracejado 2dp em tinta (verde/coral tracejado na água < 3:1).
3. Fora do mês com `ink-muted` (sem opacidade 0,35).
4. Dias futuros desativados para o TalkBack (verificado na árvore de acessibilidade do aparelho).
5. Plurais: "Falta 1 dia", "20 semanas" (sem "e 0 dias").
6. Dia do ciclo em display 44sp.
7. DESIGN.md: Hoje na cor da fase; seção Calendário.
8. Evidências refeitas (claro, escuro, detalhes). Extra achado no escuro: números sobre coral/terra ficavam claros → sempre `ink` sobre território.
Não aplicado (teto): lobo da próxima fase sobreposto, marca de sol para hoje no calendário.

## /code-review de fechamento da fase 4 (c03c07f..HEAD)
| # | Achado | Veredito | Ação |
|---|--------|----------|------|
| 1 | No dia esperado/atraso, hoje virava "dia 1, menstruação, real" sem registro | Válido, sério | Fronteira do ciclo atual nunca antes de amanhã; "próxima" mostrada separada (TDD) |
| 2 | Menstruação em andamento terminava no 1º dia e puxava a média | Válido, sério | Em andamento vai até a duração média e fica fora da média (TDD) |
| 3 | Ovulação estimada andava a cada dia de atraso | Válido | Calendário a partir da data esperada (TDD) |
| 4 | Grade do mês anterior sob o título novo | Válido | hook devolve null até o mês novo carregar (TDD) |
| 5 | Antes de 1970 a aba quebrava | Válido | módulo positivo (TDD) |
| 6 | Cada mês relia todo o histórico | Válido | sinais/modelo uma vez por foco; mês só busca registros |
| 7 | Regras de modelo duplicadas entre Hoje e Calendário | Válido | `cycleModelFor` único (TDD) |
| 8 | Janela fértil/`pad`/chave morta duplicados | Válido | `fertileWindow`, `firstOfMonth`, `model.expected`; chave removida |

Verificação: 337 testes, tsc, lint; S21 FE ok.
