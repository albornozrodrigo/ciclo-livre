---
phase: 20-modo-menopausa
plan: 01
status: complete
completed: 2026-10-26
description: "Modo Menopausa: última menstruação opcional, meses sem menstruar, sem previsão, Calores e categoria Menopausa, aviso de sangramento depois da menopausa"
type: Summary
about: "ciclo-livre"
---

# 20-01: Modo Menopausa

## O que foi feito
- **Perfil:**
  - `MODES` ganhou `menopause`.
  - `Profile.finalPeriod` guarda a data aproximada da última menstruação. É opcional, só existe nesse modo e vale até 50 anos atrás (`finalPeriodOldest`).
  - Uma data que envelheceu e não foi mexida não trava a edição.
- **Migration v12:** reconstrói `profile` (CREATE, INSERT SELECT, DROP, RENAME) e acrescenta `final_period`. O teste confirma que o perfil anterior volta igual, inclusive `baby_birth` e `twins`.
- **Backup:** arquivo sem o campo restaura com `null`. Fora da menopausa o campo vira `null`, e uma data inválida faz o arquivo ser recusado.
- **Motor (`menopause.ts`):**
  - não há modelo de ciclo;
  - a contagem de meses parte da última menstruação, informada ou registrada;
  - a menopausa fica confirmada com 12 meses de calendário;
  - sangramento (menstruação ou escape, por `spottingDates`) que começa 12 meses ou mais depois da referência anterior é sangramento depois da menopausa: o aviso fica por 180 dias depois do último, e a contagem continua a partir de antes dele;
  - sangramentos com até 7 dias de intervalo contam como um episódio.
- **Hoje:**
  - antes de 12 meses mostra "N meses sem menstruar", com a explicação; depois, "Menopausa: N anos e N meses sem menstruar";
  - o cartão de sangramento manda procurar um serviço de saúde;
  - sem data, convida a informar em Mais.
- **Registro:**
  - Calores aparece na perimenopausa e na menopausa;
  - nova categoria "Menopausa", no fim do grupo Corpo, com secura vaginal, dor na relação, urgência para urinar, escape de urina e palpitações. Ela aparece nos dois modos e conta como sintoma;
  - a TPM fica escondida na menopausa.
- **Onboarding e troca de modo:**
  - o onboarding pergunta só a última menstruação, com "Não lembro", e vai para o fim;
  - a troca de modo tem o campo opcional com "Não lembro".
- **Lembretes:** remédios e registro, mais o contraceptivo se houver plano. O atalho "Adicionar terapia hormonal" fica na lista de remédios, em qualquer modo.
- **Chat:** linha "Menopausa: … sem menstruar (sem previsão de ciclo)", com o sangramento quando houver.
- **Política, site e README:**
  - a política agora lista as datas que cada modo guarda (vigência 26/10/2026), e o site foi regenerado;
  - README e site dizem "Sete modos" e "53 categorias".

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 perfil, banco e backup | PASS | `profile.test` (menopausa: opcional, faixa, só no modo), `profile-repo.test` (migration v12), `export-repo.test` (ausente = null, inválida recusa, fora do modo = null) |
| AC-2 Hoje e motor | PASS | `menopause.test` (20 casos), `hoje.test` (contagem, aviso de escape, sem data); S21 FE: "1 mês sem menstruar" a partir do histórico |
| AC-3 registro e lembretes | PASS | `menopause.test` (categorias, sintoma, `availableKinds`), `lembretes.test` (atalho); S21 FE: Calores e Menopausa no registro |
| AC-4 onboarding, troca e chat | PASS | `onboarding.test`, `to-profile-input.test`, `profile-edit.test`, `data-context.test`; S21 FE: troca de modo, seletor de data e salvar |

## Revisão (subagente) e correções
1. **Sangrar de novo depois da menopausa apagava o aviso.** O código só comparava com o episódio anterior. Agora, a partir do primeiro sangramento depois da menopausa, todos contam, e a contagem não volta para "pendente".
2. **Sem referência anterior o app afirmava "depois de 12 meses".** Agora não avisa e só recomeça a contagem.
3. **Acolhido:** `confirmed` usa meses de calendário (`months >= 12`), alinhado com o título. 365 dias davam "11 meses" confirmados.
4. **Conferido sem problema:** a migration coluna a coluna (STRICT, CHECKs, DEFAULTs, sem FKs para `profile`), 29/02, datas futuras e as listas de modos.
5. **Mantidos:**
   - o título só ganha o prefixo "Menopausa:" depois de confirmada, porque antes disso ainda não é menopausa;
   - o cartão de teste de gravidez positivo continua aparecendo na menopausa.

## Desvios
- A contagem de categorias em README e site foi de 46 para 53. Fora do plano: o número estava desatualizado desde a v0.2.
- O plano previa que o aviso recomeçasse a contagem. A revisão mostrou que isso tratava o sangramento como menstruação normal, e a contagem passou a seguir de antes dele.

## Pendências
- Artigo próprio sobre menopausa (conteúdo editorial).
- Ao trocar de Perimenopausa para Menopausa, pré-preencher a data com o último sangramento registrado (sugestão da revisão).

## Verificação
- `npx jest`: 115 suítes, 1031 testes passando; `tsc` e `expo lint` sem erros; prettier nos arquivos tocados.
- S21 FE (`RQCRC00WJMV`):
  - a migration v12 abriu sobre os dados de teste sem perda;
  - foi possível trocar para Menopausa, ver Hoje com e sem data e encontrar as categorias no registro;
  - depois o aparelho voltou para "Menstruação e ciclo", no mesmo estado de antes.
