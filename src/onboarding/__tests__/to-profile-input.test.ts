import { type OnboardingDraft } from '@/onboarding/draft';
import { fixStepFor, toProfileInput } from '@/onboarding/to-profile-input';

const draft: OnboardingDraft = {
  birthYear: '1995',
  mode: 'pregnancy',
  lastPeriodStart: '2026-10-01',
  periodLength: 7,
  cycleLength: 35,
  regularity: 'irregular',
  dueDate: '2027-05-01',
  tryingSince: '4_6m',
  birthControl: 'pill',
  babyBirth: '2026-09-15',
};

describe('toProfileInput', () => {
  it('descarta respostas de passos que não fazem parte do fluxo do modo escolhido', () => {
    expect(toProfileInput(draft)).toEqual({
      birthYear: 1995,
      mode: 'pregnancy',
      lastPeriodStart: null,
      periodLength: 5,
      cycleLength: 28,
      regularity: 'unknown',
      dueDate: '2027-05-01',
      tryingSince: null,
      birthControl: null,
      babyBirth: null,
    });
  });

  it('mantém o que o fluxo do modo perguntou', () => {
    expect(toProfileInput({ ...draft, mode: 'period' })).toEqual({
      birthYear: 1995,
      mode: 'period',
      lastPeriodStart: '2026-10-01',
      periodLength: 7,
      cycleLength: 35,
      regularity: 'irregular',
      dueDate: null,
      tryingSince: null,
      birthControl: 'pill',
      babyBirth: null,
    });
  });
});

describe('toProfileInput › pós-parto', () => {
  it('leva a data do parto e a contracepção; descarta o resto', () => {
    expect(toProfileInput({ ...draft, mode: 'postpartum' })).toMatchObject({
      mode: 'postpartum',
      babyBirth: '2026-09-15',
      birthControl: 'pill',
      dueDate: null,
      lastPeriodStart: null,
    });
  });
});

describe('fixStepFor', () => {
  it('leva ao passo do campo quando ele faz parte do fluxo', () => {
    expect(fixStepFor('dueDate', 'pregnancy')).toBe('due_date');
  });

  it('cai na escolha de modo se o passo do campo não existe no fluxo', () => {
    expect(fixStepFor('periodLength', 'pregnancy')).toBe('mode');
  });
});
