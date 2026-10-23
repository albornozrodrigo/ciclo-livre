# Como publicar o Ciclo Livre na Google Play

Passo a passo para uma conta pessoal nova, no Brasil. Requisitos conferidos nas páginas oficiais do Google em 23/10/2026; as fontes estão no fim.

**Quanto tempo leva:** de 3 a 5 semanas. O gargalo é o teste fechado obrigatório: 12 pessoas testando por 14 dias seguidos, mais até 7 dias para o Google liberar a produção.

**O que já está pronto no repositório:**

| Item                                                                             | Onde                                                     |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Ícone 512×512 (PNG com alfa)                                                     | `store/icon-512.png`                                     |
| Arte de destaque 1024×500 (JPG, sem alfa)                                        | `store/feature-graphic.jpg`                              |
| 6 capturas de tela 1080×2160                                                     | `store/screenshots/`                                     |
| Logo em SVG e as variantes do ícone                                              | `store/logo.svg`, `store/*-full.svg`                     |
| Política de privacidade pública                                                  | https://ciclo-livre.vercel.app/privacidade               |
| Site                                                                             | https://ciclo-livre.vercel.app                           |
| Chave de upload (fora do git)                                                    | `credentials/ciclolivre-upload.jks` + `credentials.json` |
| Perfis de build                                                                  | `eas.json`: `preview` (APK) e `production` (AAB)         |
| targetSdk 36, Health Connect com tela de justificativa e `VIEW_PERMISSION_USAGE` | gerado pelo `prebuild`                                   |

---

## 0. Antes de tudo: cópia da chave de upload

Copie a pasta `credentials/` e o arquivo `credentials.json` para um lugar fora do Mac: um pendrive, um gerenciador de senhas que aceite anexos ou um disco criptografado. Sem a chave de upload você não envia atualizações até o Google aprovar um reset, o que leva dias.

---

## 1. Criar a conta de desenvolvedor (1 a 3 dias)

1. Acesse https://play.google.com/console/signup com a conta Google que vai ser dona do app.
2. Escolha **Conta pessoal** (personal). Não precisa de D-U-N-S nem CNPJ.
3. Pague a taxa única de **US$ 25** com cartão de crédito no seu nome. Cartão pré-pago é recusado.
4. Confirme a identidade. Nome e endereço vêm do seu perfil do Google Payments. Se o perfil não estiver verificado, o Google pede foto de um documento oficial, e o nome precisa bater exatamente.
5. Confirme por código o **e-mail do desenvolvedor**, o **e-mail de contato** e o **telefone**.
6. **Verifique um aparelho Android físico.** Instale o app _Google Play Console_ no S21 FE (Android 10+, sem root), abra a tarefa de verificação no painel do Console no computador, escaneie o QR code com o celular e toque em _Verify_.

**O que fica público:** seu nome legal, o país e o e-mail de desenvolvedor. Como o app é grátis, o endereço não aparece. Se não quiser expor o seu e-mail pessoal, crie um só para o projeto (por exemplo `ciclolivre.app@gmail.com`) e use-o como e-mail de contato.

---

## 2. Criar o app no Console (15 min)

1. _Todos os apps_ → **Criar app**.
2. Preencha:
   - Nome: **Ciclo Livre**
   - Idioma padrão: **Português (Brasil) – pt-BR**
   - App ou jogo: **App**
   - Gratuito ou pago: **Gratuito**. Essa escolha não muda depois.
3. Aceite as declarações e crie.

O pacote (`app.ciclolivre`) fica definido no primeiro AAB enviado e também não muda depois.

---

## 3. Gerar o AAB de produção

No Mac, na pasta do projeto:

```bash
npx eas-cli@latest build -p android --profile production
```

O EAS assina o AAB com a sua chave de upload local (`credentialsSource: local`). Baixe o `.aab` pelo link que aparece no fim.

Antes de enviar, confira duas coisas no APK de teste (perfil `preview`), que usa o mesmo código nativo:

```bash
# Assinado com a sua chave, não com a de debug (deve mostrar CN do seu certificado de upload)
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs ciclo-livre.apk

# Páginas de 16 KB (obrigatório para atualizações a partir de 01/02/2027; melhor já cumprir)
$ANDROID_HOME/build-tools/36.0.0/zipalign -c -P 16 -v 4 ciclo-livre.apk | tail -1
```

