import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, ToastAndroid } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MaisScreen from '@/app/(tabs)/mais';
import { ptBR } from '@/i18n/pt-BR';

const mockErase = jest.fn();
jest.mock('@/db/database-root', () => ({ useEraseAllData: () => mockErase }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

type AlertButton = { text?: string; onPress?: () => void };

describe('Mais › apagar todos os dados', () => {
  beforeEach(() => {
    mockErase.mockReset().mockResolvedValue(undefined);
    jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    // Simula a pessoa tocando em "Apagar tudo" no diálogo nativo.
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      (buttons as AlertButton[]).find((b) => b.text === ptBR.privacy.confirmErase)?.onPress?.();
    });
  });

  it('avisa por toast que os dados foram apagados, já que a tela é remontada', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <MaisScreen />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: ptBR.privacy.eraseButton }));

    await waitFor(() => expect(ToastAndroid.show).toHaveBeenCalledWith(ptBR.privacy.erased, ToastAndroid.LONG));
    expect(mockErase).toHaveBeenCalledTimes(1);
  });

  it('avisa por toast, sem detalhes técnicos, quando apagar falha', async () => {
    mockErase.mockRejectedValue(new Error('SQLITE_BUSY /data/user'));
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <MaisScreen />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: ptBR.privacy.eraseButton }));

    await waitFor(() =>
      expect(ToastAndroid.show).toHaveBeenCalledWith(ptBR.privacy.eraseFailed, ToastAndroid.LONG),
    );
  });
});
