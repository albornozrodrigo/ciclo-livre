import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnaliseScreen from '@/app/(tabs)/analise';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { setMeasure, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { addDays, todayIso } from '@/domain/dates';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';
import { applyHealthImport } from '@/db/health-import-repo';

const a = ptBR.analysis;

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
let mockProfile: Profile;
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({ state: { status: 'ready', profile: mockProfile } }),
}));
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};
const renderAnalise = async () => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AnaliseScreen />
    </SafeAreaProvider>,
  );
};

/** Inícios a cada 28 dias: −84, −56, −28, 0 (hoje é dia 1 do ciclo atual); menstruações de 3 dias. */
async function seed() {
  const today = todayIso();
  for (const start of [-84, -56, -28, 0]) {
    for (const d of [0, 1, 2]) if (start + d <= 0) await setSelection(mockDb, addDays(today, start + d), 'period', ['medium']);
  }
  await setSelection(mockDb, addDays(today, -84), 'pain', ['cramps']);
  await setSelection(mockDb, addDays(today, -56), 'pain', ['cramps']);
  await setMeasure(mockDb, addDays(today, -3), 'weight', 61.2);
}

beforeEach(async () => {
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  mockProfile = {
    birthYear: 1995,
    mode: 'period',
    lastPeriodStart: null,
    periodLength: 5,
    cycleLength: 28,
    regularity: 'unknown',
    dueDate: null,
    tryingSince: null,
    birthControl: null,
    lutealLength: null,
    includeAtypical: false,
  };
});

describe('Análise', () => {
  it('ciclo fora do padrão: selo no histórico, fora da média, e o aviso de como incluir', async () => {
    const today = todayIso();
    // Ciclos de 28, 28, 28 e 45 dias; o atual começa hoje.
    for (const start of [-129, -101, -73, -45, 0]) {
      for (const d of [0, 1, 2]) if (start + d <= 0) await setSelection(mockDb, addDays(today, start + d), 'period', ['medium']);
    }
    await renderAnalise();

    expect(await screen.findByLabelText(`${a.stats.cycle}: ${a.stats.cycleValue(28)}`)).toBeOnTheScreen();
    expect(screen.getByText(a.excluded(1))).toBeOnTheScreen();
    expect(screen.getByLabelText(new RegExp(`45 dias.*${a.history.atypical}.*${a.history.diff(17)}`))).toBeOnTheScreen();
    // O gráfico usa os mesmos ciclos do resumo: barras de 28 dias, nenhuma de 45.
    expect(screen.getAllByLabelText(/^Ciclo de .*: 28 dias$/, { includeHiddenElements: true })).toHaveLength(3);
    expect(screen.queryByLabelText(/^Ciclo de .*: 45 dias$/, { includeHiddenElements: true })).toBeNull();
  });

  it('mostra os números dos ciclos', async () => {
    await seed();
    await renderAnalise();

    expect(await screen.findByLabelText(`${a.stats.cycle}: ${a.stats.cycleValue(28)}`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`${a.stats.range}: ${a.stats.rangeValue(28, 28)}`)).toBeOnTheScreen();
  });

  it('diz em quantos ciclos completos os números se baseiam', async () => {
    await seed();
    await renderAnalise();

    expect(await screen.findByText(a.basis(3))).toBeOnTheScreen();
  });

  it('com ciclos completos mas sem sintomas, pede registros de sintoma (não mais ciclos)', async () => {
    const today = todayIso();
    for (const start of [-84, -56, -28, 0])
      for (const d of [0, 1, 2]) if (start + d <= 0) await setSelection(mockDb, addDays(today, start + d), 'period', ['medium']);
    await renderAnalise();

    expect(await screen.findByText(a.symptoms.noLogs)).toBeOnTheScreen();
    expect(screen.queryByText(a.symptoms.empty)).toBeNull();
  });

  it('o gráfico tem descrição acessível e tocar numa barra mostra o valor', async () => {
    await seed();
    await renderAnalise();

    const chart = await screen.findByLabelText(new RegExp(a.chartSummary(3, 28, 28, 28)));
    expect(chart).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(a.barPrefix) })[0]);
    expect(screen.getByText(/: 28 dias$/)).toBeOnTheScreen();
  });

  it('lista o histórico com o ciclo atual em andamento', async () => {
    await seed();
    await renderAnalise();

    expect(await screen.findByText(a.history.ongoing)).toBeOnTheScreen();
  });

  it('sintomas frequentes com a fase escrita', async () => {
    await seed();
    await renderAnalise();

    expect(await screen.findByText(a.symptoms.row('Cólica', 2, 3))).toBeOnTheScreen();
    expect(screen.getByText(ptBR.cycle.phases.menstruation)).toBeOnTheScreen();
  });

  it('medições dos últimos 90 dias', async () => {
    await seed();
    await renderAnalise();

    expect(await screen.findByText(a.measures.last('61,2', 'kg'))).toBeOnTheScreen();
  });

  it('temperaturas do ciclo atual vindas do Health Connect: avisa que entram na estimativa da ovulação', async () => {
    const today = todayIso();
    for (const start of [-60, -32, -4])
      for (const d of [0, 1, 2]) await setSelection(mockDb, addDays(today, start + d), 'period', ['medium']);
    await applyHealthImport(mockDb, {
      measures: [-3, -2, -1].map((d) => ({ date: addDays(today, d), category: 'temperature', value: 36.4 })),
      selections: [],
      dropped: 0,
    });
    await setMeasure(mockDb, today, 'temperature', 36.5);
    await renderAnalise();
    expect(await screen.findByText(a.bbt.imported)).toBeOnTheScreen();
  });

  it('temperaturas só registradas à mão: sem aviso de Health Connect', async () => {
    const today = todayIso();
    for (const start of [-60, -32, -4])
      for (const d of [0, 1, 2]) await setSelection(mockDb, addDays(today, start + d), 'period', ['medium']);
    for (const d of [-3, -2, -1]) await setMeasure(mockDb, addDays(today, d), 'temperature', 36.4);
    await renderAnalise();
    await screen.findByText(a.bbt.title);
    expect(screen.queryByText(a.bbt.imported)).toBeNull();
  });

  it('sem dados suficientes explica o que registrar', async () => {
    await renderAnalise();

    expect(await screen.findByText(a.emptyCycles)).toBeOnTheScreen();
  });

  it('na gravidez não mostra seções de ciclo', async () => {
    await seed();
    mockProfile = {
      ...mockProfile,
      mode: 'pregnancy',
      dueDate: addDays(todayIso(), 100),
    };
    await renderAnalise();

    expect(await screen.findByText(a.measures.title)).toBeOnTheScreen();
    expect(screen.queryByText(a.cycles.title)).toBeNull();
  });
});
