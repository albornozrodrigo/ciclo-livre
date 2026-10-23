---
phase: 08-conteudo-ia
plan: 03
completed: 2026-10-23T00:58:00Z
duration: ~2h
description: "Importar do Clue: ZIP com senha (AES/ZipCrypto) ou measurements.json; mapeamento tolerante; prévia; junta sem apagar numa transação"
type: Summary
about: "ciclo-livre"
---

# Phase 8 Plan 03: Importar do Clue — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Leitura | PASS (com desvio) | `src/lib/zip/zip.ts`: leitor próprio em JS puro (ZipCrypto + WinZip AES AE-1/AE-2 via @noble, inflate via fflate 0.8.3). Limites: 50 MB, 500 mil registros, tamanho descompactado conferido antes e depois (bomba e tamanho mentiroso viram `too_large`/`corrupt`), CRC/HMAC. Nada é extraído para disco, então não há caminho de pasta a proteger |
| AC-2 Mapeamento | PASS | `src/domain/clue/clue.ts`: tabela tipo/opção com nomes alternativos (`cold_flu`/`cold_or_flu`, `egg_white`/`eggwhite`…), `super_heavy` → muito intensa, `none` ignorado, dor com intensidade (a maior do dia), sono em minutos → faixa, °F → °C, libras → kg, notas cortadas em 1000 (contadas; mesmo dia é juntado), tags, contracepção (DIU fica de fora: o arquivo não diz o tipo). Desconhecidos contados por `tipo` ou `tipo:opção` |
| AC-3 Prévia e importação | PASS | `src/db/clue-import-repo.ts`: prévia só lê (período, dias, dias já existentes, contagem por categoria, itens que ficam de fora, não reconhecidos). Importação numa transação, sem apagar; no mesmo dia+categoria vale o app; idempotente; lembretes reagendados |
| AC-4 Telas | PASS | Mais → Seus dados → "Importar do Clue" com 3 passos (fonte: suporte do Clue); onboarding "Vim do Clue" → importa e segue para o perfil. Cópia no cache apagada logo após ler |
| AC-5 Qualidade | PASS | 595 testes (29 novos), tsc e lint limpos. S21 FE: ZIP AES no formato do Clue (101 registros fora de ordem, `none`, tipo desconhecido) → senha errada recusada → prévia correta (35 dias de menstruação, 7 por categoria) → importado → Análise com 7 ciclos completos; nenhum ZIP restante no cache |

## Desvios
- **zip.js não vai para o app:** depende de Web Workers e `crypto.subtle`, arriscado no Hermes. Ficou como devDependency (2.24.0, fixa) só para gerar ZIPs reais nos testes. No app, o leitor é próprio (~200 linhas).
- **Nova dependência:** `fflate` 0.8.3 (fixa), para descompactar.
- Texto do topo de Mais estava desatualizado ("chegam nas próximas etapas") → corrigido.

## Pendências
- Nomes de opção vêm de fontes públicas; o que divergir num arquivo real aparece em "Não reconhecido" (ajustar a tabela quando houver exemplo real).
- Onboarding pelo Clue não preenche a última menstruação a partir do histórico (a pessoa responde no perfil).
- `/code-review` e Impeccable no fechamento da fase 8.
