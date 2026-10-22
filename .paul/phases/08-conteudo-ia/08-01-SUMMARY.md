---
phase: 08-conteudo-ia
plan: 01
completed: 2026-10-23T03:40:00Z
duration: ~40min
description: "Explorar com 16 artigos próprios (escritos e revisados com a skill no-ai-slop), busca local sem acento e tela de leitura"
type: Summary
about: "ciclo-livre"
---

# Phase 8 Plan 01: Artigos e busca — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Artigos | PASS | 16 artigos em 5 temas, escritos em rascunho e editados com a skill **no-ai-slop**: contrastes binários, revelação com dois-pontos, aforismo, termo com gênero ("calada") e negrito decorativo removidos. Fontes nomeadas (FIGO, OMS, Ministério da Saúde, FEBRASGO, NHS, ACOG, NICE), sem URL |
| AC-2 Formato | PASS | `src/content/articles/index.ts` tipado; `articles.test` (19): ids únicos, resumo ≤ 140, blocos não vazios, fontes, sem `http`/`**`; janela fértil e contracepção dizem "não é método contraceptivo" |
| AC-3 Busca | PASS | `search.test` (5): sem acento/maiúscula, pesos título > resumo > corpo, todas as palavras, máx. 20, listas e subtítulos |
| AC-4 Telas | PASS | `explorar.test` (5): lista por tema com cabeçalhos, busca com contagem e "sem resultado", abrir artigo, leitura com fontes e aviso, id inexistente |
| AC-5 Aparelho | PASS | S21 FE: "colica" → 3 resultados, Cólica primeiro; leitura com subtítulos, listas, fontes e aviso |

## Observações
- Os artigos não passaram por profissional de saúde. O rodapé diz isso em todos.
- Conteúdo semanal da gravidez fica adiado.
