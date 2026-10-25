import { endPregnancy } from '@/domain/pregnancy-end';
import type { Profile } from '@/domain/profile';

const pregnant: Profile = {
  birthYear: 1995,
  mode: 'pregnancy',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: '2026-11-20',
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: true,
};

describe('encerrar a gravidez', () => {
  it('o bebê nasceu: vira pós-parto com a data do parto (e sem a menstruação de antes da gravidez)', () => {
    expect(endPregnancy({ ...pregnant, lastPeriodStart: '2025-10-01' }, { kind: 'birth', date: '2026-10-20' })).toEqual({
      ...pregnant,
      mode: 'postpartum',
      babyBirth: '2026-10-20',
      dueDate: null,
      twins: false,
    });
  });

  it('terminou de outra forma: volta a Menstruação e ciclo, sem data prevista', () => {
    expect(endPregnancy(pregnant, { kind: 'other' })).toEqual({
      ...pregnant,
      mode: 'period',
      dueDate: null,
      twins: false,
      lastPeriodStart: null,
    });
  });
});
