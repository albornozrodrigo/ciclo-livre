---
description: "Todo o acompanhamento de ciclo de um app premium, grátis, aberto e com os dados só no aparelho"
type: Project
about: "ciclo-livre"
---

# Ciclo Livre

## What This Is

App Android de acompanhamento do ciclo menstrual com paridade de funcionalidades com o Clue 274.0, incluindo tudo o que lá é Clue Plus. Aqui nada é pago e não há paywall. Os dados ficam só no aparelho, sem conta e sem servidor. As funções de IA usam a chave de API da própria pessoa (BYOK).

## Core Value

Qualquer pessoa registra o ciclo e recebe previsões, análises e relatórios completos sem pagar e sem entregar dados de saúde reprodutiva a ninguém.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application (mobile, Android) |
| Version | 0.0.0 |
| Status | Fases 1–4 completas; pronto para a fase 5 (Análise) |
| Last Updated | 2026-10-22 |

## Requirements

### Core Features

Referência: `../estudo-rea-clue/00-resumo-executivo.md` e `notas/02-mapa-de-gating.md`. Tudo o que lá aparece como "Clue Plus" aqui é padrão.

- **Registro diário:** 40+ categorias (sangramento, dor com intensidade, humor, sono, BBT etc.), tags personalizadas ilimitadas, categorias personalizáveis e reordenáveis.
- **Modos:** Período, Sem sangramento, Tentando engravidar, Gravidez (com conteúdo semanal), Pós-parto, Perimenopausa e Menopausa. Todos livres.
- **Previsões e calendário:** próxima menstruação, janela fértil/ovulação e previsões de dor, sem limite de horizonte.
- **Análise completa:** duração e variação do ciclo, fluxo, dor, sentimentos, BBT, sono, peso, frequência cardíaca, histórico e visão geral por ciclo.
- **Extras liberados:**
  - lembretes (incluindo janela fértil);
  - relatório para o médico em PDF, ilimitado;
  - exportação dos dados, com opção de salvar no Google Drive (pedido do usuário em 2026-10-22);
  - wearables via Health Connect;
  - IA BYOK (chat com seus dados e resumo de conteúdo);
  - todos os ícones e temas.

### Validated (Shipped)
- ✓ Casca de 5 abas pt-BR com tema "Território do Ciclo" (claro/escuro, contraste AA) — Phase 1
- ✓ NativeWind 5 RC validado em aparelho Android — Phase 1
- ✓ SQLite criptografado (SQLCipher) com chave no secure-store e migrations — Phase 1
- ✓ Logger sem texto livre, aviso "não é contraceptivo", apagar todos os dados e recuperação quando o banco não abre — Phase 1
- ✓ Onboarding por modo (5 modos livres), 18+ conservador, perfil criptografado; trocar modo e editar dados em Mais — Phase 2
- ✓ Registro diário: 46 categorias, medições, nota, tags ilimitadas, personalizar/reordenar, outros dias — Phase 3
- ✓ Motor de previsão local (BBT 3-sobre-6, teste, muco, calendário), Hoje com fase e calendário sem limite — Phase 4
- ✓ Modo Menopausa: meses sem menstruar, Calores e categoria Menopausa, aviso de sangramento depois da menopausa — Phase 20

### Active (In Progress)
None yet.

### Planned (Next)
Rascunho de fases para o milestone v0.1. A versão final é definida em `/paul:plan`.
1. **Fundação:**
   - design system NativeWind, navegação por abas e i18n pt-BR;
   - SQLite criptografado com migrations;
   - testes com jest-expo;
   - validar NativeWind 5 RC num aparelho ou emulador Android.
