import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RegistroScreen from '@/app/registro/[data]';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getDay, saveCategoryPrefs, setSelection } from '@/db/log-repo';
import { createTag, getDayTags } from '@/db/tag-repo';
import { todayIso } from '@/domain/dates';
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
const mockSetParams = jest.fn();
const mockPush = jest.fn();
let mockDate = '2026-10-20';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ data: mockDate }),
  router: { setParams: (p: unknown) => mockSetParams(p), push: (h: unknown) => mockPush(h) },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const renderRegistroWaitingFor = async (text: string) => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <RegistroScreen />
    </SafeAreaProvider>,
  );
  await screen.findByText(text);
};
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
  mockSetParams.mockReset();
  mockPush.mockReset();
  mockDate = '2026-10-20';
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

describe('Registrar o dia › tags', () => {
  it('se criar a tag falhar, o texto digitado continua no campo', async () => {
    await renderRegistro();
    const realRun = mockDb.runAsync;
    mockDb.runAsync = async (sql: string, ...params) => {
      if (sql.startsWith('INSERT INTO tag')) throw new Error('disco cheio');
      return realRun(sql, ...params);
    };

    await fireEvent.changeText(screen.getByLabelText(ptBR.tags.newLabel), 'Plantão');
    await fireEvent.press(screen.getByRole('button', { name: ptBR.tags.add }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(ptBR.tags.saveFailed));
    expect(screen.getByLabelText(ptBR.tags.newLabel)).toHaveDisplayValue('Plantão');
  });

  it('marca uma tag existente no dia', async () => {
    const tag = await createTag(mockDb, 'Viagem');
    await renderRegistro();

    await fireEvent.press(await screen.findByRole('checkbox', { name: `${ptBR.tags.title}: Viagem` }));

    await waitFor(async () => expect(await getDayTags(mockDb, DAY)).toEqual([{ id: tag.id, name: 'Viagem' }]));
  });

  it('cria uma tag nova e já marca no dia', async () => {
    await renderRegistro();

    await fireEvent.changeText(screen.getByLabelText(ptBR.tags.newLabel), 'Academia');
    await fireEvent.press(screen.getByRole('button', { name: ptBR.tags.add }));

    await waitFor(async () => expect((await getDayTags(mockDb, DAY)).map((t) => t.name)).toEqual(['Academia']));
  });

  it('avisa quando a tag já existe', async () => {
    await createTag(mockDb, 'Café');
    await renderRegistro();

    await fireEvent.changeText(screen.getByLabelText(ptBR.tags.newLabel), 'cafe');
    await fireEvent.press(screen.getByRole('button', { name: ptBR.tags.add }));

    expect(await screen.findByText(ptBR.tags.errors.duplicate)).toBeOnTheScreen();
  });
});

describe('Registrar o dia › outros dias', () => {
  it('texto ainda não salvo vai para o dia em que foi digitado, não para o próximo', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <RegistroScreen />
      </SafeAreaProvider>,
    );
    await screen.findByText(t.pain.label);
    await fireEvent.changeText(screen.getByLabelText(ptBR.tracking.note.label), 'Era de ontem.');

    mockDate = '2026-10-19';
    await view.rerender(
      <SafeAreaProvider initialMetrics={metrics}>
        <RegistroScreen />
      </SafeAreaProvider>,
    );

    await waitFor(async () => expect((await getDay(mockDb, DAY)).note).toBe('Era de ontem.'));
    expect((await getDay(mockDb, '2026-10-19')).note).toBeNull();
  });

  it('vai para o dia anterior', async () => {
    await renderRegistro();

    await fireEvent.press(screen.getByRole('button', { name: ptBR.tracking.previousDay }));

    expect(mockSetParams).toHaveBeenCalledWith({ data: '2026-10-19' });
  });

  it('não deixa ir além de hoje', async () => {
    mockDate = todayIso();
    await renderRegistro();

    expect(screen.getByRole('button', { name: ptBR.tracking.nextDay })).toBeDisabled();
  });
});

describe('Registrar o dia › personalização', () => {
  it('esconde categorias ocultas e segue a ordem salva', async () => {
    await saveCategoryPrefs(mockDb, [
      { category: 'pain', position: 0, hidden: true },
      { category: 'sleep', position: 1, hidden: false },
    ]);

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <RegistroScreen />
      </SafeAreaProvider>,
    );
    await screen.findByText(t.sleep.label);

    expect(screen.queryByText(t.pain.label)).toBeNull();
  });

  it('leva à tela de personalizar', async () => {
    await renderRegistroWaitingFor(t.energy.label);

    await fireEvent.press(screen.getByRole('button', { name: ptBR.tracking.customize }));

    expect(mockPush).toHaveBeenCalledWith('/registro/personalizar');
  });
});
