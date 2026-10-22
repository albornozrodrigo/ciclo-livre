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
      phase: 'Em construção — fase 2',
    },
    calendario: {
      title: 'Calendário',
      lead: 'Seus registros e previsões, mês a mês, sem limite de horizonte.',
      phase: 'Em construção — fase 4',
    },
    analise: {
      title: 'Análise',
      lead: 'Padrões do seu ciclo, fluxo, dor, sono e humor. Tudo liberado.',
      phase: 'Em construção — fase 5',
    },
    explorar: {
      title: 'Explorar',
      lead: 'Conteúdo sobre saúde menstrual e reprodutiva, com busca.',
      phase: 'Em construção — fase 8',
    },
    mais: {
      title: 'Mais',
      lead: 'Modos, lembretes, exportação de dados e privacidade.',
      phase: 'Em construção — fase 2',
    },
  },
} as const;

export type ScreenKey = keyof typeof ptBR.screens;
