import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DoneScreen from '@/app/onboarding/pronto';
import { ptBR } from '@/i18n/pt-BR';
import { type OnboardingDraft, OnboardingDraftProvider } from '@/onboarding/draft';

const mockSaveProfile = jest.fn();
jest.mock('@/profile/profile-context', () => ({ useProfile: () => ({ saveProfile: mockSaveProfile }) }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (href: unknown) => mockPush(href) } }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const copy = ptBR.onboarding.done;

const renderDone = (initial: Partial<OnboardingDraft>) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <OnboardingDraftProvider initial={initial}>
        <DoneScreen />
      </OnboardingDraftProvider>
    </SafeAreaProvider>,
  );

describe('Onboarding › pronto', () => {
  beforeEach(() => {
    mockSaveProfile.mockReset().mockResolvedValue(undefined);
    mockPush.mockReset();
  });

  it('mostra o aviso de que não é contraceptivo nem dispositivo médico', async () => {
    await renderDone({ birthYear: '1995', mode: 'period' });

    expect(screen.getByText(copy.disclaimer)).toBeOnTheScreen();
  });

  it('salva o perfil validado, com padrões e sem campos de outros modos', async () => {
    await renderDone({ birthYear: '1995', mode: 'period', lastPeriodStart: null, dueDate: '2027-01-01' });

    await fireEvent.press(screen.getByRole('button', { name: copy.start }));

    await waitFor(() =>
      expect(mockSaveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ birthYear: 1995, mode: 'period', cycleLength: 28, periodLength: 5, dueDate: null }),
      ),
    );
  });

  it('com dado inválido não salva e oferece corrigir no passo certo', async () => {
    await renderDone({ birthYear: '1995', mode: 'pregnancy', dueDate: null });

    await fireEvent.press(screen.getByRole('button', { name: copy.start }));
    await fireEvent.press(await screen.findByRole('button', { name: copy.fixButton }));

    expect(mockSaveProfile).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/onboarding/data-prevista');
  });
});