O `zipalign` deve terminar com `Verification successful`.

**Versão:** cada envio precisa de um `versionCode` maior. Antes de cada novo build de produção, aumente `expo.android.versionCode` no `app.json` (1, 2, 3...) e, quando fizer sentido, o `expo.version` (0.1.0, 0.1.1...).

---

## 4. Play App Signing

No primeiro envio, o Google cria a chave de assinatura final do app e guarda com ele. Você continua assinando cada AAB com a **chave de upload** (a sua). Não precisa mudar nada; só aceite a opção padrão quando o Console perguntar.

Se um dia perder a chave de upload: _Configuração → Integridade do app → Assinatura de apps_ → pedir reset da chave de upload.

---

## 5. Preencher "Conteúdo do app"

Fica em _Monitorar e melhorar → Política → Conteúdo do app_ (ou no checklist do painel). Todas as declarações são obrigatórias.

### 5.1 Política de privacidade

URL: **https://ciclo-livre.vercel.app/privacidade**

É o mesmo texto da tela do app (gerado de `src/content/privacy-policy.ts` por `node scripts/build-site.mjs`). Mudou a política no app? Rode o script e publique o site de novo (passo 10), para as duas versões continuarem iguais. O Google confere isso no Health Connect.

### 5.2 Acesso ao app

Marque **Todas as funcionalidades estão disponíveis sem acesso especial**. No campo de instruções, escreva:

> Não há login. A IA (resumo de artigos e chat) é opcional e usa a chave da Anthropic da própria pessoa, em Mais › IA com sua chave. O restante funciona sem chave.

### 5.3 Anúncios

**Não, meu app não contém anúncios.**

### 5.4 Classificação de conteúdo (questionário IARC)

- E-mail: o de contato.
- Categoria: **Todos os outros tipos de app** (utilitário/produtividade).
- Responda **Não** para violência, conteúdo sexual, linguagem imprópria, drogas, jogos de azar, interação entre usuários, compartilhamento de localização e compras digitais.
- Sobre conteúdo gerado por usuários: o chat só conversa com a IA, nada é publicado para outras pessoas, então **Não** para interação/compartilhamento entre usuários.

### 5.5 Público-alvo

- Faixa etária: só **18 anos ou mais**.
- Ative a opção de **restringir acesso de menores**, se aparecer.
- "O app pode atrair crianças sem querer?": **Não**.

### 5.6 Recursos financeiros

**Meu app não oferece recursos financeiros.** O Pix do "Me pague um café" só copia uma chave; o pagamento acontece no app do banco.

### 5.7 Apps de notícias e apps governamentais

**Não** e **Não**.

### 5.8 Segurança dos dados (Data safety)

As regras do Google: "coletar" é transmitir dados para fora do aparelho, e o que fica só no aparelho não se declara. No Ciclo Livre, dados só saem quando a pessoa usa a IA com a própria chave (vão para a Anthropic) ou exporta um arquivo. Exportar pelo menu de compartilhar é ação da pessoa e não conta como coleta. A IA é o caso que pede declaração.

Respostas recomendadas, pelo lado conservador:

1. **O app coleta ou compartilha dados do tipo exigido?** Sim.
2. **Todos os dados são criptografados em trânsito?** Sim (HTTPS para `api.anthropic.com`).
3. **A pessoa pode pedir a exclusão?** Escolha a opção de que os dados podem ser apagados: tudo é apagado no app (Mais › Privacidade e segurança › Apagar tudo) ou ao desinstalar. Não há conta.
4. **Tipos de dados coletados**, todos como **opcionais**, finalidade **Funcionalidade do app**, processados de forma **não efêmera** (a Anthropic guarda conforme a política dela):
   - _Saúde e fitness → Informações de saúde_ (resumo do ciclo, sintomas, medições enviados no chat);
   - _Saúde e fitness → Informações de condicionamento físico_ (sono, batimentos e peso que entram no resumo);
   - _Mensagens no app ou Outro conteúdo gerado pelo usuário_ (a pergunta e, se a pessoa marcar, as notas).
5. **Compartilhados com terceiros?** Não. O envio à Anthropic acontece por ação explícita da pessoa, depois de ver o texto e consentir, o que o Google trata como exceção ("user-initiated action"). Se preferir não depender dessa leitura, marque os mesmos três tipos também como compartilhados.

