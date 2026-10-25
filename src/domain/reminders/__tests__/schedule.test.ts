import { buildCycleModel } from '@/domain/cycle/model';
import type { Profile } from '@/domain/profile';
import { defaultReminder, type Reminder, type ReminderKind } from '@/domain/reminders/catalog';
import { MAX_FIRES, planSchedule } from '@/domain/reminders/schedule';

const TODAY = '2026-10-22';
const flow = [
  '2026-07-04',
  '2026-07-05',
  '2026-07-06',
  '2026-08-01',
  '2026-08-02',
  '2026-08-03',
  '2026-08-04',
  '2026-08-30',
  '2026-08-31',
  '2026-09-01',
  '2026-09-26',
  '2026-09-27',
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
];
const modelAt = (today: string) =>
  buildCycleModel(
    {
      flowDates: flow,
      seed: null,
      temperatures: {},
      eggWhiteDates: [],
      positiveOvulationTests: [],
      profileCycleLength: 28,
      profilePeriodLength: 5,
    },
    today,
  );
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
  lutealLength: null,
  includeAtypical: false,
};
const on = (kind: ReminderKind, patch: Partial<Reminder> = {}, options: Partial<Reminder['options']> = {}): Reminder => {
  const r = defaultReminder(kind);
  return {
    ...r,
    enabled: true,
    ...patch,
    options: { ...r.options, ...options },
  };
};
const at8 = { date: TODAY, minutes: 8 * 60 };
const plan = (reminders: Reminder[], p: Profile = profile, now = at8, model = modelAt(now.date)) =>
  planSchedule({ reminders, profile: p, model, now });
const dates = (fires: ReturnType<typeof plan>) => fires.map((f) => f.date);

describe('planSchedule — menstruação', () => {
  // Última menstruação 26/09, ciclo médio 28: esperada em 24/10, depois 21/11 e 19/12. Horizonte: 60 dias (até 21/12).
  it('N dias antes de cada menstruação prevista, no horário escolhido', () => {
    const fires = plan([on('period_soon')]);
    expect(dates(fires)).toEqual(['2026-10-22', '2026-11-19', '2026-12-17']);
    expect(fires[0]).toEqual({
      key: 'period_soon:2026-10-22',
      kind: 'period_soon',
      variant: 'period_soon',
      date: '2026-10-22',
      time: '09:00',
    });
  });

  it('não agenda o que já passou hoje', () => {
    expect(dates(plan([on('period_soon')], profile, { date: TODAY, minutes: 10 * 60 }))).toEqual(['2026-11-19', '2026-12-17']);
  });

  it('no dia previsto e, só para a próxima, no dia seguinte se não vier', () => {
    expect(dates(plan([on('period_due')]))).toEqual(['2026-10-24', '2026-11-21', '2026-12-19']);
    expect(dates(plan([on('period_late')]))).toEqual(['2026-10-25']);
  });

  it('em atraso, nada de "prevista" nem "em breve" até o registro', () => {
    const late = { date: '2026-10-30', minutes: 8 * 60 };
    expect(plan([on('period_soon'), on('period_due'), on('period_late')], profile, late)).toEqual([]);
  });

  it('sem previsão (sem menstruação conhecida), nenhum lembrete de ciclo', () => {
    expect(plan([on('period_due'), on('fertile_soon'), on('phase_change')], profile, at8, null)).toEqual([]);
  });
});

describe('planSchedule — janela fértil e fases', () => {
  it('um dia antes de cada janela fértil, igual ao calendário', () => {
    expect(dates(plan([on('fertile_soon')]))).toEqual(['2026-11-01', '2026-11-29']);
  });

  it('no início de cada fase', () => {
    const fires = plan([on('phase_change')]);
    expect(fires.slice(0, 4).map((f) => [f.date, f.variant])).toEqual([
      ['2026-10-24', 'phase_menstruation'],
      ['2026-10-28', 'phase_follicular'],
      ['2026-11-02', 'phase_fertile'],
      ['2026-11-09', 'phase_luteal'],
    ]);
  });
});

