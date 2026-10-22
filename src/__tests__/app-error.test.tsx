import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppError } from '@/components/ui/app-error';
import { ptBR } from '@/i18n/pt-BR';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

const renderError = (
  error: Error,
  retry = jest.fn(),
  reset: () => Promise<void> = jest.fn().mockResolvedValue(undefined),
  confirm: () => Promise<boolean> = async () => false,
) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AppError error={error} retry={retry} reset={reset} confirmReset={confirm} />
    </SafeAreaProvider>,
  );

describe('AppError', () => {
  it('mostra mensagem acolhedora em pt-BR sem detalhes técnicos', async () => {
    await renderError(new Error('SQLITE_NOTADB: file is not a database at /data/user/0/...'));

    expect(screen.getByRole('header', { name: ptBR.appError.title })).toBeOnTheScreen();
    expect(screen.queryByText(/SQLITE|data\/user/)).toBeNull();
  });

  it('o botão de tentar de novo chama retry', async () => {
    const retry = jest.fn();
    await renderError(new Error('x'), retry);

    fireEvent.press(screen.getByRole('button', { name: ptBR.appError.retry }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('não apaga nada se a pessoa não confirmar o recomeço', async () => {
    const reset = jest.fn().mockResolvedValue(undefined);
    const retry = jest.fn();
    await renderError(new Error('x'), retry, reset, async () => false);

    fireEvent.press(screen.getByRole('button', { name: ptBR.appError.reset }));

    await waitFor(() => expect(reset).not.toHaveBeenCalled());
    expect(retry).not.toHaveBeenCalled();
  });

  it('apaga e tenta abrir de novo depois da confirmação', async () => {
    const calls: string[] = [];
    const reset = jest.fn(async () => {
      calls.push('reset');
    });
    const retry = jest.fn(() => calls.push('retry'));
    await renderError(new Error('x'), retry, reset, async () => true);

    fireEvent.press(screen.getByRole('button', { name: ptBR.appError.reset }));

    await waitFor(() => expect(calls).toEqual(['reset', 'retry']));
  });
});
