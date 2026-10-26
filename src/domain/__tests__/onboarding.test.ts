import { nextStep, previousStep, type Step, stepsFor } from '@/domain/onboarding';

describe('stepsFor', () => {
  it.each<[Parameters<typeof stepsFor>[0], Step[]]>([
    ['period', ['welcome', 'birth_year', 'mode', 'last_period', 'lengths', 'birth_control', 'done']],
    ['perimenopause', ['welcome', 'birth_year', 'mode', 'last_period', 'lengths', 'birth_control', 'done']],
    ['no_bleeding', ['welcome', 'birth_year', 'mode', 'birth_control', 'done']],
    ['conceive', ['welcome', 'birth_year', 'mode', 'trying_since', 'last_period', 'lengths', 'done']],
    ['pregnancy', ['welcome', 'birth_year', 'mode', 'due_date', 'done']],
  ])('modo %s', (mode, steps) => {
    expect(stepsFor(mode)).toEqual(steps);
  });

  it('antes de escolher o modo mostra só até a escolha', () => {
    expect(stepsFor(null)).toEqual(['welcome', 'birth_year', 'mode']);
  });
});

describe('nextStep / previousStep', () => {
  it('avança e volta seguindo os passos do modo', () => {
    expect(nextStep('mode', 'pregnancy')).toBe('due_date');
    expect(nextStep('due_date', 'pregnancy')).toBe('done');
    expect(previousStep('due_date', 'pregnancy')).toBe('mode');
  });

  it('não avança depois do último passo nem volta antes do primeiro', () => {
    expect(nextStep('done', 'period')).toBeNull();
    expect(previousStep('welcome', 'period')).toBeNull();
  });

  it('sem modo escolhido, o passo do modo não tem próximo', () => {
    expect(nextStep('mode', null)).toBeNull();
  });
});

describe('onboarding › pós-parto', () => {
  it('data do parto e contracepção, sem última menstruação nem durações', () => {
    expect(stepsFor('postpartum')).toEqual(['welcome', 'birth_year', 'mode', 'baby_birth', 'birth_control', 'done']);
    expect(stepsFor('menopause')).toEqual(['welcome', 'birth_year', 'mode', 'final_period', 'done']);
  });
});
