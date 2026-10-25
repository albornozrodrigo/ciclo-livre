---
phase: 12-catalogo-de-registro-completo
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 12-01: Catálogo de registro completo

## O que foi feito
- **Catálogo** (`src/domain/tracking/catalog.ts`). As opções foram só acrescentadas no fim das listas, sem renomear nada:
  - `tests`: `pregnancy_faint`, `ovulation_other_method`;
  - `discharge`: `gray`, `clumpy_white`;
  - `sex`: `orgasm`, `oral`, `anal`, `touch`, `toys`;
  - `pain`: `perineum`;
  - `skin`: `hyperpigmentation`, `stretch_marks`;
  - `feelings`: `guilty`, `apathetic`, `confused`, `obsessive_thoughts`, `self_critical`;
  - `medication`: `hormone_therapy`.
- **Categorias novas:** `clots` (Ciclo, escondida em gravidez e sem sangramento), `mouth`, `breasts` e `swelling` (Corpo), `self_care` (Mente).
- **Rótulos** próprios em `pt-BR-tracking.ts`. "Pensamentos repetitivos" no lugar de "obsessivos", para não soar como diagnóstico. O grupo de inchaço se chama "Inchaço no corpo", para não confundir com o inchaço da Digestão.
- **Análise:** `clots`, `mouth`, `breasts` e `swelling` entram como sintomas. Corrimento acinzentado e em grumos contam como sintoma (sinal de atenção). Autocuidado e sexo não contam.

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 opções novas, sem mudar as antigas | PASS | `catalog.test.ts` (prefixo anterior + opções novas + rótulos); no S21 FE apareceram Acinzentado, Orgasmo, "linha fraca", Estrias, Boca, Mamas, Inchaço no corpo, Autocrítica, Autocuidado e Terapia hormonal |
| AC-2 Análise | PASS | `analysis.test.ts` (2 testes novos) |
| AC-3 motor inalterado | PASS | `signals.test.ts` (novo): só clara de ovo e ovulação positiva viram sinal |

## Verificação
- `npx jest`: 105 suítes, 856 testes passando, mais o teste de ordem `clots-order.test.ts`.
- `npx tsc --noEmit` e `npx expo lint`: sem erros.
- `/code-review` (low): nenhum bug.

## Desvios
- **Viagem:** não entrou de novo, porque `leisure.travel` já existia.
- **CSV, PDF, chat e resumo do dia:** já usam os rótulos do catálogo de forma genérica, então nada mudou neles.
- **Clue:** nenhuma chave nova mapeada; não há evidência dos nomes no export.
- **"Coágulos" no S21 FE:** não apareceu na varredura por rolagem, e o aparelho desconectou antes de uma segunda conferência. Para descartar erro de ordem, acrescentei um teste que reproduz quem já tinha personalizado as categorias: "Coágulos" entra logo depois de Testes. Fica para conferir na próxima vez que o aparelho estiver conectado.

## Decisões
| Decisão | Motivo |
|---------|--------|
| Opções novas só no fim das listas; categorias novas no fim do grupo | Ids e ordem são chave no banco, no backup e no CSV |
| Corrimento acinzentado e em grumos contam como sintoma | São sinais de atenção, diferentes dos estados normais do muco |
