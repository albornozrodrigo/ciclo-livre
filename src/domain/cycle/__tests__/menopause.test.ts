import { cycleModelFor } from '@/domain/cycle/for-profile';
import { menopauseView } from '@/domain/cycle/menopause';
import { signalsFromAnalysis } from '@/domain/cycle/signals';
import { todayCycleView } from '@/domain/cycle/today';
import type { Profile } from '@/domain/profile';
import { availableKinds } from '@/domain/reminders/catalog';
import { defaultVisibleCategories } from '@/domain/tracking/catalog';
import { isSymptom } from '@/domain/tracking/symptoms';

const TODAY = '2026-10-25';
const profile: Profile = {
  birthYear: 1972,
  mode: 'menopause',
  lastPeriodStart: null,
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
  finalPeriod: '2026-02-20',
};
const signals = { flowDates: [], temperatures: {}, eggWhiteDates: [], positiveOvulationTests: [], painDates: [] };

describe('menopauseView', () => {
  it('conta os meses desde a última menstruação; antes de 12 não está confirmada', () => {
    expect(menopauseView('2026-02-20', [], TODAY)).toEqual({
      kind: 'menopause',
      since: '2026-02-20',
      months: 8,
      years: 0,
      confirmed: false,
      bleedingAfter: false,
    });
  });

  it('depois de 12 meses: anos e meses, confirmada', () => {
    expect(menopauseView('2024-07-10', [], TODAY)).toMatchObject({ months: 27, years: 2, confirmed: true, bleedingAfter: false });
  });

  it('sem a data e sem sangramento registrado: sem contagem', () => {
    expect(menopauseView(null, [], TODAY)).toEqual({
      kind: 'menopause',
      since: null,
      months: 0,
      years: 0,
      confirmed: false,
      bleedingAfter: false,
    });
  });

  it('sem a data, conta do último sangramento registrado (histórico de outro modo)', () => {
    expect(menopauseView(null, ['2025-05-01', '2025-05-02', '2025-05-03'], TODAY)).toMatchObject({
      since: '2025-05-03',
      months: 17,
      confirmed: true,
      bleedingAfter: false,
    });
  });

  it('sangramento depois de 12 meses sem menstruar: avisa e a menopausa continua contada de antes', () => {
    expect(menopauseView('2024-07-10', ['2026-10-01', '2026-10-02'], TODAY)).toMatchObject({
      since: '2024-07-10',
      months: 27,
      confirmed: true,
      bleedingAfter: true,
    });
  });

  it('sangrar de novo depois da menopausa mantém o aviso', () => {
    expect(menopauseView('2024-01-01', ['2026-08-01', '2026-09-15'], '2026-10-26')).toMatchObject({
      since: '2024-01-01',
      confirmed: true,
      bleedingAfter: true,
    });
  });

  it('o aviso fica enquanto o último sangramento depois da menopausa tiver menos de 180 dias', () => {
    // O primeiro já passou de 180 dias; o segundo, não.
    expect(menopauseView('2023-01-01', ['2025-12-01', '2026-06-01'], TODAY)).toMatchObject({ bleedingAfter: true });
  });

  it('sangramento antes de 12 meses: recomeça a contagem, sem aviso', () => {
    expect(menopauseView('2026-02-20', ['2026-09-01'], TODAY)).toMatchObject({
      since: '2026-09-01',
      months: 1,
      bleedingAfter: false,
    });
  });

  it('o aviso some 180 dias depois do sangramento', () => {
    // 28/04 → 25/10 = 180 dias.
    expect(menopauseView('2024-01-10', ['2026-04-28'], TODAY)).toMatchObject({ bleedingAfter: true });
    expect(menopauseView('2024-01-10', ['2026-04-28'], '2026-10-26')).toMatchObject({ bleedingAfter: false });
  });

  it('dias seguidos de sangramento são um só episódio (o segundo dia não apaga o aviso)', () => {
    const days = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-24'];
    expect(menopauseView('2024-07-10', days, TODAY)).toMatchObject({ bleedingAfter: true, since: '2024-07-10' });
  });

  it('sangramento sem nenhuma referência anterior não afirma os 12 meses: só recomeça a contagem', () => {
    expect(menopauseView(null, ['2026-10-10'], TODAY)).toMatchObject({ since: '2026-10-10', bleedingAfter: false });
  });

  it('confirmada só com 12 meses de calendário (não com 365 dias)', () => {
    // 01/03/2027 → 29/02/2028: 365 dias, mas 11 meses completos.
    expect(menopauseView('2027-03-01', [], '2028-02-29')).toMatchObject({ months: 11, confirmed: false });
    expect(menopauseView('2027-03-01', [], '2028-03-01')).toMatchObject({ months: 12, confirmed: true });
  });

  it('sangramentos antigos, de antes da última menstruação informada, não contam', () => {
    expect(menopauseView('2025-06-01', ['2024-01-01', '2025-06-01'], TODAY)).toMatchObject({
      since: '2025-06-01',
      bleedingAfter: false,
    });
  });

  it('registro com data no futuro não entra na conta', () => {
    expect(menopauseView('2024-07-10', ['2026-11-01'], TODAY)).toMatchObject({ since: '2024-07-10', bleedingAfter: false });
  });
});

describe('modo menopausa', () => {
  it('não tem previsão de ciclo', () => {
    expect(cycleModelFor(profile, signals, TODAY)).toBeNull();
  });

  it('Hoje usa menstruação e escape registrados', () => {
    const view = todayCycleView({ ...profile, finalPeriod: '2024-07-10' }, { ...signals, spottingDates: ['2026-10-01'] }, TODAY);
    expect(view).toMatchObject({ kind: 'menopause', bleedingAfter: true });
  });

  it('os sinais trazem os dias de escape', () => {
    const s = signalsFromAnalysis({
      selections: [
        { date: '2026-10-01', category: 'spotting', option: 'brown' },
        { date: '2026-10-02', category: 'period', option: 'light' },
      ],
      measures: {},
    });
    expect(s.spottingDates).toEqual(['2026-10-01']);
    expect(s.flowDates).toEqual(['2026-10-02']);
  });

  it('registro com Calores e a categoria Menopausa; TPM fica escondida', () => {
    const ids = defaultVisibleCategories('menopause', null).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['hot_flashes', 'menopause_body', 'period', 'spotting', 'sleep', 'feelings']));
    expect(ids).not.toContain('pms');
    expect(defaultVisibleCategories('perimenopause', null).map((c) => c.id)).toEqual(
      expect.arrayContaining(['hot_flashes', 'menopause_body', 'pms']),
    );
    expect(defaultVisibleCategories('period', null).map((c) => c.id)).not.toContain('menopause_body');
  });

  it('a categoria Menopausa conta como sintoma', () => {
    expect(isSymptom('menopause_body', 'vaginal_dryness')).toBe(true);
    expect(isSymptom('menopause_body', 'palpitations')).toBe(true);
  });

  it('lembretes: remédios e registro (e contraceptivo só se houver plano)', () => {
    expect(availableKinds(profile)).toEqual(['medication', 'daily_log']);
    expect(availableKinds({ ...profile, birthControl: 'iud_hormonal' })).toEqual(['birth_control', 'medication', 'daily_log']);
  });
});
