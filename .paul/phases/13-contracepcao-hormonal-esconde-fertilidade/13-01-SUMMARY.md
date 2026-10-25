---
phase: 13-contracepcao-hormonal-esconde-fertilidade
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 13-01: Contracepção hormonal esconde fertilidade

## O que foi feito
- **Regra única no modelo:**
  - `CycleModel.fertilityHidden` vem ligado por `cycleModelFor` quando o método do perfil está em `HORMONAL_METHODS`: pílula, adesivo, anel, injeção, implante e DIU hormonal.
  - `buildCycleModel` continua puro: não conhece o perfil.
- **Nova fase `hormonal`** ("Contracepção hormonal"): os dias fora do sangramento ficam com ela. Nunca aparecem `fertile`, `follicular` nem `luteal`.
- **Previsão do sangramento:** não muda.
- **Efeitos:**
  - calendário sem anel de ovulação;
  - Hoje com `fertile: null` e a frase "Com contracepção hormonal, o app não estima janela fértil nem ovulação…";
  - `CycleRow.ovulation` null, o que deixa a coluna do PDF com "—";
  - o contexto do chat troca a janela fértil por uma frase explicando;
  - o lembrete de janela fértil mostra "Este lembrete não vai tocar" (não há fase fértil para agendar);
  - nova variante `phase_hormonal` no lembrete de mudança de fase.
- **Cor:** território neutro (lago) na tela Hoje e chip neutro na Análise.

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 modelo com método hormonal | PASS | `hormonal.test.ts` (6 métodos; próxima data igual) |
| AC-2 outros métodos sem mudança | PASS | `hormonal.test.ts` (cobre, camisinha, outro, prefiro não dizer, nenhum, null) |
| AC-3 telas e saídas | PASS | testes de Hoje, calendário, histórico, lembrete, contexto do chat e PDF; prints no emulador com pílula (Hoje e calendário) |

## Verificação
- `npx jest`: 107 suítes, 877 testes passando; `tsc` e `lint` sem erros.
- **Emulador** (o S21 FE desconectou duas vezes): cadastro com pílula.
  - Hoje: chip "Contracepção hormonal", sem janela fértil, com o texto explicativo.
  - Calendário: só menstruação; os dias são lidos como "contracepção hormonal".

## Revisão de código (subagente, diff não commitado) e correções
O `/code-review` comparou com uma base antiga (falta push) e cobriu só o começo do diff. Por isso rodei uma revisão focada, que achou 3 bugs e 3 inconsistências, todos corrigidos com teste:
1. **Gráfico de temperatura:** afirmava a ovulação com método hormonal. Agora `bbtChartFor(model, temps)` devolve `fertilityHidden`, e a Análise e o PDF dizem que a temperatura não é usada para estimar ovulação.
2. **Modo Tentar engravidar:** com um método antigo salvo, perdia a janela fértil. `hidesFertility` ignora o método nesse modo, que não pergunta por ele.
3. **Prévia do lembrete "Mudança de fase":** mostrava a fase folicular. Agora mostra `phase_hormonal` quando o método é hormonal.
4. **Inconsistências menores:**
   - a legenda do calendário perde "Janela fértil" e "Anel";
   - `availableKinds` não oferece `fertile_soon`;
   - a coluna de ovulação sai do PDF quando todas as linhas estão vazias.

Depois das correções: 107 suítes, 880 testes, `tsc` e `lint` sem erros.

## Decisões
| Decisão | Motivo |
|---------|--------|
| DIU hormonal entra na lista, mesmo que muita gente com ele ainda ovule | Mesmo comportamento do Flo; estimar fertilidade com DIU hormonal induz erro. Quem quiser fertilidade troca o método no perfil |
| No modo Engravidar a fertilidade sempre aparece, mesmo com método hormonal salvo | O modo não pergunta o método; um método antigo apagaria a função central do modo (achado da revisão) |
| Legenda do calendário sem "Janela fértil" e "Anel" com método hormonal | Nenhum dia usa essas marcas (achado da revisão) |
