import {
  availableKinds,
  customMessageAllowed,
  defaultReminder,
  needsAnchor,
  parseOptions,
  reminderNotice,
  validTime,
} from '@/domain/reminders/catalog';
import type { Profile } from '@/domain/profile';

const base: Profile = {
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
  babyBirth: null,
  twins: false,
};

describe('availableKinds', () => {
  it('período: todos os de ciclo e registro; contraceptivo só com método que tem agenda', () => {
    expect(availableKinds(base)).toEqual([
      'period_soon',
      'period_due',
      'period_late',
      'fertile_soon',
      'phase_change',
      'medication',
      'daily_log',
    ]);
    expect(
      availableKinds({ ...base, birthControl: 'pill', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false }),
    ).toContain('birth_control');
    expect(
      availableKinds({ ...base, birthControl: 'condom', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false }),
    ).not.toContain('birth_control');
  });

  it('gravidez: remédios e registro', () => {
    expect(availableKinds({ ...base, mode: 'pregnancy', dueDate: '2027-03-01' })).toEqual(['medication', 'daily_log']);
  });

  it('sem sangramento: sem menstruação nem fase', () => {
    expect(
      availableKinds({
        ...base,
        mode: 'no_bleeding',
        birthControl: 'ring',
        lutealLength: null,
        includeAtypical: false,
        babyBirth: null,
        twins: false,
      }),
    ).toEqual(['birth_control', 'medication', 'daily_log']);
  });
});

describe('reminderNotice', () => {
  it('tentando engravidar com contraceptivo: sugere desligar, sem desligar sozinho', () => {
    expect(
      reminderNotice(
        { ...base, mode: 'conceive', birthControl: 'pill', lutealLength: null, includeAtypical: false, babyBirth: null, twins: false },
        'birth_control',
      ),
    ).toBe('conceive_birth_control');
    expect(reminderNotice(base, 'birth_control')).toBeNull();
  });
});

describe('defaultReminder', () => {
  it('desligado, com horário e opções padrão, sem mensagem própria', () => {
    expect(defaultReminder('period_soon')).toEqual({
      kind: 'period_soon',
      enabled: false,
      time: '09:00',
      options: {
        daysBefore: 2,
        pack: 'cyclic',
        frequency: 'daily',
        anchor: null,
        anchorFor: null,
        years: null,
        threads: 'after_period',
        meds: [],
      },
      title: null,
      body: null,
    });
  });
});

describe('parseOptions', () => {
  it('mantém valores válidos e troca inválidos pelo padrão campo a campo', () => {
    expect(
      parseOptions(
        '{"daysBefore":5,"pack":"continuous","frequency":"weekly","anchor":"2026-10-20","anchorFor":"iud_copper","years":8,"threads":"monthly"}',
      ),
    ).toEqual({
      daysBefore: 5,
      pack: 'continuous',
      frequency: 'weekly',
      anchor: '2026-10-20',
      anchorFor: 'iud_copper',
      years: 8,
      threads: 'monthly',
      meds: [],
    });
    expect(
      parseOptions('{"daysBefore":9,"pack":"x","frequency":1,"anchor":"20/10/2026","anchorFor":"x","years":40,"threads":"x","extra":true}'),
    ).toEqual({
      daysBefore: 2,
      pack: 'cyclic',
      frequency: 'daily',
      anchor: null,
      anchorFor: null,
      years: null,
      threads: 'after_period',
      meds: [],
    });
    expect(parseOptions('não é json')).toEqual(defaultReminder('daily_log').options);
  });
});

describe('validTime', () => {
  it('aceita HH:MM de 00:00 a 23:59', () => {
    expect(['00:00', '09:30', '23:59'].every(validTime)).toBe(true);
    expect(['24:00', '9:30', '12:60', ''].some(validTime)).toBe(false);
  });
});

describe('needsAnchor', () => {
  const withMethod = (birthControl: Profile['birthControl']) => ({ ...base, birthControl });
  const bc = (options: Partial<ReturnType<typeof defaultReminder>['options']> = {}) => ({
    ...defaultReminder('birth_control'),
    options: { ...defaultReminder('birth_control').options, ...options },
  });

  it('adesivo, anel, injeção e pílula 21+7 precisam de data; pílula contínua não', () => {
    expect(needsAnchor(bc(), withMethod('patch'))).toBe(true);
    expect(needsAnchor(bc(), withMethod('pill'))).toBe(true);
    expect(needsAnchor(bc({ pack: 'continuous' }), withMethod('pill'))).toBe(false);
    expect(needsAnchor(defaultReminder('daily_log'), withMethod('patch'))).toBe(false);
  });

  it('data de outro método não vale (trocou pílula por injeção: pede a data de novo)', () => {
    expect(needsAnchor(bc({ anchor: '2026-10-01', anchorFor: 'pill' }), withMethod('injection'))).toBe(true);
    expect(needsAnchor(bc({ anchor: '2026-10-01', anchorFor: 'injection' }), withMethod('injection'))).toBe(false);
  });
});

describe('customMessageAllowed', () => {
  it('só quando todos os avisos do lembrete dizem a mesma coisa', () => {
    expect(customMessageAllowed('period_soon', base)).toBe(true);
    expect(
      customMessageAllowed('birth_control', {
        ...base,
        birthControl: 'pill',
        lutealLength: null,
        includeAtypical: false,
        babyBirth: null,
        twins: false,
      }),
    ).toBe(true);
    expect(customMessageAllowed('phase_change', base)).toBe(false);
    expect(
      customMessageAllowed('birth_control', {
        ...base,
        birthControl: 'ring',
        lutealLength: null,
        includeAtypical: false,
        babyBirth: null,
        twins: false,
      }),
    ).toBe(false);
  });
});
