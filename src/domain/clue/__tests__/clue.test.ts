import { CLUE_LIMITS, ClueFormatError, mapClue, parseClueMeasurements } from '@/domain/clue/clue';

const rec = (type: string, date: string, value: unknown, id = `${type}-${date}`) => ({ type, id, date, value });

describe('parseClueMeasurements', () => {
  it('lista JSON de registros; ignora entradas sem tipo/data válidos e conta', () => {
    const text = JSON.stringify([
      rec('period', '2024-04-28', { option: 'medium' }),
      { type: 'period' },
      'x',
      rec('pain', '2024-13-01', []),
    ]);
    const out = parseClueMeasurements(text);
    expect(out.records).toHaveLength(1);
    expect(out.invalid).toBe(3);
  });

  it('data absurda (ano 9999 ou 0500) conta como inválida', () => {
    const out = parseClueMeasurements(
      JSON.stringify([rec('period', '9999-12-31', { option: 'heavy' }), rec('period', '0500-01-01', { option: 'heavy' })]),
    );
    expect(out).toEqual({ records: [], invalid: 2 });
  });

  it('aceita data com horário (usa só o dia)', () => {
    expect(parseClueMeasurements(JSON.stringify([rec('period', '2024-04-28T00:00:00Z', { option: 'light' })])).records[0].date).toBe(
      '2024-04-28',
    );
  });

  it('recusa o que não é lista ou passa do limite', () => {
    expect(() => parseClueMeasurements('{"a":1}')).toThrow();
    expect(() => parseClueMeasurements('não é json')).toThrow();
    const many = Array.from({ length: CLUE_LIMITS.records + 1 }, () => ({}));
    expect(() => parseClueMeasurements(JSON.stringify(many))).toThrow();
  });
});

describe('mapClue', () => {
  const records = [
    rec('period', '2024-05-02', { option: 'super_heavy' }),
    rec('period', '2024-04-28', { option: 'medium' }),
    rec('period', '2024-04-30', { option: 'none' }),
    rec('spotting', '2024-05-10', [{ option: 'brown' }]),
    rec('pain', '2024-04-29', [
      { option: 'period_cramps', extent: { severity: 'mild' } },
      { option: 'lower_back', extent: { severity: 'severe' } },
    ]),
    rec('discharge', '2024-06-11', [{ option: 'eggwhite' }]),
    rec('tests', '2024-06-12', [{ option: 'ovulation_test_positive' }]),
    rec('ailments', '2025-06-21', [{ option: 'cold_flu' }, { option: 'cold_or_flu' }, { option: 'fever' }]),
    rec('energy', '2024-06-07', [{ option: 'energetic' }]),
    rec('sleep_duration', '2024-11-23', { minutes: 506 }),
    rec('weight', '2024-07-05', { kilograms: 63.5 }),
    rec('temperature', '2024-06-13', { fahrenheit: 97.7 }),
    rec('notes', '2024-07-08', { text: 'Começou suplemento de ferro' }),
    rec('notes', '2024-07-09', { text: 'x'.repeat(1200) }),
    rec('tags', '2024-05-05', [{ option: 'Long run' }]),
    rec('pms', '2024-05-26', { option: 'yes' }),
    rec('breasts_and_chest', '2024-05-23', [{ option: 'swollen_breasts' }]),
    rec('pain', '2024-07-01', [{ option: 'vulvar' }]),
    rec('pregnancy_superpowers', '2024-07-02', [{ option: 'glow' }]),
    rec('weight', '2024-07-03', { kilograms: 900 }),
  ];
  const out = mapClue(records);
  const sel = (date: string, category: string) =>
    out.selections.filter((s) => s.date === date && s.category === category).map((s) => s.option);

  it('menstruação: muito intenso vira o nosso nível mais forte; "none" não vira dia de sangue', () => {
    expect(sel('2024-05-02', 'period')).toEqual(['very_heavy']);
    expect(sel('2024-04-28', 'period')).toEqual(['medium']);
    expect(sel('2024-04-30', 'period')).toEqual([]);
  });

  it('dor com intensidade (a maior do dia), corrimento, testes e doenças com nomes das duas versões', () => {
    expect(sel('2024-04-29', 'pain').sort()).toEqual(['back', 'cramps']);
    expect(sel('2024-04-29', 'pain_intensity')).toEqual(['severe']);
    expect(sel('2024-06-11', 'discharge')).toEqual(['egg_white']);
    expect(sel('2024-06-12', 'tests')).toEqual(['ovulation_positive']);
    expect(sel('2025-06-21', 'ailments').sort()).toEqual(['cold_flu', 'fever']);
    expect(sel('2024-06-07', 'energy')).toEqual(['high']);
    expect(sel('2024-05-26', 'pms')).toEqual(['present']);
    expect(sel('2024-05-10', 'spotting')).toEqual(['brown']);
  });

  it('sono em minutos vira faixa; peso; temperatura em °F vira °C com 2 casas', () => {
    expect(sel('2024-11-23', 'sleep')).toEqual(['6_9h']);
    expect(out.measures).toEqual(
      expect.arrayContaining([
        { date: '2024-07-05', category: 'weight', value: 63.5 },
        { date: '2024-06-13', category: 'temperature', value: 36.5 },
      ]),
    );
  });

  it('notas (longas cortadas em 1000 e contadas) e tags', () => {
    expect(out.notes[0]).toEqual({ date: '2024-07-08', text: 'Começou suplemento de ferro' });
    expect(out.notes[1].text).toHaveLength(1000);
    expect(out.truncatedNotes).toBe(1);
    expect(out.tags).toEqual(['Long run']);
    expect(out.dayTags).toEqual([{ date: '2024-05-05', tag: 'Long run' }]);
  });

  it('o que não tem par é contado por tipo, nunca descartado em silêncio', () => {
    expect(out.unknown).toEqual({
      'breasts_and_chest:swollen_breasts': 1,
      'pain:vulvar': 1,
      pregnancy_superpowers: 1,
      'weight:out_of_range': 1,
    });
  });

  it('opção única por dia (a primeira); seleções sem repetição', () => {
    const o = mapClue([
      rec('energy', '2024-01-01', [{ option: 'tired' }, { option: 'energetic' }]),
      rec('pain', '2024-01-01', [{ option: 'headache' }, { option: 'headache' }]),
    ]);
    expect(o.selections).toEqual([
      { date: '2024-01-01', category: 'energy', option: 'low' },
      { date: '2024-01-01', category: 'pain', option: 'headache' },
    ]);
  });

  it('período coberto e dias com registro', () => {
    expect(out.range).toEqual({ from: '2024-04-28', to: '2025-06-21' });
    expect(out.days).toBeGreaterThan(10);
  });
});

