import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ExportarScreen from '@/app/dados/exportar';
import RestaurarScreen from '@/app/dados/restaurar';
import OnboardingRestaurarScreen from '@/app/onboarding/restaurar';
import { ptBR } from '@/i18n/pt-BR';

const d = ptBR.data;

let mockTipo = 'backup';
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, push: jest.fn() },
  useLocalSearchParams: () => ({ tipo: mockTipo }),
}));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
const mockReload = jest.fn(async () => undefined);
jest.mock('@/profile/profile-context', () => ({
  useProfile: () => ({ state: { status: 'ready', profile: { mode: 'period' } }, reloadProfile: () => mockReload() }),
}));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
const mockPrepare = jest.fn(async (..._args: unknown[]) => ({ file: { uri: 'cache/x' }, name: 'x', mimeType: 'x' }));
const mockShareFile = jest.fn(async (..._args: unknown[]) => undefined);
const mockSaveToFolder = jest.fn(async (..._args: unknown[]) => 'saved');
const mockRestore = jest.fn(async (..._args: unknown[]) => 'restored');
jest.mock('@/data-export/export-actions', () => ({
  prepareExport: (...args: unknown[]) => mockPrepare(...args),
  shareFile: (...args: unknown[]) => mockShareFile(...args),
  saveToFolder: (...args: unknown[]) => mockSaveToFolder(...args),
  restoreFromText: (...args: unknown[]) => mockRestore(...args),
}));
let mockPicked = '{"format":"ciclo-livre-backup"}';
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: async () => ({ canceled: false, assets: [{ uri: 'cache/picked', name: 'backup.ciclolivre', size: 100 }] }),
}));
const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return true;
    }
    async text() {
      return mockPicked;
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
  mockDeleted.length = 0;
  mockTipo = 'backup';
  mockPicked = '{"format":"ciclo-livre-backup"}';
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.style === 'destructive')?.onPress?.());
});

describe('Exportar', () => {
  it('backup: só libera com senha de 8+ iguais; avisa se diferentes', async () => {
    await render(wrap(<ExportarScreen />));
    const share = screen.getByRole('button', { name: d.share });
    expect(share).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(d.password), 'senha-forte');
    await fireEvent.changeText(screen.getByLabelText(d.passwordConfirm), 'outra-senha');
    expect(screen.getByText(`Erro: ${d.passwordMismatch}`)).toBeOnTheScreen();
    expect(share).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(d.passwordConfirm), 'senha-forte');
    await fireEvent.press(screen.getByRole('button', { name: d.share }));
    expect(mockPrepare).toHaveBeenCalledWith('backup', expect.objectContaining({ password: 'senha-forte' }));
    expect(mockShareFile).toHaveBeenCalled();
  });

  it('relatório: notas fora por padrão; marcar inclui', async () => {
    mockTipo = 'relatorio';
    await render(wrap(<ExportarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.saveFolder }));
    expect(mockPrepare).toHaveBeenLastCalledWith('relatorio', expect.objectContaining({ includeNotes: false }));
    expect(mockShow).toHaveBeenCalledWith(d.saved);
    await fireEvent(screen.getByRole('switch', { name: d.includeNotes }), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: d.share }));
    expect(mockPrepare).toHaveBeenLastCalledWith('relatorio', expect.objectContaining({ includeNotes: true }));
  });

  it('planilha avisa que não é criptografada', async () => {
    mockTipo = 'planilha';
    await render(wrap(<ExportarScreen />));
    expect(screen.getAllByText(d.notEncrypted).length).toBeGreaterThan(0);
  });

  it('falha ao gerar mostra mensagem, sem detalhe técnico', async () => {
    mockTipo = 'completo';
    mockPrepare.mockRejectedValueOnce(new Error('SQLITE_ERROR: detalhe interno'));
    await render(wrap(<ExportarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.share }));
    expect(mockShow).toHaveBeenCalledWith(d.failed);
  });
});

describe('Restaurar', () => {
  it('backup: escolhe o arquivo, apaga a cópia, pede senha, confirma e restaura', async () => {
    await render(wrap(<RestaurarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    expect(mockDeleted).toContain('cache/picked');
    await fireEvent.changeText(await screen.findByLabelText(d.password), 'senha-forte');
    await fireEvent.press(screen.getByRole('button', { name: d.restoreButton }));
    expect(Alert.alert).toHaveBeenCalledWith(d.confirmTitle, d.confirmBody, expect.anything(), expect.anything());
    expect(mockRestore).toHaveBeenCalledWith({}, mockPicked, 'senha-forte');
    expect(mockReload).toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith(d.restored);
  });

  it('exportação aberta restaura sem senha', async () => {
    mockPicked = '{"format":"ciclo-livre"}';
    await render(wrap(<RestaurarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    expect(screen.queryByLabelText(d.password)).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: d.restoreButton }));
    expect(mockRestore).toHaveBeenCalledWith({}, mockPicked, undefined);
  });

  it('falha (senha errada) mostra mensagem genérica', async () => {
    mockRestore.mockRejectedValueOnce(new Error('Senha incorreta ou arquivo danificado.'));
    await render(wrap(<RestaurarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    await fireEvent.changeText(await screen.findByLabelText(d.password), 'x');
    await fireEvent.press(screen.getByRole('button', { name: d.restoreButton }));
    expect(mockShow).toHaveBeenCalledWith(d.restoreFailed);
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('no onboarding (app reinstalado), restaurar não tenta voltar: o app troca para as abas sozinho', async () => {
    mockPicked = '{"format":"ciclo-livre"}';
    await render(wrap(<OnboardingRestaurarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    await fireEvent.press(await screen.findByRole('button', { name: d.restoreButton }));
    expect(mockReload).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
