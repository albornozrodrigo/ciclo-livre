---
phase: 18-lembretes-diu-implante-injecao-remedios
plan: 02
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 18-02: Lembrete de remédios

## O que foi feito
- **`src/domain/reminders/medication.ts`:** `Med` (nome, horários, término) e `validMeds`, com até 5 remédios, 1 a 4 horários distintos e nome de até 30 caracteres.
- **Lembrete "Remédios"** (`medication`):
  - disponível em todos os modos, inclusive gravidez, no grupo "Saúde";
  - `ReminderOptions.meds`;
  - backup antigo sem o campo vira lista vazia.
- **Agenda:**
  - cada horário de cada remédio, até o término (`Occurrence.time`), com variantes `medication_0..4` e a chave incluindo o horário;
  - os outros lembretes vêm primeiro e os remédios usam o espaço que sobra (limite subiu de 200 para 400; o Android aceita uns 500).
- **Notificação:** "Hora do remédio" e o nome. No modo discreto (padrão), o texto é neutro; o nome não vai para o identificador nem para `data`.
- **Editor:**
  - lista com nome, horários (adicionar e tirar), término opcional e "Terminou em…" quando já passou, remover e adicionar;
  - o horário geral fica escondido;
  - nome vazio ou horários repetidos mostram erro; ligar sem remédio pede um.
- **Registro:** ao salvar, cada remédio vira uma tag (`ensureTags`, sem duplicar pela chave). Se a tag falhar, o salvar continua com sucesso e o erro só vai para o log.
- **Lista:** "Ligado · 2 remédios". Ligar pela lista sem remédio abre o editor.

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 validação | PASS | `medication.test` (7 recusas; parse inválido volta a []) |
| AC-2 agenda | PASS | `medication.test` (Ferro 2×/dia até 30/10; Vitamina D diária; chaves únicas; remédios não expulsam o registro diário) |
| AC-3 conteúdo e registro | PASS | `medication.test` (nome no corpo), `tag-repo.test` (`ensureTags`, falha comprovada sem a criação), `lembretes.test` (tag criada ao salvar) |
| AC-4 tela | PASS | `lembretes.test` (adicionar, nomear, horário, salvar; nome vazio dá erro; lista abre o detalhe) |

## Revisão (subagente) e correções
1. **O limite de disparos cortava pílula e menstruação:** agora a cota dá prioridade aos outros lembretes e o limite subiu para 400.
2. **Ligar pela lista com a lista vazia ficava "ligado" sem efeito:** agora abre o editor.
3. **O subtítulo mostrava um horário não usado:** agora mostra quantos remédios há.
4. **Falha de tag aparecia como falha do salvar:** agora é capturada à parte.
5. **Término no passado sem aviso:** "Terminou em…" no editor.

## Verificação
- `npx jest`: 111 suítes, 969 testes passando; `tsc` e `lint` sem erros.
- A política de privacidade continua correta: ela já cita tags e o texto dos lembretes fora do modo discreto. Revisão confirmou.

## Decisões
| Decisão | Motivo |
|---------|--------|
| Remédios viram tags (não categoria do catálogo) | Reaproveita o registro existente; sem tabela nem categoria dinâmica |
| Um lembrete com lista (até 5), não 5 tipos | A tabela de lembretes tem um registro por tipo; lista cabe nas opções |
| Sem marcar a dose pela notificação | Escopo; fica para depois |
