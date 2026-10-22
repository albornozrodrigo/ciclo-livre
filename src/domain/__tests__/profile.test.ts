import { type ProfileInput, validateProfile } from '@/domain/profile';

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
        },
      });
    });

    it('aceita "não lembro" a última menstruação', () => {
      expect(errorsOf({ ...base, lastPeriodStart: null })).toEqual([]);
    });
  });

  describe('idade', () => {
    it('recusa quem completa menos de 18 anos no ano atual', () => {
      expect(errorsOf({ ...base, birthYear: 2009 })).toEqual([{ field: 'birthYear', code: 'under_18' }]);
    });

    it('aceita quem completa 18 anos no ano atual', () => {
      expect(errorsOf({ ...base, birthYear: 2008 })).toEqual([]);
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
      expect(errorsOf({ ...base, lastPeriodStart: '2026-10-23' })).toEqual([
        { field: 'lastPeriodStart', code: 'in_future' },
      ]);
    });

    it('recusa data há mais de 365 dias', () => {
      expect(errorsOf({ ...base, lastPeriodStart: '2025-10-21' })).toEqual([
        { field: 'lastPeriodStart', code: 'too_old' },
      ]);
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
      expect(errorsOf({ ...base, periodLength: 15, cycleLength: 15 })).toEqual([
        { field: 'periodLength', code: 'not_shorter_than_cycle' },
      ]);
    });
  });

  describe('gravidez', () => {
    it('exige data prevista do parto', () => {
      expect(errorsOf({ ...base, mode: 'pregnancy' })).toEqual([{ field: 'dueDate', code: 'required' }]);
    });

    it('recusa data prevista no passado ou além de 300 dias', () => {
      expect(errorsOf({ ...base, mode: 'pregnancy', dueDate: '2026-10-21' })).toEqual([
        { field: 'dueDate', code: 'out_of_range' },
      ]);
      expect(errorsOf({ ...base, mode: 'pregnancy', dueDate: '2027-08-19' })).toEqual([
        { field: 'dueDate', code: 'out_of_range' },
      ]);
    });

    it('recusa data prevista malformada', () => {
      expect(errorsOf({ ...base, mode: 'pregnancy', dueDate: '2027-02-30' })).toEqual([
        { field: 'dueDate', code: 'invalid_date' },
      ]);
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
