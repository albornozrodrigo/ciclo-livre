import type { Profile } from '@/domain/profile';
import { availableKinds, defaultReminder, parseOptions, type Reminder, validOptions } from '@/domain/reminders/catalog';
import { MED_LIMITS, validMeds } from '@/domain/reminders/medication';
import { MAX_FIRES, planSchedule } from '@/domain/reminders/schedule';
import { reminderContent } from '@/i18n/pt-BR-reminders';

const profile: Profile = {
  birthYear: 1995,
  mode: 'pregnancy',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: '2027-03-01',
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: false,
};
const meds = [
  { name: 'Ferro', times: ['08:00', '20:00'], until: '2026-10-30' },
  { name: 'Vitamina D', times: ['09:00'], until: null },
];
const reminder = (patch: Partial<Reminder['options']> = {}): Reminder => {
  const r = defaultReminder('medication');
  return { ...r, enabled: true, options: { ...r.options, meds, ...patch } };
};

describe('remédios: validação', () => {
  it('aceita até 5 remédios, com nome e de 1 a 4 horários', () => {
    expect(validMeds(meds)).toBe(true);
    expect(validMeds([])).toBe(true);
  });

  it.each([
    ['nome vazio', [{ name: '  ', times: ['08:00'], until: null }]],
    ['nome longo', [{ name: 'x'.repeat(MED_LIMITS.name + 1), times: ['08:00'], until: null }]],
    ['sem horário', [{ name: 'A', times: [], until: null }]],
    ['horário repetido', [{ name: 'A', times: ['08:00', '08:00'], until: null }]],
    ['5 horários', [{ name: 'A', times: ['01:00', '02:00', '03:00', '04:00', '05:00'], until: null }]],
    ['horário inválido', [{ name: 'A', times: ['8h'], until: null }]],
    ['6 remédios', Array.from({ length: 6 }, (_, i) => ({ name: `R${i}`, times: ['08:00'], until: null }))],
  ])('recusa %s', (_, value) => {
    expect(validMeds(value)).toBe(false);
  });

  it('opções gravadas com remédios inválidos voltam à lista vazia', () => {
    expect(parseOptions('{"meds":[{"name":"","times":[]}]}').meds).toEqual([]);
    expect(validOptions({ ...defaultReminder('medication').options, meds })).toBe(true);
  });
});

describe('remédios: agenda', () => {
  it('cada horário de cada remédio, até o término; disponível em qualquer modo', () => {
    expect(availableKinds(profile)).toContain('medication');
    const fires = planSchedule({ reminders: [reminder()], profile, model: null, now: { date: '2026-10-28', minutes: 10 * 60 } });
    const ferro = fires.filter((f) => f.variant === 'medication_0').map((f) => `${f.date} ${f.time}`);
    expect(ferro).toEqual(['2026-10-28 20:00', '2026-10-29 08:00', '2026-10-29 20:00', '2026-10-30 08:00', '2026-10-30 20:00']);
    const vitamina = fires.filter((f) => f.variant === 'medication_1');
    expect(vitamina[0]).toMatchObject({ date: '2026-10-29', time: '09:00' });
    expect(new Set(fires.map((f) => f.key)).size).toBe(fires.length);
  });
});

describe('remédios: notificação', () => {
  it('diz o nome do remédio (fora do modo discreto)', () => {
    expect(reminderContent(reminder(), 'medication_1', false)).toEqual({ title: 'Hora do remédio', body: 'Vitamina D' });
  });
});

describe('remédios: revisão', () => {
  it('muitos remédios não expulsam os outros lembretes da agenda', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ name: `R${i}`, times: ['06:00', '10:00', '14:00', '18:00'], until: null }));
    const daily = { ...defaultReminder('daily_log'), enabled: true, time: '23:00' };
    const fires = planSchedule({
      reminders: [{ ...reminder(), options: { ...reminder().options, meds: many } }, daily],
      profile,
      model: null,
      now: { date: '2026-10-28', minutes: 0 },
    });
    expect(fires.filter((f) => f.kind === 'daily_log')).toHaveLength(61);
    expect(fires.length).toBeLessThanOrEqual(MAX_FIRES);
  });
});
