import { signalsFromAnalysis } from '@/domain/cycle/signals';

describe('sinais do motor de previsão', () => {
  it('só clara de ovo e teste de ovulação positivo contam como sinais de fertilidade', () => {
    const signals = signalsFromAnalysis({
      selections: [
        { date: '2026-10-01', category: 'discharge', option: 'egg_white' },
        { date: '2026-10-02', category: 'discharge', option: 'gray' },
        { date: '2026-10-03', category: 'discharge', option: 'clumpy_white' },
        { date: '2026-10-04', category: 'tests', option: 'ovulation_positive' },
        { date: '2026-10-05', category: 'tests', option: 'ovulation_other_method' },
        { date: '2026-10-06', category: 'tests', option: 'pregnancy_faint' },
      ],
      measures: {},
    });

    expect(signals.eggWhiteDates).toEqual(['2026-10-01']);
    expect(signals.positiveOvulationTests).toEqual(['2026-10-04']);
  });
});
