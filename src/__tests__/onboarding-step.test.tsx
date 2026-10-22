import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingStep } from '@/components/onboarding-step';
import { OnboardingDraftProvider } from '@/onboarding/draft';

const mockStatusBar = jest.fn();
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style: string }) => {
    mockStatusBar(props.style);
    return null;
  },
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };

it('passo sem lobo atrás da barra de status deixa os ícones seguirem o tema', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <OnboardingDraftProvider>
        <OnboardingStep step="mode" title="Pergunta" onPrimary={jest.fn()} />
      </OnboardingDraftProvider>
    </SafeAreaProvider>,
  );

  expect(mockStatusBar).toHaveBeenCalledWith('auto');
});
