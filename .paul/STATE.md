---
description: "Ciclo Livre — current position and accumulated context"
type: ProjectState
about: "ciclo-livre"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-22)

**Core value:** Qualquer pessoa registra o ciclo e recebe previsões, análises e relatórios completos sem pagar e sem entregar dados de saúde reprodutiva a ninguém.
**Current focus:** v0.1 — Fase 8 (08-01 artigos e busca)

## Current Position

Milestone: v0.1 Initial Release
Phase: 8 of 11 (Conteúdo + busca + resumo IA + importar do Clue) — Planned
Plan: 08-01 (artigos + busca), 08-02 (resumo IA BYOK), 08-03 (importar do Clue)
Status: 08-02 complete; next APPLY 08-03 (importar do Clue)
Last activity: 2026-10-22 — Phase 7 complete (relatório PDF, exportação, backup/restauração, Drive pelo compartilhar; reviews aplicados)

Progress:
- Milestone: [██████░░░░] 64%
- Phase 8: [░░░░░░░░░░] 0%

## Loop Position

```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [08-02 fechado; próximo: 08-03]
```

## Accumulated Context

### Decisions
| Decision | Phase | Impact |
|----------|-------|--------|
| Local-first, sem conta; IA BYOK; Android primeiro | Init | Sem backend; Connect/comunidade fora da v0.1 |
| NativeWind 5 RC + Tailwind 4.3; lightningcss 1.30.1 | Init | Validado no aparelho (01-01); fallback descartado |
| Resolver do Metro: expo-asset/expo-image usam react-native original | 01-01 | react-native-css RC não exporta AssetRegistry (RN 0.88); revisitar no estável |
| Mudou plugin no app.json → `npx expo prebuild --platform android` antes do build | 01-02 | `expo run` não reaplica plugins em android/ existente |
| Aparelho de teste: Galaxy S21 FE `RQCRC00WJMV` (S21 Ultra é de outra sessão) | 01-03 | Usar `-s RQCRC00WJMV` / `--device RQCRC00WJMV` |
| "Sintomas frequentes" exclui estados neutros/bons por opção | 05 | Corrimento normal, energia boa etc. não viram sintoma |
| Lembretes com alarme inexato (sem SCHEDULE_EXACT_ALARM) | 06 plan | Play restringe alarme exato; horário pode variar minutos |
| Notificações discretas ligadas por padrão | 06 | Android ignorou SECRET no canal; texto de saúde só se a pessoa escolher |
| Drive via compartilhar/SAF (sem OAuth) | 07 plan | Sem projeto Google Cloud; backup automático adiado |
| `.prettierrc` (aspas simples, 140 col.) | 06 | Evita reformatar o projeto com padrões errados |
| Artigos escritos pelo app com a skill no-ai-slop, rodapé "sem revisão profissional" | 08 plan | Decisão do usuário |
| IA BYOK: Claude primeiro, chave no secure-store, consentimento explícito | 08 plan | Decisão do usuário |
| Importar do Clue (ZIP com senha + measurements.json), juntando sem apagar | 08 plan | Requisito do usuário |
| North Star "O Mapa do Corpo" | 01-01 | Provisório — confirmar com a pessoa usuária |

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Tokens repetidos em `@theme`/`:root`/`theme.ts` (agora com `line`) | 01-01 review | S | Teste de paridade ou remover `:root` |
| Movimento (transições de território) e chip que cruza na cápsula | 02-02 review | M | Fase 11 / polimento |
| Erro de medição atrás do teclado (rolar até o campo) | 03-02 review | S | Polimento |
| Lógica de ordem duplicada em personalizar × useCategoryOrder | 03 code-review | S | Refatorar quando mexer |
| Célula do calendário < 48dp de largura em telas de 360dp | 04-03 | S | Testar em aparelho pequeno |
| Teto de design: lobo da próxima fase sobreposto; marca de sol para hoje no calendário | 04 review | M | Fase 11 |
| /cso novo da IA BYOK (run da 08-02 ficou parcial sem cobertura registrada) | 08 | S | Antes do release |
| KDF nativo para backup < 3 s (hoje scrypt 2^13 em JS ≈ 6,7 s no S21 FE) | 07 | M | Fase 11 |
| Backup automático no Drive (OAuth/Drive API) | 07 plan | L | Só se pedido |
| `lastInsertRowId` na restauração de tags | 07 code-review | S | Polimento |
| Visibilidade SECRET por notificação (patch/plugin nativo) para quem desliga o modo discreto | 06 | M | Fase 11 |
| Interruptor em cápsula própria do mundo (teto do finish review) | 06 review | S | Fase 11 |
| Análise lê o banco duas vezes por foco e sem limite de data | 05 code-review | S | Unificar leitura (fase 7 ou polimento) |
| "média 29" na ponta da linha de referência; número principal em Display | 05 review | S | Polimento |
| `npm audit`: 19 high vulnerabilities vindas do template (não triadas; /cso sem OSV) | Init | S | Fase 2 |
| FLAG_SECURE / ocultar miniatura em Recentes | /cso | S | Fase 3 (quando houver dados na tela) |

### Blockers/Concerns
None yet.

## Boundaries (Active)

- metro.config.js (exceto a correção documentada do resolver), postcss.config.mjs, nativewind-env.d.ts e versões fixadas (nativewind/react-native-css/tailwindcss/lightningcss)
- android/ (gerado — CNG)

## Session Continuity

Last session: 2026-10-22
Stopped at: Phase 7 complete
Next action: /paul:apply .paul/phases/08-conteudo-ia/08-03-PLAN.md
Resume file: .paul/phases/08-conteudo-ia/08-03-PLAN.md

---
*STATE.md — Updated after every significant action*
