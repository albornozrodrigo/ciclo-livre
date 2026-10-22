---
phase: 08-conteudo-ia
plan: 02
completed: 2026-10-23T04:40:00Z
duration: ~1h20
description: "Resumo com IA na busca usando a chave da própria pessoa (Claude): chave no armazenamento seguro, consentimento explícito, HTTP direto à API, erros em pt-BR"
type: Summary
about: "ciclo-livre"
---

# Phase 8 Plan 02: Resumo com IA (BYOK) — Summary

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 Chave | PASS | `expo-secure-store`; testada antes de salvar via `GET /v1/models` (sem custo); exibida mascarada; apagar; "apagar tudo" apaga (`database-root`). Fora do SQLite, de log e de exportação |
| AC-2 Consentimento | PASS | Tela com o que vai (busca + trechos de até 3 artigos), o que nunca vai, para onde e quem paga; aceite salvo e revogável (`ia.test`) |
| AC-3 Resumo | PASS | "Resumir com IA" no Explorar → `POST /v1/messages`, `claude-opus-5-5` por padrão (Sonnet/Haiku por escolha da pessoa), `effort: low`, `fallbacks: "default"` (exceto Haiku; sem o cabeçalho, se a conta recusar). Texto + artigos citados ([[id]] filtrados) + aviso; erros mapeados |
| AC-4 Segurança | PARCIAL | Ver abaixo |
| AC-5 Testes/aparelho | PASS | 566 testes; tsc; lint. S21 FE: chave inválida testada contra a API real → 401 → mensagem em pt-BR. Resumo real depende de uma chave da pessoa (não usada) |

## Desvio: SDK oficial → HTTP direto
O `@anthropic-ai/sdk` 1.1.0 derrubou o app no S21 FE ao carregar ("Cannot read property 'BetaToolRunner' of undefined", importação circular que o Metro não resolve). O app caiu na tela de erro, sem perda de dados. O SDK foi removido, e a chamada segue a referência cURL da skill (`anthropic-version: 2026-10-21`). Os testes simulam `fetch` e conferem URL, cabeçalhos e corpo.

## Segurança (/cso)
- A execução do `/cso` (run `1792706759317-6cabe6d6d6951492`) terminou **parcial**, com a cobertura **não registrada**. Minha submissão foi recusada pelo esquema (áreas "assessed" com lacunas), e o mesmo comando fechou a execução. A skill proíbe iniciar outra.
- Na análise estática manual (fases 7, 9, 10 e 11) **não houve achados sustentados**:
  - host fixo, sem ferramentas para o modelo;
  - a injeção pela busca só afeta a resposta da própria pessoa;
  - a saída é texto simples, e as citações são filtradas antes de virar navegação;
  - a chave fica no Keystore;
  - logs só com nome de evento;
  - um pedido por toque, com `max_tokens` de 1024.
- Lacunas:
  - comportamento estocástico do modelo não testado;
  - o texto da busca pode conter dado de saúde que a própria pessoa digitou (declarado no consentimento, não filtrado).
- **Pendente:** rodar um `/cso` novo antes do release.
