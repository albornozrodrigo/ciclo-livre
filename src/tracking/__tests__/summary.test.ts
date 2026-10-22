import { summarizeDay } from '@/tracking/summary';

describe('summarizeDay', () => {
  it('agrupa por categoria, na ordem do catálogo, com o nome da categoria', () => {
    expect(
      summarizeDay({
        selections: { hair: ['good'], pain: ['back', 'cramps'], skin: ['good'], pain_intensity: ['severe'] },
        measures: {},
        note: null,
      }),
    ).toEqual(['Dor: Cólica, Costas', 'Intensidade da dor: Forte', 'Pele: Bem', 'Cabelo: Bem']);
  });

  it('medições levam nome, valor com vírgula e unidade; nota aparece como "Nota do dia"', () => {
    expect(summarizeDay({ selections: {}, measures: { temperature: 36.6 }, note: 'x' })).toEqual([
      'Temperatura basal: 36,6 °C',
      'Nota do dia',
    ]);
  });

  it('dia vazio não tem itens', () => {
    expect(summarizeDay({ selections: {}, measures: {}, note: null })).toEqual([]);
  });
});
