---
phase: 11-personalizacao-release
plan: 01
completed: 2026-10-23T16:40:00Z
duration: ~2h
description: "Política de privacidade (no-ai-slop), aberta também pelo Health Connect; trava do app; Recentes escondidos"
type: Summary
about: "ciclo-livre"
---

# Phase 11 Plan 01: Privacidade e proteção — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Política | PASS com pendência | `src/content/privacy-policy.ts`: rascunho com fatos do código, editado com a skill no-ai-slop. Testes conferem: tipos do Health Connect, destino Anthropic, tudo o que o chat envia, telas citadas que existem, permissões. Leitura com nível de subtítulo (`reading-blocks.tsx`, também usado nos artigos) e aviso "Texto sem revisão jurídica" no quadro. **Pendente:** seção de contato (precisa de um canal definido pela pessoa usuária) |
| AC-2 Intent do Health Connect | PASS | Módulo local `modules/launch-intent` (Kotlin, Expo Modules): lê só a ação do intent e consome só as duas ações do Health Connect. Ponte espera a navegação. S21 FE: abrir a frio por ACTION_SHOW_PERMISSIONS_RATIONALE, abrir com o app aberto por VIEW_PERMISSION_USAGE e o link real dentro do diálogo do Health Connect abrem a política; voltar leva a Hoje; deep link frio (`ciclolivre://lembretes`) continua funcionando |
| AC-3 Trava | PASS com ressalva | `src/security/*`: credencial do aparelho; bloqueia ao abrir e depois de 1 min fora (5 min se saiu por tela do sistema aberta pelo app; nunca infinito); cobertura ao sair; conteúdo oculto também do TalkBack; sem PIN no aparelho, desliga em vez de trancar; diálogos destrutivos não agem bloqueado. S21 FE: opção aparece (aparelho com credencial), pedido do sistema abre ("Desbloquear o Ciclo Livre", digital + padrão), cancelar mantém desligado. **Ciclo completo de desbloqueio não provado no aparelho: exige a digital/padrão da pessoa** |
| AC-4 Recentes | PASS | expo-screen-capture (FLAG_SECURE). S21 FE: cartão do Ciclo Livre em branco nos Recentes; screencap preto |
| AC-5 Qualidade | PASS | 792 testes, tsc e lint limpos. Impeccable (8 itens), /code-review (10), /cso diff (run `1792771566652-0d71612f1a6d170d`: parcial, sem achados suportados) |

## Revisões aplicadas (f4b3529)
- **/code-review:** trancar para sempre sem PIN; saída pelo compartilhar desligava a re-trava; contador preso desligava a trava para sempre (agora decisão por tempo com teto); conteúdo aparecia por um instante ao voltar (cobertura ao sair); Alert destrutivo por cima da tela de bloqueio; módulo apagava a ação de deep links; navegação antes de o navegador montar; leituras extras ao salvar.
- **Impeccable:** política incompleta (o chat envia modo, método, fase e as últimas mensagens; Pix mostra o nome; permissões reais); espaçamento dos níveis; aviso no quadro; DESIGN.md (tela de bloqueio, política, link de texto, níveis).
- **Permissões bloqueadas no app.json:** SYSTEM_ALERT_WINDOW, armazenamento, c2dm, USE_FINGERPRINT, install referrer, DETECT_SCREEN_CAPTURE. Lembretes continuam agendados (dumpsys alarm). SYSTEM_ALERT_WINDOW e ACCESS_LOCAL_NETWORK ainda aparecem no debug (vêm de `src/debug`, menu de desenvolvimento); conferir no release (11-05).

## Desvios
- Bloqueio de permissões veio do 11-05 para cá: a política precisa listar as permissões reais.
- Teste de rota da política passou antes da mudança (o expo-router já expõe rotas sem guarda); mantido como proteção.

## Adiado
- Seção "Contato" da política (decisão da pessoa usuária).
- Helper único para gravar em `app_meta` (SQL repetido em 5 repositórios) → 11-03.
- Lobo neutro na tela de bloqueio e transição de entrada/saída → 11-04.
