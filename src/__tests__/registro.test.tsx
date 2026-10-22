import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RegistroScreen from '@/app/registro/[data]';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getDay, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const DAY = '2026-10-20';
const t = ptBR.tracking.categories;

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));

const profile: Profile = {
  birthYear: 1995, mode: 'period', lastPeriodStart: null, periodLength: 5, cycleLength: 28,
  regularity: 'unknown', dueDate: null, tryingSince: null, birthControl: 'pill',
};
jest.mock('@/profile/profile-context', () => ({ useProfile: () => ({ state: { status: 'ready', profile } }) }));

const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ data: '2026-10-20' }) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const renderRegistro = async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <RegistroScreen />
    </SafeAreaProvider>,
  );
  await screen.findByRole('checkbox', { name: `${t.pain.label}: ${t.pain.options.cramps}` });
};

beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockShow.mockReset();
});

describe('Registrar o dia', () => {
  it('mostra as categorias do modo e do método, e esconde as outras', async () => {
    await renderRegistro();

    expect(screen.getByText(t.pain.label)).toBeOnTheScreen();
    expect(screen.getByText(t.bc_pill.label)).toBeOnTheScreen();
    expect(screen.queryByText(t.bc_ring.label)).toBeNull();
    expect(screen.queryByText(t.pregnancy_movements.label)).toBeNull();
  });

  it('tocar num chip de várias opções salva na hora', async () => {
    await renderRegistro();

    await fireEvent.press(screen.getByRole('checkbox', { name: `${t.pain.label}: ${t.pain.options.cramps}` }));

    expect(screen.getByRole('checkbox', { name: `${t.pain.label}: ${t.pain.options.cramps}` })).toBeChecked();
    await waitFor(async () => expect((await getDay(mockDb, DAY)).selections.pain).toEqual(['cramps']));
  });

  it('categoria de escolha única troca e desmarca', async () => {
    await renderRegistro();

    await fireEvent.press(screen.getByRole('radio', { name: `${t.period.label}: ${t.period.options.light}` }));
    await fireEvent.press(screen.getByRole('radio', { name: `${t.period.label}: ${t.period.options.heavy}` }));
    await waitFor(async () => expect((await getDay(mockDb, DAY)).selections.period).toEqual(['heavy']));

    await fireEvent.press(screen.getByRole('radio', { name: `${t.period.label}: ${t.period.options.heavy}` }));
    await waitFor(async () => expect((await getDay(mockDb, DAY)).selections.period).toBeUndefined());
  });

  it('carrega o que já foi registrado no dia', async () => {
    await setSelection(mockDb, DAY, 'energy', ['low']);

    await renderRegistro();

    expect(screen.getByRole('radio', { name: `${t.energy.label}: ${t.energy.options.low}` })).toBeChecked();
  });

  it('medição válida salva ao sair do campo; inválida mostra erro e não salva', async () => {
    await renderRegistro();
    const field = screen.getByLabelText(new RegExp(t.temperature.label));

    await fireEvent.changeText(field, '50');
    await fireEvent(field, 'blur');
    expect(await screen.findByText(new RegExp(ptBR.tracking.measureErrors.out_of_range(34, 42, '°C')))).toBeOnTheScreen();
    expect((await getDay(mockDb, DAY)).measures).toEqual({});

    await fireEvent.changeText(field, '36,55');
    await fireEvent(field, 'blur');
    await waitFor(async () => expect((await getDay(mockDb, DAY)).measures).toEqual({ temperature: 36.55 }));
  });

  it('nota salva ao sair do campo', async () => {
    await renderRegistro();
    const note = screen.getByLabelText(ptBR.tracking.note.label);

    await fireEvent.changeText(note, 'Cólica de manhã.');
    await fireEvent(note, 'blur');

    await waitFor(async () => expect((await getDay(mockDb, DAY)).note).toBe('Cólica de manhã.'));
  });

  it('medição válida é salva enquanto digita, sem precisar sair do campo (teclado fechado não tira o foco no Android)', async () => {
    await renderRegistro();
    const field = screen.getByLabelText(new RegExp(t.temperature.label));

    await fireEvent.changeText(field, '36,6');

    await waitFor(async () => expect((await getDay(mockDb, DAY)).measures).toEqual({ temperature: 36.6 }), { timeout: 3000 });
  });

  it('nota é salva enquanto digita', async () => {
    await renderRegistro();

    await fireEvent.changeText(screen.getByLabelText(ptBR.tracking.note.label), 'Dia tranquilo.');

    await waitFor(async () => expect((await getDay(mockDb, DAY)).note).toBe('Dia tranquilo.'), { timeout: 3000 });
  });

  it('o que estava pendente é salvo ao sair da tela', async () => {
    await renderRegistro();
    await fireEvent.changeText(screen.getByLabelText(ptBR.tracking.note.label), 'Saí rápido.');

    await screen.unmount();

    await waitFor(async () => expect((await getDay(mockDb, DAY)).note).toBe('Saí rápido.'));
  });

  it('a vírgula digitada não some quando o valor parcial é salvo', async () => {
    await renderRegistro();
    const field = screen.getByLabelText(new RegExp(t.temperature.label));

    await fireEvent.changeText(field, '36,');
    await waitFor(async () => expect((await getDay(mockDb, DAY)).measures).toEqual({ temperature: 36 }), { timeout: 3000 });

    expect(field).toHaveDisplayValue('36,');
  });

  it('valor inválido mostra o erro sozinho depois de uma pausa, mesmo sem sair do campo', async () => {
    await renderRegistro();

    await fireEvent.changeText(screen.getByLabelText(new RegExp(t.temperature.label)), '50');

    expect(
      await screen.findByText(new RegExp(ptBR.tracking.measureErrors.out_of_range(34, 42, '°C')), undefined, { timeout: 3000 }),
    ).toBeOnTheScreen();
  });
});
