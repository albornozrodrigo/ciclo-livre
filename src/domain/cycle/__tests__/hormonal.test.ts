import { bbtChartFor, cycleHistory } from '@/domain/analysis/analysis';
import { monthGrid } from '@/domain/cycle/calendar';
import { cycleModelFor, HORMONAL_METHODS } from '@/domain/cycle/for-profile';
import { dayInfo } from '@/domain/cycle/model';
import { todayCycleView } from '@/domain/cycle/today';
import { addDays } from '@/domain/dates';
import type { BirthControl, Profile } from '@/domain/profile';
import { availableKinds, reminderNotice } from '@/domain/reminders/catalog';

const TODAY = '2026-10-22';
const profile: Profile = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: '2026-10-10',
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: false,
};
const signals = {
  flowDates: ['2026-08-15', '2026-08-16', '2026-08-17', '2026-09-12', '2026-09-13', '2026-09-14', '2026-10-10', '2026-10-11', '2026-10-12'],
  temperatures: {},
  eggWhiteDates: [],
  positiveOvulationTests: [],
  painDates: [],
};
const phasesOverTwoCycles = (birthControl: BirthControl | null) => {
  const model = cycleModelFor({ ...profile, birthControl }, signals, TODAY)!;
  const phases = new Set<string>();
  for (let d = 0; d < 56; d++) phases.add(dayInfo(model, addDays('2026-10-10', d), TODAY)!.phase);
  return phases;
};

describe('contracepção hormonal esconde a fertilidade', () => {
  it.each(HORMONAL_METHODS)('%s: só sangramento e "contracepção hormonal", sem fase fértil', (method) => {
    expect([...phasesOverTwoCycles(method)].sort()).toEqual(['hormonal', 'menstruation']);
  });

  it.each(['none', 'iud_copper', 'condom', 'other', 'prefer_not_to_say', null] as const)('%s: fases de sempre', (method) => {
    expect(phasesOverTwoCycles(method)).toEqual(new Set(['menstruation', 'follicular', 'fertile', 'luteal']));
  });

  it('a previsão do próximo sangramento não muda', () => {
    const withPill = cycleModelFor(
      { ...profile, birthControl: 'pill', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
      signals,
      TODAY,
    )!;
    const without = cycleModelFor(profile, signals, TODAY)!;
    expect(withPill.next).toEqual(without.next);
  });

  it('calendário sem anel de ovulação', () => {
    const model = cycleModelFor(
      { ...profile, birthControl: 'ring', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
      signals,
      TODAY,
    );
    expect(
      monthGrid(2026, 10, model, new Set(), TODAY)
        .flat()
        .some((c) => c.ovulation),
    ).toBe(false);
  });

  it('Hoje sem janela fértil e com o motivo', () => {
    const view = todayCycleView(
      { ...profile, birthControl: 'implant', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
      signals,
      TODAY,
    );
    expect(view.kind === 'cycle' && view.fertile).toBeNull();
    expect(view.kind === 'cycle' && view.fertilityHidden).toBe(true);
  });

  it('Hoje com DIU de cobre continua com janela fértil', () => {
    const view = todayCycleView(
      { ...profile, birthControl: 'iud_copper', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
      signals,
      TODAY,
    );
    expect(view.kind === 'cycle' && view.fertile).not.toBeNull();
  });

  it('histórico de ciclos sem ovulação estimada', () => {
    const model = cycleModelFor(
      { ...profile, birthControl: 'patch', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
      signals,
      TODAY,
    )!;
    expect(cycleHistory(model).every((row) => row.ovulation === null)).toBe(true);
  });

  it('lembrete de janela fértil avisa que não há estimativa', () => {
    expect(
      reminderNotice(
        { ...profile, birthControl: 'injection', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
        'fertile_soon',
      ),
    ).toBe('hormonal_no_fertile');
    expect(
      reminderNotice(
        { ...profile, birthControl: 'iud_copper', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
        'fertile_soon',
      ),
    ).toBeNull();
  });
});

describe('revisão da fase 13', () => {
  it('modo Tentar engravidar mostra a fertilidade mesmo com método hormonal salvo no perfil', () => {
    const view = todayCycleView(
      { ...profile, mode: 'conceive', birthControl: 'pill', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
      signals,
      TODAY,
    );
    expect(view.kind === 'cycle' && view.fertile).not.toBeNull();
  });

  it('gráfico de temperatura não marca ovulação com método hormonal', () => {
    const model = cycleModelFor(
      { ...profile, birthControl: 'pill', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
      signals,
      TODAY,
    )!;
    const temps: Record<string, number> = {};
    ['10-13', '10-14', '10-15', '10-16', '10-17', '10-18'].forEach((d) => (temps[`2026-${d}`] = 36.4));
    ['10-19', '10-20', '10-21'].forEach((d) => (temps[`2026-${d}`] = 36.8));
    const chart = bbtChartFor(model, temps);
    expect(chart.ovulationDay).toBeNull();
    expect(chart.fertilityHidden).toBe(true);
  });

  it('lembrete de janela fértil nem é oferecido com método hormonal', () => {
    expect(
      availableKinds({ ...profile, birthControl: 'ring', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false }),
    ).not.toContain('fertile_soon');
    expect(
      availableKinds({ ...profile, birthControl: 'iud_copper', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false }),
    ).toContain('fertile_soon');
  });
});
