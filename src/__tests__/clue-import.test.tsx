import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ClueScreen from '@/app/dados/clue';
import OnboardingClueScreen from '@/app/onboarding/clue';
import { ptBR } from '@/i18n/pt-BR';

const c = ptBR.data.clue;

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), canGoBack: () => true, replace: (r: string) => mockReplace(r) } }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
jest.mock('@/profile/profile-context', () => ({ useProfile: () => ({ state: { status: 'ready', profile: { mode: 'period' } } }) }));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
const mockSync = jest.fn(async (..._a: unknown[]) => undefined);
jest.mock('@/reminders/sync', () => ({ syncReminders: (...a: unknown[]) => mockSync(...a) }));

const DATA = { days: 40 };
jest.mock('@/domain/clue/read', () => {
  class ClueReadError extends Error {
    reason: string;
    constructor(why: string) {
      super(why);
      this.reason = why;
    }
  }
  return {
    ClueReadError,
    readClueBytes: async (_b: Uint8Array, password?: string) => {
      if (!password) return { kind: 'needs_password' };
      if (password === 'errada') throw new ClueReadError('wrong_password');
      return { kind: 'ready', data: { days: 40 }, invalid: 2 };
    },
  };
});
let mockPreview: Record<string, unknown> = {};
const mockApply = jest.fn(async (..._a: unknown[]) => undefined);
jest.mock('@/db/clue-import-repo', () => ({
  previewClueImport: async () => mockPreview,
  applyClueImport: (...a: unknown[]) => mockApply(...a),
}));
let mockPickedSize = 100;
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: async () => ({
    canceled: false,
    assets: [{ uri: 'cache/clue.zip', name: 'ClueDataDownload.zip', size: mockPickedSize }],
  }),
}));
const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(path: string) {
      this.uri = path;
    }
    get exists() {
      return true;
    }
    async bytes() {
      return new Uint8Array([0x50, 0x4b]);
    }
    delete() {
      mockDeleted.push(this.uri);
    }
  },
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  mockPickedSize = 100;
  mockDeleted.length = 0;
  mockPreview = {
    range: { from: '2023-01-05', to: '2024-05-10' },
    days: 40,
    existingDays: 3,
    kept: 2,
    byCategory: [
      { category: 'period', count: 20 },
      { category: 'notes', count: 4 },
    ],
    unknown: [{ key: 'pregnancy_superpowers', count: 1 }],
    truncatedNotes: 1,
  };
});

async function openWithPassword(password: string) {
  fireEvent.press(screen.getByRole('button', { name: c.pick }));
  fireEvent.changeText(await screen.findByLabelText(c.password), password);
  await waitFor(() => expect(screen.getByRole('button', { name: c.check })).toBeEnabled());
  fireEvent.press(screen.getByRole('button', { name: c.check }));
}

describe('Importar do Clue', () => {
  it('pede a senha, avisa a errada, mostra a prévia e importa juntando; apaga a cópia do arquivo', async () => {
    await render(wrap(<ClueScreen />));
    expect(screen.getByText(c.steps[0])).toBeTruthy();
    await openWithPassword('errada');
    expect(await screen.findByText(c.errors.wrong_password, { exact: false })).toBeTruthy();
    expect(mockDeleted).toEqual(['cache/clue.zip']);

    fireEvent.changeText(screen.getByLabelText(c.password), 'certa');
    await waitFor(() => expect(screen.getByRole('button', { name: c.check })).toBeEnabled());
    fireEvent.press(screen.getByRole('button', { name: c.check }));
    expect(await screen.findByText(c.range('05/01/2023', '10/05/2024'))).toBeTruthy();
    expect(screen.getByText(c.existing(3))).toBeTruthy();
    expect(screen.getByText(c.kept(2))).toBeTruthy();
    expect(screen.getByText(c.truncated(1))).toBeTruthy();
    expect(screen.getByText(c.invalid(2))).toBeTruthy();
    expect(screen.getByText('Menstruação')).toBeTruthy();
    expect(screen.getByText(c.notesLabel)).toBeTruthy();
    expect(screen.getByText('pregnancy superpowers (1)')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: c.importButton }));
    await screen.findByRole('button', { name: c.pick });
    expect(mockApply).toHaveBeenCalledWith({}, DATA);
    expect(mockSync).toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith(c.done);
    expect(mockBack).toHaveBeenCalled();
  });

  it('arquivo grande demais: avisa e apaga a cópia que o seletor deixou no cache', async () => {
    mockPickedSize = 60 * 1024 * 1024;
    await render(wrap(<ClueScreen />));
    fireEvent.press(screen.getByRole('button', { name: c.pick }));
    expect(await screen.findByText(c.errors.too_large, { exact: false })).toBeTruthy();
    expect(mockDeleted).toEqual(['cache/clue.zip']);
  });

  it('sem nada novo: avisa e não oferece importar', async () => {
    mockPreview = { ...mockPreview, byCategory: [], kept: 5 };
    await render(wrap(<ClueScreen />));
    await openWithPassword('certa');
    expect(await screen.findByText(c.nothingNew)).toBeTruthy();
    expect(screen.queryByRole('button', { name: c.importButton })).toBeNull();
  });

  it('falha ao gravar: avisa que nada mudou e fica na tela', async () => {
    mockApply.mockRejectedValueOnce(new Error('db'));
    await render(wrap(<ClueScreen />));
    await openWithPassword('certa');
    fireEvent.press(await screen.findByRole('button', { name: c.importButton }));
    await screen.findByRole('button', { name: c.importButton });
    expect(mockShow).toHaveBeenCalledWith(c.failed);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('na primeira abertura, depois de importar segue para o perfil', async () => {
    await render(wrap(<OnboardingClueScreen />));
    await openWithPassword('certa');
    fireEvent.press(await screen.findByRole('button', { name: c.importButton }));
    await screen.findByRole('button', { name: c.pick });
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/ano');
  });
});
