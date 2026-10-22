import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SNACKBAR_DURATION_MS, SnackbarProvider, useSnackbar } from '@/components/ui/snackbar';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 16 } };

function Trigger({ message }: { message: string }) {
  const { show } = useSnackbar();
  return (
    <Pressable accessibilityRole="button" onPress={() => show(message)}>
      <Text>mostrar</Text>
    </Pressable>
  );
}

const renderWithSnackbar = (message = 'Perfil salvo.') =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <SnackbarProvider>
        <Trigger message={message} />
      </SnackbarProvider>
    </SafeAreaProvider>,
  );

describe('Snackbar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('mostra a mensagem numa região anunciada ao leitor de tela', async () => {
    await renderWithSnackbar();

    await fireEvent.press(screen.getByRole('button', { name: 'mostrar' }));

    expect(screen.getByText('Perfil salvo.')).toBeOnTheScreen();
    expect(screen.getByTestId('snackbar')).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('some sozinho depois do tempo padrão', async () => {
    await renderWithSnackbar();
    await fireEvent.press(screen.getByRole('button', { name: 'mostrar' }));

    await act(() => jest.advanceTimersByTime(SNACKBAR_DURATION_MS + 1));

    expect(screen.queryByText('Perfil salvo.')).toBeNull();
  });

  it('uma nova mensagem substitui a anterior e reinicia o tempo', async () => {
    await renderWithSnackbar();
    await fireEvent.press(screen.getByRole('button', { name: 'mostrar' }));
    await act(() => jest.advanceTimersByTime(SNACKBAR_DURATION_MS - 100));

    await fireEvent.press(screen.getByRole('button', { name: 'mostrar' }));
    await act(() => jest.advanceTimersByTime(200));

    expect(screen.getByText('Perfil salvo.')).toBeOnTheScreen();
  });
});
