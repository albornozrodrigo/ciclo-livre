import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PrivacySection } from '@/components/privacy-section';
import { ptBR } from '@/i18n/pt-BR';

const copy = ptBR.privacy;

describe('PrivacySection', () => {
  it('mostra o aviso de que o app não é contraceptivo nem dispositivo médico', async () => {
    await render(<PrivacySection onErase={jest.fn()} confirm={jest.fn()} />);

    expect(screen.getByText(copy.medicalDisclaimer)).toBeOnTheScreen();
  });

  it('explica que os dados ficam no aparelho, criptografados', async () => {
    await render(<PrivacySection onErase={jest.fn()} confirm={jest.fn()} />);

    expect(screen.getByText(copy.localData)).toBeOnTheScreen();
  });

  it('não apaga nada se a pessoa não confirmar', async () => {
    const onErase = jest.fn();
    await render(<PrivacySection onErase={onErase} confirm={async () => false} />);

    fireEvent.press(screen.getByRole('button', { name: copy.eraseButton }));

    await waitFor(() => expect(onErase).not.toHaveBeenCalled());
  });

  it('apaga depois da confirmação explícita', async () => {
    const onErase = jest.fn().mockResolvedValue(undefined);
    await render(<PrivacySection onErase={onErase} confirm={async () => true} />);

    fireEvent.press(screen.getByRole('button', { name: copy.eraseButton }));

    await waitFor(() => expect(onErase).toHaveBeenCalledTimes(1));
  });

  it('avisa sem detalhes técnicos quando apagar falha', async () => {
    const onErase = jest.fn().mockRejectedValue(new Error('SQLITE_BUSY /data/user'));
    await render(<PrivacySection onErase={onErase} confirm={async () => true} />);

    fireEvent.press(screen.getByRole('button', { name: copy.eraseButton }));

    expect(await screen.findByText(copy.eraseFailed)).toBeOnTheScreen();
    expect(screen.queryByText(/SQLITE/)).toBeNull();
  });
});
