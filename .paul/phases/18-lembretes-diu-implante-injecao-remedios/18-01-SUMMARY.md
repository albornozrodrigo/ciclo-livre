---
phase: 18-lembretes-diu-implante-injecao-remedios
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 18-01: Lembretes de DIU e implante

## O que foi feito
- **Planos novos no lembrete "Contraceptivo":** `iud_hormonal`, `iud_copper` e `implant`. Cada DIU é um plano: trocar de um para o outro invalida a data da colocação.
- **Opções:**
  - `years`: validade de 1 a 12 anos; null usa o padrão (DIU hormonal 5, DIU de cobre 10, implante 3);
  - `threads` (DIU): depois de cada menstruação, todo mês ou não lembrar.
  - O backup aceita opções antigas sem esses campos.
- **Agenda:**
  - checar os fios no dia seguinte ao fim da menstruação atual (se ainda não passou) e de cada uma das previstas;
  - sem ciclo previsto (sem sangramento, atraso), ou com "todo mês", no dia da colocação;
  - troca 30 dias antes e no dia;
  - com a validade vencida, um aviso por mês no dia do vencimento;
  - nada antes da colocação.
- **Tela:** data da colocação (até 12 anos atrás), validade, checagem dos fios (só DIU), aviso de validade vencida e prévia.
- **Injeção:** já avisava 7 dias antes (`injection_soon`); não mudou.

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 planos | PASS | `schedule.test` (troca de DIU invalida a data); `lembretes.test` (pede a data da colocação) |
| AC-2 agenda do DIU | PASS | `schedule.test`: fios depois da menstruação (atual e previstas), todo mês, nunca, sem ciclo previsto, troca |
| AC-3 implante | PASS | `schedule.test` (troca, aviso passado não agendado, validade vencida) |
| AC-4 tela e opções | PASS | `lembretes.test` (DIU: 10 anos padrão, ajusta e salva; implante vencido avisa), `catalog.test` (parse) |

## Revisão (subagente) e correções
1. **"Depois da menstruação" sem modelo ou com atraso:** não agendava nada (DIU hormonal que suprime o sangramento). Agora cai para "todo mês".
2. **Validade vencida:** o lembrete ficava ligado sem disparar. Agora avisa todo mês, e a tela mostra a data.
3. **Menstruação em andamento:** a checagem dela era pulada. Agora entra.
4. **Um único plano para os dois DIUs:** trocar hormonal ↔ cobre mantinha a data antiga, e o cobre ficava com 5 anos. Agora são planos separados, e o cobre tem 10 anos por padrão.
5. **Texto do dia da troca:** "pode não proteger mais" era alarmista com validade errada. Virou "Pela validade que você informou, a troca é hoje. Confirme com o serviço de saúde."
6. **Colocação no futuro:** nada é agendado antes dela.

## Verificação
- `npx jest`: 110 suítes, 953 testes passando; `tsc` e `lint` sem erros.
