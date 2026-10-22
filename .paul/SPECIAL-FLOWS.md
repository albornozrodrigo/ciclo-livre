---
description: "Ciclo Livre — specialized skill integrations and when to invoke them"
type: SpecialFlows
about: "ciclo-livre"
---

# Special Flows: Ciclo Livre

Skills mapeadas por tipo de trabalho. A verificação acontece no UNIFY (`/paul:flows audit`).

## Project-Level Skills

| Skill | Work Type | Priority | Trigger |
|-------|-----------|----------|---------|
| `/superpowers:test-driven-development` | Lógica de domínio: previsão de ciclo, janela fértil/ovulação, previsões de dor, cálculos da Análise, migrations do banco | **Required** | Qualquer task que crie ou altere código em `src/domain/` ou `src/db/` (o teste falhando vem antes da implementação) |
| `/superpowers:verification-before-completion` | Fechar qualquer task ou plan | **Required** | Antes de marcar task concluída e antes do UNIFY: rodar `npx tsc --noEmit`, `npx expo lint`, testes e bundle Android, e mostrar a saída |
| `/impeccable:impeccable` | Design e revisão de interface (hierarquia, acessibilidade, estados vazios e de erro, dark mode) | **Required** | Fases com telas novas (2, 3, 5, 6, 7, 8, 9, 11), antes do UNIFY |
| `/code-review` | Revisão de correção do diff da fase | **Required** | Ao fechar cada fase, antes de marcá-la Complete |
| `/superpowers:systematic-debugging` | Bugs e comportamento inesperado | Optional | Sempre que aparecer falha sem causa conhecida |
| `/cso` | Revisão de segurança e privacidade (criptografia local, secure-store, envio para IA) | Optional | Fases 1, 8 e 9 |

## Phase Overrides

| Phase | Skill | Why |
|-------|-------|-----|
| 1 — Fundação | `/cso` | Criptografia do SQLite e manejo da chave são a base de privacidade |
| 4 — Motor de previsão | `/superpowers:test-driven-development` (cobertura ≥ 90%) | Previsão errada engana a usuária; casos-limite primeiro |
| 8–9 — IA BYOK | `/cso` | Chave de API do usuário e envio de dados de saúde a terceiros |

## Templates / Assets

| Asset | Location | When Used |
|-------|----------|-----------|
| Estudo REA (resumo + mapa Plus) | `../estudo-rea-clue/00-resumo-executivo.md`, `notas/02-mapa-de-gating.md` | Definir escopo e critérios de aceite de cada fase |
| Detalhes de IA, wearables e previsões | `../estudo-rea-clue/notas/04-ia-wearables-connect.md` | Fases 4, 8, 9 e 10 |
| Doctor report e ícones | `../estudo-rea-clue/notas/03-monetizacao-extra.md` | Fases 7 e 11 |
| Regras Expo do projeto | `AGENTS.md` | Toda task |

---
*SPECIAL-FLOWS.md — configured 2026-10-22*
