import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PrivacySection } from '@/components/privacy-section';
import { ptBR } from '@/i18n/pt-BR';

// Trava do app tem testes próprios (src/security); aqui só a tela.
jest.mock('@/security/security-settings', () => ({ SecuritySettings: () => null }));

const copy = ptBR.privacy;
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (href: unknown) => mockPush(href) } }));

describe('PrivacySection', () => {
  it('leva à política de privacidade', async () => {
    await render(<PrivacySection onErase={jest.fn()} confirm={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: new RegExp(ptBR.policy.link) }));
    expect(mockPush).toHaveBeenCalledWith('/privacidade');
  });

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

  it('ignora um segundo toque enquanto a confirmação está aberta', async () => {
    let answer: (value: boolean) => void = () => {};
    const confirm = jest.fn(() => new Promise<boolean>((resolve) => (answer = resolve)));
    const onErase = jest.fn().mockResolvedValue(undefined);
    await render(<PrivacySection onErase={onErase} confirm={confirm} />);
    const button = screen.getByRole('button', { name: copy.eraseButton });

    fireEvent.press(button);
    fireEvent.press(button);
    answer(true);

    await waitFor(() => expect(onErase).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
