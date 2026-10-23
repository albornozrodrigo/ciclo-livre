---
phase: 10-health-connect
plan: 02
completed: 2026-10-23T15:40:00Z
duration: ~1h30
description: "Health Connect no aparelho: biblioteca, tela em Mais, import ao abrir, revisões"
type: Summary
about: "ciclo-livre"
---

# Phase 10 Plan 02: Nativo, tela e aparelho — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Nativo | PASS | react-native-health-connect 4.1.3 + expo-build-properties (minSdk 26). Manifesto: só os 5 READ_*, intent de política de privacidade na MainActivity e alias `ViewPermissionUsageActivity` protegido por `START_VIEW_PERMISSION_USAGE`. Build e instalação no S21 FE |
| AC-2 Tela | PASS | `src/app/health/index.tsx`: indisponível, precisa atualizar, desconectado, conectado. Conectar pede só leitura dos tipos marcados; resultado em tabela; "Abrir o Health Connect"; desconectar para de ler e tira a permissão. `src/health/health-bridge.tsx`: import ao abrir ou voltar ao app, no máximo a cada 6 h. Entrada em Mais só no Android, antes do café (que segue por último) |
| AC-3 Qualidade e aparelho | PASS com ressalva | 755 testes, tsc e lint limpos. S21 FE: tela, pedido de permissão do sistema, leitura real sem erro (o Health Connect do aparelho está vazio, então entraram 0 registros), desconectar, revogação provada (depois de reiniciar, o sistema pede a permissão de novo), "Não permitir". Análise já cobre peso, FC em repouso, VFC, sono e temperatura. /code-review feito; /cso parcial (ver abaixo) |

## Revisões e correções (commit 80c9acd)
- **/code-review (10 achados):** reimport não atualizava o dia em andamento e contava os próprios registros como "ficou de fora" → tabela `health_origin` (migration v7): o import só atualiza o que ainda é dele, e nunca o que a pessoa editou ou apagou. Reconectar agora lê de novo 30 dias. Conexão conferida dentro da transação de gravação (desconectar ou restaurar no meio da leitura cancela). Tela acompanha o banco quando a leitura falha depois de conectar. Só no Android. Leituras em paralelo. Trava duplicada e o campo `days` (sem uso) removidos.
- **Impeccable:** retorno no topo (antes ficava atrás da cápsula), resultado em tabela, "Lendo:" só com os tipos ainda liberados (sem nenhum: aviso com "Abrir o Health Connect"), linha com detalhe, Play Store só quando precisa atualizar, textos simples ("Última leitura", "o valor parecia errado"), regra do import automático explicada. DESIGN.md atualizado.
- **Segurança (revisão manual independente):** sem achado crítico ou alto. Corrigidos: custo quadrático no sono e `Math.min(...spread)` (app malicioso gravando em massa) → teto de 5000 por tipo, laço linear; fuso inválido descartado; marca de import no futuro ignorada; leitura cortada no teto não avança a marca; texto "não saem daqui" corrigido para incluir a IA com chave própria.

## /cso
Run `1792768965174-6a48251d9894399c` terminou **parcial, sem cobertura registrada**: a submissão foi recusada (domínios de cobertura do próprio helper) e o `finish` estava encadeado no mesmo comando, então fechou antes da correção. Pela regra de um run só, não reiniciei; a revisão manual de segurança acima cobriu o diff da fase.

## Adiado
- Tela de política de privacidade para o intent de rationale do Health Connect (exigência da Play para apps de saúde) → fase 11.
- "Remover o que veio do Health Connect" e aviso quando a ovulação depende de temperatura importada (agora possível com `health_origin`) → polimento.
- Prova com dados reais do Health Connect (aparelho sem dados de relógio).
