import { cycleModelFor } from '@/domain/cycle/for-profile';
import { todayCycleView } from '@/domain/cycle/today';
import type { Profile } from '@/domain/profile';
import { availableKinds } from '@/domain/reminders/catalog';
import { defaultVisibleCategories } from '@/domain/tracking/catalog';
import { isSymptom } from '@/domain/tracking/symptoms';

const TODAY = '2026-10-25';
const profile: Profile = {
  birthYear: 1995,
  mode: 'postpartum',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: '2026-10-05',
  twins: false,
};
const signals = { flowDates: ['2026-08-01'], temperatures: {}, eggWhiteDates: [], positiveOvulationTests: [], painDates: [] };

describe('modo pós-parto', () => {
  it('não tem previsão de ciclo', () => {
    expect(cycleModelFor(profile, signals, TODAY)).toBeNull();
  });

  it('Hoje conta semanas e dias desde o parto', () => {
    expect(todayCycleView(profile, signals, TODAY)).toEqual({ kind: 'postpartum', weeks: 2, days: 6, months: 0, periodBack: false });
  });

  it('depois de 12 semanas conta em meses', () => {
    const view = todayCycleView({ ...profile, babyBirth: '2026-06-20', twins: false }, signals, TODAY);
    expect(view).toMatchObject({ kind: 'postpartum', months: 4 });
  });

  it('menstruação registrada 6 semanas ou mais depois do parto: sugere voltar ao modo ciclo', () => {
    const view = todayCycleView({ ...profile, babyBirth: '2026-08-01', twins: false }, { ...signals, flowDates: ['2026-09-12'] }, TODAY);
    expect(view).toMatchObject({ kind: 'postpartum', periodBack: true });
  });

  it('sangramento marcado como menstruação nas primeiras 6 semanas (provável lóquio) não conta', () => {
    const view = todayCycleView(profile, { ...signals, flowDates: ['2026-10-20'] }, TODAY);
    expect(view).toMatchObject({ kind: 'postpartum', periodBack: false });
  });

  it('registro com lóquios e amamentação, só neste modo; menstruação continua disponível', () => {
    const ids = defaultVisibleCategories('postpartum', null).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['lochia', 'lactation', 'period']));
    expect(defaultVisibleCategories('period', null).map((c) => c.id)).not.toContain('lochia');
  });

  it('amamentação e lóquios (menos "nenhum") contam como sintomas', () => {
    expect(isSymptom('lactation', 'cracked_nipples')).toBe(true);
    expect(isSymptom('lochia', 'bright_red')).toBe(true);
    expect(isSymptom('lochia', 'none')).toBe(false);
  });

  it('lembretes: contraceptivo (se houver), remédios e registro', () => {
    expect(availableKinds(profile)).toEqual(['medication', 'daily_log']);
    expect(availableKinds({ ...profile, birthControl: 'pill' })).toEqual(['birth_control', 'medication', 'daily_log']);
  });
});