describe('notas no mesmo dia', () => {
  it('juntam numa nota só (o app guarda uma por dia)', () => {
    const o = mapClue([rec('notes', '2024-01-01', { text: 'a' }, '1'), rec('notes', '2024-01-01', { text: 'b' }, '2')]);
    expect(o.notes).toEqual([{ date: '2024-01-01', text: 'a\nb' }]);
  });
});

describe('contracepção', () => {
  it('pílula, anel, adesivo, injeção e implante; DIU sem tipo fica como não reconhecido', () => {
    const o = mapClue([
      rec('pill', '2024-02-01', [{ option: 'taken' }]),
      rec('birth_control_pill', '2024-02-02', [{ option: 'missed' }]),
      rec('pill', '2024-02-03', [{ option: 'double' }]),
      rec('ring', '2024-02-04', [{ option: 'inserted' }]),
      rec('patch', '2024-02-05', [{ option: 'replaced' }]),
      rec('injection', '2024-02-06', [{ option: 'taken' }]),
      rec('implant', '2024-02-07', [{ option: 'removed' }]),
      rec('iud', '2024-02-08', [{ option: 'thread_checked' }]),
    ]);
    expect(o.selections.map((s) => `${s.category}:${s.option}`)).toEqual([
      'bc_pill:taken',
      'bc_pill:missed',
      'bc_pill:double',
      'bc_ring:inserted',
      'bc_patch:replaced',
      'bc_injection:taken',
      'bc_implant:removed',
    ]);
    expect(o.unknown).toEqual({ iud: 1 });
  });
});

describe('limites contra arquivo forjado', () => {
  it('nomes herdados de objeto (constructor, __proto__) não viram categoria', () => {
    const o = mapClue([
      rec('pain', '2024-01-01', [{ option: 'constructor' }, { option: '__proto__' }]),
      rec('constructor', '2024-01-02', [{ option: 'x' }]),
      rec('toString', '2024-01-03', [{ option: 'x' }]),
    ]);
    expect(o.selections).toEqual([]);
    expect(o.unknown).toEqual({ 'pain:constructor': 1, 'pain:__proto__': 1, constructor: 1, toString: 1 });
  });

  it('registro com mais de 50 opções é ignorado e contado', () => {
    const many = Array.from({ length: 51 }, () => ({ option: 'headache' }));
    const o = mapClue([rec('pain', '2024-01-01', many)]);
    expect(o.selections).toEqual([]);
    expect(o.unknown).toEqual({ 'pain:too_many_options': 1 });
  });

  it('não reconhecidos: no máximo 50 chaves; o resto soma em "other"', () => {
    const recs = Array.from({ length: 60 }, (_, i) => rec(`tipo_${i}`, '2024-01-01', [{ option: 'x' }]));
    const o = mapClue(recs);
    expect(Object.keys(o.unknown)).toHaveLength(51);
    expect(o.unknown.other).toBe(10);
  });

  it('mais de 1000 tags distintas: arquivo recusado', () => {
    const tags = Array.from({ length: 1001 }, (_, i) => ({ option: `t${i}` }));
    expect(() =>
      mapClue([
        rec('tags', '2024-01-01', tags.slice(0, 40)),
        ...Array.from({ length: 25 }, (_, k) =>
          rec('tags', `2024-02-${String(k + 1).padStart(2, '0')}`, tags.slice(40 * k + 40, 40 * k + 80)),
        ),
      ]),
    ).toThrow(ClueFormatError);
  });
});

describe('intensidade da dor', () => {
  it('só vem de opção que vira dor (enxaqueca vai para doenças e não deixa intensidade sozinha)', () => {
    const o = mapClue([rec('pain', '2024-01-01', [{ option: 'migraine', extent: { severity: 'severe' } }])]);
    expect(o.selections).toEqual([{ date: '2024-01-01', category: 'ailments', option: 'migraine' }]);
  });
});
