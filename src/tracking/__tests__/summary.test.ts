import { summarizeDay } from '@/tracking/summary';

describe('summarizeDay', () => {
  it('opções de várias escolhas aparecem sozinhas; escolha única leva o nome da categoria', () => {
    expect(
      summarizeDay({ selections: { pain: ['cramps'], pain_intensity: ['severe'] }, measures: {}, note: null }),
    ).toEqual(['Cólica', 'Intensidade da dor: Forte']);
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