2. Onboarding + perfil + modos de uso.
3. Registro diário: categorias, tags e notas.
4. Motor de previsão de ciclo, fertilidade e dor (TDD obrigatório) + calendário.
5. Aba Análise (gráficos).
6. Lembretes locais (expo-notifications).
7. Relatório médico em PDF + exportação dos dados (backup local e salvar no Google Drive).
8. Conteúdo próprio + busca + resumo IA (BYOK).
9. Chat com seus dados (BYOK, com consentimento explícito antes de enviar dados).
10. Wearables via Health Connect (sono, temperatura, FC, peso).
11. Personalização (ícones alternativos, temas) + build de release (EAS).

### Next Milestone: v0.2 O que o Flo tem a mais
Fonte: `../estudo-rea-flo/notas/05-o-que-trazer-ao-ciclo-livre.md` (estudo REA do Flo 9.73.1, 2026-10-25). Oito fases (12–19), tudo no aparelho e grátis:
1. catálogo de registro completo;
2. contracepção hormonal esconde fertilidade;
3. fase lútea informada;
4. ciclos fora do padrão;
5. status do modo Engravidar e chance por dia;
6. "Pode aparecer hoje";
7. lembretes de DIU, implante, injeção e remédios;
8. Pós-parto e encerrar gravidez.
9. Modo Menopausa (fase 20, pedido da pessoa usuária em 2026-10-26).

### Out of Scope (v0.1)
- iOS e web: Android primeiro, por decisão do usuário (2026-10-22).
- Conta, login e sync na nuvem: local-first. Sync com criptografia ponta a ponta é candidato a milestone futuro.
- Clue Connect (compartilhar com parceiro) e comunidade: dependem de servidor. Ficam para depois do sync.
- "What others track": no Clue depende de dados agregados da comunidade. Sem servidor, não há fonte para esses dados.
- OAuth direto com Oura, Garmin, Whoop etc.: exige registrar o app com cada fornecedor. A v0.1 usa só o Health Connect.
- Parcerias, suporte premium e qualquer fluxo de compra: o app é grátis.
- Artigos e textos do Clue: o conteúdo é original ou de fontes com licença aberta.

## Target Users

**Primary:** pessoas que menstruam e querem acompanhar ciclo, fertilidade, gravidez ou perimenopausa.
- Não querem pagar assinatura por análises e previsões.
- Preocupam-se com a privacidade de dados de saúde reprodutiva.
- Usam Android, com ou sem wearable.

## Context

**Business Context:** projeto aberto e gratuito, sem monetização. Inspirado no estudo REA do Clue (`../estudo-rea-clue/`), que mapeou o que é grátis e o que é pago. A paridade é de funcionalidade, não de marca nem de conteúdo.

**Technical Context:**
- No Clue, previsões, análises, PDF e IA são calculados no servidor. Aqui tudo roda no aparelho, exceto as chamadas de IA BYOK.
- O motor de previsão precisa de algoritmo próprio e documentado (média ponderada dos ciclos, com BBT e muco para a ovulação).

## Constraints

### Technical Constraints
- Expo SDK 58 / RN 0.88 / React 19.3 / expo-router, com rotas em `src/app/`.
- Sempre usar `npx expo install`.
- Projeto CNG: nunca editar `android/` à mão.
- Tailwind 4.3 via NativeWind 5.0.0-rc.0 + react-native-css 3.1.0-rc.0, ambos fixados exatamente.
- lightningcss fixado em 1.30.1: o 1.33 quebra o compilador do react-native-css.
- O RC foi testado oficialmente só no Expo 57.
- Dados de saúde:
  - SQLite criptografado, com a chave no expo-secure-store;
  - nunca logar conteúdo de registros;
  - nada sai do aparelho sem ação explícita.
- Chave de IA BYOK:
  - fica no secure-store e nunca vai para logs nem para o código;
  - mostrar exatamente o que será enviado ao provedor antes de enviar.
- Health Connect exige um development build (não roda no Expo Go).

### Business Constraints
- Custo zero de operação: sem backend próprio.
- Sem marca, logo, nomes ou textos do Clue (marca registrada).

