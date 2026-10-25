---
phase: 19-pos-parto-encerrar-gravidez
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 19-01: Modo Pós-parto

## O que foi feito
- **Perfil:** `MODES` ganhou `postpartum`, e `Profile.babyBirth` é obrigatório nesse modo, de hoje até 365 dias atrás. A data que envelhece não trava a edição.
- **Migration v10:** reconstrói `profile` (CREATE, INSERT SELECT, DROP, RENAME), mudando o CHECK de `mode` e acrescentando `baby_birth`. Um teste confirma que o perfil salvo antes (inclusive `luteal_length` e `include_atypical`) continua igual.
- **Backup:** arquivo antigo restaura com `babyBirth` null; pós-parto sem a data do parto é recusado.
- **Onboarding:** passo `baby_birth` (tela "Quando foi o parto?"), depois contracepção, depois pronto. A tela final não fala de "última menstruação".
- **Troca de modo:** pede a data do parto.
- **Motor e Hoje:**
  - sem modelo de ciclo, então sem previsão nem fase;
  - "Pós-parto: N semanas e N dias" até a 12ª semana e "N meses" depois;
  - o texto explica que a menstruação pode voltar mesmo amamentando;
  - quando há menstruação registrada 6 semanas ou mais depois do parto, sugere "Voltar para Menstruação e ciclo".
- **Registro:** Lóquios (nenhum, vermelho vivo, marrom ou rosado, amarelado ou esbranquiçado) e Amamentação (mamas cheias e duras, nódulo, dor, vermelhidão, fissura, vazamento), só neste modo. Contam como sintomas, menos "nenhum".
- **Lembretes:** contraceptivo (se houver plano), remédios e registro.
- **Chat:** linha "Pós-parto: … desde o parto (sem previsão de ciclo)".

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 perfil e banco | PASS | `profile.test` (4), `profile-repo.test` (migration v10 preserva dados e aceita pós-parto), `export-repo.test` (ausente = null; sem data recusa) |
| AC-2 Hoje e motor | PASS | `postpartum.test` (sem modelo; semanas e dias; meses; período de carência), `hoje.test` (card e botão de troca); emulador: "Pós-parto: 2 semanas e 6 dias" |
| AC-3 registro e lembretes | PASS | `postpartum.test` (categorias só no modo; sintomas; `availableKinds`) |
| AC-4 onboarding e troca | PASS | `onboarding.test` (fluxo), `to-profile-input.test`; emulador: troca de modo pede a data e salva |

## Revisão (subagente)
- Nenhum bug que bloqueie. A migration foi conferida coluna a coluna, sem índices, FKs ou triggers em `profile`.
- **Acolhido:** período de carência de 42 dias para "a menstruação voltou", porque nas primeiras semanas o sangramento é quase sempre lóquio.
- **Acolhido:** o backup recusa pós-parto sem data do parto.
- **Mantido:** o arredondamento de meses completos.

## Verificação
- `npx jest`: 112 suítes, 987 testes passando; `tsc` e `lint` sem erros.
