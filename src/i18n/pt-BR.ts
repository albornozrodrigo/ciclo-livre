export const ptBR = {
  tabs: {
    hoje: 'Hoje',
    calendario: 'Calendário',
    analise: 'Análise',
    explorar: 'Explorar',
    mais: 'Mais',
  },
  screens: {
    hoje: {
      title: 'Hoje',
      lead: 'Aqui você vai ver em que fase do ciclo está e registrar o seu dia.',
      phase: 'Em construção — etapa 2',
    },
    calendario: {
      title: 'Calendário',
      lead: 'Seus registros e previsões, mês a mês, sem limite de horizonte.',
      phase: 'Em construção — etapa 4',
    },
    analise: {
      title: 'Análise',
      lead: 'Padrões do seu ciclo, fluxo, dor, sono e humor. Tudo liberado.',
      phase: 'Em construção — etapa 5',
    },
    explorar: {
      title: 'Explorar',
      lead: 'Conteúdo sobre saúde menstrual e reprodutiva, com busca.',
      phase: 'Em construção — etapa 8',
    },
    mais: {
      title: 'Mais',
      lead: 'Modos, lembretes, exportação de dados e privacidade.',
      phase: 'Em construção — etapa 2',
    },
  },
  privacy: {
    title: 'Privacidade e segurança',
    localData:
      'Seus dados ficam só neste aparelho, num banco criptografado. Não há conta nem servidor, e nada sai daqui sem você pedir.',
    medicalDisclaimer:
      'O Ciclo Livre não é método contraceptivo nem dispositivo médico. As previsões são estimativas e não substituem orientação profissional.',
    eraseButton: 'Apagar todos os dados',
    eraseHint: 'Remove registros, configurações e a chave de criptografia deste aparelho. Não dá para desfazer.',
    confirmTitle: 'Apagar todos os dados?',
    confirmBody: 'Tudo o que o Ciclo Livre guardou neste aparelho será removido. Não dá para desfazer.',
    confirmCancel: 'Cancelar',
    confirmErase: 'Apagar tudo',
    erased: 'Pronto. Seus dados foram apagados.',
    eraseFailed: 'Não foi possível apagar tudo agora. Tente de novo.',
  },
  appError: {
    title: 'Algo não abriu direito',
    body: 'Não conseguimos abrir seus dados com segurança agora. Nada foi apagado e nada saiu do seu aparelho.',
    retry: 'Tentar de novo',
  },
} as const;

export type ScreenKey = keyof typeof ptBR.screens;
