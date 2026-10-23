import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ExplorarScreen from '@/app/(tabs)/explorar';
import IaScreen from '@/app/ia/index';
import ConsentimentoScreen from '@/app/ia/consentimento';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getAiSettings, getChatSettings, setAiConsent, setChatConsent } from '@/db/ai-settings-repo';
import { addChatPair, listChat } from '@/db/chat-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { ptBR } from '@/i18n/pt-BR';

const t = ptBR.ai;
const KEY = 'sk-ant-api03-' + 'x'.repeat(80);

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { push: (h: unknown) => mockPush(h), back: () => mockBack(), canGoBack: () => true, replace: (h: unknown) => mockReplace(h) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
let mockKey: string | null = null;
jest.mock('@/ai/key-store', () => ({
  getApiKey: async () => mockKey,
  saveApiKey: async (k: string) => {
    if (!k.trim().startsWith('sk-ant-')) throw new Error('Chave inválida.');
    mockKey = k.trim();
  },
  deleteApiKey: async () => {
    mockKey = null;
  },
  maskKey: (k: string) => `sk-ant-…${k.slice(-4)}`,
}));
const mockSummarize = jest.fn();
const mockTestKey = jest.fn(async (..._a: unknown[]) => ({ ok: true }));
jest.mock('@/ai/claude', () => ({
  AI_MODELS: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  summarize: (...a: unknown[]) => mockSummarize(...a),
  testKey: (...a: unknown[]) => mockTestKey(...a),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

beforeEach(async () => {
  jest.clearAllMocks();
  mockKey = null;
  mockParams = {};
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
});

describe('IA com sua chave › perguntas sobre seus dados', () => {
  const c = ptBR.chat;
  it('mostra o estado; revogar desliga o envio do chat sem mexer no dos artigos', async () => {
    await setAiConsent(mockDb, true);
    await setChatConsent(mockDb, true);
    await render(wrap(<IaScreen />));
    expect(await screen.findByText(c.consentOn)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: c.revoke }));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(c.revoked));
    expect((await getChatSettings(mockDb)).consent).toBe(false);
    expect((await getAiSettings(mockDb)).consent).toBe(true);
    expect(screen.getByText(c.consentOff)).toBeOnTheScreen();
  });

  it('sem consentimento: leva a revisar e concordar; sem conversa, não oferece apagar', async () => {
    await render(wrap(<IaScreen />));
    expect(await screen.findByText(c.consentOff)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: c.clear })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: c.review }));
    expect(mockPush).toHaveBeenCalledWith('/chat/consentimento');
  });

  it('apagar conversa confirma e limpa', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.style === 'destructive')?.onPress?.());
    await addChatPair(mockDb, 'p', 'r');
    await render(wrap(<IaScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: c.clear }));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(c.cleared));
    expect(await listChat(mockDb)).toEqual([]);
  });
});

