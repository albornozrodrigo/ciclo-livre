import { todayIso } from '@/domain/dates';
import { type ProfileInput, validateBirthYear, validateProfile, validateProfileEdit } from '@/domain/profile';

const TODAY = '2026-10-22';

const base: ProfileInput = {
  birthYear: 1995,
  mode: 'period',
  lastPeriodStart: '2026-10-10',
};

const errorsOf = (input: ProfileInput) => {
  const result = validateProfile(input, TODAY);
  return result.ok ? [] : result.errors;
};

describe('validateProfile', () => {
  describe('perfil mínimo', () => {
    it('aceita e aplica os padrões de duração e regularidade', () => {
      const result = validateProfile(base, TODAY);

      expect(result).toEqual({
        ok: true,
        profile: {
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
          finalPeriod: null,
        },
      });
    });

    it('aceita "não lembro" a última menstruação', () => {
      expect(errorsOf({ ...base, lastPeriodStart: null })).toEqual([]);
    });
  });

  describe('idade', () => {
    it('recusa quem pode ainda ter 17 anos (completa 18 neste ano)', () => {
      expect(errorsOf({ ...base, birthYear: 2008 })).toEqual([{ field: 'birthYear', code: 'under_18' }]);
    });

    it('aceita quem com certeza já tem 18 anos completos', () => {
      expect(errorsOf({ ...base, birthYear: 2007 })).toEqual([]);
    });

    it('ano no futuro é ano inválido, não menor de idade', () => {
      expect(errorsOf({ ...base, birthYear: 2030 })).toEqual([{ field: 'birthYear', code: 'out_of_range' }]);
    });

    it('recusa ano de nascimento implausível (mais de 100 anos)', () => {
      expect(errorsOf({ ...base, birthYear: 1925 })).toEqual([{ field: 'birthYear', code: 'out_of_range' }]);
    });

    it('recusa ano que não é inteiro', () => {
      expect(errorsOf({ ...base, birthYear: 1995.5 })).toEqual([{ field: 'birthYear', code: 'out_of_range' }]);
    });
  });

  describe('última menstruação', () => {
    it('recusa data no futuro', () => {
      expect(errorsOf({ ...base, lastPeriodStart: '2026-10-23' })).toEqual([{ field: 'lastPeriodStart', code: 'in_future' }]);
    });

    it('recusa data há mais de 365 dias', () => {
      expect(errorsOf({ ...base, lastPeriodStart: '2025-10-21' })).toEqual([{ field: 'lastPeriodStart', code: 'too_old' }]);
    });

    it('aceita exatamente 365 dias atrás', () => {
      expect(errorsOf({ ...base, lastPeriodStart: '2025-10-22' })).toEqual([]);
    });

    it.each(['2026-13-01', '2026-02-30', '22/10/2026', ''])('recusa data inválida %p', (value) => {
      expect(errorsOf({ ...base, lastPeriodStart: value })).toEqual([{ field: 'lastPeriodStart', code: 'invalid_date' }]);
    });
  });

  describe('durações', () => {
    it.each([0, 16, 4.5])('recusa duração de menstruação %p', (periodLength) => {
      expect(errorsOf({ ...base, periodLength })).toEqual([{ field: 'periodLength', code: 'out_of_range' }]);
    });

    it.each([14, 91])('recusa duração de ciclo %p', (cycleLength) => {
      expect(errorsOf({ ...base, cycleLength })).toEqual([{ field: 'cycleLength', code: 'out_of_range' }]);
    });

    it('recusa menstruação tão longa quanto o ciclo', () => {
      expect(errorsOf({ ...base, periodLength: 15, cycleLength: 15 })).toEqual([{ field: 'periodLength', code: 'not_shorter_than_cycle' }]);
    });
  });

  describe('fase lútea', () => {
    it('é opcional: sem informar fica null', () => {
      const result = validateProfile(base, TODAY);
      expect(result.ok && result.profile.lutealLength).toBeNull();
    });

    it('aceita de 9 a 18 dias', () => {
      expect(errorsOf({ ...base, lutealLength: 9, includeAtypical: false, babyBirth: null, twins: false })).toEqual([]);
      expect(errorsOf({ ...base, lutealLength: 18, includeAtypical: false, babyBirth: null, twins: false })).toEqual([]);
    });

    it.each([8, 19, 12.5])('recusa %p', (lutealLength) => {
      expect(errorsOf({ ...base, lutealLength })).toEqual([{ field: 'lutealLength', code: 'out_of_range' }]);
    });

    it('não trava a edição por causa da duração do ciclo (o motor decide se o valor cabe)', () => {
      expect(
        errorsOf({ ...base, cycleLength: 16, periodLength: 3, lutealLength: 16, includeAtypical: false, babyBirth: null, twins: false }),
      ).toEqual([]);
    });
  });

  describe('menopausa', () => {
    it('a última menstruação é opcional (não lembro)', () => {
      expect(errorsOf({ ...base, mode: 'menopause', lastPeriodStart: null })).toEqual([]);
    });

    it('aceita de hoje até 50 anos atrás', () => {
      expect(errorsOf({ ...base, mode: 'menopause', finalPeriod: TODAY })).toEqual([]);
      expect(errorsOf({ ...base, mode: 'menopause', finalPeriod: '1976-10-22' })).toEqual([]);
    });

    it('recusa data no futuro, de mais de 50 anos e inválida', () => {
      expect(errorsOf({ ...base, mode: 'menopause', finalPeriod: '2026-10-23' })).toEqual([{ field: 'finalPeriod', code: 'in_future' }]);
      expect(errorsOf({ ...base, mode: 'menopause', finalPeriod: '1976-10-21' })).toEqual([{ field: 'finalPeriod', code: 'too_old' }]);
      expect(errorsOf({ ...base, mode: 'menopause', finalPeriod: '2026-02-30' })).toEqual([{ field: 'finalPeriod', code: 'invalid_date' }]);
    });

    it('a data só vale no modo menopausa', () => {
      const result = validateProfile({ ...base, mode: 'perimenopause', finalPeriod: '2025-01-01' }, TODAY);
      expect(result.ok && result.profile.finalPeriod).toBeNull();
      const kept = validateProfile({ ...base, mode: 'menopause', finalPeriod: '2025-01-01' }, TODAY);
      expect(kept.ok && kept.profile.finalPeriod).toBe('2025-01-01');
    });
  });

  describe('pós-parto', () => {
    it('exige a data do parto', () => {
      expect(errorsOf({ ...base, mode: 'postpartum' })).toEqual([{ field: 'babyBirth', code: 'required' }]);
    });

    it('aceita de hoje até 365 dias atrás', () => {
      expect(errorsOf({ ...base, mode: 'postpartum', babyBirth: TODAY })).toEqual([]);
      expect(errorsOf({ ...base, mode: 'postpartum', babyBirth: '2025-10-22', twins: false })).toEqual([]);
    });

    it('recusa data no futuro e de mais de um ano', () => {
      expect(errorsOf({ ...base, mode: 'postpartum', babyBirth: '2026-10-23', twins: false })).toEqual([
        { field: 'babyBirth', code: 'in_future' },
      ]);
      expect(errorsOf({ ...base, mode: 'postpartum', babyBirth: '2025-10-21', twins: false })).toEqual([
        { field: 'babyBirth', code: 'too_old' },
      ]);
    });

    it('a data do parto só vale no modo pós-parto', () => {
      const result = validateProfile({ ...base, babyBirth: '2026-10-01', twins: false }, TODAY);
      expect(result.ok && result.profile.babyBirth).toBeNull();
    });
  });

  describe('gravidez', () => {
    it('exige data prevista do parto', () => {
      expect(errorsOf({ ...base, mode: 'pregnancy' })).toEqual([{ field: 'dueDate', code: 'required' }]);
    });

    it('recusa data prevista no passado ou além de 300 dias', () => {
      expect(errorsOf({ ...base, mode: 'pregnancy', dueDate: '2026-10-21' })).toEqual([{ field: 'dueDate', code: 'out_of_range' }]);
      expect(errorsOf({ ...base, mode: 'pregnancy', dueDate: '2027-08-19' })).toEqual([{ field: 'dueDate', code: 'out_of_range' }]);
    });

    it('recusa data prevista malformada', () => {
      expect(errorsOf({ ...base, mode: 'pregnancy', dueDate: '2027-02-30' })).toEqual([{ field: 'dueDate', code: 'invalid_date' }]);
    });

    it('aceita data prevista válida', () => {
      expect(errorsOf({ ...base, mode: 'pregnancy', dueDate: '2027-05-01' })).toEqual([]);
    });

    it('limpa a data prevista quando o modo não é gravidez', () => {
      const result = validateProfile({ ...base, dueDate: '2027-05-01' }, TODAY);

      expect(result.ok && result.profile.dueDate).toBeNull();
    });
  });

  describe('tentando engravidar', () => {
    it('exige há quanto tempo', () => {
      expect(errorsOf({ ...base, mode: 'conceive' })).toEqual([{ field: 'tryingSince', code: 'required' }]);
    });

    it('aceita uma faixa válida', () => {
      expect(errorsOf({ ...base, mode: 'conceive', tryingSince: '4_6m' })).toEqual([]);
    });

    it('limpa a faixa quando o modo não é tentar engravidar', () => {
      const result = validateProfile({ ...base, tryingSince: '4_6m' }, TODAY);

      expect(result.ok && result.profile.tryingSince).toBeNull();
    });
  });

  it('acumula erros de vários campos', () => {
    expect(errorsOf({ birthYear: 2015, mode: 'pregnancy', lastPeriodStart: '2030-01-01' })).toEqual([
      { field: 'birthYear', code: 'under_18' },
      { field: 'lastPeriodStart', code: 'in_future' },
      { field: 'dueDate', code: 'required' },
    ]);
  });
});

