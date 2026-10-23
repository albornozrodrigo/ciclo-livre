---
phase: 09-chat-dados
plan: 01
completed: 2026-10-23T13:30:00Z
duration: ~1h30
description: "Base do chat com seus dados: resumo local exato, histórico cifrado, consentimento próprio e envio com travas"
type: Summary
about: "ciclo-livre"
---

# Phase 9 Plan 01: Base do chat — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Resumo exato e mínimo | PASS (com desvio) | `src/domain/ai/data-context.ts` + `src/i18n/pt-BR-chat.ts`: modo, contracepção (omitida em "prefiro não dizer"), ciclo atual com margem, resumo, ciclos do escopo, sintomas, medições de 90 dias; sem ano de nascimento, tags nem lembretes; notas só ligadas (limpas, ≤ 300 cada, só do período). ≤ 8000 caracteres, determinístico; sem dados, diz isso. 10 testes + amostra impressa revisada |
| AC-2 Conversa cifrada | PASS | Migração v6 `chat_message` (CHECK 1–4000); `chat-repo` grava o par numa transação, corta no teto, recusa vazio; apagar conversa; restaurar backup apaga a conversa; exportação não a leva |
| AC-3 Consentimento próprio | PASS | `ai_chat_consent` + escopo (6/12 ciclos, notas) em `ai-settings-repo`, independente do consentimento dos artigos; `requestChat` relê no envio; sem chave/consentimento, pergunta vazia ou > 3000: nada sai |
| AC-4 Envio com travas | PASS | `chat()` extraído de `summarize` (mesmo prazo, cancelamento, retry só no 400 do fallback, refusal/max_tokens); `buildChatPrompt` com instruções fixas, `<dados>` na primeira mensagem, últimas 10 mensagens alternadas, `<pergunta>`; trava global `ai-lock` compartilhada com o resumo; o texto enviado é igual à `previewChatContext` (teste compara) |

Qualidade: 670 testes (eram 643), tsc e lint limpos.

## Desvios
- Teto de tamanho corta primeiro as **notas** antigas e depois os ciclos antigos (o plano dizia ciclos primeiro): notas são opcionais; os ciclos são a base das perguntas.
- "Prefiro não dizer" sobre contracepção não entra no resumo (não estava no plano).
- O teste do "prefiro não dizer" foi escrito junto com a implementação (não vi o vermelho antes); os demais seguiram vermelho → verde.

## Pendente para o 09-02
- Migração v6 ainda não rodou no S21 FE (banco real SQLCipher): conferir ao abrir o app.
