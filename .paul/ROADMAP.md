---
description: "Ciclo Livre — milestone and phase structure"
type: Roadmap
about: "ciclo-livre"
---

# Roadmap: Ciclo Livre

## Overview
App Android de acompanhamento de ciclo com paridade de funcionalidades com o Clue 274.0, incluindo todo o Clue Plus. É grátis, local-first e usa IA BYOK. A jornada:
- fundação técnica e de privacidade;
- registro, previsão e análise, o núcleo de valor;
- extras que no Clue são pagos (lembrete fértil, PDF, IA, wearables, ícones);
- build de release.

## Current Milestone
**v0.1 Initial Release** (v0.1.0)
Status: In progress
Phases: 10 of 11 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Fundação | 4 | ✅ Complete | 2026-10-22 |
| 2 | Onboarding, perfil e modos | 3 | ✅ Complete | 2026-10-22 |
| 3 | Registro diário | 3 | ✅ Complete | 2026-10-22 |
| 4 | Motor de previsão + calendário | 3 | ✅ Complete | 2026-10-22 |
| 5 | Análise | 2 | ✅ Complete | 2026-10-22 |
| 6 | Lembretes | 2 | ✅ Complete | 2026-10-22 |
| 7 | Relatório médico + exportação (Google Drive) | 3 | ✅ Complete | 2026-10-22 |
| 8 | Conteúdo + busca + resumo IA + importar do Clue | 4 | ✅ Complete | 2026-10-23 |
| 9 | Chat com seus dados (IA BYOK) | 2 | ✅ Complete | 2026-10-23 |
| 10 | Wearables (Health Connect) | 2 | ✅ Complete | 2026-10-23 |
| 11 | Personalização + release | 5 | In progress | - |

## Phase Details

### Phase 1: Fundação

**Goal:** O app abre no Android real com a casca de navegação, o tema do Ciclo Livre e um banco SQLite comprovadamente criptografado, e tem testes rodando.
**Depends on:** Nothing (first phase)
**Research:** Likely. NativeWind 5 RC no SDK 58 ainda não tem validação oficial, e o SQLCipher do expo-sqlite exige development build.

**Scope:**
- Infra de testes (jest-expo + Testing Library) e remoção das telas de exemplo do template.
- Tema (tokens claro/escuro no Tailwind 4) e abas: Hoje, Calendário, Análise, Explorar, Mais.
- Development build Android rodando no aparelho, com NativeWind validado visualmente.
- SQLite + SQLCipher com a chave no secure-store, executor de migrations e verificação de `cipher_version`.
- Base de privacidade: log sem dados sensíveis, aviso "não é contraceptivo" e "apagar todos os dados".

**Plans:**
- [x] 01-01: Ferramentas, casca de navegação e tema + dev build no aparelho
- [x] 01-02: Banco criptografado + migrations (TDD)
- [x] 01-03: Base de privacidade (logger seguro, aviso médico, apagar tudo)
- [x] 01-04: Correções do /code-review e /cso de fechamento

### Phase 2: Onboarding, perfil e modos
**Goal:** No primeiro uso, a pessoa informa a última menstruação, a duração média do ciclo e da menstruação, e escolhe o modo: Período, Sem sangramento, Tentando engravidar, Gravidez ou Perimenopausa. Todos os modos são livres e trocáveis em Mais.
**Depends on:** Phase 1 (banco + abas)
**Research:** Unlikely

### Phase 3: Registro diário
**Goal:**
- Registrar qualquer dia em 40+ categorias (sangramento, dor com intensidade, humor, sono, BBT, muco, sexo, testes etc.).
- Notas e tags personalizadas ilimitadas.
- Personalizar e reordenar categorias.
**Depends on:** Phase 2
**Research:** Unlikely (catálogo de categorias derivado do estudo, com textos próprios)

### Phase 4: Motor de previsão + calendário
**Goal:**
- Prever a próxima menstruação, a janela fértil/ovulação (com BBT e muco quando houver) e a dor.
- Calendário sem limite de horizonte.
- Visão "Hoje" com a fase do ciclo e cards de fase liberados.
- TDD obrigatório, com cobertura ≥ 90%.
**Depends on:** Phase 3 (dados registrados)
**Research:** Likely (algoritmos de previsão e literatura sobre detecção de ovulação por BBT)