describe('validateBirthYear', () => {
  it('devolve o código de erro do ano isoladamente', () => {
    expect(validateBirthYear(2008, TODAY)).toBe('under_18');
    expect(validateBirthYear(1800, TODAY)).toBe('out_of_range');
    expect(validateBirthYear(1990, TODAY)).toBeNull();
  });
});

describe('validateProfileEdit', () => {
  const saved = {
    ...base,
    lastPeriodStart: '2025-10-25',
    periodLength: 5,
    cycleLength: 28,
    regularity: 'unknown' as const,
    dueDate: null,
    tryingSince: null,
    birthControl: null,
    lutealLength: null,
    includeAtypical: false,
    babyBirth: null,
    twins: false,
    finalPeriod: null,
  };

  it('não bloqueia por uma data guardada que envelheceu e não foi mexida', () => {
    expect(validateProfileEdit({ ...saved, mode: 'perimenopause' }, saved, '2026-11-01').ok).toBe(true);
  });

  it('continua recusando a data antiga se a pessoa acabou de escolhê-la', () => {
    const previous = { ...saved, lastPeriodStart: '2026-10-01' };
    const result = validateProfileEdit({ ...saved }, previous, '2026-11-01');

    expect(result.ok ? [] : result.errors).toEqual([{ field: 'lastPeriodStart', code: 'too_old' }]);
  });

  it('data prevista que já passou e não foi mexida não bloqueia edições', () => {
    const pregnant = { ...saved, mode: 'pregnancy' as const, lastPeriodStart: null, dueDate: '2026-10-01' };

    expect(validateProfileEdit({ ...pregnant, cycleLength: 30 }, pregnant, '2026-11-01').ok).toBe(true);
  });
});

describe('todayIso', () => {
  it('é a data local de hoje', () => {
    expect(todayIso(new Date(2026, 9, 22, 23, 30))).toBe('2026-10-22');
  });
});
