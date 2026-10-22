---
phase: 06-lembretes
plan: 02
completed: 2026-10-23T01:00:00Z
duration: ~2h
description: "Lembretes no aparelho: telas em Mais, permissão do Android 13+, agendamento por diferença, notificações discretas por padrão, apagar tudo cancelando; disparo provado no S21 FE"
type: Summary
about: "ciclo-livre"
---

# Phase 6 Plan 02: Lembretes no aparelho — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Telas | PASS | `lembretes.test.tsx` (14). Lista por grupo com interruptores (role switch, cores do mundo ≥3:1). Detalhe com horário (relógio nativo 24h), dias antes, cartela, frequência, mensagem com contador, prévia e confirmação ao sair sem salvar. Capturas claro/escuro no S21 FE |
| AC-2 Permissão | PASS | Pedido só ao ligar o primeiro lembrete, com canal criado antes (`sync.test`). No aparelho: prompt do Android → "Não permitir" → aviso + "Abrir ajustes", interruptor desligado. Ao voltar com permissão, o aviso some |
| AC-3 Agendamento | PASS (com desvio) | Agenda por diferença (`sync.test`, 10). Reagenda ao abrir, voltar, sair e salvar. Toque no lembrete de registro abre o dia dele. Apagar tudo cancela, sem corrida. **Disparo real:** agendado 17:40, chegou 17:42 (alarme inexato, janela de 2 min), canal e título corretos |
| AC-4 Testes | PASS | 449 testes; tsc; lint |
| AC-5 Aparelho + qualidade | PASS | Capturas; detector `[]`; finish review e /code-review aplicados (abaixo) |

## Desvio importante: tela de bloqueio
O plano previa o canal com `lockscreenVisibility` PRIVATE (depois SECRET). No S21 FE, o Android criou os canais com `mLockscreenVisibility=-1000` (sem substituição), e o `expo-notifications` não define visibilidade por notificação (fica PRIVATE). Na prática, com o ajuste padrão do Android, o texto apareceria na tela de bloqueio.

**Decisão:** notificações discretas **ligadas por padrão** ("Ciclo Livre: você tem um lembrete"). Para ver o texto de saúde, a pessoa precisa desligar esse modo. A prévia e a lista dizem que, sem o modo discreto, a tela de bloqueio segue o ajuste de conteúdo sensível do Android.

**Adiado:** plugin ou patch nativo para `setVisibility(SECRET)` por notificação.

## Finish review (Impeccable) — aplicado
1. Privacidade da tela de bloqueio (acima).
2. Interruptor com tokens do mundo: trilho tinta + botão sol / trilho tinta suave + botão água.
3. DESIGN.md: linha com interruptor, campo de horário, aviso de atenção, prévia de notificação, lista que salva a cada toque.
4. Ligar contraceptivo sem data abre o detalhe já ligado.
5. Sair sem salvar pede confirmação (`usePreventRemove`).
6. Rótulo "Receber este lembrete"; "Mensagem" e "Como vai aparecer" viram títulos de seção.
7. Negar a permissão mostra um snackbar; o aviso persiste enquanto não houver permissão.
8. O texto avisa que os lembretes param após 60 dias sem abrir o app; `maxLength`; dica acessível do horário.
Não aplicado (teto): interruptor em cápsula própria do mundo; movimento.

## /code-review de fechamento (132fa3a..HEAD)
| # | Achado | Veredito | Ação |
|---|--------|----------|------|
| 1 | Apagar tudo × reagendamento em curso | Válido, sério | geração + fila; o cancelamento vem depois do passo em curso (teste) |
| 2 | Mensagem própria em variantes opostas | Válido, sério | só em variantes uniformes; tela esconde os campos (teste) |
| 3 | Teto de 64 encurtava a agenda | Válido | 200; dois diários cobrem 60 dias (teste) |
| 4 | Cancelar tudo a cada ida ao fundo | Válido | agenda por diferença, id com hash do texto/canal (teste) |
| 5 | Dedupe do toque perdido na remontagem | Válido | conjunto no módulo (teste) |
| 6 | Apagar tudo acusava falha com dados já apagados | Válido | erro de cancelamento só vai para o log (teste) |
| 7 | Toque no registro abria hoje | Válido | data nos dados, validada (teste) |
| 8 | Data de referência de outro método | Válido | `anchorFor` (teste) |
| 9 | Falha de releitura pulava o reagendamento | Válido | reagenda antes de reler |
| 10 | Regra "precisa de data" duplicada | Válido | `needsAnchor` no catálogo; `availableKinds` usa `modeHasCycle` |

## Outros
- Formatação: o `prettier --write` sem config reformatou 33 arquivos com aspas duplas. Foi revertido, e agora há `.prettierrc` com o padrão do projeto.
- O aviso "onChange deprecated" do DateTimePicker foi trocado por `onValueChange`.
