import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MaisScreen from '@/app/(tabs)/mais';
import type { Profile } from '@/domain/profile';
import { PIX_KEY } from '@/constants/support';
import { ptBR } from '@/i18n/pt-BR';
import { markAppLocked } from '@/security/lock-policy';

// Trava do app tem testes próprios (src/security); aqui só a tela.
jest.mock('@/security/security-settings', () => ({ SecuritySettings: () => null }));

const mockErase = jest.fn();
jest.mock('@/db/database-root', () => ({ useEraseAllData: () => mockErase }));

const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({
  useSnackbar: () => ({ show: mockShow }),
}));

const profile: Profile = {
  birthYear: 1995,
  mode: 'conceive',
  lastPeriodStart: '2026-10-10',
  periodLength: 5,
  cycleLength: 28,
  regularity: 'regular',
  dueDate: null,
  tryingSince: '1_3m',
  birthControl: null,
  lutealLength: null,
};
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({
    state: { status: 'ready', profile },
    saveProfile: jest.fn(),
  }),
}));

const mockCopy = jest.fn(async (..._a: unknown[]) => true);
jest.mock('expo-clipboard', () => ({ setStringAsync: (...a: unknown[]) => mockCopy(...a) }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { push: (href: unknown) => mockPush(href) },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};
type AlertButton = { text?: string; onPress?: () => void };

const renderMais = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MaisScreen />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  mockErase.mockReset().mockResolvedValue(undefined);
  mockShow.mockReset();
  mockPush.mockReset();
  // Simula a pessoa tocando em "Apagar tudo" no diálogo nativo.
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    (buttons as AlertButton[]).find((b) => b.text === ptBR.privacy.confirmErase)?.onPress?.();
  });
});

describe('Mais › seu perfil', () => {
  it('mostra o modo atual', async () => {
    await renderMais();

    expect(screen.getByText(new RegExp(ptBR.onboarding.mode.options.conceive.label))).toBeOnTheScreen();
  });

  it('leva à troca de modo e aos dados do ciclo', async () => {
    await renderMais();

    await fireEvent.press(screen.getByRole('button', { name: new RegExp(ptBR.profile.changeMode) }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(ptBR.profile.cycleData) }));

    expect(mockPush.mock.calls).toEqual([['/perfil/modo'], ['/perfil/ciclo']]);
  });
});

describe('Mais › apagar todos os dados', () => {
  it('com o app bloqueado, o diálogo que ficou aberto por cima não apaga nada', async () => {
    await renderMais();
    markAppLocked(true);
    await fireEvent.press(screen.getByRole('button', { name: ptBR.privacy.eraseButton }));
    markAppLocked(false);
    expect(mockErase).not.toHaveBeenCalled();
  });

  it('confirma por snackbar que os dados foram apagados', async () => {
    await renderMais();

    await fireEvent.press(screen.getByRole('button', { name: ptBR.privacy.eraseButton }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(ptBR.privacy.erased));
    expect(mockErase).toHaveBeenCalledTimes(1);
  });

  it('avisa por snackbar, sem detalhes técnicos, quando apagar falha', async () => {
    mockErase.mockRejectedValue(new Error('SQLITE_BUSY /data/user'));
    await renderMais();

    await fireEvent.press(screen.getByRole('button', { name: ptBR.privacy.eraseButton }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(ptBR.privacy.eraseFailed));
  });
});

describe('Mais › Aparência', () => {
  it('leva à tela de Aparência', async () => {
    await renderMais();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(ptBR.appearance.maisHint) }));
    expect(mockPush).toHaveBeenCalledWith('/aparencia');
  });
});

describe('Mais › Health Connect', () => {
  it('fora do Android não aparece', async () => {
    await renderMais();
    expect(screen.queryByText(ptBR.health.section)).toBeNull();
  });

  it('no Android leva à tela do Health Connect', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await renderMais();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(ptBR.health.maisHint) }));
    expect(mockPush).toHaveBeenCalledWith('/health');
  });
});

describe('Me pague um café', () => {
  const c = ptBR.coffee;

  it('é o último item da tela e diz que o app é grátis, sem anúncios e que os dados são só da pessoa', async () => {
    await renderMais();
    const headers = screen.getAllByRole('header').map((h) => h.props.children);
    expect(headers[headers.length - 1]).toBe(c.title);
    expect(screen.getByText(c.body)).toBeOnTheScreen();
    expect(c.body).toMatch(/grátis/);
    expect(c.body).toMatch(/sem anúncios/);
    expect(c.body).toMatch(/para sempre/);
    expect(c.body).toMatch(/seus e de mais ninguém/);
    expect(screen.getByText(PIX_KEY)).toBeOnTheScreen();
  });

  it('copia a chave Pix e avisa', async () => {
    await renderMais();
    await fireEvent.press(screen.getByRole('button', { name: c.copy }));
    expect(mockCopy).toHaveBeenCalledWith(PIX_KEY);
    expect(mockShow).toHaveBeenCalledWith(c.copied);
  });
});