describe('IA com sua chave', () => {
  it('campo da chave não oferece salvar no gerenciador de senhas (a chave fica só no armazenamento seguro)', async () => {
    await render(wrap(<IaScreen />));
    const field = await screen.findByLabelText(t.keyLabel);
    expect(field.props.autoComplete).toBe('off');
    expect(field.props.importantForAutofill).toBe('no');
  });

  it('formato errado: erro no campo, nada salvo', async () => {
    await render(wrap(<IaScreen />));
    await fireEvent.changeText(await screen.findByLabelText(t.keyLabel), 'abc');
    await fireEvent.press(screen.getByRole('button', { name: t.saveKey }));
    expect(screen.getByText(`Erro: ${t.keyInvalidFormat}`)).toBeOnTheScreen();
    expect(mockKey).toBeNull();
  });

  it('chave válida: testa sem custo, salva e mostra mascarada; apagar remove', async () => {
    await render(wrap(<IaScreen />));
    await fireEvent.changeText(await screen.findByLabelText(t.keyLabel), KEY);
    await fireEvent.press(screen.getByRole('button', { name: t.saveKey }));
    expect(mockTestKey).toHaveBeenCalledWith(KEY);
    expect(await screen.findByText(t.keySaved('sk-ant-…xxxx'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t.removeKey }));
    expect(mockKey).toBeNull();
  });

  it('vindo do chat (sem chave), salvar a chave segue para o consentimento das perguntas', async () => {
    mockParams = { next: 'chat' };
    await render(wrap(<IaScreen />));
    await fireEvent.changeText(await screen.findByLabelText(t.keyLabel), KEY);
    await fireEvent.press(screen.getByRole('button', { name: t.saveKey }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/chat/consentimento'));
  });

  it('chave recusada pela API: não salva e explica', async () => {
    mockTestKey.mockResolvedValueOnce({ ok: false, error: 'invalid_key' } as never);
    await render(wrap(<IaScreen />));
    await fireEvent.changeText(await screen.findByLabelText(t.keyLabel), KEY);
    await fireEvent.press(screen.getByRole('button', { name: t.saveKey }));
    expect(await screen.findByText(`Erro: ${t.keyRejected}`)).toBeOnTheScreen();
    expect(mockKey).toBeNull();
  });

  it('escolher modelo salva', async () => {
    await render(wrap(<IaScreen />));
    await fireEvent.press(await screen.findByRole('radio', { name: new RegExp(t.models['claude-haiku-5-5'].label) }));
    expect((await getAiSettings(mockDb)).model).toBe('claude-haiku-5-5');
  });
});

describe('Consentimento', () => {
  it('diz o que vai e o que nunca vai; concordar salva e volta', async () => {
    await render(wrap(<ConsentimentoScreen />));
    expect(await screen.findByText(t.consentSent[0])).toBeOnTheScreen();
    expect(screen.getByText(t.consentNever[0])).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t.accept }));
    expect((await getAiSettings(mockDb)).consent).toBe(true);
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('Resumo no Explorar', () => {
  const search = async (q: string) => {
    await render(wrap(<ExplorarScreen />));
    await fireEvent.changeText(screen.getByLabelText(ptBR.content.search), q);
  };

  it('sem chave: o botão leva às configurações', async () => {
    await search('colica');
    await fireEvent.press(await screen.findByRole('button', { name: t.summarize }));
    expect(mockPush).toHaveBeenCalledWith('/ia');
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('com chave e sem consentimento: abre o consentimento antes', async () => {
    mockKey = KEY;
    await search('colica');
    await fireEvent.press(await screen.findByRole('button', { name: t.summarize }));
    expect(mockPush).toHaveBeenCalledWith('/ia/consentimento');
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('com chave e consentimento: resume com a busca e os artigos, mostra texto, artigos usados e aviso', async () => {
    mockKey = KEY;
    await setAiConsent(mockDb, true);
    mockSummarize.mockResolvedValue({
      ok: true,
      text: 'Calor e movimento ajudam.',
      cited: [{ id: 'colica', title: 'Cólica menstrual: o que ajuda', summary: 's' }],
    });
    await search('colica');
    await fireEvent.press(await screen.findByRole('button', { name: t.summarize }));
    const args = mockSummarize.mock.calls[0][0];
    expect(args).toMatchObject({ apiKey: KEY, model: 'claude-opus-5-5', query: 'colica' });
    expect(args.articles[0].id).toBe('colica');
    expect(await screen.findByText('Calor e movimento ajudam.')).toBeOnTheScreen();
    expect(screen.getByText(t.summaryDisclaimer)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: t.basedOn })).toBeOnTheScreen();
  });

  it('erro vira mensagem em pt-BR', async () => {
    mockKey = KEY;
    await setAiConsent(mockDb, true);
    mockSummarize.mockResolvedValue({ ok: false, error: 'offline' });
    await search('colica');
    await fireEvent.press(await screen.findByRole('button', { name: t.summarize }));
    expect(await screen.findByText(t.errors.offline)).toBeOnTheScreen();
  });
});
