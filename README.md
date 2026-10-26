# Ciclo Livre

App Android de acompanhamento do ciclo menstrual, grátis, sem anúncios e com os dados só no celular de quem usa. Tudo o que apps como o Clue cobram numa assinatura aqui é liberado: previsões, análises, relatório em PDF para a consulta, lembrete da janela fértil, Health Connect, IA, ícones e temas.

Site: https://ciclo-livre.vercel.app · Política de privacidade: https://ciclo-livre.vercel.app/privacidade

Este repositório é aberto para a comunidade. A ideia é que pessoas desenvolvedoras que menstruam, e quem mais quiser somar, ajudem a construir o app que gostariam de usar.

> O Ciclo Livre não é método contraceptivo nem dispositivo médico. As previsões são estimativas.

## O que o app faz

- **Registro diário:** 53 categorias (sangramento, dor, humor, sono, temperatura basal, muco, sexo, testes e outras), notas e tags sem limite, categorias reordenáveis.
- **Sete modos, todos livres:** Período, Sem sangramento, Tentando engravidar, Gravidez, Pós-parto, Perimenopausa e Menopausa.
- **Previsões no aparelho:** próxima menstruação, janela fértil e ovulação (usa temperatura basal e muco quando você registra), calendário sem limite de datas.
- **Análise:** duração e variação do ciclo, sintomas frequentes, temperatura, sono, peso e batimentos.
- **Lembretes locais**, inclusive o da janela fértil, com texto discreto por padrão.
- **Relatório em PDF** dos últimos ciclos para levar à consulta, quantas vezes quiser.
- **Exportar, fazer backup criptografado e restaurar**; importar os dados exportados do Clue.
- **Health Connect (só leitura):** sono, temperatura basal, frequência cardíaca em repouso, VFC e peso do relógio ou de outros apps.
- **IA com a sua chave (BYOK):** resumo de artigos e conversa sobre os seus dados usando o Claude, da Anthropic. O app mostra o texto exato antes de enviar e pede consentimento.
- **Artigos próprios** sobre ciclo, com fontes.
- **Proteção:** desbloqueio com a digital ou o PIN do celular, app escondido nos recentes, ícone discreto ("Diário").
- **Aparência:** tema claro, escuro ou igual ao celular, e quatro ícones.

## Privacidade

- Sem conta, sem servidor, sem anúncios e sem analytics.
- Tudo fica num banco SQLite criptografado (SQLCipher). A chave fica no armazenamento seguro do Android.
- O app fica fora do backup automático do Android.
- Só sai algo do celular quando a pessoa manda: a IA com a chave dela, ou um arquivo que ela exporta e compartilha.
- Os logs nunca levam o conteúdo dos registros.

A política completa está no app (Mais › Privacidade e segurança) e em [`src/content/privacy-policy.ts`](src/content/privacy-policy.ts).

## Stack

| Camada | Tecnologia |
|---|---|
| App | Expo SDK 58, React Native 0.88 (New Architecture), React 19, TypeScript |
| Navegação | expo-router (rotas em `src/app/`) |
| Estilo | NativeWind 5 (RC) + Tailwind 4 |
| Dados | expo-sqlite com SQLCipher, migrations próprias |
| Segredos | expo-secure-store |
| Saúde | react-native-health-connect |
| Testes | Jest (jest-expo) + React Native Testing Library |
| Build | EAS Build |

## Como rodar

Você vai precisar de Node 20 ou mais novo, do Android Studio (SDK e um emulador ou um celular Android 8+ com depuração USB) e do JDK que vem com ele. O app usa código nativo (SQLCipher, Health Connect, módulos locais), então **não roda no Expo Go**: é preciso um development build.

```bash
git clone https://github.com/albornozrodrigo/ciclo-livre.git
cd ciclo-livre
npm install
npx expo prebuild --platform android   # gera android/ a partir do app.json e dos plugins
npx expo run:android                   # compila, instala e abre o app
```

Depois do primeiro build, `npx expo start --dev-client` basta para mudanças em JavaScript. Mudou `app.json`, um plugin ou um módulo nativo? Rode o `prebuild` de novo antes do build.

### Testes e qualidade

```bash
npm test                 # Jest (domínio, banco em memória, telas)
npx tsc --noEmit         # tipos
npm run lint             # ESLint
```

## Como o código está organizado

```
src/
  app/          telas (expo-router)
  domain/       regras puras: previsão do ciclo, análise, importação, IA (feitas com TDD)
  db/           banco criptografado, migrations e repositórios
  components/   componentes de interface
  ai/           chamadas ao Claude (só com chave e consentimento)
  health/       Health Connect
  security/     trava do app
  i18n/         textos em pt-BR
  content/      artigos e política de privacidade
modules/        módulos nativos locais (ícone do app, intent de abertura, janela segura)
plugins/        config plugins do Expo (backup, ícones alternativos)
scripts/        geração dos ícones e da página de política do site
site/           site estático (Vercel), mesmo visual do app
store/          imagens da Google Play (ícone, arte de destaque, capturas)
docs/           guia de publicação na Play Store
.paul/          planejamento por fases (roadmap, planos e resumos)
DESIGN.md       sistema visual "Território do Ciclo"
PRODUCT.md      para quem é o app e como ele fala
```

A pasta `android/` é gerada pelo `prebuild` e não vai para o repositório. Configure o nativo pelo `app.json` e pelos plugins.

## Como contribuir

Leia o [CONTRIBUTING.md](CONTRIBUTING.md). Em resumo:

1. Abra uma issue contando o que você quer mudar, ou escolha uma aberta.
2. Escreva o teste primeiro, depois o código.
3. Antes do pull request, rode `npm test`, `npx tsc --noEmit` e `npm run lint`.

As issues são públicas. Não escreva nelas nada sobre a sua saúde.

## Apoie

O app é grátis e sem anúncios para sempre. Se ele te ajuda e você quiser retribuir, a chave Pix está no app, em Mais › Me pague um café.

## Licença

[GPL-3.0](LICENSE). Você pode usar, estudar, mudar e redistribuir o código. Quem distribuir uma versão modificada precisa publicar o código dela sob a mesma licença.

---

## English

Ciclo Livre is a free, ad-free, open-source period tracker for Android. All data stays on the device in an encrypted database: no account, no server, no analytics. Features that cycle apps usually put behind a subscription (predictions, analysis, PDF report, Health Connect, AI with your own Anthropic key, icons and themes) are all free. The app is in Brazilian Portuguese. Contributions are welcome, especially from developers who menstruate. Licensed under GPL-3.0.
