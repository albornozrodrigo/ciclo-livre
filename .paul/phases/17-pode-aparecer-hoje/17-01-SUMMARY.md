---
phase: 17-pode-aparecer-hoje
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 17-01: "Pode aparecer hoje"

## O que foi feito
- **`src/domain/tracking/symptoms.ts`:** a regra "o que é sintoma" (`isSymptom`) saiu da Análise. É usada por "sintomas frequentes" e pela previsão.
- **`src/domain/cycle/likely-today.ts` (`predictLikelyToday`):** usa os ciclos completos recentes (até 6) que têm algum sintoma registrado, sem os fora do padrão, a menos que a pessoa os inclua. Um sintoma conta num ciclo quando aparece a ±1 dia do mesmo ponto: contado a partir do início na primeira metade do ciclo, ou a partir da menstruação seguinte na segunda. Entra se apareceu em pelo menos 2 ciclos e em mais da metade. Mostra até 3. Com a menstruação atrasada, não prevê nada.
- **`CycleSignals.symptoms` e `TodayView.likelyToday`.**
- **Componente `LikelyToday`:** título "Pode aparecer hoje", uma linha por sintoma ("Cólica: em 3 dos 3 ciclos com registro") e a nota "Pelo que você registrou neste mesmo ponto dos ciclos anteriores." Aparece em Hoje e no topo do registro de hoje. No registro, é recalculado quando a pessoa registra algo.

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 regra | PASS | `likely-today.test`: frequente aparece, raro não; TPM pela régua do fim; neutros e não-sintomas nunca; máximo 3; menos de 2 ciclos não prevê; atraso não prevê |
| AC-2 onde aparece | PASS | `hoje.test` (bloco com o motivo), `registro.test` (hoje sim, outro dia não) |

## Revisão (subagente) e correções
1. **Atraso:** a régua "antes da próxima" casava todo dia com a véspera dos ciclos anteriores. Agora, com atraso, a lista vem vazia.
2. **Réguas misturadas:** as duas valiam em qualquer dia, e a dor do meio de um ciclo longo podia contar no começo do ciclo. Agora é uma régua por metade do ciclo. Os atípicos ficam de fora, como na fase 15.
   - **Desvio:** o teste que eu escrevi para esse caso não reproduzia o problema (passaria de qualquer jeito), então tirei esse teste. A correção está no código, mas sem teste próprio.
3. **Texto:** "dos últimos Y ciclos" virou "dos Y ciclos com registro", porque Y conta só os ciclos com algum sintoma.
4. **Registro desatualizado:** `useTodayCycle` ganhou um `refreshKey`. O registro passa o dia (estado estável, sem loop) e só consulta quando a data é hoje.

## Verificação
- `npx jest`: 110 suítes, 940 testes passando; `tsc` e `lint` sem erros.
- Não tirei print no aparelho: o emulador tem um ciclo só, então não haveria nada para mostrar. A tela está coberta por testes de componente.

## Decisões
| Decisão | Motivo |
|---------|--------|
| ±1 dia, mais da metade e no mínimo 2 | Evita prever a partir de uma ocorrência isolada |
| Régua do início na 1ª metade, do fim na 2ª | Sintomas de começo e de antes da menstruação ficam alinhados mesmo com ciclos de tamanhos diferentes |
| Com contracepção hormonal, continua valendo (usa os sangramentos registrados) | Sintomas ligados ao sangramento de pausa também são úteis; não afirma fertilidade |
