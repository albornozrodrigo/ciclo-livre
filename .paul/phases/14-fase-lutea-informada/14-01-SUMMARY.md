---
phase: 14-fase-lutea-informada
plan: 01
status: complete
completed: 2026-10-25
type: Summary
about: "ciclo-livre"
---

# 14-01: Fase lútea informada

## O que foi feito
- **Perfil:** novo campo `Profile.lutealLength` (`number | null`, de 9 a 18 dias). Migration v8 (`luteal_length` com CHECK), leitura e gravação no repo, backup e restauração. Backups antigos, sem o campo, restauram como null; valor fora da faixa recusa o arquivo.
- **Motor:** a fase lútea vem da medida pela temperatura; sem medida, do valor informado (se couber no ciclo medido); sem nenhum dos dois, 14 dias.
- **Tela Dados do ciclo:** interruptor "Sei a duração da minha fase lútea" com contador de 9 a 18 (padrão 14) e o aviso de que a medida vale mais. O campo não está no onboarding.
- **Política de privacidade:** cita o campo; vigência atualizada para 25/10/2026; site regerado (`site/privacidade`).

## Acceptance Criteria
| AC | Resultado | Evidência |
|----|-----------|-----------|
| AC-1 perfil guarda e valida | PASS | `profile.test` (faixa), `profile-repo.test` (ida e volta com 12) |
| AC-2 backup antigo e novo | PASS | `export-repo.test` (sem o campo vira null; 30 recusa; schema 8) |
| AC-3 motor | PASS | `for-profile.test`: 11 dias, padrão 14, medida 17 vence a informada, valor que não cabe é ignorado |
| AC-4 tela | PASS | `profile-edit.test` (liga, ajusta para 13, salva); emulador: liga, salva e reabre com 14 dias (migration v8 rodou no banco real do app) |

## Revisão (subagente) e correções
1. **Tela travada sem aviso:** a regra "fase lútea < ciclo" na validação travava o "Salvar" (e o "Trocar modo") sem mensagem. A regra saiu da validação e foi para o motor: valor que não cabe no ciclo medido (`> ciclo − menstruação − 5`) é ignorado. Isso também resolve o caso do ciclo medido mais curto que o do perfil e a diferença entre o que o backup e a tela aceitavam.
2. **Texto da tela × conta do motor (1 dia):** o texto passa a ser "Do dia da ovulação até a véspera da menstruação", a mesma conta do motor (`daysBetween(ovulação, próxima)`). Os 14 dias padrão significam o mesmo nos dois.

## Verificação
- `npx jest`: 107 suítes, 893 testes passando; `tsc` e `lint` sem erros.

## Decisões
| Decisão | Motivo |
|---------|--------|
| Contagem "do dia da ovulação até a véspera" | Coincide com o motor e com o padrão de 14 dias já usado; evita deslocar todas as previsões |
| Campo só na edição do perfil | Onboarding curto; poucas pessoas sabem esse número |
| Valor que não cabe é ignorado, sem erro | A pessoa não fica travada; o motor nunca põe a janela fértil dentro da menstruação |
