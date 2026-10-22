---
phase: 03-registro
plan: 03
completed: 2026-10-22T20:30:00Z
duration: ~45min
description: "Tags ilimitadas, personalizar/reordenar categorias com botões acessíveis e navegar entre dias"
type: Summary
about: "ciclo-livre"
---

# Phase 3 Plan 03: Tags, personalização e outros dias — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Tags | PASS | `tags.test.ts` (1–30, duplicata sem acento/maiúscula, sem limite), `tag-repo.test.ts` (migration v4, cascade), `registro.test.tsx` (marcar, criar e marcar, duplicata); aparelho: "Plantao" criada e marcada |
| AC-2 Personalizar | PASS | `personalizar.test.tsx` (ocultar, mover, limites, restaurar); aparelho: "Escape" oculto some do registro |
| AC-3 Outros dias | PASS | testes (dia anterior, não passa de hoje); aparelho: "21 de outubro de 2026" sem os registros de hoje |
| AC-4 Qualidade | PASS | 232 testes, tsc, lint, detector |

## Decisions
- Reordenar com botões ↑/↓ (nome acessível "Mover X para cima") em vez de arrastar: funciona com TalkBack e com uma mão.
- Navegação de dia por `router.setParams` (mesma tela, recarrega pelo parâmetro).
- Correção: cápsula de contorno desabilitada mantém 48dp (antes herdava 56dp da primária).

## /code-review de fechamento da fase 3 (769fae9..HEAD)

| # | Achado | Veredito | Ação |
|---|--------|----------|------|
| 1 | Transações concorrentes (BEGIN dentro de BEGIN; ROLLBACK de uma desfaz a outra) | Válido, sério | `enqueueWrite`: fila de escritas por conexão em todos os repositórios (provado: sem a fila, "cannot start a transaction within a transaction") |
| 2 | Texto pendente salvo no dia para onde se navegou | Válido, sério | Campos com `key` pela data: o antigo desmonta e salva no próprio dia (TDD) |
| 3 | Dia anterior aparecendo sob a data nova | Válido | Estado guarda a data dele (TDD com carregamento retido) |
| 4 | Desfazer antigo apagava salvamento novo | Válido + achado extra | Desfazer só se o valor atual ainda é o aplicado; referência do estado mais recente para toques seguidos (provado RED sem ela) |
| 5 | Personalizar apagava preferências de outros modos | Válido | `saveCategoryPrefs` faz upsert, sem DELETE (TDD) |
| 6 | Falha ao criar tag limpava o texto; duplo envio | Válido | resultado `'failed'` mantém texto; trava de envio (TDD) |
| 7 | Ordem das tags mudava ao reabrir | Válido | ordenação pela mesma chave do banco |
| 8 | Nota contada como categoria | Válido | contagem só de categorias; "Nota registrada hoje" (TDD) |
| 9 | Casts repetidos / lógica duplicada | Parcial | `categoryLabels()` único; a lógica de ordem da tela de personalizar ficou (precisa listar também as ocultas) |
| 10 | Duplicata checada lendo a tabela inteira | Válido | consulta pela chave |

Verificação: 239 testes, tsc, lint; S21 FE com toques rápidos corretos.
