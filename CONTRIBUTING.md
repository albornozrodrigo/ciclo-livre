# Contribuindo com o Ciclo Livre

Que bom ter você aqui. O Ciclo Livre é feito para quem menstrua, e quem menstrua sabe melhor do que ninguém o que falta nos apps de ciclo. Toda contribuição conta: código, teste, texto, design, tradução, relato de bug.

## Antes de começar

- **Issues são públicas.** Não escreva nelas dados de saúde seus ou de outra pessoa. Para mostrar um bug, use dados inventados.
- **Combine antes de mudanças grandes.** Abra uma issue descrevendo a ideia. Assim ninguém perde tempo com algo que não cabe no projeto.
- **Seja gentil.** Tratamos todo mundo com respeito, sem exceção. Comentários sobre corpo, gênero ou experiência de alguém não têm lugar aqui.

## Regras do projeto

Elas existem por causa da privacidade de quem usa o app:

1. **Dados de saúde só no banco criptografado.** Nada de AsyncStorage, arquivos soltos ou logs com conteúdo de registros.
2. **Nada sai do aparelho sem ação explícita da pessoa.** Nenhuma chamada de rede automática, nenhum analytics, nenhum SDK de terceiros que fale com servidor.
3. **Tudo liberado.** Nada de paywall, anúncio ou recurso "premium".
4. **O app não é contraceptivo.** Qualquer texto sobre fertilidade deixa isso claro.
5. **Mudou o que o app guarda ou envia?** Atualize a política em `src/content/privacy-policy.ts` e a data dela. Os testes conferem parte disso.

## Fluxo de trabalho

1. Faça um fork e crie uma branch a partir de `main`.
2. **Teste primeiro (TDD).** Escreva o teste, veja falhar, escreva o código mínimo para passar. A lógica de domínio (`src/domain/`) e o banco (`src/db/`) têm testes rápidos em Node; as telas usam a React Native Testing Library.
3. Rode tudo antes de abrir o pull request:
   ```bash
   npm test
   npx tsc --noEmit
   npm run lint
   ```
4. Mexeu em interface? Teste num aparelho ou emulador Android e anexe capturas no PR.
5. Mexeu em `app.json`, num plugin ou em `modules/`? Rode `npx expo prebuild --platform android` e confirme que o app **abre**, não só que compila.

## Estilo

- **Código:** TypeScript estrito, Prettier (aspas simples, 140 colunas) e ESLint do projeto. Rode o Prettier só nos arquivos que você mexeu.
- **Comentários e textos:** em português do Brasil, curtos e diretos.
- **Interface:** siga o [DESIGN.md](DESIGN.md) (mundo "Território do Ciclo"). Cores de fase sempre com rótulo, contraste AA, toques de 48dp ou mais, tudo funcionando com o TalkBack.
- **Textos do app:** linguagem do dia a dia, inclusiva e sem paternalismo. O tom está no [PRODUCT.md](PRODUCT.md).
- **Artigos:** conteúdo original com fontes abertas. Não copie textos de outros apps.
- **Nativo:** nunca edite `android/` à mão. Use `app.json`, um config plugin em `plugins/` ou um módulo local em `modules/`. Instale pacotes com `npx expo install`.

## Licença

Ao contribuir, você concorda que a sua contribuição fica sob a [GPL-3.0](LICENSE), a mesma licença do projeto.
