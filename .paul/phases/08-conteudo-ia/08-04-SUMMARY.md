---
phase: 08-conteudo-ia
plan: 04
completed: 2026-10-23T03:40:00Z
duration: ~3h
description: "Correções da verificação OWASP (Top 10:2025 + Mobile Top 10)"
type: Summary
about: "ciclo-livre"
---

# Phase 8 Plan 04: Correções OWASP — Summary

Origem: `/cso --owasp` (run `1792723700454-58830251dd7d11a7`, parcial pelo teto de 10 min) + três revisões manuais (armazenamento/cripto/config; entrada/injeção/integridade; IA/rede/cadeia) + `npm audit`.

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Datas plausíveis | PASS | `isValidDate` (1900–2100) nas 9 fronteiras; `toDayNumber`/`addDays` com faixa de contas 1800–2299 (nunca geram ano de 5 dígitos). Restauração e Clue recusam 9999/0500 (testes que falham sem a correção). S21 FE: `ciclolivre://registro/9999-12-31` abre o registro de hoje, sem erro |
| AC-2 Restauração linear | PASS | `tagsOf` com conjunto de chaves; `MAX_TAGS = 1000`. Antes: 200 mil tags travavam > 5 min (teste preso); agora recusado em < 1 s; 1000 tags restauram |
| AC-3 Lembretes | PASS | Identificador `r_` + SHA-256 com segredo em `app_meta` (SQLCipher); `data` vazio exceto lembrete diário; "apagar tudo" também dispensa as exibidas. Plugin `plugins/with-no-backup.js` + `allowBackup:false` + secure-store sem regras próprias. S21 FE: pacote sem `ALLOW_BACKUP`; agenda só com `r_…` (0 ocorrências de tipo/data) |
| AC-4 Senha do backup | PASS | Mínimo 12; força só "boa"/"forte"; "Gerar senha forte" (20 caracteres, 32 símbolos, 100 bits) com aviso para anotar; ao abrir, N ≤ 2^15 e salt/nonce de 16/12 bytes. S21 FE: senha gerada aparece e libera o backup |
| AC-5 Clue | PASS | 1000 tags distintas (acima: "grande demais"), 50 opções por registro, 50 chaves de não reconhecido + "other"; busca só em chaves próprias (`constructor`, `__proto__` contados como desconhecidos) |
| AC-6 IA e campos | PASS | `requestSummary`: consentimento e chave relidos no envio, um pedido por vez, cancelado ao sair; prazo único cobre tentativas e leitura do corpo. Campo da chave sem autofill. Cópia do arquivo apagada em `finally`. CSP no HTML do PDF; CSV neutraliza fórmula após espaço e com sinais de largura total |
| AC-7 Qualidade | PASS | 633 testes (era 601), tsc e lint limpos; prebuild + build no S21 FE |

## Achados não corrigidos (decisão)
- Trava do app / FLAG_SECURE, chave de release (build usa a de debug), permissões extras → fase 11.
- KDF nativo (scrypt em JS limita N) → fase 11; a senha longa/gerada compensa.
- `npm audit`: 33 "high" vindas de `braces` e `node-forge`, só em ferramentas de build (Expo CLI/Metro); sem versão corrigida publicada.
- Modelo padrão da IA continua Opus 5.5; retry do 400 sem ler o corpo (custo só de latência).
- `/cso` registrou um achado (backup do banco) que o manifesto gerado desmentia; o problema real de backup era a agenda de notificações, agora resolvido.

## Desvios
- Datas: duas faixas (entrada 1900–2100, contas 1800–2299) em vez de uma, porque uma data perto do limite ainda quebraria a conta do próximo ciclo.
- Alfabeto da senha gerada mantém o L (sem 0/O e 1/I) para ter exatamente 32 símbolos, sem viés.