### Phase 5: Análise
**Goal:**
- Duração e variação do ciclo, fluxo, dor, sentimentos, BBT, sono, peso e FC.
- Histórico e visão geral por ciclo.
- Tudo liberado.
**Depends on:** Phase 4
**Research:** Likely (biblioteca de gráficos compatível com RN 0.88/Skia)

### Phase 6: Lembretes
**Goal:** Lembretes locais (menstruação, janela fértil, pílula, BBT, registro etc.), incluindo o de janela fértil, que no Clue é pago.
**Depends on:** Phase 4
**Research:** Unlikely

### Phase 7: Relatório médico + exportação de dados
**Goal:**
- PDF de 6 ciclos para levar ao médico, ilimitado.
- Exportar todos os dados (formato aberto, por exemplo JSON/CSV, além de um backup criptografado para restaurar).
- Opção de **salvar no Google Drive** (requisito do usuário, 2026-10-22).
- Importar ou restaurar o backup.
- A exportação é sempre uma ação explícita da pessoa.
**Depends on:** Phase 5
**Research:** Likely. Para o Google Drive, comparar duas opções:
  - SAF/compartilhar do Android: o Drive aparece como destino, sem OAuth e sem custo;
  - Drive API com OAuth: backup automático, mas exige um projeto no Google Cloud e tela de consentimento.

### Phase 8: Conteúdo + busca + resumo IA + importar do Clue
**Goal:**
- Artigos próprios, escritos com a skill no-ai-slop (decisão do usuário, 2026-10-22), todos liberados.
- Busca.
- Resumo por IA usando a chave da própria pessoa (BYOK, Claude primeiro).
- **Importar os dados exportados do Clue** (requisito do usuário, 2026-10-22).
**Depends on:** Phase 1
**Research:** Likely (fontes de conteúdo com licença aberta; APIs Claude/OpenAI)

### Phase 9: Chat com seus dados (IA BYOK)
**Goal:** Conversar com os próprios dados do ciclo. A pessoa vê e consente com exatamente o que será enviado ao provedor antes de enviar.
**Depends on:** Phases 5 and 8
**Research:** Feita (estudo REA nota 04: chat do Clue sem streaming, 3000 caracteres, perguntas sugeridas, apagar conversa)

**Plans:**
- [x] 09-01: Contexto exato, histórico cifrado, consentimento próprio e envio (TDD)
- [x] 09-02: Telas (entrada na Análise, consentimento com o texto exato, conversa) + aparelho

### Phase 10: Wearables (Health Connect)
**Goal:** Importar sono, temperatura, FC e peso do Health Connect e mostrá-los na Análise.
**Depends on:** Phase 5
**Research:** Feita (react-native-health-connect 4.1.3 com plugin Expo próprio; exige minSdk 26; leitura padrão de 30 dias)

**Plans:**
- [x] 10-01: Conversão e gravação (TDD)
- [x] 10-02: Nativo, tela e aparelho

### Phase 11: Personalização + release
**Goal:**
- Ícones alternativos e temas, todos liberados.
- Build de release via EAS rodando em aparelho real.
- Política de privacidade no app (texto com no-ai-slop; também aberta pelo diálogo do Health Connect), trava do app e Recentes escondidos.
- Polimento das pendências acumuladas.
**Depends on:** Phases 1–10
**Research:** Feita (2026-10-23): ícones por plugin próprio (libs prontas desabilitam a MainActivity); expo-local-authentication + expo-screen-capture; react-native-quick-crypto para scrypt nativo; assinatura de release por plugin; tema via Appearance.setColorScheme.

**Plans:**
- [x] 11-01: Política de privacidade + trava do app + Recentes
- [x] 11-02: Ícone próprio, ícones alternativos e tema
- [ ] 11-03: Polimento funcional (pendências S)
- [ ] 11-04: Polimento visual (teto de design adiado)
- [ ] 11-05: Release (KDF nativo, permissões, assinatura, /cso completo)

---
*Roadmap created: 2026-10-22*
*Last updated: 2026-10-23*
