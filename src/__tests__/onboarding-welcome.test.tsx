import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from '@/app/onboarding';
import { ptBR } from '@/i18n/pt-BR';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (href: unknown) => mockPush(href) } }));
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };

describe('Boas-vindas', () => {
  it('a política de privacidade está à mão antes do cadastro', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <WelcomeScreen />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: ptBR.policy.link }));
    expect(mockPush).toHaveBeenCalledWith('/privacidade');
  });
});
