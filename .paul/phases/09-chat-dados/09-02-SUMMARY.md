---
phase: 09-chat-dados
plan: 02
completed: 2026-10-23T14:40:00Z
duration: ~1h30
description: "Telas do chat com seus dados: entrada na Análise, consentimento com o texto exato, conversa, controles em Mais → IA"
type: Summary
about: "ciclo-livre"
---

# Phase 9 Plan 02: Telas do chat — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Entrada e consentimento | PASS | Linha "Perguntar sobre meus dados" no topo da Análise → `/chat`. Sem chave: aviso + Mais → IA (`next=chat`, e salvar a chave segue para o consentimento); sem consentimento: `/chat/consentimento` com o que vai, o que nunca vai, para onde, escopo (6/12 ciclos, notas desligadas) e o texto exato refeito na hora, com contagem. "Concordo" grava escopo + consentimento; "Agora não" não grava. S21 FE: texto exato com dados reais (770 caracteres, datas dd/mm/aaaa, sem ano de nascimento/tags/notas) |
| AC-2 Conversa | PASS (sem prova de envio real no aparelho) | Histórico salvo; perguntas sugeridas (só preenchem o campo); campo com contador "N de 3.000" e erro acima do limite; "Pensando…" polite; resposta anunciada no TalkBack; erro em Aviso de atenção com "Tentar de novo" e a pergunta de volta no campo; "Ver o que é enviado"; "Apagar conversa" com confirmação; aviso fixo. Testes de tela com fetch simulado |
| AC-3 Mais → IA | PASS | Seção "Perguntas sobre seus dados": estado, revogar (não mexe no consentimento dos artigos), revisar e concordar, apagar conversa só quando existe, falhas avisadas |
| AC-4 Qualidade e aparelho | PARCIAL | 686 testes, tsc e lint limpos; Impeccable: 5 must-fix + 3 nice aplicados; DESIGN.md com os padrões novos. S21 FE: migração v6 rodou no banco real (app abre sem erro), entrada na Análise, ida para a chave, consentimento com o texto exato. **Não provado no aparelho:** a tela de conversa e o envio real, porque não há chave da Anthropic salva no S21 FE (salvar exige chave válida, testada na API) |

## Desvios
- Perguntas sugeridas preenchem o campo em vez de enviar (o Clue envia na hora): cada envio custa na chave da pessoa.
- Texto exato com datas dd/mm/aaaa e linhas mais simples (pedido do Impeccable): a pessoa precisa entender para consentir.
- Aviso de atenção virou componente (`src/components/ui/attention-notice.tsx`).

## Pendências
- Prova de uma conversa real (e do teclado sobre o campo) no S21 FE quando houver uma chave da Anthropic.
