---
phase: 15-ciclos-fora-do-padrao
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 15-01: Ciclos fora do padrão

## O que foi feito
- **Critério** (`stats.ts`): os 12 ciclos completos mais recentes são julgados juntos. Um ciclo fica fora do padrão quando:
  - é implausível (fora de 15–90 dias); ou
  - está a 8 dias ou mais da mediana dos outros, com pelo menos 3 referências.
  - Só vale se os marcados forem minoria (até 1/3 dos plausíveis).
- **`diffFromUsual`:** duração menos a mediana dos outros, truncada em direção a zero. É null com menos de 2 referências e para ciclos implausíveis.
- **Mesma marcação em todo o app:** `recentAtypical` e `recentDiffs` são usados pela previsão (`cycleStats`), pelo histórico, pelo resumo, pelo gráfico, pelo PDF e pelo chat.
- **Previsão:** usa os 6 ciclos plausíveis mais recentes que não estão marcados. Com `includeAtypical`, volta a usar os 6 plausíveis mais recentes, como antes.
- **Perfil:** novo campo `includeAtypical` (migration v9, backup com ausência = false) e interruptor em Dados do ciclo.
- **Análise:**
  - no histórico, selo "Fora do padrão" e a linha "N dias mais curto/longo que o normal" (a partir de 2 dias), também no nome acessível;
  - no resumo, "N ciclos fora do padrão não entram na média nem nas previsões. Dá para incluir em Mais → Dados do ciclo.";
  - o gráfico de barras usa os mesmos ciclos do resumo.
- **PDF:** a duração vem com "(fora do padrão)" e o texto diz quantos ciclos ficaram de fora.
- **Chat:** a linha do ciclo diz "(fora do padrão, fora da média)".

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 critério | PASS | `stats.test`: 28/29/27/45/28 marca só o 45; menos de 3 referências não marca; implausível marca; dois grupos e ciclos alternados não marcam |
| AC-2 previsão | PASS | `atypical-model.test`: ciclo de 28 dias sem o 45, 31 com a opção; `stats.test`: mudança de padrão (20×26 e depois 8×35) prevê 35 |
| AC-3 comparação | PASS | `atypical-model.test` (+17 e selo), `analise.test` (selo, diferença, aviso, barras), `data-context.test` |
| AC-4 preferência e backup | PASS | `profile-edit.test` (interruptor salva), `profile-repo.test` (ida e volta true), `export-repo.test` (ausente = false; schema 9) |

## Revisão (subagente) e correções
1. **Previsão e Análise julgavam com referências diferentes** (12 recentes × todos). Numa mudança de padrão, a tela dizia que os ciclos de 35 dias estavam fora da média, mas a previsão usava 35. Agora a janela é uma só.
2. **Todos marcados com dois grupos do mesmo tamanho ou ciclos alternados.** A previsão caía na duração do perfil e a Análise sumia. Agora há a regra da minoria.
3. **Gráfico de barras diferente do resumo:** corrigido.
4. **"+92 dias" para um registro implausível:** a diferença agora é null para ciclos implausíveis.
5. **Com a opção ligada, a média podia usar menos de 6 ciclos:** volta a usar os 6 plausíveis mais recentes.

## Verificação
- `npx jest`: 108 suítes, 910 testes passando; `tsc` e `lint` sem erros.
- **Desvio:** não tirei print no aparelho. O emulador só tem um ciclo, então não haveria ciclo atípico para mostrar. As telas estão cobertas por testes de componente (Análise e perfil).

## Decisões
| Decisão | Motivo |
|---------|--------|
| Mediana dos outros, 8 dias, ≥ 3 referências, minoria de até 1/3 | Robusto a um ciclo atípico; não pune quem tem ciclos alternados nem quem mudou de padrão |
| Janela única dos 12 mais recentes | Previsão e telas nunca se contradizem |
| Interruptor global, sem marcar ciclo a ciclo | Escopo da fase; dá para refinar depois |
