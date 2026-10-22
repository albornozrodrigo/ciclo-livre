---
phase: 07-relatorio-exportacao
plan: 01
completed: 2026-10-23T01:40:00Z
duration: ~45min
description: "Exportação aberta (JSON versionado), planilha CSV segura, backup criptografado por senha (scrypt + AES-256-GCM) e restauração validada numa única transação"
type: Summary
about: "ciclo-livre"
---

# Phase 7 Plan 01: Exportação e backup — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 JSON | PASS | `export-repo.test`: formato `ciclo-livre` v1, schema 5, perfil, seleções/medições/notas/tags/tags do dia, preferências, lembretes e modo discreto, em ordem determinística; sem chave do banco |
| AC-2 CSV | PASS | `csv.test` + `pt-BR-export.test`: BOM, CRLF, colunas na ordem do catálogo com os mesmos rótulos da tela, opções separadas por "; ", vírgula decimal, RFC 4180, fórmulas neutralizadas com apóstrofo |
| AC-3 Backup | PASS (medição pendente) | `backup.test`: ida e volta; envelope versionado sem texto em claro; senha errada e arquivo adulterado dão o mesmo erro genérico; N forjado recusado (2^10–2^17, r=8, p=1); senha ≥ 8. `@noble/ciphers` e `@noble/hashes` 2.4.0 fixadas. **O tempo do scrypt no S21 FE será medido no 07-03** (precisa da tela) |
| AC-4 Restauração | PASS | Valida tudo antes (catálogo, escolha única, faixas, datas, tags, lembretes, perfil **por estrutura**, para backup antigo restaurar). Recusa formato/versão desconhecidos sem mudar nada (10 casos). Ida e volta idêntica. Transação única via `enqueueWrite`, queries parametrizadas |
| AC-5 Qualidade | PASS | Cobertura de 98% (export-repo, format, csv, backup); 34 testes novos; tsc; lint |

## Decisões
- Uma única mensagem de erro de importação (o arquivo vem de fora; nenhum detalhe interno).
- Jest transforma `@noble/*` (só ESM) nos dois projetos.
