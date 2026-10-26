import { monthGrid } from '@/domain/cycle/calendar';
import { chanceFor, conceiveStatus } from '@/domain/cycle/conceive';
import { cycleModelFor } from '@/domain/cycle/for-profile';
import { todayCycleView } from '@/domain/cycle/today';
import { addDays } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { availableKinds, defaultReminder } from '@/domain/reminders/catalog';
import { planSchedule } from '@/domain/reminders/schedule';
import { reminderContent } from '@/i18n/pt-BR-reminders';

const profile: Profile = {
  birthYear: 1995,
  mode: 'conceive',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'regular',
  dueDate: null,
  tryingSince: '1_3m',
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: false,
  finalPeriod: null,
};
// Ciclos de 28 dias; o atual começa em 2026-10-01 → ovulação estimada 2026-10-15 (28 − 14).
const flowDates = ['2026-08-06', '2026-08-07', '2026-09-03', '2026-09-04', '2026-10-01', '2026-10-02'];
const signals = { flowDates, temperatures: {}, eggWhiteDates: [], positiveOvulationTests: [], painDates: [] };
const OVULATION = '2026-10-15';

describe('chance de engravidar por dia (Wilcox et al., 1995)', () => {
  it.each([
    [-6, 'low'],
    [-5, 'medium'],
    [-3, 'medium'],
    [-2, 'high'],
    [0, 'high'],
    [1, 'medium'],
    [2, 'low'],
  ] as const)('dia %p em relação à ovulação: %s', (offset, chance) => {
    expect(chanceFor(addDays(OVULATION, offset), OVULATION)).toBe(chance);
  });
});

describe('status do modo Tentar engravidar', () => {
  const statusOn = (today: string) => conceiveStatus(cycleModelFor(profile, signals, today)!, today);

  it('antes da janela: melhor chance em N dias', () => {
    expect(statusOn('2026-10-05')).toEqual({ chance: 'low', status: { kind: 'best_in', days: 8 } });
  });

  it('dentro da janela: último dia fértil', () => {
    expect(statusOn('2026-10-14')).toEqual({ chance: 'high', status: { kind: 'last_fertile', date: '2026-10-16' } });
  });

  it('depois da janela: dia do teste de gravidez', () => {
    expect(statusOn('2026-10-20')).toEqual({ chance: 'low', status: { kind: 'test_from', date: '2026-10-29', days: 9 } });
  });

  it('com atraso: já dá para testar', () => {
    expect(statusOn('2026-11-02').status).toEqual({ kind: 'late_test' });
  });

  it('Hoje traz o status só no modo Tentar engravidar', () => {
    const conceive = todayCycleView(profile, signals, '2026-10-05');
    const period = todayCycleView({ ...profile, mode: 'period' }, signals, '2026-10-05');
    expect(conceive.kind === 'cycle' && conceive.conceive?.status.kind).toBe('best_in');
    expect(period.kind === 'cycle' && period.conceive).toBeUndefined();
  });

  it('calendário diz a chance dos dias da janela, só quando pedido', () => {
    const model = cycleModelFor(profile, signals, '2026-10-05');
    const cells = monthGrid(2026, 10, model, new Set(), '2026-10-05', { chance: true }).flat();
    expect(cells.find((c) => c.date === '2026-10-14')?.chance).toBe('high');
    expect(cells.find((c) => c.date === '2026-10-11')?.chance).toBe('medium');
    expect(cells.find((c) => c.date === '2026-10-05')?.chance).toBeNull();
    expect(
      monthGrid(2026, 10, model, new Set(), '2026-10-05')
        .flat()
        .every((c) => c.chance === null),
    ).toBe(true);
  });
});

describe('lembrete do teste de gravidez', () => {
  it('só existe no modo Tentar engravidar', () => {
    expect(availableKinds(profile)).toContain('pregnancy_test');
    expect(availableKinds({ ...profile, mode: 'period' })).not.toContain('pregnancy_test');
  });

  it('dispara no dia em que a menstruação é esperada', () => {
    const model = cycleModelFor(profile, signals, '2026-10-05');
    const fires = planSchedule({
      reminders: [{ ...defaultReminder('pregnancy_test'), enabled: true }],
      profile,
      model,
      now: { date: '2026-10-05', minutes: 0 },
    });
    expect(fires.map((f) => [f.date, f.variant])[0]).toEqual(['2026-10-29', 'pregnancy_test']);
  });
});

describe('revisão da fase 16', () => {
  it('ovulação tardia (teste positivo no dia 20): o teste de gravidez fica para 14 dias depois da ovulação', () => {
    const late = { ...signals, positiveOvulationTests: ['2026-10-20'] }; // ovulação 21/10
    const model = cycleModelFor(profile, late, '2026-10-24')!;
    expect(conceiveStatus(model, '2026-10-24').status).toEqual({ kind: 'test_from', date: '2026-11-04', days: 11 });
    const fires = planSchedule({
      reminders: [{ ...defaultReminder('pregnancy_test'), enabled: true }],
      profile,
      model,
      now: { date: '2026-10-24', minutes: 0 },
    });
    expect(fires[0]).toMatchObject({ date: '2026-11-04', variant: 'pregnancy_test' });
  });

  it('o lembrete se repete nos ciclos previstos dentro dos 60 dias', () => {
    const model = cycleModelFor(profile, signals, '2026-10-05');
    const fires = planSchedule({
      reminders: [{ ...defaultReminder('pregnancy_test'), enabled: true }],
      profile,
      model,
      now: { date: '2026-10-05', minutes: 0 },
    });
    expect(fires.map((f) => f.date)).toEqual(['2026-10-29', '2026-11-26']);
  });

  it('mensagem personalizada do lembrete vale', () => {
    expect(reminderContent({ ...defaultReminder('pregnancy_test'), title: 'Teste hoje' }, 'pregnancy_test', false).title).toBe(
      'Teste hoje',
    );
  });
});