### Compliance Constraints
- Dado sensível (LGPD art. 11, saúde e vida sexual): consentimento explícito para qualquer envio (IA), exportação sob controle da pessoa e opção de apagar tudo.
- O app não é dispositivo médico. Avisar que as previsões não servem como método contraceptivo.

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Nome "Ciclo Livre" | Não usar a marca Clue; nome que comunica "aberto" | 2026-10-22 | Active |
| Local-first, sem conta | Privacidade de dados reprodutivos e custo zero | 2026-10-22 | Active |
| IA via BYOK | Funções de IA grátis sem custo para o projeto | 2026-10-22 | Active |
| Android primeiro | Paridade com o APK estudado; foco | 2026-10-22 | Active |
| PAUL como SDD + skills Superpowers como flows | O PAUL dá roadmap/estado entre sessões; o Superpowers dá a disciplina de TDD e verificação | 2026-10-22 | Active |
| NativeWind 5 RC + Tailwind 4 | O usuário pediu as versões mais recentes; o NativeWind 4 estável só suporta Tailwind 3 | 2026-10-22 | Active (validado no aparelho; ajuste de resolver do Metro) |
| SQLCipher com chave bruta 256 bits no secure-store; falha fechada sem cipher | Dado sensível nunca em claro | 2026-10-22 | Active |
| Idade 18+ conservadora pelo ano (ano atual − ano − 1 ≥ 18) | Sem coletar data completa; nunca deixar 17 anos passar | 2026-10-22 | Active |
| Previsões calculadas no aparelho; hoje nunca vira menstruação sem registro | Honestidade sobre incerteza | 2026-10-22 | Active |
| Todas as escritas passam por uma fila por conexão | expo-sqlite não tem transação exclusiva com SQLCipher | 2026-10-22 | Active |
| Só se guarda o que o fluxo do modo pergunta | Minimização de dado sensível | 2026-10-22 | Active |
| Aparelho de teste: Galaxy S21 FE (RQCRC00WJMV) | Indicado pela pessoa usuária; S21 Ultra usado por outra sessão | 2026-10-22 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Paridade com o mapa Plus do estudo | 100% dos itens "Plus" fora do Out of Scope implementados e liberados | 0% | Not started |
| Telas de compra ou paywall | 0 | 0 | On track |
| Testes do motor de previsão | Cobertura ≥ 90% em `src/domain/` com casos-limite (ciclo irregular, dados faltantes) | - | Not started |
| Dados de saúde enviados para fora sem ação explícita | 0 requisições | - | Not started |
| Build Android de release | APK/AAB via EAS rodando em aparelho real | - | Not started |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Expo SDK 58, React Native 0.88, React 19.3 | React Compiler + typed routes ligados no template |
| Navegação | expo-router 58 | Rotas em `src/app/` |
| Estilo | NativeWind 5.0.0-rc.0 + Tailwind 4.3.3 | `src/global.css`, `metro.config.js`, `postcss.config.mjs` |
| Dados | expo-sqlite (SQLCipher) | A confirmar no plano da fase 1 |
| Segredos | expo-secure-store | Chave do banco + chave de IA |
| Notificações | expo-notifications (locais) | Fase 6 |
| PDF | expo-print + expo-sharing | Fase 7 |
| Exportação / Google Drive | Seletor de arquivos do Android (SAF) ou Drive API | Fase 7: decidir no plano; a preferência é o SAF/compartilhar do sistema, que inclui o Drive sem OAuth e sem custo |
| Saúde | Health Connect (react-native-health-connect ou módulo Expo) | Fase 10; exige dev build |
| IA | APIs Claude/OpenAI via chave do usuário | Fases 8–9 |
| Testes | jest-expo + Testing Library RN | TDD no domínio |
| Build | EAS Build | Fase 11 |

## Links

| Resource | URL |
|----------|-----|
| Repository | local: `ciclo-livre/` |
| Estudo base | `../estudo-rea-clue/` |
| Estudo do Flo (v0.2) | `../estudo-rea-flo/` |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-10-26 after Phase 20*
