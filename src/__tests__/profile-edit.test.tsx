import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CycleDataScreen from '@/app/perfil/ciclo';
import ChangeModeScreen from '@/app/perfil/modo';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const profile: Profile = {
  birthYear: 1995, mode: 'period', lastPeriodStart: '2026-10-10', periodLength: 5, cycleLength: 28,
  regularity: 'regular', dueDate: null, tryingSince: null, birthControl: 'pill',
};

const mockSave = jest.fn();
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({ state: { status: 'ready', profile }, saveProfile: mockSave }),
}));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => mockCanGoBack, replace: (href: unknown) => mockReplace(href) },
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>);
const save = () => fireEvent.press(screen.getByRole('button', { name: ptBR.profile.save }));

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(undefined);
  mockShow.mockReset();
  mockBack.mockReset();
  mockReplace.mockReset();
  mockCanGoBack = true;
});

describe('Trocar modo', () => {
  it('marca o modo atual', async () => {
    await wrap(<ChangeModeScreen />);

    expect(screen.getByRole('radio', { name: /Menstruação e ciclo/ })).toBeChecked();
  });

  it('troca para perimenopausa, salva, confirma e volta', async () => {
    await wrap(<ChangeModeScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: /Perimenopausa/ }));
    await save();

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ ...profile, mode: 'perimenopause' }));
    expect(mockShow).toHaveBeenCalledWith(ptBR.profile.saved);
    expect(mockBack).toHaveBeenCalled();
  });

  it('gravidez pede a data prevista antes de salvar', async () => {
    await wrap(<ChangeModeScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: /Gravidez/ }));

    expect(screen.getByRole('button', { name: new RegExp(ptBR.onboarding.dueDate.label) })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ptBR.profile.save })).toBeDisabled();
  });

  it('tentar engravidar pede há quanto tempo', async () => {
    await wrap(<ChangeModeScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: /Tentar engravidar/ }));
    await fireEvent.press(screen.getByRole('radio', { name: '4 a 6 meses' }));
    await save();

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ ...profile, mode: 'conceive', tryingSince: '4_6m' }));
  });
});

describe('Dados do ciclo', () => {
  it('ajusta a duração do ciclo e salva', async () => {
    await wrap(<CycleDataScreen />);

    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`${ptBR.onboarding.lengths.increase}: ${ptBR.onboarding.lengths.cycle}`) }));
    await save();

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ ...profile, cycleLength: 29 }));
  });

  it('"Não lembro" limpa a última menstruação', async () => {
    await wrap(<CycleDataScreen />);

    await fireEvent.press(screen.getByRole('button', { name: ptBR.onboarding.lastPeriod.dontRemember }));
    await save();

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ ...profile, lastPeriodStart: null }));
  });

  it('avisa sem detalhes técnicos quando salvar falha', async () => {
    mockSave.mockRejectedValue(new Error('SQLITE_CONSTRAINT'));
    await wrap(<CycleDataScreen />);

    await save();

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(ptBR.profile.saveFailed));
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('Editor sem tela anterior (aberto por link)', () => {
  it('depois de salvar vai para Mais em vez de tentar voltar', async () => {
    mockCanGoBack = false;
    await wrap(<ChangeModeScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: /Perimenopausa/ }));
    await save();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/mais'));
    expect(mockBack).not.toHaveBeenCalled();
  });
});
