import { categoryById, type ChoiceCategory } from '@/domain/tracking/catalog';
import { orderCategories, orderForEditing, toggleOption, validateMeasure, validateNote } from '@/domain/tracking/rules';

const single = categoryById('period') as ChoiceCategory;
const multi = categoryById('pain') as ChoiceCategory;

describe('toggleOption', () => {
  it('single: escolhe, troca e desmarca', () => {
    expect(toggleOption(single, [], 'light')).toEqual(['light']);
    expect(toggleOption(single, ['light'], 'heavy')).toEqual(['heavy']);
    expect(toggleOption(single, ['heavy'], 'heavy')).toEqual([]);
  });

  it('multi: adiciona e remove mantendo a ordem do catálogo', () => {
    expect(toggleOption(multi, ['headache'], 'cramps')).toEqual(['cramps', 'headache']);
    expect(toggleOption(multi, ['cramps', 'headache'], 'cramps')).toEqual(['headache']);
  });

  it('ignora opção que não existe na categoria', () => {
    expect(toggleOption(multi, ['cramps'], 'inventada')).toEqual(['cramps']);
  });
});

describe('validateMeasure', () => {
  it.each([
    ['temperature', 36.55, null],
    ['temperature', 33.9, 'out_of_range'],
    ['temperature', 36.555, 'too_precise'],
    ['weight', 64.3, null],
    ['weight', 301, 'out_of_range'],
    ['resting_heart_rate', 62, null],
    ['resting_heart_rate', 62.5, 'too_precise'],
    ['hrv', 4, 'out_of_range'],
    ['temperature', Number.NaN, 'out_of_range'],
  ])('%s = %p → %p', (kind, value, expected) => {
    expect(validateMeasure(kind as string, value as number)).toBe(expected);
  });

  it('categoria que não é medição é inválida', () => {
    expect(validateMeasure('period', 1)).toBe('not_a_measure');
  });
});

describe('validateNote', () => {
  it('aceita texto até 1000 caracteres', () => {
    expect(validateNote('Cólica forte de manhã.')).toBeNull();
    expect(validateNote('a'.repeat(1000))).toBeNull();
  });

  it('recusa acima de 1000 caracteres', () => {
    expect(validateNote('a'.repeat(1001))).toBe('too_long');
  });

  it('recusa só espaços', () => {
    expect(validateNote('   \n ')).toBe('empty');
  });
});

describe('orderCategories', () => {
  const ids = ['period', 'pain', 'feelings', 'sleep'];

  it('sem preferências mantém a ordem padrão', () => {
    expect(orderCategories(ids, [])).toEqual(ids);
  });

  it('aplica a ordem salva e tira as ocultas', () => {
    const prefs = [
      { category: 'sleep', position: 0, hidden: false },
      { category: 'period', position: 1, hidden: false },
      { category: 'pain', position: 2, hidden: true },
    ];
    expect(orderCategories(ids, prefs)).toEqual(['sleep', 'period', 'feelings']);
  });

  it('categorias sem preferência mantêm a posição padrão relativa (não vão para o fim)', () => {
    // Personalizado em outro modo (sem "period"): ao voltar, "period" não fica enterrada no fim.
    const prefs = [
      { category: 'pain', position: 0, hidden: false },
      { category: 'feelings', position: 1, hidden: false },
      { category: 'sleep', position: 2, hidden: false },
    ];
    expect(orderCategories(ids, prefs)).toEqual(['period', 'pain', 'feelings', 'sleep']);
  });

  it('respeita a ordem escolhida entre as personalizadas e encaixa as outras antes da próxima no padrão', () => {
    expect(orderCategories(ids, [{ category: 'sleep', position: 0, hidden: false }, { category: 'pain', position: 1, hidden: false }])).toEqual([
      'period', 'sleep', 'pain', 'feelings',
    ]);
  });

  it('ignora preferências de categorias que não estão visíveis', () => {
    expect(orderCategories(['period'], [{ category: 'bc_ring', position: 0, hidden: false }])).toEqual(['period']);
  });
});

describe('orderForEditing', () => {
  it('lista para Personalizar: visíveis na ordem escolhida e, no fim, as ocultas', () => {
    const prefs = [
      { category: 'mood', position: 0, hidden: false },
      { category: 'period', position: 1, hidden: true },
      { category: 'pain', position: 2, hidden: false },
    ];
    expect(orderForEditing(['period', 'pain', 'mood', 'energy'], prefs)).toEqual([
      { id: 'mood', hidden: false },
      { id: 'energy', hidden: false },
      { id: 'pain', hidden: false },
      { id: 'period', hidden: true },
    ]);
  });
});
