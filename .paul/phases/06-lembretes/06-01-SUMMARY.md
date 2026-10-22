---
phase: 06-lembretes
plan: 01
completed: 2026-10-23T00:30:00Z
duration: ~35min
description: "Domínio dos lembretes: catálogo por modo e método, agenda pura de 60 dias a partir do motor do ciclo, mensagem validada, textos pt-BR e persistência (migration v5)"
type: Summary
about: "ciclo-livre"
---

# Phase 6 Plan 01: Domínio dos lembretes — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Catálogo | PASS | `catalog.test.ts`: tipos por modo (gravidez só registro; sem sangramento sem ciclo), contraceptivo só para pílula/adesivo/anel/injeção, aviso em "tentando engravidar", opções validadas campo a campo |
| AC-2 Agenda | PASS | `schedule.test.ts` (19): menstruação N dias antes/no dia/atraso só da próxima; atraso suspende; janela fértil e fases pelo `dayInfo`; pílula contínua e 21+7, adesivo, anel, injeção; registro a cada 3 dias/semanal/quinzenal/mensal (último dia do mês); passado fora; máx. 64 ordenados com chaves únicas |
| AC-3 Mensagem | PASS | `message.test.ts`, `pt-BR-reminders.test.ts`: 40/100, vazio = padrão, janela fértil sempre "não serve como contracepção", discreto neutro mesmo com mensagem própria |
| AC-4 Persistência | PASS | migration v5 `reminder` (CHECKs de horário e tamanhos); `reminder-repo.test.ts`: padrão sem linha, upsert, recusa inválidos, discreto em `app_meta`; queries parametrizadas via `enqueueWrite`; nada é logado |
| AC-5 Qualidade | PASS | cobertura 98,6% em `src/domain/reminders`; 409 testes; tsc; lint |

## Decisões
- Confiança baixa não bloqueia lembretes de menstruação (quem acabou de chegar sempre está em baixa); só a falta de modelo bloqueia.
- Em atraso, nenhum lembrete de previsão (menstruação, fase, fértil) até o registro; o de atraso dispara uma vez, no dia seguinte ao esperado.
- Agenda trabalha com data + minutos locais (sem fuso no domínio); a conversão para `Date` fica no agendador (06-02).
- "Apagar tudo" já remove a tabela (apaga o arquivo do banco); cancelar notificações pendentes é do 06-02.

## Adiado
- "Alterações nas estatísticas do ciclo" (exige tarefa em segundo plano).
