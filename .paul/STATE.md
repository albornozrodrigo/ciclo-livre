---
description: "Ciclo Livre — current position and accumulated context"
type: ProjectState
about: "ciclo-livre"
---

# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-22)

**Core value:** Qualquer pessoa registra o ciclo e recebe previsões, análises e relatórios completos sem pagar e sem entregar dados de saúde reprodutiva a ninguém.
**Current focus:** v0.1 — Fase 1 Fundação (plano 01-01)

## Current Position

Milestone: v0.1 Initial Release
Phase: 5 of 11 (Análise) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-10-22 — Phase 4 complete (motor de previsão, Hoje com fase, calendário; reviews aplicados)

Progress:
- Milestone: [████░░░░░░] 36%
- Phase 5: [░░░░░░░░░░] 0%

## Loop Position

```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Pronto para planejar a fase 5]
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
| `npm audit`: 19 high vulnerabilities vindas do template (não triadas; /cso sem OSV) | Init | S | Fase 2 |
| FLAG_SECURE / ocultar miniatura em Recentes | /cso | S | Fase 3 (quando houver dados na tela) |

### Blockers/Concerns
None yet.

## Boundaries (Active)

- metro.config.js (exceto a correção documentada do resolver), postcss.config.mjs, nativewind-env.d.ts e versões fixadas (nativewind/react-native-css/tailwindcss/lightningcss)
- android/ (gerado — CNG)

## Session Continuity

Last session: 2026-10-22
Stopped at: Phase 4 complete, ready to plan Phase 5
Next action: /paul:plan para a fase 5 (Análise: gráficos de ciclo, fluxo, dor, sentimentos, BBT, sono, peso, FC)
Resume file: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
