---
phase: 07-relatorio-exportacao
plan: 03
completed: 2026-10-23T03:00:00Z
duration: ~2h
description: "Tela Seus dados: relatório PDF, planilha, exportação completa, backup criptografado e restauração (também na primeira abertura); Google Drive pelo compartilhar; provado no S21 FE"
type: Summary
about: "ciclo-livre"
---

# Phase 7 Plan 03: Seus dados + Google Drive — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Tela | PASS | Mais → Seus dados com 5 ações explicadas (`dados.test`, 12) |
| AC-2 Destinos / Drive | PASS (com desvio) | "Compartilhar…" abre o menu do Android **com Drive** (captura no S21 FE). "Salvar em pasta…" usa o SAF: o seletor de pastas (árvore) **não lista o Drive** (o app do Drive não oferece escolher pasta), então a tela diz que o Drive fica no Compartilhar. O seletor de arquivos da restauração lista o Drive. **O envio de fato para o Drive da pessoa não foi feito** (ação externa; fica para ela) |
| AC-3 Backup/restauração | PASS | Senha + confirmação + força + aviso. Ordem: conferir → confirmar → substituir. Senha errada: erro no campo, nada muda. **Aparelho:** backup → apagar tudo (0 alarmes) → "Já tenho um backup" → abas com tudo de volta e lembretes reagendados |
| AC-4 Privacidade | PASS | Temporários numa pasta privada própria, limpa a cada exportação e no apagar tudo (o compartilhar não apaga na hora para o Drive/Gmail conseguirem ler). Aviso de que JSON/CSV não são criptografados. Logs só com nomes de evento |
| AC-5 Aparelho + qualidade | PASS | PDF A4 salvo e conferido (595×841); 507 testes; tsc; lint; detector; finish review e /code-review aplicados |

## Medidas no S21 FE
- scrypt N=2^14 levou ~15 s em JS (Hermes). Com 2^13 levou **6,7 s** e passa a ser o padrão, com mensagem de progresso.
- Meta de < 3 s **não atingida**. KDF nativo fica adiado. Os parâmetros vão no arquivo, então backups antigos continuam abrindo.

## Achados no aparelho
- PDF com nome aleatório → copiado com nome legível (o `copy` do expo-file-system é assíncrono no Android, apesar do tipo).
- PDF saía em Carta (o gerador ignora `@page`) → `width/height` A4.
- `adb reverse` perdido após o rebuild (app parado no splash) → refeito.
- Restaurar não existia na primeira abertura (o caso de app reinstalado) → "Já tenho um backup" nas boas-vindas.

## Finish review (Impeccable) — aplicado
- **Bloqueadores:**
  - PDF em A4.
  - Restaurar confere antes de pedir confirmação.
  - Erros escritos (senha errada, arquivo que não é do app).
  - Erro de "senhas diferentes" marcado no campo e anunciado.
- **Melhorias:**
  - Onboarding restaura sem aviso e sem confirmação.
  - O sol acompanha o próximo passo.
  - Relatório: "previsão" na ovulação do ciclo atual, modo, legenda do tracejado, quebras de página, cores e tracking do app, aviso arredondado.
  - Textos: "suas notas destes ciclos", Drive só onde há o Compartilhar.
  - Destinos na zona do polegar (slot `footer` do FormScreen).
  - DESIGN.md atualizado.

## /code-review de fechamento (d4045c1..HEAD)
| # | Achado | Veredito | Ação |
|---|--------|----------|------|
| 1 | Compartilhar apagava o arquivo antes do Drive/Gmail ler | Válido, sério | Pasta própria, limpa na próxima exportação e no apagar tudo (teste) |
| 2 | Detecção de backup por texto solto | Válido | Pelo `format` analisado (teste) |
| 3 | CSV com `,` não abre direito no Excel pt-BR | Válido | Separador `;` (teste) |
| 4 | Importar perfil nulo deixava lembretes agendados | Válido | Arquivo sem perfil é recusado (teste) |
| 5 | Toque duplo gerava duas exportações | Válido | Trava com ref (teste com mutação) |
| 6 | Senha antiga reaproveitada ao trocar de arquivo | Válido | Limpa ao escolher e após restaurar (teste) |
| 7 | Erro do seletor virava "cancelado" sem registro | Válido | `log.event('folder_pick_closed')` |
| 8 | Medições duplicadas entre Análise e relatório | Válido | `measureSeriesAll` + `MEASURES` no domínio |
| 9 | Chave do modo discreto duplicada | Válido | Exportada do reminder-repo |
| 10 | SELECT extra por tag na restauração | Válido, adiado | `lastInsertRowId` diverge entre expo-sqlite e o adaptador de teste (`lastInsertRowid`); ganho pequeno |

## Adiado
- KDF nativo (backup em menos de 3 s).
- Backup automático no Drive (exige OAuth/Drive API).
- `lastInsertRowId` na restauração.
