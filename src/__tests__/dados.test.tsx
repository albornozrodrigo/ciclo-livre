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
const mockRead = jest.fn(async (text: string, password?: string): Promise<unknown> => {
  if (text.includes('ciclo-livre-backup') && !password) return { kind: 'needs_password' };
  if (password === 'errada') throw new Error('Senha incorreta ou arquivo danificado.');
  return { kind: 'ready', data: { ok: true } };
});
const mockApply = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('@/data-export/export-actions', () => ({
  EXPORT_KINDS: ['relatorio', 'planilha', 'completo', 'backup'],
  prepareExport: (...args: unknown[]) => mockPrepare(...args),
  shareFile: (...args: unknown[]) => mockShareFile(...args),
  saveToFolder: (...args: unknown[]) => mockSaveToFolder(...args),
  readRestore: (text: string, password?: string) => mockRead(text, password),
  applyRestore: (...args: unknown[]) => mockApply(...args),
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
  const pickAndType = async (password: string) => {
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    await fireEvent.changeText(await screen.findByLabelText(d.password), password);
  };

  it('backup: confere a senha ANTES de pedir confirmação; depois substitui e relê o perfil', async () => {
    await render(wrap(<RestaurarScreen />));
    await pickAndType('senha-forte');
    expect(mockDeleted).toContain('cache/picked');
    await fireEvent.press(screen.getByRole('button', { name: d.restoreButton }));
    expect(mockRead).toHaveBeenLastCalledWith(mockPicked, 'senha-forte');
    expect(Alert.alert).toHaveBeenCalledWith(d.confirmTitle, d.confirmBody, expect.anything(), expect.anything());
    expect(mockApply).toHaveBeenCalledWith({}, { ok: true });
    expect(mockReload).toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith(d.restored);
  });

  it('senha errada: erro no campo, sem confirmação e sem tocar nos dados', async () => {
    await render(wrap(<RestaurarScreen />));
    await pickAndType('errada');
    await fireEvent.press(screen.getByRole('button', { name: d.restoreButton }));
    expect(await screen.findByText(`Erro: ${d.wrongPassword}`)).toBeOnTheScreen();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('arquivo que não é do app: erro escrito na tela', async () => {
    mockPicked = 'qualquer coisa';
    mockRead.mockRejectedValueOnce(new Error('inválido'));
    await render(wrap(<RestaurarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    expect(await screen.findByText(`Erro: ${d.notAppFile}`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: d.restoreButton })).toBeNull();
  });

  it('escolher outro arquivo limpa a senha digitada', async () => {
    await render(wrap(<RestaurarScreen />));
    await pickAndType('senha-forte');
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    expect(await screen.findByLabelText(d.password)).toHaveProp('value', '');
  });

  it('exportação aberta restaura sem senha', async () => {
    mockPicked = '{"format":"ciclo-livre"}';
    await render(wrap(<RestaurarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    expect(screen.queryByLabelText(d.password)).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: d.restoreButton }));
    expect(mockApply).toHaveBeenCalled();
  });

  it('no onboarding (aparelho vazio): sem aviso nem confirmação de substituir, e não tenta voltar', async () => {
    mockPicked = '{"format":"ciclo-livre"}';
    await render(wrap(<OnboardingRestaurarScreen />));
    await fireEvent.press(screen.getByRole('button', { name: d.pick }));
    expect(screen.queryByText(d.confirmBody)).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: d.restoreButton }));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockApply).toHaveBeenCalled();
    expect(mockReload).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('Exportar — dois toques rápidos', () => {
  it('geram uma exportação só', async () => {
    mockTipo = 'completo';
    let release: () => void = () => undefined;
    mockPrepare.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve({ file: { uri: 'x' }, name: 'x', mimeType: 'x' }))),
    );
    await render(wrap(<ExportarScreen />));
    const share = screen.getByRole('button', { name: d.share });
    fireEvent.press(share);
    fireEvent.press(share);
    release();
    await screen.findByRole('button', { name: d.share });
    expect(mockPrepare).toHaveBeenCalledTimes(1);
  });
});
