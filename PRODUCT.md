# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users
Pessoas adultas (18+) que menstruam, no Android:
- acompanham o ciclo no dia a dia;
- estão tentando engravidar;
- estão grávidas;
- estão entrando na perimenopausa.

O trabalho delas:
- registrar rapidamente como foi o dia (sangramento, dor, humor, sono, temperatura etc.);
- saber o que esperar: próxima menstruação, janela fértil, fase do ciclo;
- entender padrões ao longo dos meses e levar um resumo ao médico.

O uso costuma ser rápido, várias vezes por semana, muitas vezes em público ou à noite.

## Product Purpose
Acompanhamento completo do ciclo menstrual, com tudo o que apps do gênero cobram em assinatura e aqui sai grátis:
- previsões sem limite;
- análises completas;
- todos os modos;
- relatório médico;
- integração com wearables;
- IA.

Sucesso significa que a pessoa registra, entende o próprio corpo e confia no app sem pagar e sem expor dados de saúde reprodutiva.

## Positioning
Grátis por inteiro e local-first:
- não há conta, servidor nem paywall;
- os dados ficam no aparelho, em banco criptografado;
- as funções de IA usam a chave de API da própria pessoa e só enviam o que ela vê e aprova.

## Operating Context
- Registro diário curto, de segundos, frequentemente com uma mão.
- Consulta da fase e das previsões antes de decisões do dia (sexo, treino, compromissos).
- Revisão mensal dos padrões.
- Gerar e compartilhar um PDF antes de consultas médicas.
- Dados de wearables chegam pelo Health Connect.

## Capabilities and Constraints
- **Modos:** Período, Sem sangramento, Tentando engravidar, Gravidez e Perimenopausa. Todos livres.
- **Registro:** 40+ categorias, tags ilimitadas e notas.
- **Previsões:** menstruação, janela fértil/ovulação e dor.
- **Análises:** ciclo, fluxo, dor, sentimentos, BBT, sono, peso e FC.
- **Extras:** lembretes, PDF médico, conteúdo próprio com busca e IA BYOK.
- **Fora da v0.1:** iOS e web, conta e sync, compartilhamento com parceiro e comunidade.
- **Saúde:** o app não é dispositivo médico. As previsões não servem como método contraceptivo, e isso precisa ser dito.
- **Envio de dados:** nada sai do aparelho sem ação explícita da pessoa (LGPD, dado sensível).
- **Stack:** Expo SDK 58 + NativeWind 5 / Tailwind 4.
- **Detalhes do produto:** `.paul/PROJECT.md`.

## Brand Commitments
- **Nome:** Ciclo Livre.
- **Voz:** inclusiva e acolhedora.
  - Trata por "você" e usa "pessoas que menstruam".
  - Não presume gênero, orientação nem relacionamento.
  - Tom de amiga bem informada: direto sobre sexo e contracepção, nunca infantil nem alarmista.
- **Idioma:** pt-BR.
- **Proibido:** marca, logotipo, cores identitárias, textos e artigos do Clue (marca registrada). O estudo `../estudo-rea-clue/` serve só como referência de funcionalidade.

## Evidence on Hand
- Estudo REA do app de referência em `../estudo-rea-clue/`: inventário de funcionalidades. Não é conteúdo nem identidade.
- Ainda não há usuários, depoimentos, métricas nem conteúdo editorial. Não inventar.

## Product Principles
1. **Nada atrás de cadeado:** nenhuma tela de compra, upsell, blur ou cadeado em lugar nenhum.
2. **Privacidade por padrão:** dados no aparelho; qualquer envio é explícito, visível e opcional.
3. **Registrar em segundos:** o caminho mais comum (registrar hoje) é o mais curto.
4. **Honestidade sobre incerteza:** previsões mostram quão confiáveis são e nunca se passam por conselho médico.
5. **Respeito a todos os corpos e momentos de vida:** nenhum modo é tratado como padrão "certo".

## Accessibility & Inclusion
- WCAG AA: contraste AA, respeito ao tamanho de fonte do sistema e TalkBack nas telas principais.
- Linguagem inclusiva, conforme Brand Commitments.
