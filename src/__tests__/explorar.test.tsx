import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ExplorarScreen from '@/app/(tabs)/explorar';
import ArtigoScreen from '@/app/artigo/[id]';
import { ARTICLES } from '@/content/articles';
import { ptBR } from '@/i18n/pt-BR';

const c = ptBR.content;
const mockPush = jest.fn();
let mockId = 'colica';
// Objeto estável: um banco novo a cada render faria o efeito de foco rodar sem parar.
let mockConsent = false;
let mockKey: string | null = null;
const mockDb = { getAllAsync: async () => (mockConsent ? [{ key: 'ai_consent', value: '1' }] : []) };
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('@/ai/key-store', () => ({ getApiKey: async () => mockKey }));
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  useIsFocused: () => true,
  router: { push: (href: unknown) => mockPush(href) },
  useLocalSearchParams: () => ({ id: mockId }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

beforeEach(() => {
  mockPush.mockClear();
  mockFetch.mockReset();
  mockId = 'colica';
  mockConsent = false;
  mockKey = null;
});

describe('Resumir com IA', () => {
  const search = async () => {
    await render(wrap(<ExplorarScreen />));
    await fireEvent.changeText(screen.getByLabelText(c.search), 'colica');
  };

  it('sem chave: leva à tela da chave e nada é enviado', async () => {
    await search();
    await fireEvent.press(screen.getByRole('button', { name: ptBR.ai.summarize }));
    expect(mockPush).toHaveBeenCalledWith('/ia');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('com chave e sem consentimento: leva ao consentimento e nada é enviado', async () => {
    mockKey = 'sk-ant-api03-' + 'x'.repeat(80);
    await search();
    await fireEvent.press(screen.getByRole('button', { name: ptBR.ai.summarize }));
    expect(mockPush).toHaveBeenCalledWith('/ia/consentimento');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('com chave e consentimento: mostra o resumo', async () => {
    mockKey = 'sk-ant-api03-' + 'x'.repeat(80);
    mockConsent = true;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Calor alivia.' }] }),
    });
    await search();
    await fireEvent.press(screen.getByRole('button', { name: ptBR.ai.summarize }));
    expect(await screen.findByText('Calor alivia.')).toBeOnTheScreen();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('Explorar', () => {
  it('lista os artigos por tema', async () => {
    await render(wrap(<ExplorarScreen />));
    expect(screen.getByRole('header', { name: c.topics.menstruacao })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: new RegExp(`^${ARTICLES[0].title}`) })).toBeOnTheScreen();
  });

  it('busca sem acento filtra e mostra a contagem; tocar abre o artigo', async () => {
    await render(wrap(<ExplorarScreen />));
    await fireEvent.changeText(screen.getByLabelText(c.search), 'colica');
    expect(screen.getByText(/artigos? encontrados?$/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /^Cólica menstrual/ }));
    expect(mockPush).toHaveBeenCalledWith('/artigo/colica');
  });

  it('busca sem resultado explica o que fazer', async () => {
    await render(wrap(<ExplorarScreen />));
    await fireEvent.changeText(screen.getByLabelText(c.search), 'xyzxyz');
    expect(screen.getByText(c.results(0))).toBeOnTheScreen();
    expect(screen.getByText(c.noResultsHint)).toBeOnTheScreen();
  });
});

describe('Artigo', () => {
  it('título, tempo, subtítulos, fontes e aviso', async () => {
    await render(wrap(<ArtigoScreen />));
    expect(screen.getByRole('header', { name: 'Cólica menstrual: o que ajuda' })).toBeOnTheScreen();
    expect(screen.getByText(c.minutes(4))).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'O que costuma aliviar' })).toBeOnTheScreen();
    expect(screen.getByText(/ACOG, Dysmenorrhea/)).toBeOnTheScreen();
    expect(screen.getByText(c.disclaimer)).toBeOnTheScreen();
  });

  it('id desconhecido mostra que não encontrou', async () => {
    mockId = 'nao-existe';
    await render(wrap(<ArtigoScreen />));
    expect(screen.getByText(c.notFound)).toBeOnTheScreen();
  });
});