Não marque localização, identificadores, contatos, fotos, arquivos, histórico de navegação nem informações financeiras: o app não envia nada disso.

### 5.9 Declaração de apps de saúde

- Marque **Monitoramento do ciclo menstrual** (period tracking). Se houver, marque também **Gestão do sono**, porque o app mostra o sono vindo do Health Connect.
- **Não** marque _Dispositivo médico_.

### 5.10 Permissões do Health Connect

Dentro da mesma declaração. Peça exatamente as 5 permissões do manifest, nem mais nem menos. Justificativas para colar:

| Permissão                     | Justificativa                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `READ_SLEEP`                  | Mostrar a duração do sono por dia na tela Análise, ao lado das fases do ciclo, para a pessoa ver se o sono muda antes da menstruação. |
| `READ_BASAL_BODY_TEMPERATURE` | Usar a temperatura basal medida pelo relógio ou termômetro para estimar a ovulação e mostrar a curva de temperatura do ciclo.         |
| `READ_RESTING_HEART_RATE`     | Mostrar a frequência cardíaca em repouso por dia na Análise, que costuma subir na fase lútea.                                         |
| `READ_HEART_RATE_VARIABILITY` | Mostrar a variabilidade da frequência cardíaca por dia na Análise, junto das fases do ciclo.                                          |
| `READ_WEIGHT`                 | Mostrar o peso ao longo dos ciclos na Análise, para a pessoa notar variações ligadas à retenção de líquido.                           |

Inclua também: o app só lê, nunca escreve; lê os últimos 30 dias na primeira conexão; os dados ficam no banco criptografado do aparelho; a tela de justificativa do Health Connect abre a política de privacidade.

### 5.11 Aviso médico (obrigatório para apps de saúde)

A descrição completa da ficha (passo 6) já traz a frase exigida: o app não é dispositivo médico e não diagnostica, trata, cura nem previne nenhuma condição. Não escreva em lugar nenhum que o app serve para evitar gravidez.

### 5.12 IA generativa

O app usa o Claude para resumir artigos e responder perguntas sobre os dados da pessoa. É um recurso de apoio, não o centro do app, mas o Google pode pedir uma forma de **denunciar uma resposta da IA dentro do app**. Hoje o app não tem esse botão. Se a análise pedir, adicione um "Denunciar resposta" na tela do chat, que abra uma issue ou um e-mail sem incluir dados de saúde.

---

## 6. Ficha da loja

_Crescer → Presença na loja → Página principal da loja_.

**Nome do app** (até 30): `Ciclo Livre`

**Descrição curta** (até 80, sem emoji):

```
Acompanhe o ciclo sem anúncios e sem conta. Seus dados ficam no celular.
```

**Descrição completa** (até 4.000):

```
O Ciclo Livre acompanha o ciclo menstrual sem cobrar, sem anúncios e sem pedir conta. Tudo o que você registra fica só no seu celular, num banco de dados criptografado.

O QUE O APP FAZ
• Registro do dia em segundos: 46 categorias, como sangramento, coleta, dor, humor, sono, temperatura basal, muco, sexo e testes. Notas e tags sem limite.
• Cinco modos: Período, Sem sangramento, Tentando engravidar, Gravidez e Perimenopausa.
• Previsão da próxima menstruação, da janela fértil e da ovulação, com a margem de dias. Se você registra temperatura basal ou muco, a previsão usa esses dados.
• Calendário sem limite de datas.
• Análise: duração e variação do ciclo, sintomas frequentes, temperatura, sono, peso e batimentos.
• Lembretes no próprio celular, inclusive da janela fértil, com texto discreto por padrão.
• Relatório em PDF dos últimos 6 ciclos para levar à consulta.
• Exportar planilha ou JSON, backup criptografado com senha e importação do histórico exportado do Clue.
• Health Connect (só leitura): sono, temperatura basal, frequência cardíaca em repouso, variabilidade e peso.
• IA opcional com a sua chave da Anthropic: resumo de artigos e conversa sobre os seus dados. O app mostra o texto exato antes de enviar e só envia quando você confirma.
• Artigos sobre o ciclo, com fontes.
• Trava com a digital ou o PIN do celular, tela escondida nos apps recentes e um ícone discreto chamado "Diário".
• Tema claro ou escuro e quatro ícones.

PRIVACIDADE
Sem conta, sem servidor, sem anúncios e sem analytics. O app fica fora do backup automático do Android. Algo só sai do celular quando você manda: na IA com a sua chave ou num arquivo que você exporta.

GRÁTIS E ABERTO
Nada fica atrás de assinatura. O código é aberto (GPL-3.0) em github.com/albornozrodrigo/ciclo-livre, e qualquer pessoa pode conferir o que o app faz com os dados.

AVISO
O Ciclo Livre não é um dispositivo médico e não diagnostica, trata, cura nem previne nenhuma condição médica. As previsões são estimativas e não servem como método contraceptivo. Em caso de dúvida sobre a sua saúde, procure um profissional. Para maiores de 18 anos.
```

