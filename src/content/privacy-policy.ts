import type { Block } from './search';

/** Bloco de leitura da política: os do artigo mais subtítulo (###). */
export type PolicyBlock = Block | { kind: 'sub'; text: string };

/**
 * Política de privacidade (texto editado com a skill no-ai-slop, 2026-10-23).
 * Cada afirmação corresponde a um comportamento do código; mudou o app, revise aqui e a data.
 */
export const PRIVACY_POLICY: { title: string; effective: string; blocks: PolicyBlock[] } = {
  title: 'Política de privacidade do Ciclo Livre',
  effective: '26 de outubro de 2026',
  blocks: [
    { kind: 'h', text: 'Em resumo' },
    {
      kind: 'p',
      text: 'Tudo o que você registra fica só neste celular, num banco criptografado. O Ciclo Livre não tem conta, servidor, anúncios nem analytics, e quem faz o app não recebe os seus registros nem dados de uso. Algo só sai do celular quando você manda: ao usar a IA com a sua própria chave ou ao exportar e compartilhar um arquivo.',
    },
    { kind: 'h', text: 'O que fica guardado no celular' },
    {
      kind: 'list',
      items: [
        'O que você registra: menstruação, sintomas, humor, medições (temperatura, peso, sono, batimentos), notas, tags e testes.',
        'Seu perfil: ano de nascimento, modo de uso (por exemplo, tentando engravidar, gravidez ou menopausa), duração média do ciclo, as datas que o modo pede (data prevista do parto, data do parto ou, na menopausa, a data aproximada da última menstruação), a duração da fase lútea se você informar e, se quiser contar, o método contraceptivo.',
        'Suas configurações: lembretes, ordem das categorias e o que você escolheu na IA e no Health Connect.',
        'A conversa com a IA, se você usar o chat.',
      ],
    },
    {
      kind: 'p',
      text: 'Tudo isso fica num banco de dados criptografado (SQLCipher), e a chave que abre o banco fica no armazenamento seguro do Android. O Ciclo Livre fica de fora do backup automático do Android, então nada disso vai para a sua conta Google.',
    },
    { kind: 'h', text: 'O que sai do celular, e só quando você pede' },
    { kind: 'sub', text: 'IA com a sua chave' },
    {
      kind: 'p',
      text: 'O Ciclo Livre não tem IA própria. Se você colocar uma chave da Anthropic (a empresa do Claude), o app manda para a Anthropic:',
    },
    {
      kind: 'list',
      items: [
        'no resumo de artigos: o que você digitou na busca e trechos de até 3 artigos do app;',
        'no chat: a sua pergunta, as últimas mensagens da conversa (até 10) e um resumo dos seus dados: modo de uso, método contraceptivo (se você contou), fase do ciclo e previsões de hoje, ciclos, sintomas frequentes, medições dos últimos 90 dias e, se você marcar, as notas.',
      ],
    },
    {
      kind: 'p',
      text: 'Antes do primeiro envio do chat, o app mostra esse resumo inteiro e pede o seu consentimento. O ano de nascimento, as tags e o texto dos lembretes nunca vão. Nada é enviado até você tocar em "Resumir" ou "Enviar".',
    },
    {
      kind: 'p',
      text: 'A Anthropic trata esses dados conforme a política dela para a API, e o custo cai na sua conta lá. Em Mais › IA com sua chave você retira o consentimento ou apaga a chave quando quiser. Retirar o consentimento do chat apaga a conversa guardada.',
    },
    { kind: 'sub', text: 'Exportar e compartilhar' },
    {
      kind: 'p',
      text: 'Quando você exporta os dados, gera o PDF para o médico ou faz um backup, o arquivo vai para onde você escolher na tela de compartilhar do Android (Drive, e-mail, outro app). A partir daí, valem as regras do destino. O backup é criptografado com uma senha que só você sabe.',
    },
    { kind: 'sub', text: 'Me pague um café' },
    {
      kind: 'p',
      text: 'Copiar a chave Pix não envia nada. Se você pagar, o pagamento acontece no app do seu banco, e quem recebe vê o seu nome, como em qualquer Pix.',
    },
    { kind: 'h', text: 'Health Connect' },
    {
      kind: 'p',
      text: 'Se você conectar, o Ciclo Livre lê do Health Connect só os tipos que você marcar: sono, temperatura basal, frequência cardíaca em repouso, variabilidade da frequência cardíaca e peso. Na primeira vez ele lê os últimos 30 dias; depois, só o que for novo, e sempre com o app aberto. Esses dados entram no banco criptografado e seguem as mesmas regras do resto.',
    },
    {
      kind: 'p',
      text: 'O Ciclo Livre nunca escreve no Health Connect. Para parar, toque em "Desconectar" ou tire as permissões no próprio Health Connect. O que já entrou continua no app até você apagar.',
    },
    { kind: 'h', text: 'Lembretes' },
    {
      kind: 'p',
      text: 'Os lembretes são agendados no próprio celular, e o Android guarda essa agenda fora do banco criptografado. Por isso, por padrão, o texto do lembrete é discreto e não fala de ciclo, nem na tela de bloqueio. Se você desligar as notificações discretas, o texto completo passa a ficar nessa agenda e a aparecer na notificação.',
    },
    { kind: 'h', text: 'Permissões do Android' },
    {
      kind: 'list',
      items: [
        'Internet e estado da rede: só para a IA com a sua chave.',
        'Notificações, iniciar com o aparelho, vibrar e manter o aparelho acordado por um instante: para os lembretes, inclusive depois de reiniciar o celular.',
        'Contador no ícone: em algumas telas iniciais, mostra um número no ícone quando há lembrete.',
        'Health Connect (leitura): o Android lista sempre, mas o app só usa se você conectar.',
        'Biometria: o Android lista sempre, mas o app só usa se você ligar o bloqueio.',
      ],
    },
    { kind: 'h', text: 'Seus direitos (LGPD)' },
    {
      kind: 'p',
      text: 'A LGPD trata dados de saúde como dados sensíveis. Como eles ficam com você, você exerce os seus direitos no próprio app:',
    },
    {
      kind: 'list',
      items: [
        'ver e exportar tudo em Mais › Seus dados;',
        'corrigir qualquer registro no dia dele;',
        'apagar tudo em Mais › Privacidade e segurança, o que apaga também a chave de criptografia e não tem volta;',
        'retirar o consentimento da IA e desconectar o Health Connect quando quiser.',
      ],
    },
    { kind: 'p', text: 'Desinstalar o app também apaga tudo o que ele guardou. Arquivos que você exportou continuam onde você os salvou.' },
    { kind: 'h', text: 'Idade e uso' },
    {
      kind: 'p',
      text: 'O Ciclo Livre é para maiores de 18 anos. As previsões são estimativas, e o app não é método contraceptivo nem dispositivo médico.',
    },
    { kind: 'h', text: 'Contato e código' },
    {
      kind: 'p',
      text: 'O Ciclo Livre é código aberto, sob a licença GPL-3.0. O código, as dúvidas e as sugestões ficam em github.com/albornozrodrigo/ciclo-livre: é só abrir uma issue lá. As issues são públicas, então não escreva nelas nada sobre a sua saúde.',
    },
    { kind: 'h', text: 'Mudanças nesta política' },
    { kind: 'p', text: 'Se esta política mudar, a nova versão chega numa atualização do app, com a nova data no topo.' },
  ],
};
