import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnaliseScreen from '@/app/(tabs)/analise';
import ChatScreen from '@/app/chat';
import ChatConsentScreen from '@/app/chat/consentimento';
import ChatContextScreen from '@/app/chat/contexto';
import { openMemoryDatabase } from '@/db/__tests__/node-sqlite-adapter';
import { getChatSettings, setChatConsent } from '@/db/ai-settings-repo';
import { listChat } from '@/db/chat-repo';
import { setNote, setSelection } from '@/db/log-repo';
import { MIGRATIONS, runMigrations } from '@/db/migrations';
import { saveProfile } from '@/db/profile-repo';
import type { Profile } from '@/domain/profile';
import { ptBR } from '@/i18n/pt-BR';

const c = ptBR.chat;
const profile: Profile = {
  birthYear: 1990,
  mode: 'period',
  lastPeriodStart: '2026-09-25',
  periodLength: 5,
  cycleLength: 28,
  regularity: 'regular',
  dueDate: null,
  tryingSince: null,
  birthControl: null,
  lutealLength: null,
  includeAtypical: false,
};

let mockDb: ReturnType<typeof openMemoryDatabase>;
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
let mockProfile: Profile;
jest.mock('@/profile/profile-context', () => ({ useProfile: () => ({ state: { status: 'ready', profile: mockProfile } }) }));
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  useIsFocused: () => true,
  router: { push: (h: unknown) => mockPush(h), replace: (h: unknown) => mockReplace(h), back: jest.fn(), canGoBack: () => true },
}));
const mockShow = jest.fn();
jest.mock('@/components/ui/snackbar', () => ({ useSnackbar: () => ({ show: mockShow }) }));
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockStore.set(k, v),
  deleteItemAsync: async (k: string) => void mockStore.delete(k),
}));
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const answer = (text: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] }),
});
const KEY = 'sk-ant-api03-' + 'x'.repeat(80);

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

beforeEach(async () => {
  jest.clearAllMocks();
  mockStore.clear();
  mockProfile = profile;
  mockDb = openMemoryDatabase();
  await runMigrations(mockDb, MIGRATIONS);
  await saveProfile(mockDb, profile, new Date());
  for (const d of ['2026-08-28', '2026-08-29', '2026-09-25', '2026-09-26']) await setSelection(mockDb, d, 'period', ['medium']);
  await setNote(mockDb, '2026-09-26', 'Nota íntima de teste');
  mockFetch.mockResolvedValue(answer('Seus ciclos variam pouco.'));
});

