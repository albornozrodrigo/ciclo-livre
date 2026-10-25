import { todayCycleView } from '@/domain/cycle/today';
import type { Profile } from '@/domain/profile';

const TODAY = '2026-10-22';
const profile: Profile = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
};
const signals = {
  flowDates: ['2026-08-01', '2026-08-02', '2026-08-29', '2026-08-30', '2026-09-26', '2026-09-27'],
  temperatures: {},
  eggWhiteDates: [],
  positiveOvulationTests: [],
  painDates: ['2026-08-01', '2026-08-29'],
};

describe('todayCycleView', () => {
  it('modo menstruação com dados: fase, dia, próxima menstruação, janela fértil, confiança e dor', () => {
    expect(todayCycleView(profile, signals, TODAY)).toEqual({
      kind: 'cycle',
      phase: 'luteal',
      cycleDay: 27,
      daysToNext: 2,
      late: false,
      next: { start: '2026-10-24', earliest: '2026-10-23', latest: '2026-10-25' },
      fertile: { start: '2026-11-02', end: '2026-11-08' },
      fertilityHidden: false,
      confidence: 'medium',
      painDays: ['2026-10-24'],
      nextPhase: { phase: 'menstruation', inDays: 2 },
    });
  });

  it('próxima fase: qual é e em quantos dias começa', () => {
    // Dia 8 do ciclo de 26/09: folicular hoje, janela fértil começa em 5/10.
    const view = todayCycleView(profile, signals, '2026-10-03');
    expect(view.kind === 'cycle' && view.phase).toBe('follicular');
    expect(view.kind === 'cycle' && view.nextPhase).toEqual({ phase: 'fertile', inDays: 2 });
  });

  it('durante a janela fértil mostra a janela atual', () => {
    const view = todayCycleView(profile, signals, '2026-10-07');
    expect(view.kind === 'cycle' && view.fertile).toEqual({ start: '2026-10-05', end: '2026-10-11' });
  });

  it('atrasada: conta os dias de atraso', () => {
    const view = todayCycleView(profile, signals, '2026-10-27');
    expect(view).toEqual(expect.objectContaining({ kind: 'cycle', late: true, lateDays: 3 }));
    // Atrasada: não há "próxima fase" honesta para anunciar (a menstruação já devia ter vindo).
    expect(view.kind === 'cycle' && view.nextPhase).toBeNull();
  });

  it('sem nenhuma menstruação conhecida pede o primeiro registro', () => {
    expect(todayCycleView(profile, { ...signals, flowDates: [], painDates: [] }, TODAY)).toEqual({ kind: 'none' });
  });

  it('usa a semente do onboarding', () => {
    const view = todayCycleView({ ...profile, lastPeriodStart: '2026-10-10' }, { ...signals, flowDates: [], painDates: [] }, TODAY);
    expect(view).toEqual(expect.objectContaining({ kind: 'cycle', cycleDay: 13, confidence: 'low' }));
  });

  it('gravidez mostra semanas, não ciclo', () => {
    expect(todayCycleView({ ...profile, mode: 'pregnancy', dueDate: '2027-05-01' }, signals, TODAY)).toEqual({
      kind: 'pregnancy',
      week: 12,
      day: 5,
      daysToDue: 191,
    });
  });

  it('sem sangramento não faz previsões', () => {
    expect(todayCycleView({ ...profile, mode: 'no_bleeding' }, signals, TODAY)).toEqual({ kind: 'no_bleeding' });
  });
});
