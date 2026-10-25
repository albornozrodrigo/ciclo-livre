---
phase: 16-status-engravidar-chance-por-dia
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 16-01: Status do modo Engravidar e chance por dia

## O que foi feito
- **`src/domain/cycle/conceive.ts`:**
  - `chanceFor`: chance alta de O−2 a O, média de O−5 a O−3 e em O+1, baixa nos outros dias. Fonte: Wilcox, Weinberg e Baird, NEJM 1995.
  - `conceiveStatus`: devolve "melhor chance em N dias", "último dia fértil", "teste de gravidez a partir de" ou "atraso: já dá para testar".
  - `pregnancyTestDate`: a menstruação esperada ou 14 dias depois da ovulação, o que vier depois.
- **Hoje** (só no modo Tentar engravidar): mostra "Chance de engravidar hoje: …", a linha do próximo passo e a nota com a fonte e o aviso de que não é contraceptivo.
- **Calendário:** os dias de chance média ou alta dizem isso no nome acessível. Não há cor nova.
- **Lembrete "Dia do teste de gravidez"** (`pregnancy_test`):
  - só no modo Tentar engravidar, no grupo Ciclo da lista;
  - dispara no dia do teste do ciclo atual e repete nos ciclos previstos dentro dos 60 dias;
  - aceita mensagem personalizada.
- **Chat:** linha "Chance de engravidar hoje (estimativa por dia da ovulação): …".

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 chance por dia | PASS | `conceive.test` (7 offsets) |
| AC-2 status | PASS | `conceive.test` (antes, dentro, depois, atraso, ovulação tardia); Hoje só no modo conceive |
| AC-3 telas | PASS | `hoje.test` (chance, próximo passo, fonte; nada no modo menstruação), `calendario.test` (nome acessível); emulador: "Chance de engravidar hoje: média / Melhor chance: a partir de amanhã" |
| AC-4 lembrete | PASS | `conceive.test` (data, repetição), `lembretes.test` (aparece só no modo conceive) |

## Revisão (subagente) e correções
1. **O lembrete não aparecia na lista**, porque `GROUPS` era fixo: ele entrou no grupo Ciclo.
2. **A mensagem personalizada era aceita e ignorada:** o tipo entrou em `CUSTOMIZABLE`.
3. **Com ovulação tardia, o "teste confiável" vinha cedo demais:** o dia agora é `max(esperada, ovulação + 14)`.
4. **Só um disparo:** o lembrete agora repete nos ciclos previstos.

## Verificação
- `npx jest`: 109 suítes, 932 testes passando; `tsc` e `lint` sem erros.

## Decisões
| Decisão | Motivo |
|---------|--------|
| Wilcox 1995 como curva, em 3 níveis em vez de porcentagem | O estudo é a referência aberta mais citada; níveis não dão falsa precisão a uma estimativa |
| O+1 como "média" | Margem da estimativa de ovulação (o estudo dá ~0 depois da ovulação) |
| Sem tabela por idade | A do Flo não tem fonte aberta |
| Teste a partir de max(esperada, ovulação + 14) | Resultado confiável depende da ovulação real |