**Imagens:**

- Ícone: `store/icon-512.png`
- Arte de destaque: `store/feature-graphic.jpg`. Texto alternativo: `Ciclo Livre: app de ciclo menstrual grátis, sem anúncios e sem conta, com os dados no celular.`
- Capturas de tela do telefone: as 6 de `store/screenshots/`, nesta ordem (Hoje, Registro, Calendário, Análise, Seus dados, Aparência).

As capturas usam dados de exemplo do aparelho de teste. Confira se não há nada pessoal nelas antes de enviar.

**Categoria** (_Configurações da loja_): **Saúde e fitness**. Tags: período, ciclo menstrual, saúde da mulher (escolha as que o Console oferecer).

**Contato:** e-mail (obrigatório, público) e site `https://ciclo-livre.vercel.app`.

---

## 7. Conta de serviço para `eas submit` (opcional, 20 min)

Dá para subir o AAB arrastando no Console. Para enviar pelo terminal:

1. No Google Cloud Console (https://console.cloud.google.com), crie um projeto, por exemplo `ciclo-livre-play`.
2. Ative a **Google Play Android Developer API** nesse projeto.
3. _IAM e administrador → Contas de serviço → Criar conta de serviço_. Não precisa de papel no Cloud.
4. Na conta criada: _Chaves → Adicionar chave → JSON_. Salve como `credentials/play-service-account.json` (a pasta já está no `.gitignore`).
5. No Play Console: _Usuários e permissões → Convidar novos usuários_, cole o e-mail da conta de serviço e dê, para o app Ciclo Livre: ver informações do app, gerenciar versões de teste, lançar em produção e gerenciar a presença na loja.
6. No `eas.json`, adicione:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./credentials/play-service-account.json",
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

7. Envie: `npx eas-cli@latest submit -p android --profile production --latest`

O **primeiro AAB** sobe mais fácil à mão pelo Console. Se o `eas submit` reclamar que o app não existe, faça o primeiro envio manual e use o EAS a partir do segundo.

---

## 8. Testes

### 8.1 Teste interno (no mesmo dia)

_Testar e lançar → Testes → Teste interno → Criar versão_. Envie o AAB, escreva as notas da versão e publique. Adicione o seu e-mail na lista de testadores, abra o link de participação no celular e instale pela Play. Confira:

- o app abre, registra, a trava funciona;
- o Health Connect pede as permissões e lê dados;
- a política abre pelo diálogo do Health Connect;
- a troca de ícone funciona (o app instalado pela Play é assinado pelo Google, não pela sua chave).

### 8.2 Teste fechado (14 dias, obrigatório)

Contas pessoais criadas depois de 13/11/2023 só liberam a produção depois disto: **pelo menos 12 testadores que aceitaram o convite e ficaram inscritos nos últimos 14 dias seguidos**. Quem sai antes perde a contagem; quem sai e volta recomeça do zero.

1. Crie um **Google Group** (https://groups.google.com), por exemplo `ciclo-livre-testes`, aberto para quem tiver o link.
2. _Testes → Teste fechado → Criar faixa_ (ou use "Alpha"). Em _Testadores_, adicione o e-mail do grupo.
3. Envie o mesmo AAB, escolha os países (Brasil) e mande para revisão. O link de participação só funciona depois que a faixa for publicada.
4. Divulgue o link do grupo e o de participação. Bons lugares: o README do repositório, comunidades de mulheres e pessoas não binárias na tecnologia (PyLadies, WoMakersCode, Rails Girls, grupos de Discord/Telegram), amigas e amigos com Android.
5. Peça que **fiquem inscritos e usem o app de verdade** durante os 14 dias, e que mandem feedback (formulário simples ou issues sem dados de saúde). O Google olha o engajamento.
6. Anote o feedback e o que mudou por causa dele: o Console pergunta isso no passo 9.

Recrute 15 a 20 pessoas para sobrar margem.

---

## 9. Pedir acesso à produção (até 7 dias)

Depois dos 14 dias, o painel mostra **Solicitar acesso à produção**. O questionário tem três partes:

1. **Sobre o teste fechado:** se foi fácil recrutar, se usaram todos os recursos, como o uso deles se parece com o de quem vai usar o app, resumo do feedback e como você coletou.
2. **Sobre o app:** público (pessoas adultas que menstruam, no Android, no Brasil), o valor (acompanhamento completo grátis, com dados só no aparelho), estimativa de instalações no primeiro ano (seja realista: centenas ou poucos milhares).
3. **Prontidão:** o que mudou com o teste e como você decidiu que está pronto (testes automatizados, revisão de segurança, teste em aparelho real).

Cada parte só é salva quando você clica em _Próximo_. Se o Google achar o engajamento fraco, ele pede mais dias de teste.

---

## 10. Lançar em produção

1. _Produção → Criar versão_, escolha o AAB que já passou pelo teste fechado (ou um novo, com `versionCode` maior).
2. Países: **Brasil** (o app está só em português).
3. Use **lançamento gradual**: comece com 20%, acompanhe falhas em _Android vitals_ por alguns dias e suba para 50% e 100%.
4. Ative a **Publicação gerenciada** se quiser escolher o momento exato em que o app aparece depois de aprovado.
5. Envie para revisão. Pode levar até 7 dias, às vezes mais para apps de saúde.

Quando sair, troque no site o "Chega à Google Play em breve" pelo link da loja (`site/index.html`) e publique:

```bash
node scripts/build-site.mjs        # só se a política mudou
cd site && npx vercel@latest deploy --prod
```

---

## Motivos comuns de recusa (e como o app já se previne)

| Motivo                                                             | Situação no Ciclo Livre                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Permissões do Health Connect no manifest diferentes das declaradas | Manifest tem exatamente 5 permissões de leitura; declare as 5      |
| Falta a tela de justificativa ou o `VIEW_PERMISSION_USAGE`         | Ambos no manifest gerado; a tela abre a política                   |
| Política no Console diferente da do app                            | As duas vêm do mesmo arquivo                                       |
| Falta o aviso "não é dispositivo médico"                           | Está na descrição completa                                         |
| Promessa de contracepção                                           | O app diz o contrário em todas as previsões                        |
| Dados de saúde enviados a terceiros sem consentimento              | O chat mostra o texto e pede consentimento antes do primeiro envio |
| Segurança dos dados incoerente com o comportamento                 | Declare a IA como no passo 5.8                                     |
| Teste fechado fraco                                                | Recrute com folga e peça uso real                                  |

---

## Fontes oficiais

- Conta e verificação: https://support.google.com/googleplay/android-developer/answer/6112435, /answer/13628312, /answer/14316361
- Teste fechado e acesso à produção: https://support.google.com/googleplay/android-developer/answer/14151465, /answer/9845334
- Target API: https://developer.android.com/google/play/requirements/target-sdk
- Páginas de 16 KB: https://developer.android.com/guide/practices/page-sizes
- Segurança dos dados: https://support.google.com/googleplay/android-developer/answer/10787469
- Dados do usuário e política de privacidade: https://support.google.com/googleplay/android-developer/answer/10144311
- Apps de saúde: https://support.google.com/googleplay/android-developer/answer/16679511
- Health Connect: https://developer.android.com/health-and-fitness/health-connect/publish
- Público-alvo: https://support.google.com/googleplay/android-developer/answer/9867159
- Classificação: https://support.google.com/googleplay/android-developer/answer/9898843
- Ficha e imagens: https://support.google.com/googleplay/android-developer/answer/9866151
- IA generativa: https://support.google.com/googleplay/android-developer/answer/13985936
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- EAS Submit: https://docs.expo.dev/submit/android/ e https://github.com/expo/fyi/blob/main/creating-google-service-account.md
