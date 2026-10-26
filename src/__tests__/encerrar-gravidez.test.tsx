import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import EndPregnancyScreen from '@/app/perfil/encerrar-gravidez';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const pregnant: Profile = {
  birthYear: 1995,
  mode: 'pregnancy',
  lastPeriodStart: null,
  periodLength: 5,
  cycleLength: 28,
  regularity: 'unknown',
  dueDate: '2027-03-01',
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
  babyBirth: null,
  twins: true,
  finalPeriod: null,
};

const mockSave = jest.fn();
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({ state: { status: 'ready', profile: pregnant }, saveProfile: mockSave }),
}));
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: jest.fn() }) }));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { dismissTo: (href: unknown) => mockReplace(href), back: jest.fn(), canGoBack: () => true } }));

const copy = ptBR.profile.endPregnancy;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(undefined);
  mockReplace.mockReset();
});

it('"terminou de outra forma": mostra o acolhimento e volta a Menstruação e ciclo', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <EndPregnancyScreen />
    </SafeAreaProvider>,
  );
  expect(screen.getByRole('button', { name: copy.save })).toBeDisabled();

  await fireEvent.press(screen.getByRole('radio', { name: copy.options.other }));
  expect(screen.getByText(copy.care)).toBeOnTheScreen();
  expect(screen.getByText(copy.support)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: copy.save }));

  await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ ...pregnant, mode: 'period', dueDate: null, twins: false }));
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
});

it('"o bebê nasceu" pede a data do parto antes de confirmar', async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <EndPregnancyScreen />
    </SafeAreaProvider>,
  );

  await fireEvent.press(screen.getByRole('radio', { name: copy.options.birth }));

  expect(screen.getByText(ptBR.onboarding.babyBirth.label)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: copy.save })).toBeDisabled();
});