describe('planSchedule — contraceptivo', () => {
  const withMethod = (method: Profile['birthControl']) => ({
    ...profile,
    birthControl: method,
  });

  it('pílula contínua: todo dia', () => {
    const fires = plan([on('birth_control', {}, { pack: 'continuous' })], withMethod('pill'));
    expect(fires[0]).toMatchObject({ date: TODAY, variant: 'pill' });
    expect(fires).toHaveLength(61);
  });

  it('pílula 21+7: só nos dias ativos da cartela', () => {
    const fires = plan([on('birth_control', {}, { pack: 'cyclic', anchor: '2026-10-20', anchorFor: 'pill' })], withMethod('pill'));
    expect(dates(fires)).toContain('2026-11-09');
    expect(dates(fires)).not.toContain('2026-11-10');
    expect(dates(fires)).toContain('2026-11-17');
  });

  it('adesivo: troca semanal por 3 semanas e aviso da pausa', () => {
    const fires = plan([on('birth_control', {}, { anchor: '2026-10-20', anchorFor: 'patch' })], withMethod('patch'));
    expect(fires.slice(0, 4).map((f) => [f.date, f.variant])).toEqual([
      ['2026-10-27', 'patch_change'],
      ['2026-11-03', 'patch_change'],
      ['2026-11-10', 'patch_off'],
      ['2026-11-17', 'patch_change'],
    ]);
  });

  it('anel: tirar após 3 semanas, recolocar após 1', () => {
    const fires = plan([on('birth_control', {}, { anchor: '2026-10-20', anchorFor: 'ring' })], withMethod('ring'));
    expect(fires.slice(0, 2).map((f) => [f.date, f.variant])).toEqual([
      ['2026-11-10', 'ring_remove'],
      ['2026-11-17', 'ring_insert'],
    ]);
  });

  it('injeção: 7 dias antes e no dia, a cada 12 semanas', () => {
    const fires = plan([on('birth_control', {}, { anchor: '2026-09-01', anchorFor: 'injection' })], withMethod('injection'));
    expect(fires.map((f) => [f.date, f.variant])).toEqual([
      ['2026-11-17', 'injection_soon'],
      ['2026-11-24', 'injection_due'],
    ]);
  });

  it('sem data de referência (adesivo, anel, injeção, pílula 21+7), nada', () => {
    expect(plan([on('birth_control')], withMethod('patch'))).toEqual([]);
  });

  it('data de referência de outro método é ignorada (trocou pílula por injeção)', () => {
    expect(plan([on('birth_control', {}, { anchor: '2026-09-01', anchorFor: 'pill' })], withMethod('injection'))).toEqual([]);
  });

  it('método sem agenda (camisinha): nada, mesmo ligado', () => {
    expect(plan([on('birth_control', {}, { pack: 'continuous' })], withMethod('condom'))).toEqual([]);
  });
});

describe('planSchedule — registro', () => {
  it('a cada 3 dias, semanal e quinzenal a partir da referência', () => {
    expect(dates(plan([on('daily_log', {}, { frequency: 'every_3_days', anchor: '2026-10-20' })])).slice(0, 2)).toEqual([
      '2026-10-23',
      '2026-10-26',
    ]);
    expect(dates(plan([on('daily_log', {}, { frequency: 'weekly', anchor: '2026-10-20' })])).slice(0, 2)).toEqual([
      '2026-10-27',
      '2026-11-03',
    ]);
    expect(dates(plan([on('daily_log', {}, { frequency: 'fortnightly', anchor: '2026-10-20' })])).slice(0, 2)).toEqual([
      '2026-11-03',
      '2026-11-17',
    ]);
  });

  it('mensal no mesmo dia do mês (último dia quando o mês é mais curto)', () => {
    expect(dates(plan([on('daily_log', {}, { frequency: 'monthly', anchor: '2026-01-31' })]))).toEqual(['2026-10-31', '2026-11-30']);
  });
});

describe('planSchedule — regras gerais', () => {
  it('desligado ou fora do modo não agenda', () => {
    expect(plan([{ ...on('period_due'), enabled: false }])).toEqual([]);
    expect(
      plan([on('period_due'), on('daily_log')], {
        ...profile,
        mode: 'pregnancy',
        dueDate: '2027-03-01',
      }).every((f) => f.kind === 'daily_log'),
    ).toBe(true);
  });

  it('dois lembretes diários ainda cobrem os 60 dias inteiros', () => {
    const fires = plan([on('birth_control', {}, { pack: 'continuous' }), on('daily_log'), on('period_due')], {
      ...profile,
      birthControl: 'pill',
      lutealLength: null,
      includeAtypical: false,
    });
    expect(fires).toHaveLength(61 + 61 + 3);
    expect(fires.at(-1)?.date).toBe('2026-12-21');
  });

  it(`no máximo ${MAX_FIRES} disparos, os mais próximos primeiro, com chaves únicas`, () => {
    const all = (['period_soon', 'period_due', 'period_late', 'fertile_soon', 'phase_change', 'daily_log'] as const).map((k) => on(k));
    const fires = plan([...all, on('birth_control', {}, { pack: 'continuous' })], {
      ...profile,
      birthControl: 'pill',
      lutealLength: null,
      includeAtypical: false,
    });
    expect(fires.length).toBeLessThanOrEqual(MAX_FIRES);
    expect(new Set(fires.map((f) => f.key)).size).toBe(fires.length);
    const order = fires.map((f) => `${f.date} ${f.time}`);
    expect(order).toEqual([...order].sort());
  });
});
