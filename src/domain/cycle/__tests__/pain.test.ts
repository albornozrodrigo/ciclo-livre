import { predictPainDays } from '@/domain/cycle/pain';
import type { Period } from '@/domain/cycle/periods';

const p = (start: string): Period => ({ start, end: start, source: 'logged' });
const periods = [p('2026-08-01'), p('2026-08-29'), p('2026-09-26')];

describe('predictPainDays', () => {
  it('dia do ciclo com dor em mais da metade dos ciclos vira previsão no próximo (ocorrência isolada não)', () => {
    const painDates = ['2026-08-01', '2026-08-02', '2026-08-29', '2026-09-12'];

    expect(predictPainDays(periods, painDates, '2026-10-24')).toEqual(['2026-10-24']);
  });

  it('com menos de 2 ciclos completos não prevê', () => {
    expect(predictPainDays([p('2026-09-26')], ['2026-09-26'], '2026-10-24')).toEqual([]);
  });

  it('sem dor registrada não prevê', () => {
    expect(predictPainDays(periods, [], '2026-10-24')).toEqual([]);
  });
});