describe('Entrada na Análise', () => {
  it('"Perguntar sobre meus dados" abre o chat', async () => {
    await render(wrap(<AnaliseScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${c.entry}`) }));
    expect(mockPush).toHaveBeenCalledWith('/chat');
  });
});

describe('Chat: portas de entrada', () => {
  it('sem chave: explica e vai para a configuração da chave, voltando ao chat depois', async () => {
    await render(wrap(<ChatScreen />));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/ia', params: { next: 'chat' } }));
    expect(mockShow).toHaveBeenCalledWith(c.needKey);
  });

  it('com chave e sem consentimento: vai para o consentimento', async () => {
    mockStore.set('anthropic_api_key', KEY);
    await render(wrap(<ChatScreen />));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/chat/consentimento'));
  });
});

describe('Consentimento', () => {
  it('mostra o texto exato; notas e escopo mudam o texto na hora; concordar grava e abre o chat', async () => {
    await render(wrap(<ChatConsentScreen />));
    expect(await screen.findByText(/Modo: Menstruação e ciclo/)).toBeOnTheScreen();
    expect(screen.queryByText(/Nota íntima de teste/)).toBeNull();
    expect(screen.getByText(/caracteres$/)).toBeOnTheScreen();

    await fireEvent(screen.getByRole('switch', { name: c.notes }), 'valueChange', true);
    expect(await screen.findByText(/Nota íntima de teste/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: c.cycleOptions[12] }));

    await fireEvent.press(screen.getByRole('button', { name: c.accept }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/chat'));
    expect(await getChatSettings(mockDb)).toEqual({ consent: true, cycles: 12, includeNotes: true });
    expect(mockReplace).toHaveBeenCalledWith('/chat');
  });

  it('resumo que não pôde ser montado: aviso com "Tentar de novo" (sem tela parada)', async () => {
    await mockDb.runAsync('DELETE FROM profile');
    await render(wrap(<ChatConsentScreen />));
    expect(await screen.findByText(`Erro: ${c.previewFailed}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: c.retry })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: c.accept })).toBeDisabled();
  });

  it('configuração que não carrega: aviso com "Tentar de novo"', async () => {
    await mockDb.execAsync('DROP TABLE app_meta');
    await render(wrap(<ChatConsentScreen />));
    expect(await screen.findByText(`Erro: ${c.previewFailed}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: c.retry })).toBeOnTheScreen();
  });

  it('"Agora não" não grava nada', async () => {
    await render(wrap(<ChatConsentScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: c.decline }));
    expect((await getChatSettings(mockDb)).consent).toBe(false);
  });
});

describe('Conversa', () => {
  beforeEach(async () => {
    mockStore.set('anthropic_api_key', KEY);
    await setChatConsent(mockDb, true);
  });

  it('pergunta sugerida só preenche o campo (enviar custa na chave da pessoa); enviar mostra e anuncia a resposta', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(wrap(<ChatScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: c.starters[0] }));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByLabelText(c.input).props.value).toBe(c.starters[0]);
    await fireEvent.press(screen.getByRole('button', { name: c.send }));
    expect(await screen.findByText('Seus ciclos variam pouco.')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith(`${c.claude}: Seus ciclos variam pouco.`);
    expect(screen.getByText(c.starters[0])).toBeOnTheScreen();
    expect(await listChat(mockDb)).toHaveLength(2);
    expect(screen.getByText(c.disclaimer)).toBeOnTheScreen();
  });

  it('escrever e enviar; erro mostra a mensagem e devolve a pergunta ao campo', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await render(wrap(<ChatScreen />));
    const input = await screen.findByLabelText(c.input);
    await fireEvent.changeText(input, 'Por que atrasou?');
    await fireEvent.press(screen.getByRole('button', { name: c.send }));
    expect(await screen.findByText(`Erro: ${ptBR.ai.errors.invalid_key}`)).toBeOnTheScreen();
    expect(screen.getByLabelText(c.input).props.value).toBe('Por que atrasou?');
    expect(await listChat(mockDb)).toEqual([]);
    // "Tentar de novo" reenvia a mesma pergunta.
    await fireEvent.press(screen.getByRole('button', { name: c.retry }));
    expect(await screen.findByText('Seus ciclos variam pouco.')).toBeOnTheScreen();
  });

  it('mostra a pergunta como foi enviada; toque duplo envia uma vez só', async () => {
    await render(wrap(<ChatScreen />));
    await fireEvent.changeText(await screen.findByLabelText(c.input), 'ciclo <21 dias?');
    const send = screen.getByRole('button', { name: c.send });
    // Dois toques no mesmo instante, antes de qualquer re-render.
    await act(async () => {
      void fireEvent.press(send);
      void fireEvent.press(send);
    });
    expect(await screen.findByText('Seus ciclos variam pouco.')).toBeOnTheScreen();
    expect(screen.getByText('ciclo ‹21 dias?')).toBeOnTheScreen();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(`Erro: ${c.errors.busy}`)).toBeNull();
  });

  it('recusa do Claude: mensagem própria do chat (não fala de artigos)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ stop_reason: 'refusal', content: [] }) });
    await render(wrap(<ChatScreen />));
    await fireEvent.changeText(await screen.findByLabelText(c.input), 'pergunta');
    await fireEvent.press(screen.getByRole('button', { name: c.send }));
    expect(await screen.findByText(`Erro: ${c.errors.refusal}`)).toBeOnTheScreen();
  });

  it('enviar fica desligado com campo vazio; contador mostra o limite', async () => {
    await render(wrap(<ChatScreen />));
    expect(await screen.findByRole('button', { name: c.send })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(c.input), 'oi');
    expect(screen.getByText('2 de 3.000')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText(c.input), 'x'.repeat(3001));
    expect(screen.getByText(`Erro: ${c.errors.too_long}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: c.send })).toBeDisabled();
  });

  it('"Ver o que é enviado" abre o texto; "Apagar conversa" confirma e limpa', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.style === 'destructive')?.onPress?.());
    await render(wrap(<ChatScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: c.starters[1] }));
    await fireEvent.press(screen.getByRole('button', { name: c.send }));
    await screen.findByText('Seus ciclos variam pouco.');
    await fireEvent.press(screen.getByRole('button', { name: c.showContext }));
    expect(mockPush).toHaveBeenCalledWith('/chat/contexto');
    await fireEvent.press(screen.getByRole('button', { name: c.clear }));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(c.cleared));
    expect(await listChat(mockDb)).toEqual([]);
    expect(screen.queryByText('Seus ciclos variam pouco.')).toBeNull();
    expect(mockShow).toHaveBeenCalledWith(c.cleared);
  });

  it('tela "O que é enviado" mostra o mesmo resumo', async () => {
    await render(wrap(<ChatContextScreen />));
    expect(await screen.findByText(/Modo: Menstruação e ciclo/)).toBeOnTheScreen();
  });
});
